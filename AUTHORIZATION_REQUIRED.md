# ✅ LinkedIn Authorization Update

## 🎯 Current Status

The system has been updated with improved OAuth scopes to:
- ✅ Get real LinkedIn User ID (using `openid` and `profile` scopes)
- ✅ Publish posts with correct author URN
- ✅ Support automatic token refresh

**But**: You need to **re-authorize** with the new scopes.

## 🔗 Authorization Link

Open this link in your browser:

```
http://localhost:3000/auth/linkedin/auth
```

This will:
1. Redirect you to LinkedIn authorization page
2. Request permissions for: `openid`, `profile`, and `w_member_social`
3. Return to the application with a success page
4. Save your LinkedIn ID and tokens automatically

## 📝 After Authorization

Once authorized:
- ✅ System will have your real LinkedIn User ID
- ✅ Posts will be published with correct author information
- ✅ Automatic token refresh will work
- ✅ Scheduled posts will post twice weekly (Tue & Fri at 10:30 AM Portugal time)

## 🧪 Test Publishing

After authorization, test posting:
```bash
curl -X POST http://localhost:3000/api/system/posts/publish
```

Check dashboard at: `http://localhost:3000`

## ❓ Issues?

If you see "LinkedIn connection invalid":
1. Make sure you authorized with NEW scopes
2. Check system status on Dashboard
3. Look at logs: `tail -f /tmp/server.log`
