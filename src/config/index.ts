import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface AppConfig {
  // App settings
  nodeEnv: string;
  port: number;
  appName: string;

  // LinkedIn API
  linkedin: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    accessToken: string;
    profileId: string;
    companyId: string;
  };

  // Posting schedule
  posting: {
    days: number[]; // 0=Sunday, 1=Monday, etc.
    time: string; // HH:mm format
    timezone: string;
    maxPostLength: number;
    includeImages: boolean;
    language: string;
  };

  // Content sources
  content: {
    mongodbRssUrl: string;
    fallbackRssUrls: string[];
  };

  // Database
  database: {
    url: string;
  };

  // Web panel
  webPanel: {
    enabled: boolean;
    port: number;
  };

  // Logging
  logging: {
    level: string;
  };
}

// Parse posting days from comma-separated string to array of numbers
const parsePostingDays = (daysStr: string): number[] => {
  return daysStr.split(',').map(day => parseInt(day.trim(), 10)).filter(day => day >= 0 && day <= 6);
};

const config: AppConfig = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  appName: process.env.APP_NAME || 'LinkedIn MongoDB Agent',

  linkedin: {
    clientId: process.env.LINKEDIN_CLIENT_ID || '',
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
    redirectUri: process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3000/auth/linkedin/callback',
    accessToken: process.env.LINKEDIN_ACCESS_TOKEN || '',
    profileId: process.env.LINKEDIN_PROFILE_ID || '',
    companyId: process.env.LINKEDIN_COMPANY_ID || 'mongodbinc',
  },

  posting: {
    days: parsePostingDays(process.env.POSTING_DAYS || '2,5'), // Tuesday, Friday
    time: process.env.POSTING_TIME || '10:30',
    timezone: process.env.TIMEZONE || 'Europe/Lisbon',
    maxPostLength: parseInt(process.env.MAX_POST_LENGTH || '3000', 10),
    includeImages: process.env.INCLUDE_IMAGES === 'true',
    language: process.env.POST_LANGUAGE || 'en',
  },

  content: {
    mongodbRssUrl: process.env.MONGODB_RSS_URL || 'https://www.mongodb.com/company/blog/rss',
    fallbackRssUrls: [
      'https://www.mongodb.com/company/blog/rss',
      'https://feeds.feedburner.com/MongoDBBlog',
    ],
  },

  database: {
    url: process.env.DATABASE_URL || 'file:./dev.db',
  },

  webPanel: {
    enabled: process.env.ENABLE_WEB_PANEL === 'true',
    port: parseInt(process.env.WEB_PANEL_PORT || '3000', 10),
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

// Validation
const validateConfig = (): void => {
  const errors: string[] = [];

  if (!config.linkedin.clientId && config.nodeEnv === 'production') {
    errors.push('LINKEDIN_CLIENT_ID is required in production');
  }

  if (!config.linkedin.clientSecret && config.nodeEnv === 'production') {
    errors.push('LINKEDIN_CLIENT_SECRET is required in production');
  }

  if (config.posting.days.length === 0) {
    errors.push('At least one posting day must be specified');
  }

  if (!/^\d{2}:\d{2}$/.test(config.posting.time)) {
    errors.push('POSTING_TIME must be in HH:mm format');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.join('\n')}`);
  }
};

validateConfig();

export default config;