# Email Notification System - Error Handling & Testing Guide

## Overview
The email notification system (STEP 8) is non-blocking — video generation completes successfully regardless of email status. All email errors and successes are logged for debugging.

---

## ✅ Email Success Path

**When email sends successfully:**
1. ✅ Video is already completed and stored
2. ✅ Email sent via Plunk to user@mail.com
3. ✅ Database updated: `email_sent = true`, `email_sent_at = <timestamp>`
4. ✅ User receives email with video thumbnail, download link, and dashboard link
5. ✅ Inngest shows STEP 8 as successful in dashboard

**Email content includes:**
- User's name personalization
- Video title
- First scene thumbnail (or gradient placeholder)
- View in Dashboard button
- Direct Video Download button
- Series name and generation timestamp

---

## ⚠️ Error Cases & Handling

### 1. **PLUNK_API_KEY Not Configured**
**Error Message:**
```
[step-8] CRITICAL: PLUNK_API_KEY not set!
```
**Cause:** Environment variable missing
**Fix:** Add to `.env.local`:
```
PLUNK_API_KEY=sk_YOUR_SECRET_KEY_HERE
```
**Status:** ⚠️ Returns `success: false`, does NOT throw (non-blocking)

---

### 2. **Using Public Key Instead of Secret Key**
**Error Message:**
```
[step-8] WARNING: Using PUBLIC key (pk_). Must use SECRET key (sk_) for email sending!
```
**Cause:** Copied `pk_` key instead of `sk_` from Plunk dashboard
**Expected Error from Plunk:**
```
You attached a public key but this route may only be accessed with a secret key
```
**Fix:**
- Go to https://app.useplunk.com → API Keys
- Copy the **Secret Key** (starts with `sk_`) not Public Key
- Update `.env.local`: `PLUNK_API_KEY=sk_...`

**Status:** ⚠️ Returns `success: false`, does NOT throw (non-blocking)

---

### 3. **User Not Found in Database**
**Error Message:**
```
[step-8] No user record in database for user_id: <clerk_id>
Database query failed: <error_details>
```
**Cause:** 
- Clerk webhook failed to sync user to Supabase
- User deleted from database
- Clerk user ID mismatch

**Fix Options:**
```bash
# Option 1: Force sync current user
curl -X POST http://localhost:3000/api/user/sync

# Option 2: Check sync status
curl -X GET http://localhost:3000/api/user/sync

# Option 3: Check email debug info
curl -X GET http://localhost:3000/api/debug/email
```

**Status:** ⚠️ Returns `success: false`, does NOT throw (non-blocking)

---

### 4. **User Has No Email Address**
**Error Message:**
```
[step-8] User found but has no email address
```
**Cause:** Clerk user created without email, or email not synced
**Fix:** Update user profile in Clerk dashboard to add email

**Status:** ⚠️ Returns `success: false`, does NOT throw (non-blocking)

---

### 5. **Invalid Email Format**
**Error Message:**
```
[step-8] User email is invalid: <malformed_email>
```
**Cause:** Email address fails regex validation
**Fix:** Update user email in Clerk dashboard

**Status:** ⚠️ Returns `success: false`, does NOT throw (non-blocking)

---

### 6. **Plunk API Rate Limit / Quota Exceeded**
**Error Message:**
```
[step-8] Transient error (attempt 1/3): rate limit exceeded
[step-8] Waiting 1000ms before retry...
```
**Cause:** 
- Too many emails sent in short time
- Plunk account quota reached

**Automatic Retry:** Yes (3 attempts with exponential backoff: 1s, 2s, 3s)

**Database Update:** `email_sent = false`, `email_error = '<error message>'`

**Status:** After 3 retries → ⚠️ Returns `success: false`, does NOT throw (non-blocking)

---

### 7. **Plunk API Timeout / Network Error**
**Error Message:**
```
[step-8] Email send failed (attempt 1/3): ECONNREFUSED / ETIMEDOUT
```
**Cause:** Network issue, Plunk API down, or too slow response

**Automatic Retry:** Yes (3 attempts with exponential backoff)

**Status:** After 3 retries → ⚠️ Returns `success: false`, does NOT throw (non-blocking)

---

### 8. **Unexpected Plunk Response Format**
**Error Messages:**
```
[step-8] Unexpected Plunk response: <formatted_json>
[step-8] Plunk returned unsuccessful response: false
```
**Cause:** Plunk API returned unexpected JSON structure

**Fix:** Check Plunk API response format or contact Plunk support

**Status:** ⚠️ Returns `success: false`, does NOT throw (non-blocking)

---

### 9. **NEXT_PUBLIC_APP_URL Not Configured**
**Warning:**
```
[step-8] NEXT_PUBLIC_APP_URL not set - dashboard link will use download URL
```
**Impact:** Email includes direct download link instead of dashboard button
**Fix:** Add to `.env.local`:
```
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Dev
NEXT_PUBLIC_APP_URL=https://yourdomain.com # Production
```

---

