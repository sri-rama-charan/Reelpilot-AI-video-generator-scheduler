# Complete Error Handling Strategy for VidGen

## System-Wide Error Handling Overview

The video generation pipeline is split into **8 steps**, each with comprehensive error handling:

| Step | Name | Critical | Retry | Fail Behavior |
|------|------|----------|-------|---------------|
| 1 | Fetch Series | ✅ Yes | ❌ No | Throws immediately |
| 2 | Generate Script (Groq) | ✅ Yes | ✅ Yes (3x) | Throws on failure |
| 3 | Generate Voice (TTS) | ✅ Yes | ✅ Yes (3x) | Throws on failure |
| 4 | Generate Captions | ✅ Yes | ❌ No | Throws on failure |
| 5 | Generate Images (HF) | ✅ Yes | ✅ Yes (multi-token) | Throws on failure |
| 6 | Save to Database | ✅ Yes | ❌ No | Throws on failure |
| 7 | Render Video (Remotion) | ✅ Yes | ❌ No | Throws on failure |
| 8 | Send Email (Plunk) | ⚠️ No | ✅ Yes (3x) | **Non-blocking on failure** |

---

## Step-by-Step Error Handling

### STEP 1: Fetch Series ✅
**What it does:** Load series configuration from Supabase

**Error Cases:**
| Case | Error | Fix |
|------|-------|-----|
| Series not found | "Series {id} not found or access denied" | Check series ID is correct |
| User mismatch | "Series {id} not found or access denied" | Ensure user owns series |
| Database error | Supabase connection error | Check network, credentials |

**Failure Mode:** ❌ **CRITICAL** - Throws immediately, marks video as `failed`

---

### STEP 2: Generate Script (Groq LLM) ✅
**What it does:** Groq LLM generates multi-scene video script with voiceover

**Error Cases:**
| Case | Error | Handling |
|------|-------|----------|
| Invalid event data | "Invalid event data — seriesId/userId missing" | Check trigger from API |
| Groq API error | Network/timeout | **Retry 3 times** with 1s-3s backoff |
| Invalid JSON response | Groq returns non-JSON | Retry up to 3 attempts |
| Word count too low | Script too short for duration | Retry up to 3 attempts |
| Voiceover missing | Scene has empty voiceover | Error: "Scene N missing voiceover" |

**Failure Mode:** ❌ **CRITICAL** - After 3 retries, throws immediately

**Environment Variables Required:**
- `GROQ_API_KEY` - for Llama 3.3 70B model

---

### STEP 3: Generate Voice (TTS) ✅
**What it does:** Text-to-speech via Deepgram or FonadaLabs (per language)

**Error Cases:**
| Language | Provider | Error Case |
|----------|----------|-----------|
| English, Spanish, German, French, Dutch, Italian, Japanese | Deepgram | Rate limit, invalid voice, network error |
| Hindi, Marathi, Telugu, Tamil | FonadaLabs | Rate limit, empty buffer, timeout |
| Any | Any | API key missing |

**Retry Strategy:**
- Deepgram: **3 retries** (1s, 2s, 3s backoff)
- FonadaLabs: **3 retries** per chunk (text split into 450-char chunks)

**Error Validation:**
- ✅ Checks `DEEPGRAM_API_KEY` is set
- ✅ Checks `FONADA_API_KEY` is set  
- ✅ Validates text is not empty
- ✅ Validates audio buffer not empty after generation

**Failure Mode:** ❌ **CRITICAL** - After all retries fail, throws immediately

**Environment Variables Required:**
- `DEEPGRAM_API_KEY` - for non-Indian TTS
- `FONADA_API_KEY` - for Indian language TTS

---

### STEP 4: Generate Captions ✅
**What it does:** Deepgram transcription → word-level timestamps → SRT format

**Error Cases:**
| Case | Error | Handling |
|------|-------|----------|
| Deepgram API down | Network error | Throws immediately |
| Invalid language | Unsupported lang code | Falls back to `en` |
| Word-level timestamps missing | Deepgram returns no words | Handles gracefully with fallback |
| SRT formatting error | Invalid time format | Uses tested `toSrtTime()` helper |

**Failure Mode:** ❌ **CRITICAL** - No retry, throws immediately

**Environment Variables Required:**
- `DEEPGRAM_API_KEY` - for transcription + captions

---

### STEP 5: Generate Images (HuggingFace with Fallback) ✅ **NEW**
**What it does:** FLUX.1-schnell image generation, with automatic token fallback

**Error Cases:**
| Case | Error | Handling |
|------|-------|----------|
| No HF tokens configured | "No HF_TOKEN or HF_TOKEN_NEW" | Throws immediately |
| New token quota exhausted | 402 Insufficient credit | **Falls back to old token** |
| Old token quota exhausted | 402 Insufficient credit | Throws after both exhausted |
| Network timeout | ECONNREFUSED | No retry (HF API only retry within token) |
| Invalid model URL | 404 on HF endpoint | Throws immediately |
| Empty image buffer | Image is 0 bytes | Throws with clear error |

