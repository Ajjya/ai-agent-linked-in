import axios, { AxiosInstance } from 'axios';
import config from '../config';
import databaseService from './database';

interface LinkedInProfile {
  id: string;
  localizedFirstName: string;
  localizedLastName: string;
  profilePicture?: {
    'displayImage~': {
      elements: Array<{
        identifiers: Array<{
          identifier: string;
        }>;
      }>;
    };
  };
}

interface LinkedInPostResponse {
  id: string;
  activity: string;
}

interface LinkedInShareContent {
  author: string;
  lifecycleState: 'PUBLISHED';
  specificContent: {
    'com.linkedin.ugc.ShareContent': {
      shareCommentary: {
        text: string;
      };
      shareMediaCategory: 'NONE' | 'IMAGE' | 'VIDEO' | 'ARTICLE';
      media?: Array<{
        status: 'READY';
        description: {
          text: string;
        };
        media: string; // URN of uploaded media
        title: {
          text: string;
        };
      }>;
    };
  };
  visibility: {
    'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' | 'CONNECTIONS';
  };
}

class LinkedInService {
  private api: AxiosInstance;
  private accessToken: string;

  constructor() {
    this.accessToken = config.linkedin.accessToken;
    this.api = axios.create({
      baseURL: 'https://api.linkedin.com/v2',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
    });
  }

  async validateConnection(): Promise<boolean> {
    try {
      if (!this.accessToken || this.accessToken.trim() === '') {
        console.log('⚠️ LinkedIn access token not provided or empty');
        return false;
      }

      const profile = await this.getProfile();
      console.log(`✅ LinkedIn connection validated for: ${profile.localizedFirstName} ${profile.localizedLastName}`);
      return true;
    } catch (error) {
      console.error('❌ LinkedIn connection validation failed:', error);
      return false;
    }
  }

  async getProfile(): Promise<LinkedInProfile> {
    if (!this.accessToken || this.accessToken.trim() === '') {
      throw new Error('LinkedIn access token is required');
    }

    try {
      const response = await this.api.get('/people/~:(id,localizedFirstName,localizedLastName,profilePicture(displayImage~:playableStreams))');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching LinkedIn profile:', error);
      throw new Error('Failed to fetch LinkedIn profile');
    }
  }

  async createPost(postData: {
    id: string;
    title: string;
    content: string;
    imageUrl?: string;
  }): Promise<string | null> {
    try {
      console.log(`📤 Publishing LinkedIn post: ${postData.title}`);

      const profile = await this.getProfile();
      const authorUrn = `urn:li:person:${profile.id}`;

      let shareContent: LinkedInShareContent = {
        author: authorUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: postData.content,
            },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      };

      // Add image if provided
      if (postData.imageUrl && config.posting.includeImages) {
        try {
          const mediaUrn = await this.uploadImage(postData.imageUrl, authorUrn);
          if (mediaUrn) {
            shareContent.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'IMAGE';
            shareContent.specificContent['com.linkedin.ugc.ShareContent'].media = [
              {
                status: 'READY',
                description: {
                  text: postData.title,
                },
                media: mediaUrn,
                title: {
                  text: postData.title,
                },
              },
            ];
          }
        } catch (imageError) {
          console.warn('⚠️ Failed to upload image, posting without it:', imageError);
        }
      }

      const response = await this.api.post('/ugcPosts', shareContent);
      const linkedinPostId = response.data.id;

      console.log(`✅ LinkedIn post published successfully: ${linkedinPostId}`);

      // Update post in database
      await databaseService.updatePostStatus(
        postData.id,
        'published',
        linkedinPostId,
        new Date()
      );

      // Log success
      await databaseService.createPublishLog({
        postId: postData.id,
        status: 'success',
        message: `Successfully published to LinkedIn: ${linkedinPostId}`,
      });

      return linkedinPostId;
    } catch (error: any) {
      console.error('❌ Error publishing LinkedIn post:', error);

      // Update post status to failed
      await databaseService.updatePostStatus(postData.id, 'failed');

      // Log error
      await databaseService.createPublishLog({
        postId: postData.id,
        status: 'error',
        message: 'Failed to publish to LinkedIn',
        error: error.response?.data ? JSON.stringify(error.response.data) : error.message,
      });

      throw error;
    }
  }

  private async uploadImage(imageUrl: string, authorUrn: string): Promise<string | null> {
    try {
      console.log('📷 Uploading image to LinkedIn...');

      // Step 1: Register upload
      const registerUploadResponse = await this.api.post('/assets?action=registerUpload', {
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          owner: authorUrn,
          serviceRelationships: [
            {
              relationshipType: 'OWNER',
              identifier: 'urn:li:userGeneratedContent',
            },
          ],
        },
      });

      const uploadUrl = registerUploadResponse.data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
      const asset = registerUploadResponse.data.value.asset;

      // Step 2: Download image from URL
      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const imageBuffer = Buffer.from(imageResponse.data);

      // Step 3: Upload image
      await axios.post(uploadUrl, imageBuffer, {
        headers: {
          'Content-Type': 'application/octet-stream',
        },
      });

      console.log('✅ Image uploaded successfully');
      return asset;
    } catch (error) {
      console.error('❌ Error uploading image:', error);
      return null;
    }
  }

  async getPostAnalytics(postId: string): Promise<any> {
    try {
      // Note: LinkedIn Analytics API requires additional permissions
      // This is a placeholder for future analytics implementation
      console.log(`📊 Getting analytics for post: ${postId}`);
      return null;
    } catch (error) {
      console.error('❌ Error fetching post analytics:', error);
      return null;
    }
  }

  // OAuth helper methods for initial setup
  getAuthorizationUrl(): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.linkedin.clientId,
      redirect_uri: config.linkedin.redirectUri,
      scope: 'r_liteprofile,r_emailaddress,w_member_social',
      state: 'linkedin_oauth_' + Date.now(),
    });

    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<{
    access_token: string;
    expires_in: number;
  }> {
    try {
      const response = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', {
        grant_type: 'authorization_code',
        code,
        client_id: config.linkedin.clientId,
        client_secret: config.linkedin.clientSecret,
        redirect_uri: config.linkedin.redirectUri,
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      return response.data;
    } catch (error) {
      console.error('❌ Error exchanging code for token:', error);
      throw error;
    }
  }

  // Test method to validate API setup
  async testConnection(): Promise<{
    success: boolean;
    profile?: LinkedInProfile;
    error?: string;
  }> {
    try {
      const profile = await this.getProfile();
      return {
        success: true,
        profile,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default new LinkedInService();