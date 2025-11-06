````markdown
# Automatic LinkedIn Token Refresh

## Overview

The automatic token refresh system eliminates the need for manual access token updates. Now the application automatically:

1. 🔄 **Refreshes tokens** before they expire
2. 💾 **Stores tokens** safely in the database
3. ⏰ **Checks expiration** every 30 minutes
4. 🤖 **Works without user interaction**

## How It Works

### 1. OAuth Flow with Auto-Save
When authorizing through LinkedIn OAuth:
- Access token and refresh token are saved to the database
- Token expiration time is set
- Users no longer need to manually copy tokens

### 2. Automatic Token Checking
Every 30 minutes the system:
- Checks token expiration
- If token expires within 30 minutes - automatically refreshes it
- Updated token is saved to the database

### 3. Initialization on Startup
When the application starts:
- Loads a valid token from the database
- Initializes the LinkedIn API with the loaded token

## Usage

### Initial Setup
1. Navigate to `http://localhost:3000/auth/linkedin/auth`
2. Get the authorization URL and follow it
3. Confirm access in LinkedIn
4. Tokens are automatically saved to the system

### After Setup
- ✅ No actions required
- ✅ Tokens refresh automatically
- ✅ Posting works without interruptions

## Technical Details

### Database
New `linkedin_tokens` table:
```sql
CREATE TABLE "linkedin_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "tokenType" TEXT NOT NULL DEFAULT 'Bearer',
    "scope" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
```

### Scheduler
- **Frequency**: Every 30 minutes
- **Refresh condition**: If token expires within 30 minutes
- **Logging**: All operations are logged to the database

### API Methods
- `linkedinService.initializeToken()` - Load token on startup
- `linkedinService.checkAndRefreshToken()` - Check and refresh
- `linkedinService.refreshToken()` - Force refresh

## Benefits

1. 🛡️ **Security**: Tokens stored in encrypted database
2. 🤖 **Automation**: Completely autonomous operation
3. ⚡ **Reliability**: Prevents failures due to expired tokens
4. 📈 **Continuity**: Posting works without interruptions
5. 🔧 **Simplicity**: Set up once, works forever

## Monitoring

Automatic token refresh logs are available in:
- Application console (on startup)
- Database (`publish_logs` table)
- Web dashboard

## Token Statuses

- ✅ **Valid**: Token is active, not expiring
- 🔄 **Refreshing**: Token close to expiration, refresh in progress
- ❌ **Invalid**: Re-authorization required

Now you can forget about managing LinkedIn tokens manually! 🚀
````