**Token Fallback Chain:**
1. Try `HF_TOKEN_NEW` (new account, full quota)
2. On quota error (402, "depleted"): Fall back to `HF_TOKEN` (old account)
3. If both fail: Throw error with message about both tokens exhausted

**Per-Scene Behavior:**
- ✅ Scene 1 tries NEW token
- ✅ If NEW exhausted → Scene 1 uses OLD token
- ✅ Scene 2 tries NEW token (may have auto-reset)
- ✅ If NEW still exhausted → uses OLD token

**Failure Mode:** ❌ **CRITICAL** - When both tokens exhausted, throws immediately

**Environment Variables Required:**
- `HF_TOKEN_NEW` - New HuggingFace account token (priority)
- `HF_TOKEN` - Old HuggingFace account token (fallback)

---

### STEP 6: Save to Database ✅
**What it does:** Store all generated assets (script, audio, captions, images) to Supabase

**Error Cases:**
| Case | Error |  Fix |
|------|-------|-----|
| Table not found | "Table 'videos' not found" | Run migrations in Supabase |
| Column missing | "Column 'email_sent' not found" | Run migration: add email tracking columns |
| Connection refused | "Cannot reach Supabase" | Check network, credentials |
| RLS policy blocked | "new row violates policy" | Check RLS configuration |

**Failure Mode:** ❌ **CRITICAL** - Throws immediately

**Database Requirements:**
- Videos table with columns: audio_urls, captions_srt, captions_scenes, images, etc.
- New columns (for email tracking): `email_sent`, `email_sent_at`, `email_error`

---

### STEP 7: Render Video (Remotion) ✅
**What it does:** Bundle React composition + render to MP4 with FFmpeg

**Error Cases:**
| Case | Error | Handling |
|------|-------|----------|
| Remotion bundling fails | Webpack/esbuild error | Throws immediately |
| Scene missing image URL | "imageUrl: ''" in sceneInputs | Throws in VideoComposition |
| FFmpeg not found | "FFmpeg binary not found" | Check Next.js serverExternalPackages |
| Disk space full | ENOSPC | Throws with OS error |
| Temp file cleanup fails | Cannot unlink output.mp4 | Logs warning, continues |
| Supabase upload fails | Storage bucket error | Throws with upload error |

**Error Validation:**
- ✅ Validates bundle location exists
- ✅ Validates output path writable
- ✅ Validates scene inputs have imageUrl, audioUrl
- ✅ Deletes temp file after upload (even on failure)
- ✅ Validates Supabase storage response

**Failure Mode:** ❌ **CRITICAL** - Throws immediately on any error

**Configuration Required:**
```typescript
// next.config.ts
serverExternalPackages: [
  "@remotion/bundler",
  "@remotion/renderer", 
  "@remotion/core",
  "@remotion/cli",
  "remotion",
]
```

---

### STEP 8: Send Email (Plunk) ⚠️ **NON-BLOCKING**
**What it does:** Send completion email via Plunk to user

**Error Cases & Handling:**

| Case | Error | Behavior | Retry |
|------|-------|----------|-------|
| PLUNK_API_KEY not set | "PLUNK_API_KEY not configured" | Return `success: false` | ❌ No |
| Public key used | "You attached a public key" | Return `success: false` | ❌ No |
| No user in database | "No user record found" | Return `success: false` | ❌ No |
| User has no email | "User has no email address" | Return `success: false` | ❌ No |
| Invalid email format | Regex fails | Return `success: false` | ❌ No |
| Rate limit (402) | "Rate limit exceeded" | Return `success: false` | ✅ Yes (3x) |
| Timeout/network | ECONNREFUSED | Return `success: false` | ✅ Yes (3x) |
| Unexpected response | Response format wrong | Return `success: false` | ✅ Yes (3x) |

**Retry Strategy (Transient Errors Only):**
- Detects transient errors: "rate", "timeout", "temporarily"
- Retries up to 3 times with exponential backoff: 1s → 2s → 3s
- Non-transient errors fail immediately without retry

**Database Updates:**
- ✅ On success: `email_sent = true`, `email_sent_at = <timestamp>`
- ⚠️ On failure: `email_sent = false`, `email_error = '<message>'`

**Failure Mode:** ⚠️ **NON-BLOCKING** - Video already complete, email failure doesn't affect video status

**Logging:**
- ✅ Logs at every decision point
- ✅ Logs Plunk API response (success/failure)
- ✅ Logs retry attempts
- ✅ Logs final result with emoji (✅ success, ⚠️ warning)

