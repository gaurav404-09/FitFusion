# Camera Button Development Build Error Fix
Status: Diagnosed - Backend dependency issue

## Root Cause
Camera capture in `FoodScannerScreen.js` → `backendAPI.analyzeFoodImage()` → nutrition server (port 5001 expected).
**curl localhost:5000/api/health failed** - server not running.
Dev build proceeds to API call after photo capture, crashes when backend unreachable.

**AIWellnessCoach WARN**: Unrelated TypeError (`.map()` on undefined) - fix separately.

## Fix Steps (Execute in order)
1. **Start Nutrition Backend**:
   ```
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   python nutrition_server.py
   ```
✅ Server running on port 5001: `{"nutrition_score_available": true, "status": "healthy"}`

2. **Verify Backend API** (port 5001 in backendAPI.js? Check server logs)

3. **Test Camera Flow**:
   - Run `npx expo start --dev-client --clear`
   - Navigate → Nutrition → FoodScanner
   - Click camera → should analyze without crash

4. **Optional: Fix AIWellnessCoach** (add null checks)

## Completion Criteria
- Camera button click succeeds
- Food analysis returns nutrition data
- No crash in dev build
