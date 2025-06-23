# Firebase Authentication Setup Instructions

## Current Issue
Your Google OAuth popup is closing immediately because the backend Firebase configuration is using placeholder values instead of real credentials.

## Steps to Fix

### 1. Get Firebase Service Account Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **libeary-tracker**
3. Click the gear icon (⚙️) → **Project Settings**
4. Go to the **Service Accounts** tab
5. Click **Generate new private key**
6. Download the JSON file

### 2. Update Backend Environment Variables

Open `backend/.env` and replace these lines:

```bash
# Current (placeholder values):
FIREBASE_PROJECT_ID=libeary-tracker
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_ACTUAL_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@libeary-tracker.iam.gserviceaccount.com

# Replace with actual values from the downloaded JSON:
FIREBASE_PROJECT_ID=libeary-tracker
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n[PASTE_ACTUAL_PRIVATE_KEY_HERE]\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=[PASTE_ACTUAL_CLIENT_EMAIL_HERE]
```

### 3. Verify Domain Authorization

1. In Firebase Console → **Authentication** → **Settings** → **Authorized domains**
2. Make sure these domains are listed:
   - `localhost`
   - `127.0.0.1`
   - Your production domain (if any)

### 4. Check Google OAuth Configuration

1. Go to **Authentication** → **Sign-in method**
2. Click on **Google**
3. Verify it's enabled
4. Check that your OAuth client ID matches: `835678699315-9mn04gcsn95utl9298f4ja02t437ksdj.apps.googleusercontent.com`

### 5. Test the Fix

1. Restart your backend server: `npm run dev`
2. Try signing in again
3. Check browser console for detailed error messages
4. If popup is blocked, use the "Sign in with Redirect" option

## Troubleshooting

### If you still see popup closing immediately:
1. Check browser console for errors
2. Verify Firebase config in `frontend/.env` matches your project
3. Make sure popup blockers are disabled
4. Try incognito/private browsing mode

### If backend authentication fails:
1. Verify the service account JSON was copied correctly
2. Check that the private key includes proper line breaks (`\n`)
3. Ensure the client email matches exactly

## Security Note
Never commit the actual Firebase private key to version control. Keep it in `.env` files only.
