# Architecture - AI Content Generation Flow

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     LinkedIn MongoDB Content Agent v2.0                 │
│                    with AI-Powered Content Generation                   │
└─────────────────────────────────────────────────────────────────────────┘

                              CONTENT FLOW

    ┌──────────────┐
    │ MongoDB RSS  │
    │    Feed      │
    └──────┬───────┘
           │
           ▼
    ┌──────────────────┐
    │   RSS Parser     │ ◀── Fetches every 6 hours
    │   (rss.ts)       │     Uses fallback URLs
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────────────────────┐
    │  Extract Content Metadata        │
    │  - Title                         │
    │  - Description                   │
    │  - Category (announcement,etc)   │
    │  - Image URL                     │
    └──────┬───────────────────────────┘
           │
           ▼
    ┌──────────────────────────────────┐
    │   AI CONTENT GENERATION          │
    │   (aiContent.ts)                 │
    │                                  │
    │  ✓ If OPENAI_API_KEY configured │
    │    - Send to ChatGPT             │
    │    - Generate bold title         │
    │    - Create engaging content     │
    │    - Add emojis & CTA            │
    │    - Remove ellipsis             │
    │                                  │
    │  ✓ If no OpenAI key              │
    │    - Fallback to templates       │
    │    - Ensure posts created        │
    └──────┬───────────────────────────┘
           │
           ▼
    ┌──────────────────────────────────┐
    │   Format for LinkedIn            │
    │                                  │
    │  - Ensure < 3000 chars           │
    │  - Add source link               │
    │  - Include relevant hashtags     │
    │  - Attach image if available     │
    └──────┬───────────────────────────┘
           │
           ▼
    ┌──────────────────────────────────┐
    │   Store in Database              │
    │   (Prisma + SQLite)              │
    │                                  │
    │  Save:                           │
    │  - Title (AI-generated)          │
    │  - Content (AI-generated)        │
    │  - Scheduled date/time           │
    │  - Status (draft/scheduled)      │
    └──────┬───────────────────────────┘
           │
           ▼
    ┌──────────────────────────────────┐
    │   Scheduler                      │
    │   (scheduler.ts)                 │
    │                                  │
    │   Runs on schedule:              │
    │   - Tuesday 10:30 AM             │
    │   - Friday 10:30 AM              │
    │   (configurable)                 │
    └──────┬───────────────────────────┘
           │
           ▼
    ┌──────────────────────────────────┐
    │   LinkedIn API Publisher         │
    │   (linkedin.ts)                  │
    │                                  │
    │   - Load stored token            │
    │   - Create UGC post              │
    │   - Publish with author URN      │
    │   - Return LinkedIn post ID      │
    └──────┬───────────────────────────┘
           │
           ▼
    ┌──────────────────────────────────┐
    │   LinkedIn Profile               │
    │                                  │
    │   ✨ Bold Title                  │
    │   ✨ Engaging Content            │
    │   ✨ Emojis & Formatting         │
    │   ✨ Hashtags                    │
    │   ✨ Source Link                 │
    └──────────────────────────────────┘
```

## AI Content Generation Details

### Input
```typescript
{
  title: "MongoDB Introduces Vector Search",
  description: "Long RSS description about vector search...",
  link: "https://mongodb.com/blog/post",
  category: "announcement"
}
```

### ChatGPT System Prompt
```
You are a professional LinkedIn content creator specializing in MongoDB.
Create engaging posts with:
- **Bold titles** using markdown
- Compelling 3-5 sentence descriptions
- Relevant emojis
- Call-to-action or thought-provoking question
- Professional yet friendly tone
- NO ellipsis (...) or generic phrases
- Ready to post on LinkedIn
```

### Output
```
**Transform Your Search with MongoDB Vector Search**

Tired of keyword-based limitations? MongoDB's vector search enables semantic understanding of your data. Whether building AI applications or recommendation systems, this feature opens new possibilities.

What search experiences are you building? 🚀