## 📊 Database Email Tracking

After Step 8, the `videos` table is updated with:

```sql
-- Success case:
UPDATE videos SET 
  email_sent = true,
  email_sent_at = '2025-03-07T10:30:45Z'
WHERE id = <video_id>;

-- Failure case:
UPDATE videos SET 
  email_sent = false,
  email_error = 'Rate limit exceeded'
WHERE id = <video_id>;
```

**Query to check email status:**
```sql
SELECT id, title, status, email_sent, email_sent_at, email_error 
FROM videos 
WHERE user_id = '<clerk_user_id>' 
ORDER BY created_at DESC;
```

---

## 🧪 Testing Email Functionality

### 1. **Test Email Configuration**
```bash
curl -X GET http://localhost:3000/api/debug/email
```
**Response shows:**
- ✅ Plunk API key status
- ✅ User record found
- ✅ User email address
- ✅ App URL configured

### 2. **Send Test Email**
```bash
curl -X POST http://localhost:3000/api/debug/email
```
**Response shows:**
- Email sent confirmation
- Plunk message ID
- Any errors

### 3. **Generate Video and Check Email**
1. Go to dashboard → Create Series
2. Complete all setup steps
3. Click "Generate Video"
4. Wait for video generation to complete
5. Check inbox for completion email
6. Verify email contains:
   - ✅ User's name
   - ✅ Video title
   - ✅ Thumbnail image
   - ✅ "View in Dashboard" button (links to http://localhost:3000/dashboard/videos)
   - ✅ "Download Video" button (direct MP4 link)

### 4. **Check Email Status in Database**
After generation completes:
```sql
SELECT id, title, email_sent, email_sent_at, email_error 
FROM videos 
WHERE id = <latest_video_id>;
```

---

## 🔍 Debugging with Logs

**Check Inngest Dashboard:**
1. Go to http://localhost:8410 (Inngest dev UI)
2. Find your video generation run
3. Click "STEP 8: send-email-notification"
4. Look for logs like:
   ```
   [step-8] Starting email notification for user <id>
   [step-8] User found: email@domain.com (User Name)
   [step-8] Email content prepared: {...}
   [step-8] Sending email (attempt 1/3)...
   [step-8] Plunk response (attempt 1): {...}
   [step-8] ✅ Email sent successfully to email@domain.com
   ```

**Check Server Logs:**
In terminal running `npm run dev`:
```
[step-8] Starting email notification for user src1123577
[step-8] User found: user@gmail.com (John Doe)
[step-8] Email content prepared: {...}
[step-8] Sending email (attempt 1/3)...
[step-8] Plunk response (attempt 1): {"success":true,"id":"msg_123"}
[step-8] ✅ Email sent successfully to user@gmail.com
```

---

## 📋 Pre-Testing Checklist

- [ ] `PLUNK_API_KEY` is set to **secret key** (starts with `sk_`)
- [ ] `NEXT_PUBLIC_APP_URL=http://localhost:3000` in `.env.local`
- [ ] Clerk webhook configured to sync users to Supabase
- [ ] User has email address in Clerk profile
- [ ] Database tables have `email_sent`, `email_sent_at`, `email_error` columns
- [ ] Run `/api/debug/email` GET to verify config
- [ ] Run `/api/debug/email` POST to send test email
- [ ] Restart dev server after `.env.local` changes

---

## 🚀 Production Considerations

1. **Email Rate Limits:** Monitor Plunk quotas; add graceful handling
2. **Email Templates:** Consider using Plunk's template features
3. **Unsubscribe Links:** Consider adding unsubscribe support
4. **Email Analytics:** Track open/click rates via Plunk dashboard
5. **Domain Branding:** Use branded sender address instead of default
6. **Error Alerts:** Log email failures to monitoring service (Sentry, etc.)
7. **Retry Strategy:** Current 3 retries with backoff is good for transients
8. **Database Indexes:** `email_sent` and `email_sent_at` columns are indexed for queries

---

## 🎯 Expected Email Content

**Subject:** `Video Ready: Your New Video`

**HTML Body includes:**
- 🎉 Success emoji and greeting
- 👤 Personalized name ("Hi John,")
- 🎬 Video title
- 🖼️ First scene thumbnail (or gradient)
- 🔗 "View in Dashboard" button (blue)
- 📥 "Download Video" button (dark)
- ℹ️ Series name and timestamp
- 📧 Footer with unsubscribe-like text

---

## ✨ Summary

**Email System Status:**
- ✅ Validates Plunk API key (must be secret `sk_`, not public `pk_`)
- ✅ Verifies user exists and has email
- ✅ HTML escapes user inputs to prevent XSS
- ✅ Validates email format with regex
- ✅ Retries 3 times on transient failures (rate limit, timeout, etc.)
- ✅ Non-blocking: Video completes even if email fails
- ✅ Tracks success/failure in database
- ✅ Comprehensive logging for debugging
- ✅ Professional email template with personalization

**Ready for testing!** 🚀
