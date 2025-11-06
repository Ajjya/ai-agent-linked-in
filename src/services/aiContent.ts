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
Always make titles bold using **markdown** format.
Avoid ellipsis (...) and generic phrases.
Focus on value, insights, and actionable information.
Keep the tone professional but friendly.
Include relevant emojis to make content more visually appealing.
The final content should be ready to post on LinkedIn.`,
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
1. Create a compelling, bold title (use **markdown** for bold)
2. Write engaging body content (3-5 sentences max) that highlights key insights
3. Make it professional yet conversational
4. Remove any ellipsis (...) or generic phrases
5. Add relevant emojis to make it visually appealing
6. Include a call-to-action or thought-provoking question
7. Format as a complete LinkedIn post ready to publish
8. Keep it under 1500 characters

Format your response as:
---TITLE---
**Your Bold Title Here**
---CONTENT---
Your engaging post content here with emojis and formatting`;
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
    // Remove trailing dots or ellipsis
    content = content.replace(/\.{3}$/, '').replace(/\.$/, '');

    // Add source link at the end if not already present
    if (!content.includes('http')) {
      content = `${content}\n\n🔗 Read more: ${link}`;
    }

    // Ensure content doesn't exceed LinkedIn's character limit
    const maxLength = config.posting.maxPostLength;
    if (content.length > maxLength) {
      content = content.substring(0, maxLength - 10).trim() + '...';
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
