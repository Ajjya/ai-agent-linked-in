````markdown
# LinkedIn OAuth Setup Guide

## Step 1: Create LinkedIn App

1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
2. Click "Create app"
3. Fill out the form:
   - **App name**: MongoDB Content Agent
   - **LinkedIn Page**: Select your company or create a personal page
   - **Privacy policy URL**: https://yourcompany.com/privacy (temporarily use https://mongodb.com/privacy)
   - **App logo**: Upload a logo (optional)

## Step 2: Configure Permissions

1. In the **Products** section add:
   - **Sign In with LinkedIn using OpenID Connect**
   - **Share on LinkedIn** (requires verification)
   - **Marketing Developer Platform** (if available)

2. In the **Auth** section configure:
   - **Authorized redirect URLs**: 
     ```
     http://localhost:3000/auth/linkedin/callback
     ```

## Step 3: Get Credentials

1. Go to the **Auth** tab
2. Copy:
   - **Client ID**
   - **Client Secret**

## Step 4: Update .env File

Open the `.env` file and fill in:

```env
LINKEDIN_CLIENT_ID=your_client_id_here
LINKEDIN_CLIENT_SECRET=your_client_secret_here
LINKEDIN_REDIRECT_URI=http://localhost:3000/auth/linkedin/callback
```

## Step 5: Get Access Token

1. Restart the application after updating .env
2. Open http://localhost:3000/settings.html
3. Click "Authorize LinkedIn"
4. Follow the OAuth authorization process
5. Access token will be automatically saved

## Alternative Token Retrieval Method

If the button on settings.html doesn't work, use the direct URL:

1. Get the authorization URL:
   ```bash
   curl http://localhost:3000/auth/linkedin/auth
   ```

2. Open the returned URL in your browser
3. Authorize with LinkedIn
4. You will be redirected back with the access token

## Verify Connection

After obtaining the token, verify the connection:

```bash
curl http://localhost:3000/api/system/status
```

The response should show `linkedin: connected`.
````