import { Router } from 'express';
import linkedinService from '../services/linkedin';

const router = Router();

// Get LinkedIn authorization URL
router.get('/linkedin/auth', (req, res) => {
  try {
    const authUrl = linkedinService.getAuthorizationUrl();
    res.json({
      success: true,
      authUrl,
      message: 'Visit this URL to authorize the application',
    });
  } catch (error) {
    console.error('Error getting authorization URL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate authorization URL',
    });
  }
});

// Handle LinkedIn OAuth callback
router.get('/linkedin/callback', async (req, res): Promise<void> => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      res.status(400).send(`
        <html>
          <body>
            <h2>❌ LinkedIn Authorization Failed</h2>
            <p>Error: ${error}</p>
            <p><a href="/">Back to Dashboard</a></p>
          </body>
        </html>
      `);
      return;
    }

    if (!code) {
      res.status(400).send(`
        <html>
          <body>
            <h2>❌ Missing Authorization Code</h2>
            <p>No authorization code received from LinkedIn</p>
            <p><a href="/">Back to Dashboard</a></p>
          </body>
        </html>
      `);
    }

    // Exchange code for access token
    const tokenData = await linkedinService.exchangeCodeForToken(code as string);

    res.send(`
      <html>
        <head>
          <title>LinkedIn Authorization Success</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
            .success { background: #d4edda; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .token-box { background: #f8f9fa; border: 1px solid #dee2e6; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .token { font-family: monospace; word-break: break-all; background: #e9ecef; padding: 10px; border-radius: 3px; }
            .steps { background: #e7f3ff; border-left: 4px solid #0077b5; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <h1>🎉 LinkedIn Authorization Successful!</h1>
          
          <div class="success">
            <strong>✅ Success!</strong> Your LinkedIn application has been authorized.
          </div>

          <div class="token-box">
            <h3>📝 Your Access Token:</h3>
            <div class="token">${tokenData.access_token}</div>
            <p><small>Expires in: ${tokenData.expires_in} seconds (~${Math.round(tokenData.expires_in / 3600)} hours)</small></p>
          </div>

          <div class="steps">
            <h3>🔧 Next Steps:</h3>
            <ol>
              <li>Copy the access token above</li>
              <li>Open your <code>.env</code> file</li>
              <li>Update: <code>LINKEDIN_ACCESS_TOKEN=${tokenData.access_token}</code></li>
              <li>Restart your application</li>
              <li>Test the connection in <a href="/settings">Settings</a></li>
            </ol>
          </div>

          <p>
            <a href="/" style="background: #0077b5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              🏠 Back to Dashboard
            </a>
            <a href="/settings" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-left: 10px;">
              ⚙️ Go to Settings
            </a>
          </p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    res.status(500).send(`
      <html>
        <body>
          <h2>❌ Token Exchange Failed</h2>
          <p>Error: ${error}</p>
          <p><a href="/">Back to Dashboard</a></p>
        </body>
      </html>
    `);
  }
});

export default router;