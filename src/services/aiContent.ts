import OpenAI from 'openai';
import config from '../config';

interface ContentGenerationParams {
  title: string;
  description: string;
  link: string;
  category: string;
}

interface GeneratedContent {
  title: string;
  content: string;
}

class AIContentService {
  private client: OpenAI;
  private model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ OPENAI_API_KEY not found in environment variables. AI content generation will be disabled.');
    }

    this.client = new OpenAI({
      apiKey: apiKey || '',
    });

    this.model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
  }

  async generateLinkedInContent(params: ContentGenerationParams): Promise<GeneratedContent> {
    const { title, description, link, category } = params;

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY in environment variables.');
    }

    console.log(`🤖 Generating AI content for: ${title}`);

    const prompt = this.createPrompt(title, description, category);

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are a professional LinkedIn content creator specializing in MongoDB and database technology. 
Create engaging, attractive, and NATURAL-SOUNDING LinkedIn posts that feel human-written.

CRITICAL: VARY YOUR STYLE - posts should look different from each other!

FORMATTING OPTIONS (mix and match):
- All content MUST be written in ENGLISH language only
- Sometimes use emojis (2-4 per post), sometimes skip them
- Sometimes use bullet points (• or -), sometimes write in paragraphs
- Sometimes use numbered lists, sometimes flowing text
- Sometimes add line breaks, sometimes keep it compact
- Always make titles bold using **markdown** format
- Keep posts CONCISE - 300-500 characters (aim for ~400 chars)

STYLE VARIETY (important!):
- Post 1: Might be emoji-heavy with bullet points
- Post 2: Might be a clean paragraph with no emojis
- Post 3: Might have numbered steps
- Post 4: Might use question format with minimal emojis
- Post 5: Might be storytelling style
Make each post feel UNIQUE and human-written!

CONTENT GUIDELINES:
- Professional yet conversational tone
- Focus on value and actionable insights
- Avoid repetitive patterns between posts
- NO ellipsis (...)
- Include engaging hooks and calls-to-action when appropriate
- Make it authentic and relatable

The final content should be ready to post on LinkedIn immediately.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.8,
        max_tokens: 500,
      });

      const generatedText = response.choices[0]?.message?.content || '';

      if (!generatedText) {
        throw new Error('Empty response from OpenAI');
      }

      // Parse the response to extract title and content
      const { title: aiTitle, content: aiContent } = this.parseAIResponse(generatedText, title);

      console.log(`✅ AI content generated successfully`);

      return {
        title: aiTitle,
        content: this.formatContentForLinkedIn(aiContent, link),
      };
    } catch (error: any) {
      console.error('❌ Error generating AI content:', error.message);
      throw error;
    }
  }

  private createPrompt(title: string, description: string, category: string): string {
    return `Create an engaging LinkedIn post based on the following information:

Title: ${title}
Category: ${category}
Description: ${description}

CORE REQUIREMENTS:
1. WRITE EVERYTHING IN ENGLISH LANGUAGE - mandatory
2. Create a compelling, bold title (use **markdown** for bold)
3. Content length: 300-500 characters (aim for ~400 characters)
4. Make it feel HUMAN and NATURAL - avoid robotic patterns
5. NO ellipsis (...) - complete all sentences
6. Professional yet conversational tone

STYLE VARIETY (IMPORTANT - choose ONE approach per post):

Option A - List Format:
🚀 Opening line
• Point 1
• Point 2
• Point 3
Closing thought or question

Option B - Paragraph Style:
Clean flowing text with occasional line breaks. Focus on storytelling or insights. Maybe 1-2 emojis if it feels natural.

Option C - Question-Based:
Start with a compelling question. Provide context. End with call-to-action. Light emoji use.

Option D - Numbered Steps:
Clear intro
1. First step/benefit
2. Second step/benefit
3. Third step/benefit
Summary or question

Option E - Hybrid:
Mix paragraphs with occasional bullets where it makes sense naturally.

EMOJI USAGE (vary this):
- Some posts: 3-4 emojis for emphasis
- Some posts: 1-2 emojis or none
- Some posts: Emojis as section markers
Never force emojis - only use when they add value

CONTENT LENGTH TARGET:
- Minimum: 300 characters
- Target: 400 characters
- Maximum: 500 characters
Make sure posts are substantial but not too long!

MAKE IT AUTHENTIC:
- Don't use the same structure twice in a row
- Vary sentence length and rhythm
- Sometimes formal, sometimes casual
- Be creative and human!

Format your response as:
---TITLE---
**Your Bold Title Here in English**
---CONTENT---
[Your creative, varied content (300-500 chars) - could be lists, paragraphs, questions, or mix]`;
  }

  private parseAIResponse(response: string, fallbackTitle: string): { title: string; content: string } {
    const titleMatch = response.match(/---TITLE---\s*([\s\S]*?)\s*---CONTENT---/);
    const contentMatch = response.match(/---CONTENT---\s*([\s\S]*?)$/);

    let title = fallbackTitle;
    let content = response;

    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].trim().replace(/\*\*/g, '');
    }

    if (contentMatch && contentMatch[1]) {
      content = contentMatch[1].trim();
    }

    return { title, content };
  }

  private formatContentForLinkedIn(content: string, link: string): string {
    // Remove trailing ellipsis but keep the content complete
    content = content.replace(/\.{3}$/, '').trim();

    // Add source link at the end if not already present
    if (!content.includes('http') && link) {
      content = `${content}\n\n🔗 Read more: ${link}`;
    }

    // Ensure content doesn't exceed LinkedIn's character limit
    const maxLength = config.posting.maxPostLength;
    if (content.length > maxLength) {
      // Trim at word boundary without adding ellipsis
      let trimmed = content.substring(0, maxLength).trim();
      
      // Find last complete sentence
      const lastPeriod = trimmed.lastIndexOf('.');
      const lastNewline = trimmed.lastIndexOf('\n');
      const cutPoint = Math.max(lastPeriod, lastNewline);
      
      if (cutPoint > maxLength - 500) {
        trimmed = trimmed.substring(0, cutPoint + 1);
      }
      
      content = trimmed.trim();
    }

    return content;
  }

  async isConfigured(): Promise<boolean> {
    return !!process.env.OPENAI_API_KEY;
  }
}

// Export singleton instance
const aiContentService = new AIContentService();

export default aiContentService;