#MongoDB #VectorSearch #AI #Innovation
```

## Fallback Architecture

```
AI Content Generation Request
        │
        ├─→ Is OPENAI_API_KEY configured?
        │
        ├─ YES ──→ Try ChatGPT API
        │          │
        │          ├─→ Success? ──→ Return AI content ✅
        │          │
        │          └─→ Failed? ──→ Log warning
        │
        └─ NO ───→ Skip AI
        
        │
        ▼
    Use Template-Based Generation
        │
        ├─ Extract key points
        ├─ Generate hashtags
        ├─ Format with emojis
        └─ Return template content ✅
        
Result: Posts ALWAYS created, AI is optional enhancement
```

## Service Interaction

```
App Start
  │
  ├─→ Load config (including OPENAI_API_KEY)
  │
  ├─→ Initialize Database
  │   └─→ Load tokens, posts
  │
  ├─→ Initialize Scheduler
  │   └─→ Set up cron jobs
  │
  ├─→ Initialize AI Service
  │   └─→ Connect to OpenAI (if key available)
  │
  ├─→ Initialize RSS Service
  │   └─→ Ready to fetch & process
  │
  └─→ Ready! 🚀
```

## Data Flow - Creating a Post

```
RSS Article from MongoDB Blog
        ↓
Parse with rss-parser
        ↓
Extract: title, description, link, category, image
        ↓
Call aiContentService.generateLinkedInContent()
        ↓
        ├─ AI Available?
        │  ├─ YES: Call OpenAI ChatGPT API
        │  │        ├─ Generate bold title
        │  │        ├─ Generate engaging content
        │  │        └─ Return formatted post
        │  │
        │  └─ NO: Use template-based generation
        │
Save to Database (with created timestamp)
        ↓
Calculate next posting date
        ↓
Set status to "scheduled"
        ↓
Wait for scheduler
        ↓
When scheduled time reached:
  ├─ Load LinkedIn token
  ├─ Create UGC post via LinkedIn API
  ├─ Record post ID
  └─ Mark as "published"
        ↓
Publish to LinkedIn! ✨
```

## Environment Configuration

```env
# AI Settings
OPENAI_API_KEY=sk-...                 # From platform.openai.com
OPENAI_MODEL=gpt-3.5-turbo           # Recommended model

# LinkedIn Settings (existing)
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
LINKEDIN_REDIRECT_URI=...

# Schedule Settings (existing)
POSTING_DAYS=2,5                      # Tuesday, Friday
POSTING_TIME=10:30                    # 10:30 AM
TIMEZONE=Europe/Lisbon

# Other Settings (existing)
DATABASE_URL=file:./dev.db
NODE_ENV=production
```

## Cost & Performance

### OpenAI API Costs
```
gpt-3.5-turbo: ~$0.0005 per 1000 input tokens
              ~$0.0015 per 1000 output tokens
              
Per post: ~$0.0015 (estimated)
2 posts/week: ~$0.012/month 💰
```

### Performance
```
RSS Fetch:           ~2-5 seconds
AI Content Gen:      ~3-8 seconds
LinkedIn Publish:    ~1-2 seconds
─────────────────────────────
Total per post:      ~6-15 seconds ⚡
```

## Error Handling

```
AI Generation Fails
  │
  ├─ Rate Limited?
  │  └─ Fall back to templates
  │
  ├─ Invalid API Key?
  │  └─ Log error, fall back
  │
  ├─ Network Error?
  │  └─ Retry in next cycle
  │
  └─ Other Error?
     └─ Log & continue

Result: System remains stable ✅
```

## Monitoring & Logging

```
All operations logged:

✅ AI content generated successfully
⚠️ AI generation failed, falling back to template
❌ OpenAI API error: ...
🔐 LinkedIn token validated
📊 Post published: urn:li:share:...
📈 Activity tracked in database

Accessible via:
- Application console
- /tmp/server.log
- Dashboard activity log
```

---

**Architecture enables AI-enhanced content while maintaining reliability and fallback support.** ✨
