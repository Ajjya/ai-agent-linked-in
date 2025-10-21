# 🍃 LinkedIn MongoDB Agent

Automated LinkedIn posting agent that publishes MongoDB-related content to your LinkedIn profile twice a week. This application fetches content from MongoDB's RSS feed, creates engaging LinkedIn posts, and publishes them on a configurable schedule.

![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)
![LinkedIn API](https://img.shields.io/badge/LinkedIn-API-0077B5.svg)
![MongoDB](https://img.shields.io/badge/MongoDB-Content-47A248.svg)

## ✨ Features

- **📡 Automatic RSS Parsing**: Fetches latest MongoDB blog posts and news
- **📝 Smart Content Generation**: Creates engaging LinkedIn posts with proper formatting
- **⏰ Scheduled Publishing**: Configurable posting schedule (default: Tuesday & Friday, 10:30 AM Portugal time)
- **🖼️ Image Support**: Automatically includes images from RSS feeds when available
- **📊 Web Dashboard**: Simple web interface for managing posts and viewing schedules
- **🔄 Manual Override**: Create and publish custom posts instantly
- **📈 Activity Logging**: Track publishing history and success rates
- **🐳 Docker Ready**: Easy deployment with Docker and Docker Compose
- **🚀 CI/CD Pipeline**: Automated testing and deployment with GitHub Actions

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   MongoDB RSS   │───▶│  RSS Parser      │───▶│  Content Store  │
│     Feed        │    │  Service         │    │   (SQLite)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                          │
┌─────────────────┐    ┌──────────────────┐              │
│  LinkedIn API   │◀───│   Scheduler      │◀─────────────┘
│    Publisher    │    │   Service        │
└─────────────────┘    └──────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │  Web Dashboard   │
                       │   (Express.js)   │
                       └──────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and Yarn
- LinkedIn Developer Account (see setup instructions below)
- Git

### 1. Clone and Install

```bash
git clone https://github.com/Ajjya/ai-agent-linked-in.git
cd ai-agent-linked-in
yarn install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your LinkedIn API credentials
```

### 3. Initialize Database

```bash
yarn db:generate
yarn db:push
```

### 4. Start Development Server

```bash
yarn dev
```

Visit `http://localhost:3000` to access the web dashboard.

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LINKEDIN_CLIENT_ID` | LinkedIn App Client ID | - |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn App Client Secret | - |
| `LINKEDIN_ACCESS_TOKEN` | LinkedIn OAuth Access Token | - |
| `POSTING_DAYS` | Posting days (0=Sun, 1=Mon, etc.) | `2,5` (Tue, Fri) |
| `POSTING_TIME` | Posting time (HH:mm) | `10:30` |
| `TIMEZONE` | Timezone for scheduling | `Europe/Lisbon` |
| `MONGODB_RSS_URL` | MongoDB RSS feed URL | `https://www.mongodb.com/blog/rss.xml` |

### Posting Schedule Customization

```bash
# Post on Monday, Wednesday, Friday at 9:00 AM
POSTING_DAYS=1,3,5
POSTING_TIME=09:00
TIMEZONE=America/New_York
```

## 📱 LinkedIn API Setup

### Step 1: Create LinkedIn Developer Account

1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/)
2. Sign in with your LinkedIn account
3. Click "Create App"

### Step 2: Configure Your App

- **App Name**: "MongoDB Content Agent" (or your preference)
- **LinkedIn Page**: Select your profile or company page
- **Privacy Policy**: Add a simple privacy policy URL
- **Logo**: Upload an app logo (optional)

### Step 3: Request API Products

1. Navigate to the "Products" tab
2. Request access to:
   - **Share on LinkedIn** (for posting content)
   - **Sign In with LinkedIn using OpenID Connect** (for authentication)

### Step 4: Get Your Credentials

1. Go to the "Auth" tab
2. Copy your **Client ID** and **Client Secret**
3. Add authorized redirect URL: `http://localhost:3000/auth/linkedin/callback`

### Step 5: Generate Access Token

Currently, you'll need to manually generate an access token through LinkedIn's OAuth flow. A future update will include a built-in OAuth handler.

## 🖥️ Web Dashboard

The application includes a simple web dashboard for managing posts:

- **📊 Dashboard**: Overview of posts, statistics, and system status
- **📝 Posts**: Manage all posts (create, edit, delete, publish)
- **📅 Schedule**: View upcoming posting schedule and scheduled posts
- **⚙️ Settings**: Configuration and LinkedIn setup instructions

### Dashboard Features

- Real-time system status
- Manual RSS fetch trigger
- Immediate post publishing
- LinkedIn connection testing
- Recent activity logs

## 🐳 Docker Deployment

### Local Docker Setup

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f
```

### Digital Ocean Deployment

1. **Create Digital Ocean Droplet**
   ```bash
   # Ubuntu 22.04 LTS recommended
   # Minimum 1GB RAM, 25GB SSD
   ```

2. **Install Docker and Docker Compose**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   sudo usermod -aG docker $USER
   ```

3. **Deploy Application**
   ```bash
   git clone https://github.com/Ajjya/ai-agent-linked-in.git
   cd ai-agent-linked-in
   cp .env.example .env.production
   # Edit .env.production with production values
   docker-compose -f docker-compose.yml up -d
   ```

## 🔄 CI/CD Pipeline

The project includes GitHub Actions for automated testing and deployment:

- **Automated Testing**: Linting, type checking, and builds on Node.js 18 & 20
- **Security Scanning**: Trivy vulnerability scanner
- **Docker Build**: Automatic Docker image builds and pushes
- **Deployment**: Optional automated deployment to Digital Ocean

### GitHub Secrets Required

- `DOCKER_USERNAME`: Docker Hub username
- `DOCKER_PASSWORD`: Docker Hub password
- `DO_HOST`: Digital Ocean droplet IP (optional)
- `DO_USERNAME`: Digital Ocean server username (optional)
- `DO_SSH_KEY`: Digital Ocean SSH private key (optional)

## 📊 Content Strategy

The agent automatically categorizes and formats MongoDB content:

### Content Types
- **📚 Tutorials**: Step-by-step guides and how-tos
- **📰 News**: Product announcements and updates  
- **💡 Tips**: Best practices and optimization advice
- **📋 Case Studies**: Real-world implementations and success stories

### Post Format
```
🍃 [MongoDB Article Title]

[Engaging summary of the article content...]

💡 Key insights for MongoDB developers and data architects.

🔗 Read more: [article-link]

#MongoDB #Database #NoSQL #DataManagement #TechTips
```

## 🛠️ Development

### Project Structure

```
ai-agent-linked-in/
├── src/
│   ├── config/          # Application configuration
│   ├── services/        # Business logic services
│   │   ├── database.ts  # Database operations
│   │   ├── linkedin.ts  # LinkedIn API integration
│   │   ├── rss.ts       # RSS parsing and content
│   │   └── scheduler.ts # Cron job management
│   ├── routes/          # Express API routes
│   ├── views/           # Web dashboard HTML
│   ├── app.ts          # Express application
│   └── index.ts        # Application entry point
├── prisma/
│   └── schema.prisma   # Database schema
├── .github/
│   └── workflows/      # GitHub Actions CI/CD
├── docker-compose.yml  # Docker services
├── Dockerfile         # Container definition
└── README.md         # This file
```

### Available Scripts

```bash
# Development
yarn dev              # Start development server
yarn build           # Build TypeScript
yarn start           # Run production build

# Database
yarn db:generate     # Generate Prisma client
yarn db:push        # Apply schema changes
yarn db:migrate     # Create migration
yarn db:studio      # Open Prisma Studio

# Code Quality
yarn lint           # Run ESLint
yarn lint:fix       # Fix ESLint issues
yarn format         # Format with Prettier
```

## 🔍 Monitoring & Logging

### Application Logs

- RSS fetch operations
- Post publishing attempts
- LinkedIn API interactions
- Scheduler execution
- Error tracking

### Health Checks

- Database connectivity
- LinkedIn API status
- Scheduler service status
- RSS feed accessibility

## 🚧 Roadmap

- [ ] **OAuth Flow Integration**: Built-in LinkedIn OAuth setup
- [ ] **Analytics Dashboard**: Post performance metrics
- [ ] **Content Templates**: Customizable post templates
- [ ] **Multiple Accounts**: Support for multiple LinkedIn profiles
- [ ] **Advanced Scheduling**: More flexible scheduling options
- [ ] **Content Filtering**: Smart content selection based on engagement
- [ ] **Slack Integration**: Notifications and approvals via Slack
- [ ] **API Extensions**: RESTful API for external integrations

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Common Issues

**LinkedIn API Access Denied**
- Ensure your app has proper permissions
- Check that redirect URLs match exactly
- Verify your access token hasn't expired

**Posts Not Publishing**  
- Check LinkedIn API credentials
- Verify system clock and timezone settings
- Review application logs for errors

**RSS Feed Not Updating**
- Confirm MongoDB RSS URL accessibility
- Check internet connectivity
- Review RSS parser logs

### Getting Help

- 📧 **Email**: [Create an issue](https://github.com/Ajjya/ai-agent-linked-in/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/Ajjya/ai-agent-linked-in/discussions)
- 📖 **Documentation**: Check the `/settings` page in the web dashboard

## 🙏 Acknowledgments

- LinkedIn for providing the professional networking API
- MongoDB for the excellent RSS feed and content
- The open-source community for the amazing tools and libraries

---

**Made with ❤️ for the MongoDB and LinkedIn communities**

*This project is not officially affiliated with LinkedIn or MongoDB.*