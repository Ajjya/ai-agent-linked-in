# 🔐 LinkedIn Two-App Architecture

## 📱 Why Two Apps?

LinkedIn's Community Management API **must be the only product** on an application. Therefore, we use **two separate apps**:

- **App 1**: OAuth login & personal posting (`Sign In with LinkedIn`)
- **App 2**: Organization publishing (`Community Management API`)

This is the **official LinkedIn recommendation** for combining different access types.

---

## 🚀 Quick Setup

### App 1: Authentication (Already configured)
Your existing app with `Sign In with LinkedIn` - **no changes needed**.

### App 2: Organization Publishing (New)

1. **Create new LinkedIn app** at https://www.linkedin.com/developers/apps
2. **Request "Community Management API"** (Development Tier)
3. **Copy credentials** to `.env`:
   ```env
   LINKEDIN_PUBLISH_CLIENT_ID=your_app2_client_id
   LINKEDIN_PUBLISH_CLIENT_SECRET=your_app2_client_secret
   ```
4. **Set organization mode**:
   ```env
   LINKEDIN_COMPANY_ID=your_org_id
   LINKEDIN_PUBLISH_AS_ORGANIZATION=true
   ```

5. **Authorize App 2**:
   ```bash
   curl http://localhost:3000/auth/linkedin/auth-org
   ```
   Open URL in browser → Sign in as org admin → Allow

---

## 🎯 How It Works

### Personal Posting (App 1)
```env
LINKEDIN_PUBLISH_AS_ORGANIZATION=false
```
- Uses App 1 credentials
- Token with `w_member_social` scope
- Posts to your personal feed

### Organization Posting (App 2)
```env
LINKEDIN_PUBLISH_AS_ORGANIZATION=true
```
- Uses App 2 credentials
- Token with `w_organization_social` scope  
- Posts to organization page

---

## 📋 Complete Setup Steps

### Step 1: Create App 2

1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps)
2. Click **"Create app"**
3. Fill details:
   - **App name**: "Your Org Publisher"
   - **LinkedIn Page**: Your organization
   - **Privacy policy**: Your URL
4. Click **"Create app"**

### Step 2: Request Community Management API

1. In App 2 → **Products** tab
2. Find **"Community Management API"**
3. Click **"Request access"** → Development Tier
4. Wait for approval (usually instant)

### Step 3: Configure OAuth

1. Go to **Auth** tab in App 2
2. Add redirect URL: `http://localhost:3000/auth/linkedin/callback`
3. Copy **Client ID** and **Client Secret**

### Step 4: Update .env

```env
# App 1: OAuth & Personal (existing)
LINKEDIN_CLIENT_ID=your_app1_client_id
LINKEDIN_CLIENT_SECRET=your_app1_client_secret

# App 2: Organization Publishing (new)
LINKEDIN_PUBLISH_CLIENT_ID=your_app2_client_id
LINKEDIN_PUBLISH_CLIENT_SECRET=your_app2_client_secret

# Organization settings
LINKEDIN_COMPANY_ID=your_org_id
LINKEDIN_PUBLISH_AS_ORGANIZATION=true
```

### Step 5: Authorize App 2

**Start server:**
```bash
npm run dev
```

**Get App 2 authorization URL:**
```bash
curl http://localhost:3000/auth/linkedin/auth-org
```

Open URL → Sign in as org admin → Allow

---

## 🔍 Verification

### Check Token Scopes

```bash
sqlite3 prisma/dev.db "SELECT scope FROM LinkedInToken ORDER BY createdAt DESC LIMIT 1;"
```

**Should have:** `openid profile w_organization_social`

### Check Publishing Logs

```
🔑 Using App 2 (Publish) credentials
✅ Publishing as Organization: XXXXXXXXX
   Author URN: urn:li:organization:XXXXXXXXX
```

---

## 🔄 Switching Modes

Edit `.env` and restart:

**Organization:**
```env
LINKEDIN_PUBLISH_AS_ORGANIZATION=true
```

**Personal:**
```env
LINKEDIN_PUBLISH_AS_ORGANIZATION=false
```

---

## ✅ Checklist

- [ ] App 2 created with Community Management API only
- [ ] App 2 credentials in `.env`
- [ ] Organization ID in `.env`
- [ ] `LINKEDIN_PUBLISH_AS_ORGANIZATION=true`
- [ ] Authorized App 2 via `/auth/linkedin/auth-org`
- [ ] Token has `w_organization_social` scope
- [ ] Test post published to organization page
