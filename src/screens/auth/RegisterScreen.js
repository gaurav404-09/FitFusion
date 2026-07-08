// Register Screen — 3-step signup with Year, Branch, Hostel
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Dimensions,
  Modal,
  FlatList,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, SPACING, FONT_SIZES, FONTS, BORDER_RADIUS } from "../../theme";
import {
  AnimatedButton,
  StyledInput,
  ScrollPicker,
} from "../../components/common";
import { useAuth } from "../../services/AuthContext";
import { COLLEGES, YEARS, BRANCHES, HOSTELS } from "../../data/seedData";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const AGE_DATA = Array.from({ length: 83 }, (_, i) => i + 18); // 18-100
const HEIGHT_DATA = Array.from({ length: 101 }, (_, i) => i + 120); // 120-220 cm
const WEIGHT_DATA = Array.from({ length: 151 }, (_, i) => i + 30); // 30-180 kg

// Default dummy values for rapid testing
const DEFAULT_COLLEGE = "MNNIT Allahabad";
const DEFAULT_YEAR = "2nd Year";
const DEFAULT_BRANCH = "Material Science and Engineering";
const DEFAULT_HOSTEL = "Vindhyachal Hostel";

export default function RegisterScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    college: DEFAULT_COLLEGE,
    year: DEFAULT_YEAR,
    branch: DEFAULT_BRANCH,
    hostel: DEFAULT_HOSTEL,
    age: 22,
    height: 170,
    weight: 65,
    gender: "male",
  });
  const [loading, setLoading] = useState(false);

  // Modal visibility states
  const [showCollegePicker, setShowCollegePicker] = useState(false);
  const [showBranchPicker, setShowBranchPicker] = useState(false);
  const [showHostelPicker, setShowHostelPicker] = useState(false);

  const { register } = useAuth();

  function updateForm(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleRegister() {
    if (!form.name || !form.email || !form.password || !form.college) {
      Alert.alert("Error", "Please fill all required fields");
      return;
    }
    setLoading(true);
    try {
      await register(form);
    } catch (e) {
      Alert.alert("Registration Failed", e.message);
    }
    setLoading(false);
  }

  // ─── Generic list-picker modal ────────────────────────────────────────────
  function ListPickerModal({ visible, title, data, value, onSelect, onClose }) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.modalDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={data}
              keyExtractor={(item, idx) => idx.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.listItem,
                    item === value && styles.listItemSelected,
                  ]}
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                >
                  <Text
                    style={[
                      styles.listItemText,
                      item === value && styles.listItemTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                  {item === value && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    );
  }

  // ─── Step 1: Account ─────────────────────────────────────────────────────
  function renderStep1() {
    return (
      <>
        <Text style={styles.stepTitle}>Create Account</Text>
        <Text style={styles.stepSubtitle}>Step 1 of 3 — Account Details</Text>
        <StyledInput
          label="Email"
          value={form.email}
          onChangeText={(v) => updateForm("email", v)}
          placeholder="you@campus.edu"
          keyboardType="email-address"
          icon="📧"
        />
        <StyledInput
          label="Password"
          value={form.password}
          onChangeText={(v) => updateForm("password", v)}
          placeholder="Min 6 characters"
          secureTextEntry
          icon="🔒"
        />
        <AnimatedButton
          title="Next Step →"
          onPress={() => {
            if (!form.email || !form.password) {
              Alert.alert("Error", "Email and password are required");
              return;
            }
            if (form.password.length < 6) {
              Alert.alert("Error", "Password must be at least 6 characters");
              return;
            }
            setStep(2);
          }}
          style={{ marginTop: SPACING.lg }}
        />
      </>
    );
  }

  // ─── Step 2: Campus Identity ──────────────────────────────────────────────
  function renderStep2() {
    return (
      <>
        <Text style={styles.stepTitle}>Campus Identity</Text>
        <Text style={styles.stepSubtitle}>
          Step 2 of 3 — Who are you on campus?
        </Text>

        <StyledInput
          label="Full Name"
          value={form.name}
          onChangeText={(v) => updateForm("name", v)}
          placeholder="John Doe"
          icon="👤"
        />

        {/* College Picker */}
        <Text style={styles.fieldLabel}>College / University</Text>
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => setShowCollegePicker(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.pickerButtonText} numberOfLines={1}>
            🏛️ {form.college}
          </Text>
          <Text style={styles.pickerChevron}>▼</Text>
        </TouchableOpacity>

        {/* Academic Year — inline chip row (only 4 options) */}
        <Text style={styles.fieldLabel}>Academic Year</Text>
        <View style={styles.chipRow}>
          {YEARS.map((yr) => (
            <TouchableOpacity
              key={yr}
              style={[
                styles.yearChip,
                form.year === yr && styles.yearChipActive,
              ]}
              onPress={() => updateForm("year", yr)}
            >
              <Text
                style={[
                  styles.yearChipText,
                  form.year === yr && styles.yearChipTextActive,
                ]}
              >
                {yr}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Branch / Department Picker */}
        <Text style={styles.fieldLabel}>Branch / Department</Text>
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => setShowBranchPicker(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.pickerButtonText} numberOfLines={1}>
            🎓 {form.branch}
          </Text>
          <Text style={styles.pickerChevron}>▼</Text>
        </TouchableOpacity>

        {/* Hostel Picker */}
        <Text style={styles.fieldLabel}>Hostel / Residence</Text>
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => setShowHostelPicker(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.pickerButtonText} numberOfLines={1}>
            🏠 {form.hostel}
          </Text>
          <Text style={styles.pickerChevron}>▼</Text>
        </TouchableOpacity>

        {/* Modals */}
        <ListPickerModal
          visible={showCollegePicker}
          title="Select College"
          data={COLLEGES}
          value={form.college}
          onSelect={(v) => updateForm("college", v)}
          onClose={() => setShowCollegePicker(false)}
        />
        <ListPickerModal
          visible={showBranchPicker}
          title="Select Branch / Department"
          data={BRANCHES}
          value={form.branch}
          onSelect={(v) => updateForm("branch", v)}
          onClose={() => setShowBranchPicker(false)}
        />
        <ListPickerModal
          visible={showHostelPicker}
          title="Select Hostel"
          data={HOSTELS}
          value={form.hostel}
          onSelect={(v) => updateForm("hostel", v)}
          onClose={() => setShowHostelPicker(false)}
        />

        <View style={styles.navButtons}>
          <TouchableOpacity onPress={() => setStep(1)} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <AnimatedButton
            title="Next Step →"
            onPress={() => {
              if (!form.name) {
                Alert.alert("Error", "Please enter your name");
                return;
              }
              setStep(3);
            }}
            style={{ flex: 1 }}
          />
        </View>
      </>
    );
  }

  // ─── Step 3: Body Metrics ─────────────────────────────────────────────────
  function renderStep3() {
    return (
      <>
        <Text style={styles.stepTitle}>Body Metrics</Text>
        <Text style={styles.stepSubtitle}>Step 3 of 3 — Personal Details</Text>

        <View style={styles.formContent}>
          <View style={styles.genderRow}>
            {[
              { key: "male", emoji: "👨", label: "Male" },
              { key: "female", emoji: "👩", label: "Female" },
              { key: "other", emoji: "🧑", label: "Other" },
            ].map((g) => (
              <TouchableOpacity
                key={g.key}
                style={[
                  styles.genderBtn,
                  form.gender === g.key && styles.genderBtnActive,
                ]}
                onPress={() => updateForm("gender", g.key)}
              >
                <Text style={styles.genderEmoji}>{g.emoji}</Text>
                <Text
                  style={[
                    styles.genderLabel,
                    form.gender === g.key && styles.genderLabelActive,
                  ]}
                >
                  {g.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.metricsRow}>
            <View style={{ flex: 1, marginRight: SPACING.md }}>
              <ScrollPicker
                label="Age"
                data={AGE_DATA}
                value={form.age}
                onValueChange={(v) => updateForm("age", v)}
                height={140}
              />
            </View>
            <View style={{ flex: 1 }}>
              <ScrollPicker
                label="Height (cm)"
                data={HEIGHT_DATA}
                value={form.height}
                onValueChange={(v) => updateForm("height", v)}
                height={140}
              />
            </View>
          </View>

          <View style={styles.weightContainer}>
            <ScrollPicker
              label="Weight (kg)"
              data={WEIGHT_DATA}
              value={form.weight}
              onValueChange={(v) => updateForm("weight", v)}
              height={220}
            />
          </View>
        </View>

        <View style={styles.bottomSection}>
          <View style={styles.navButtons}>
            <TouchableOpacity onPress={() => setStep(2)} style={styles.backBtn}>
              <Text style={styles.backBtnText}>← Back</Text>
            </TouchableOpacity>
            <AnimatedButton
              title={loading ? "Creating..." : "Complete Signup"}
              onPress={handleRegister}
              disabled={loading}
              style={{ flex: 1 }}
            />
          </View>
          <LoginLink navigation={navigation} />
        </View>
      </>
    );
  }

  const progress = (step / 3) * 100;

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.mainWrapper}>
          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBg}>
              <LinearGradient
                colors={COLORS.gradientPrimary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${progress}%` }]}
              />
            </View>
            <Text style={styles.progressLabel}>Step {step} of 3</Text>
          </View>

          {step === 1 && (
            <ScrollView
              contentContainerStyle={styles.stepScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {renderStep1()}
              <LoginLink navigation={navigation} />
            </ScrollView>
          )}
          {step === 2 && (
            <ScrollView
              contentContainerStyle={styles.stepScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {renderStep2()}
              <LoginLink navigation={navigation} />
            </ScrollView>
          )}
          {step === 3 && (
            <View style={styles.stepViewContent}>
              {renderStep3()}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function LoginLink({ navigation }) {
  return (
    <TouchableOpacity
      style={styles.loginLink}
      onPress={() => navigation.goBack()}
    >
      <Text style={styles.loginText}>
        Already have an account?{" "}
        <Text style={styles.loginTextBold}>Sign In</Text>
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mainWrapper: {
    flex: 1,
    paddingHorizontal: SPACING.xxl,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
  },
  stepScrollContent: { paddingBottom: SPACING.huge },
  stepViewContent: { 
    flex: 1, 
    paddingBottom: SPACING.md,
  },
  formContent: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  bottomSection: {
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  weightContainer: {
    marginTop: SPACING.md,
  },

  // Progress
  progressContainer: { marginBottom: SPACING.xl },
  progressBg: {
    height: 4,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: { height: 4, borderRadius: 2 },
  progressLabel: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    ...FONTS.medium,
    marginTop: SPACING.xs,
    textAlign: "right",
  },

  // Step headings
  stepTitle: {
    fontSize: FONT_SIZES.xxxl,
    ...FONTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  stepSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xxl,
  },

  // Field label
  fieldLabel: {
    fontSize: FONT_SIZES.sm,
    ...FONTS.medium,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
  },

  // Generic picker button (college / branch / hostel)
  pickerButton: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md + 4,
    marginBottom: SPACING.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pickerButtonText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    flex: 1,
  },
  pickerChevron: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginLeft: SPACING.sm,
  },

  // Year chips
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  yearChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    backgroundColor: COLORS.surfaceLight,
  },
  yearChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  yearChipText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
    ...FONTS.medium,
  },
  yearChipTextActive: {
    color: COLORS.textInverse,
    ...FONTS.bold,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: SCREEN_HEIGHT * 0.55,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glassBorder,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    ...FONTS.bold,
    color: COLORS.text,
  },
  modalDone: {
    fontSize: FONT_SIZES.md,
    ...FONTS.semiBold,
    color: COLORS.primary,
  },
  listItem: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glassBorder,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  listItemSelected: { backgroundColor: COLORS.primary + "15" },
  listItemText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    flex: 1,
  },
  listItemTextSelected: {
    color: COLORS.primary,
    ...FONTS.semiBold,
  },
  checkmark: {
    color: COLORS.primary,
    fontSize: 18,
    ...FONTS.bold,
  },

  // Gender
  genderRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  genderBtn: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  genderBtnActive: {
    backgroundColor: COLORS.primary + "15",
    borderColor: COLORS.primary,
  },
  genderEmoji: { fontSize: 24, marginBottom: 4 },
  genderLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    ...FONTS.medium,
  },
  genderLabelActive: { color: COLORS.primary, ...FONTS.bold },

  // Metrics row
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: SPACING.md,
  },

  // Nav
  navButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  backBtn: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  backBtnText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.md,
    ...FONTS.medium,
  },

  // Bottom link
  loginLink: {
    alignItems: "center",
    marginTop: SPACING.md,
  },
  loginText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.md,
  },
  loginTextBold: {
    color: COLORS.primary,
    ...FONTS.bold,
  },

  // Admin toggle
  adminRow: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.xs,
  },
  adminToggle: {
    flexDirection: "row",
    alignItems: "center",
  },
  adminCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.glassBorder,
    marginRight: SPACING.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  adminCheckboxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  adminCheck: {
    color: COLORS.textInverse,
    fontSize: 14,
    ...FONTS.bold,
  },
  adminLabel: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    ...FONTS.medium,
  },
});
