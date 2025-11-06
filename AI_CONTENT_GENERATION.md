# AI-Powered Content Generation

This document explains how the LinkedIn agent uses OpenAI's ChatGPT API to generate attractive, engaging LinkedIn posts.

## Overview

Instead of publishing raw RSS feed content with generic templates, the system now:

1. **Fetches MongoDB RSS feed content**
2. **Sends it to ChatGPT for enhancement**
3. **Generates attractive, engaging posts with:**
   - **Bold titles** (using markdown formatting)
   - **Compelling descriptions** (without ellipsis)
   - **Relevant emojis** (for visual appeal)
   - **Call-to-action** or thought-provoking questions
   - **Professional yet conversational tone**

## Setup

### 1. Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign up or log in
3. Create a new API key
4. Copy the key

### 2. Configure Environment Variables

Add to your `.env` file:

```env
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-3.5-turbo
```

**Available Models:**
- `gpt-3.5-turbo` - Fast and cost-effective (recommended)
- `gpt-4` - More creative but slower and expensive
- `gpt-4-turbo` - Balanced performance and quality

### 3. Restart Application

```bash
npm run dev
# or
npm start
```

## How It Works

### Content Generation Flow

```
RSS Feed Article
       ↓
   Extract: Title, Description, Category
       ↓
   Send to ChatGPT with System Prompt
       ↓
ChatGPT Response: Title + Content
       ↓
Format for LinkedIn (max 3000 chars)
       ↓
Save to Database
       ↓
Schedule for Publishing
```

### AI System Prompt

The agent instructs ChatGPT to:

1. **Create Professional Content** - Suitable for LinkedIn's professional audience
2. **Use Bold Titles** - Format titles as `**Bold Title**` for markdown
3. **Avoid Ellipsis** - Remove `...` to create complete thoughts
4. **Add Value** - Focus on insights and actionable information
5. **Use Emojis** - Make content visually appealing
6. **Include Call-to-Action** - End with question or engagement hook
7. **Keep it Concise** - Under 1500 characters for readability

### Example Output

**Before (Template-based):**
```
🍃 MongoDB Atlas Vector Search: Advanced Similarity Search...

Learn about MongoDB's new vector search capabilities for semantic search...

🔗 Read article: https://example.com
#MongoDB #Database #NoSQL
```

**After (AI-generated):**
```
🎯 **Transform Your Search with MongoDB Vector Search: The Future of Semantic Intelligence**

Tired of keyword-based search limitations? MongoDB Atlas now offers advanced vector search capabilities that enable true semantic understanding of your data. Whether you're building recommendation systems, content discovery platforms, or AI-powered applications, this game-changing feature opens entirely new possibilities for your users.

💡 Key insight: Vector search enables your application to understand meaning, not just keywords—making search smarter and more intuitive.

🔗 Discover how to implement vector search: https://example.com

What use cases are you excited to build with semantic search? Share your thoughts! 🚀

#MongoDB #VectorSearch #SemanticSearch #AI #Database #Innovation
```

## Fallback Behavior

If ChatGPT API is not configured or fails:

1. **First time:** System logs warning about missing `OPENAI_API_KEY`
2. **Content generation:** Falls back to template-based system
3. **Continue publishing:** Without disruption - posts still get published

This ensures reliability - your RSS content will always be published, with or without AI enhancement.

## Cost Estimation

Using `gpt-3.5-turbo` API:

| Task | Tokens | Cost |
|------|--------|------|
| Generate 1 post | ~300-500 | $0.0015 |
| Generate 10 posts | 3000-5000 | $0.015 |
| Generate 50 posts | 15000-25000 | $0.075 |

**Monthly estimate (2 posts/week):** ~$0.12 - $0.20

## Monitoring

Check logs for AI content generation:

```bash
# View live logs
tail -f /tmp/server.log | grep "🤖\|AI"

# Or filter in web dashboard
# Logs show success/failure of each generation attempt
```

### Log Examples

**Successful generation:**
```
🤖 Generating AI content for: MongoDB Atlas Vector Search
✅ AI content generated successfully
```

**Fallback to template:**
```
⚠️ AI content generation failed, falling back to template: Rate limit exceeded
📝 Generating content from template (AI not configured)
```

## Customization

### Modify System Prompt

Edit `src/services/aiContent.ts`:

```typescript
role: 'system',
content: `You are a professional LinkedIn content creator...`
```

### Adjust Temperature

Lower = more consistent, Higher = more creative

```typescript
temperature: 0.7, // Change between 0.0 and 1.0
```

### Change Character Limit

```typescript
max_tokens: 1000, // Increase or decrease
```

## Troubleshooting

### "OpenAI API key not configured"

**Solution:** Add `OPENAI_API_KEY` to `.env` file and restart

### "Rate limit exceeded"

**Solution:** Wait a few minutes and try again, or upgrade your OpenAI plan

### "Invalid API key"

**Solution:** 
1. Generate new key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Update `.env` file
3. Restart application

### "Empty response from OpenAI"

**Solution:** 
1. Check API key is valid
2. Try different model: `gpt-4-turbo` or `gpt-4`
3. Check OpenAI service status

## Best Practices

1. **Use `gpt-3.5-turbo`** for cost efficiency
2. **Monitor usage** on OpenAI dashboard
3. **Test with single post** before running automation
4. **Keep fallback templates updated** for reliability
5. **Review AI outputs** regularly for quality assurance

## Future Enhancements

- [ ] Caching frequently requested topics
- [ ] A/B testing different tones
- [ ] Category-specific prompts
- [ ] Brand voice customization
- [ ] LinkedIn analytics integration
