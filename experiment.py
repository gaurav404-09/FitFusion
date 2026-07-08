import pandas as pd
import numpy as np
import torch
import torch.nn as nn
import matplotlib.pyplot as plt
import pickle

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

# ==============================
# Load dataset
# ==============================

path = "C:/Users/Asus/CampusTitan/ScreenTime vs MentalWellness.csv"
df = pd.read_csv(path)

# ---------------------------------------------------------
# NEW: Convert Weekly Features to Daily Features
# ---------------------------------------------------------
if "exercise_minutes_per_week" in df.columns:
    df["exercise_minutes_per_day"] = df["exercise_minutes_per_week"] / 7.0
    df = df.drop(columns=["exercise_minutes_per_week"])

if "social_hours_per_week" in df.columns:
    df["social_hours_per_day"] = df["social_hours_per_week"] / 7.0
    df = df.drop(columns=["social_hours_per_week"])

# ---------------------------------------------------------

target = "mental_wellness_index_0_100"

y = df[target]
X = df.drop(columns=[target, "user_id"])

# ==============================
# Detect categorical columns
# ==============================

threshold = 10
categorical_cols = []
numeric_cols = []

for col in X.columns:
    if X[col].dtype == "object":
        categorical_cols.append(col)
    elif X[col].nunique() <= threshold:
        categorical_cols.append(col)
    else:
        numeric_cols.append(col)

# ==============================
# One-hot encode categorical
# ==============================

X = pd.get_dummies(X, columns=categorical_cols)

# Save final column structure for inference
columns = X.columns
pickle.dump(columns, open("columns.pkl", "wb"))

# ==============================
# Handle missing values
# ==============================

X = X.fillna(0)

# ==============================
# Scale numeric columns
# ==============================

scaler = StandardScaler()

if numeric_cols:
    X[numeric_cols] = scaler.fit_transform(X[numeric_cols])

# Save scaler for inference
pickle.dump(scaler, open("scaler.pkl", "wb"))

# ==============================
# Train / validation split
# ==============================

X_train, X_val, y_train, y_val = train_test_split(
    X, y,
    test_size=0.25,
    random_state=42
)

# ==============================
# Convert to tensors
# ==============================

X_train = torch.tensor(X_train.to_numpy(dtype=np.float32))
X_val = torch.tensor(X_val.to_numpy(dtype=np.float32))

y_train = torch.tensor(y_train.to_numpy(dtype=np.float32)).view(-1,1)
y_val = torch.tensor(y_val.to_numpy(dtype=np.float32)).view(-1,1)

# ==============================
# Neural Network
# ==============================

class Net(nn.Module):
    def __init__(self, input_dim):
        super(Net, self).__init__()
        self.model = nn.Sequential(
            nn.Linear(input_dim, 12),
            nn.ReLU(),
            nn.Linear(12, 8),
            nn.ReLU(),
            nn.Linear(8, 1)
        )

    def forward(self, x):
        return self.model(x)

model = Net(X_train.shape[1])

# ==============================
# Training setup
# ==============================

criterion = nn.MSELoss()
optimizer = torch.optim.Adam(model.parameters(), lr=0.001)

epochs = 100
batch_size = 16

train_losses = []
val_losses = []

best_val_loss = float('inf')
patience = 10
patience_counter = 0

# ==============================
# Training loop
# ==============================

for epoch in range(epochs):
    model.train()
    permutation = torch.randperm(X_train.size()[0])
    epoch_loss = 0

    for i in range(0, X_train.size()[0], batch_size):
        indices = permutation[i:i+batch_size]
        batch_x = X_train[indices]
        batch_y = y_train[indices]

        optimizer.zero_grad()
        outputs = model(batch_x)
        loss = criterion(outputs, batch_y)
        loss.backward()
        optimizer.step()

        epoch_loss += loss.item()

    epoch_loss /= (X_train.size()[0] / batch_size)
    train_losses.append(epoch_loss)

    # Validation
    model.eval()
    with torch.no_grad():
        val_pred = model(X_val)
        val_loss = criterion(val_pred, y_val).item()

    val_losses.append(val_loss)
    print(f"Epoch {epoch} | Train Loss: {epoch_loss:.4f} | Val Loss: {val_loss:.4f}")

    # Save best model
    if val_loss < best_val_loss:
        best_val_loss = val_loss
        patience_counter = 0
        torch.save(model.state_dict(), "best_model.pth")
    else:
        patience_counter += 1

    # Early stopping
    if patience_counter >= patience:
        print("Early stopping triggered")
        break

# ==============================
# Plot loss curve
# ==============================

plt.figure(figsize=(8,5))
plt.plot(train_losses, label="Train Loss")
plt.plot(val_losses, label="Validation Loss")
plt.xlabel("Epoch")
plt.ylabel("Loss")
plt.title("Training vs Validation Loss")
plt.legend()
plt.show()

# ==============================
# Evaluation
# ==============================

model.load_state_dict(torch.load("best_model.pth"))
model.eval()

with torch.no_grad():
    predictions = model(X_val)

predictions = predictions.numpy().flatten()
y_val_np = y_val.numpy().flatten()

rmse = np.sqrt(((predictions - y_val_np) ** 2).mean())
print("RMSE:", rmse)