**Environment Variables Required:**
- `PLUNK_API_KEY` - **SECRET key** (starts with `sk_`, not `pk_`)
- `NEXT_PUBLIC_APP_URL` - For dashboard link (e.g., http://localhost:3000)

---

## Global Error Handling: onFailure

**Inngest Configuration:**
```typescript
onFailure: async ({ error, event }) => {
  // Extract video ID from nested event structure
  const failedVideoId = event.data.event.data.videoId;
  
  // Mark entire video generation as failed
  if (failedVideoId) {
    await supabaseAdmin
      .from("videos")
      .update({
        status: "failed",
        error_message: error.message.slice(0, 500),
      })
      .eq("id", failedVideoId);
  }
}
```

**Triggered When:**
- Any non-email step throws an exception
- Retries are exhausted
- Inngest function times out

**Database Updates:**
- `status` → "failed"
- `error_message` → Truncated error text
- `updated_at` → Current timestamp

---

## Error Recovery Strategies

### User-Facing Errors (Steps 1-7)

**User sees error in:**
1. Series detail page shows video in "failed" state
2. Inngest dashboard shows failed step with error message
3. Server logs show detailed error

**User can:**
1. Check error message in dashboard
2. Fix configuration (e.g., add HF token)
3. Retry generation from UI
4. Contact support with error details from dashboard

### Email-Only Errors (Step 8)

**User experience:**
- ✅ Video is complete and downloadable
- ⚠️ May not receive email notification
- ℹ️ Can check email status via API: `/api/debug/email` GET

**Admin/Developer can:**
1. Check database: `SELECT email_sent, email_error FROM videos WHERE id = X`
2. Inspect logs in Inngest dashboard
3. Manually trigger email resend (future feature)

---

## Monitoring & Observability

### Key Metrics to Track

```sql
-- Failed videos in last 24h
SELECT COUNT(*), error_message 
FROM videos 
WHERE status = 'failed' 
AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY error_message;

-- Email failures in last 24h  
SELECT COUNT(*), email_error
FROM videos
WHERE email_sent = false
AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY email_error;

-- Average generation time
SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_seconds
FROM videos
WHERE status = 'completed'
AND created_at > NOW() - INTERVAL '7 days';
```

### Inngest Dashboard

Visit http://localhost:8410 to see:
- ✅ Successful runs (8 steps completed)
- ⚠️ Failed runs (with step number and error)
- 📊 Run history and timing
- 🔍 Full logs per step

---

## Testing Error Scenarios

### Test 1: Missing Groq API Key
```bash
# Remove GROQ_API_KEY from .env.local
npm run dev
# Attempt video generation → Should fail at STEP 2
```

### Test 2: HuggingFace Token Quota (New Token Fallback)
```bash
# Set HF_TOKEN_NEW to invalid/expired token
# Set HF_TOKEN to valid token
# Generate video → Should fallback to HF_TOKEN at STEP 5
```

### Test 3: Plunk API Key Wrong Format
```bash
# Set PLUNK_API_KEY to public key (pk_...)
# Generate video → Should complete video, fail at STEP 8 non-blocking
# Check logs: should say "Using PUBLIC key"
```

### Test 4: User Not Synced to Database
```bash
# Sign in with new Clerk account
# Manually delete user from supabase users table
# Generate video → Should complete, fail email at STEP 8
# Check logs: "No user record found in database"
```

### Test 5: Network Timeout at Step 3 (TTS Retry)
```bash
# Unplug internet (or use request proxy to simulate timeout)
# Generate video → Should retry 3 times, then fail at STEP 3
# Check logs: "Attempt 1 failed", "Attempt 2 failed", "Attempt 3 failed"
```

---

## Error Handling Best Practices Implemented ✅

1. **Validation First** - Check inputs before making API calls
2. **Retry with Backoff** - Transient errors retry 3x with increasing delays
3. **No Retry on Permanent Errors** - Invalid config/credentials fail fast
4. **Graceful Degradation** - Email fails non-blocking, video still completes
5. **Comprehensive Logging** - Every decision point logged with context
6. **Database Tracking** - Error messages persisted for debugging
7. **User-Friendly Messages** - Errors explain what happened and how to fix
8. **Security** - HTML escaping prevents XSS in email templates
9. **Monitoring** - Email status tracked in database for analytics
10. **Documentation** - This guide explains all error cases and recovery

---

## Summary

| Component | Error Handling | Robustness |
|-----------|----------------|-----------|
| Video Generation | Fail-fast on critical steps, 3x retry on transients | 🟢 Strong |
| Email Notification | Non-blocking, 3x retry on transients | 🟢 Strong |
| User Sync | Automatic via webhook, manual fallback API | 🟢 Strong |
| Image Generation | Multi-token fallback (NEW → OLD) | 🟢 Strong |
| TTS Generation | Retry per provider, validates buffer | 🟢 Strong |
| Logging | Comprehensive at every step | 🟢 Excellent |

**Status: Ready for Testing** ✅
