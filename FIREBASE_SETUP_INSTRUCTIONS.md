# 🔥 Firebase Authentication Setup Instructions

## 🚨 Current Issue
**BLOCKING**: Authentication is failing with `auth/configuration-not-found` error because:
1. Backend Firebase configuration uses placeholder values
2. Google OAuth may not be properly enabled in Firebase Console
3. Authorized domains may not be configured

## ✅ Complete Fix Guide

### Step 1: Enable Google Authentication in Firebase Console

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Select your project**: `libeary-tracker`
3. **Navigate to Authentication**:
   - Click **Authentication** in the left sidebar
   - Go to **Sign-in method** tab
4. **Enable Google Provider**:
   - Click on **Google** in the sign-in providers list
   - Toggle **Enable** to ON
   - Verify the OAuth client ID matches: `835678699315-9mn04gcsn95utl9298f4ja02t437ksdj.apps.googleusercontent.com`
   - Click **Save**

### Step 2: Configure Authorized Domains

1. **In Firebase Console → Authentication → Settings**
2. **Go to Authorized domains tab**
3. **Ensure these domains are added**:
   - `localhost` (for development)
   - `127.0.0.1` (alternative localhost)
   - Your production domain (when ready)

### Step 3: Get Firebase Service Account Credentials

1. **In Firebase Console → Project Settings** (gear icon ⚙️)
2. **Go to Service Accounts tab**
3. **Click "Generate new private key"**
4. **Download the JSON file** - this contains your credentials
5. **Keep this file secure** - never commit to version control

### Step 4: Update Backend Environment Variables

**Open `backend/.env` and replace the placeholder values:**

```bash
# BEFORE (current placeholder values):
FIREBASE_PROJECT_ID=libeary-tracker
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_ACTUAL_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@libeary-tracker.iam.gserviceaccount.com

# AFTER (replace with actual values from downloaded JSON):
FIREBASE_PROJECT_ID=libeary-tracker
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n[PASTE_ACTUAL_PRIVATE_KEY_HERE]\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=[PASTE_ACTUAL_CLIENT_EMAIL_FROM_JSON]
```

**⚠️ Important**: When copying the private key:
- Keep the quotes around the entire key
- Ensure `\n` characters are preserved for line breaks
- The key should start with `-----BEGIN PRIVATE KEY-----` and end with `-----END PRIVATE KEY-----`

### Step 5: Configure Google Cloud Console (if needed)

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Select your project**: `libeary-tracker`
3. **Navigate to APIs & Services → OAuth consent screen**
4. **Configure the consent screen**:
   - Set app name: "Library Tracker"
   - Add support email
   - Add developer contact information
   - Save and continue

### Step 6: Test the Configuration

1. **Restart your backend server**:
   ```bash
   cd backend
   npm run dev
   ```

2. **Test authentication**:
   - Open http://localhost:5173
   - Click "Sign in with Google"
   - Check browser console for any errors

3. **Verify backend connection**:
   ```bash
   curl http://localhost:5001/health
   ```

## 🔧 Troubleshooting Guide

### ❌ Popup closes immediately
**Causes & Solutions**:
- **Popup blocker**: Disable popup blockers for localhost
- **Invalid OAuth config**: Verify client ID in Firebase Console
- **Domain not authorized**: Add localhost to authorized domains
- **Try redirect method**: Use "Sign in with Redirect" as fallback

### ❌ Backend authentication fails
**Causes & Solutions**:
- **Invalid service account**: Re-download and copy credentials carefully
- **Malformed private key**: Ensure `\n` characters are preserved
- **Wrong client email**: Copy exact email from service account JSON
- **Project ID mismatch**: Verify project ID is `libeary-tracker`

### ❌ CORS errors
**Causes & Solutions**:
- **Frontend URL not in CORS_ORIGIN**: Add your frontend URL to backend `.env`
- **Port mismatch**: Ensure frontend runs on port 5173, backend on 5001

### ❌ Network errors
**Causes & Solutions**:
- **Backend not running**: Start backend with `npm run dev`
- **MongoDB not connected**: Check MongoDB connection in backend logs
- **Firewall blocking**: Check if ports 5001 and 5173 are accessible

## 🔒 Security Checklist

- [ ] ✅ Firebase private key is in `.env` file only
- [ ] ✅ `.env` files are in `.gitignore`
- [ ] ✅ OAuth consent screen is configured
- [ ] ✅ Authorized domains are restricted to necessary domains
- [ ] ✅ Service account has minimal required permissions

## 📋 Quick Verification Steps

After completing the setup:

1. **Frontend config check**: Browser console should show:
   ```
   🔧 Firebase config check: { hasApiKey: true, hasAuthDomain: true, hasProjectId: true, projectId: 'libeary-tracker' }
   ```

2. **Backend health check**: Should return:
   ```json
   {
     "status": "OK",
     "timestamp": "2025-06-24T...",
     "environment": "development"
   }
   ```

3. **Authentication flow**: Google popup should open and allow sign-in

## 🚀 Next Steps After Fix

Once authentication is working:
1. Test user registration and login
2. Verify JWT token generation
3. Test protected routes access
4. Check user data persistence in MongoDB
