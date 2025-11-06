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
Create engaging, attractive LinkedIn posts that capture attention and drive engagement.
IMPORTANT: All content MUST be written in ENGLISH language only.
Always make titles bold using **markdown** format.
Avoid ellipsis (...) and generic phrases.
Focus on value, insights, and actionable information.
Keep the tone professional but friendly.
Include relevant emojis to make content more visually appealing.
The final content should be ready to post on LinkedIn.
Remember: Write everything in ENGLISH.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
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

Requirements:
1. WRITE EVERYTHING IN ENGLISH LANGUAGE - this is mandatory
2. Create a compelling, bold title (use **markdown** for bold)
3. Write extensive, engaging body content (maximum 800-1000 characters) with detailed insights and value
4. Make it professional yet conversational
5. Remove any ellipsis (...) or generic phrases - complete all sentences fully
6. Add relevant emojis to make it visually appealing
7. Include a strong call-to-action or thought-provoking question
8. Format as a complete LinkedIn post ready to publish
9. Maximize content length while keeping it high quality - aim for 900-1000 characters
10. No ellipsis or truncation at the end
11. Language: ENGLISH only

Format your response as:
---TITLE---
**Your Bold Title Here in English**
---CONTENT---
Your extensive and engaging post content here with emojis and formatting in English`;
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
