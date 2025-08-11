# Service Account Setup Guide

Since you're using a Google Workspace account, we need to use Firebase Admin SDK with a service account instead of email/password authentication.

## Quick Setup Steps

### 1. Create a Firebase Service Account

1. Go to your [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** (gear icon) → **Service Accounts** tab
4. Click **"Generate new private key"**
5. Download the JSON file

### 2. Add Service Account to .env

1. Open the downloaded JSON file
2. Copy the entire JSON content (it's one long line)
3. Add it to your `.env` file:

```env
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"your-project-id","private_key_id":"...rest_of_json..."}
```

**Important**: The JSON must be on a single line in the .env file!

### 3. Install Dependencies and Run

```bash
# Install the new dependency
npm install

# Run the script
npm run generate-mock-data
```

## Alternative: Quick Test Setup

If you want to test quickly without service account setup:

1. **Create a temporary test user**:
   - Go to Firebase Console → Authentication
   - Create a user with email/password (not Google sign-in)
   - Add this user to your project as a member

2. **Use the old authentication method**:
   - I can revert the script to use email/password auth
   - Use the test user credentials

Which approach would you prefer? The service account method is more secure and doesn't require managing additional user accounts.
