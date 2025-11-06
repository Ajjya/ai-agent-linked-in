const axios = require('axios');
require('dotenv').config();

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./prisma/dev.db');

async function refreshLinkedInToken() {
  try {
    // Get the current token from database
    db.get('SELECT * FROM linkedin_tokens LIMIT 1', async (err, row) => {
      if (err || !row) {
        console.error('No token found in database');
        db.close();
        return;
      }

      const refreshToken = row.refreshToken;
      if (!refreshToken) {
        console.error('No refresh token available');
        db.close();
        return;
      }

      console.log('🔄 Attempting to refresh LinkedIn token...');

      try {
        const response = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', {
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: process.env.LINKEDIN_CLIENT_ID,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET,
        }, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });

        const newTokenData = response.data;
        const expiresAt = new Date(Date.now() + newTokenData.expires_in * 1000).getTime();

        console.log('✅ Token refreshed successfully');
        console.log(`   New token expires at: ${new Date(expiresAt).toISOString()}`);

        // Update in database
        db.run(
          `UPDATE linkedin_tokens SET 
            accessToken = ?, 
            refreshToken = ?,
            expiresAt = ?,
            updatedAt = datetime('now')
          WHERE id = ?`,
          [
            newTokenData.access_token,
            newTokenData.refresh_token || refreshToken,
            expiresAt,
            row.id,
          ],
          (updateErr) => {
            if (updateErr) {
              console.error('❌ Error updating token in database:', updateErr);
            } else {
              console.log('✅ Token updated in database');
            }
            db.close();
          }
        );
      } catch (error) {
        console.error('❌ Error refreshing token:', error.response?.data || error.message);
        db.close();
      }
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
    db.close();
  }
}

refreshLinkedInToken();
