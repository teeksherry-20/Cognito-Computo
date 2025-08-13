import express from "express";
import cors from "cors";
import { google } from "googleapis";

const SPREADSHEET_ID = "1eHdXlQOsNwS1a8-69_cW0f8rYvH-BTiMU31bYFOEQa0";

// Service account credentials from environment or inline
const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY ? 
  JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY) : 
  {
    "type": "service_account",
    "project_id": "root-isotope-468903-h9",
    "private_key_id": "fa52868044971889c1f5086791979af2c1631ecf",
    "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDI/qlJq7FtxBbY\nt024Y+p9KhOFEMjcY3vKDCXcSbo5wAS6XuhFbSumB9mOI/SMqRjF3xek0pjn+B+S\nMZVUSMQn5Y9P2G6tJ5H3w/9xNAYkpeG1Le5SjYpJmChoHNQ5MOlJETiyuFk1HjtX\n4DUc2ZBJU6/OjcRukOxcECFhgdiNi/KLB11pkssqEqctyh/mz3QZ5CMdvlGXOnMm\nD+0GrtmEnQe6NqNaQOr77a0NRgE1qg9FYU8Ull/dkTMTtOx8lHPq8IusoboGC1F3\nD1s8tUmAJ9kbPdSNsCxL5b92q1zfh+ljlL9/d6JyALMCpDiNV9yfwC+AAqxWDj+n\ntAnyt87bAgMBAAECggEARRZ8HC2fJGrVq5J+bZYyoOlYolGdqVuszkuUq/7Pu1AM\nj/9VeZ/H9B8YoeosAjmRoVpI50fYdUvtljPi74C/pDMdKsXrbSt/2hmN8Vx/jBNU\n3RE3rTqnwRpDMV5PeIUeexYnVg9V4pNMtK0FtK/4D6xrbuV+Er9P72lAACNAy44m\nUN6g/qMug0c8AkcJEWBPTujax9kOYTsQjHSiz6Fuo51C0HUBbHnwyptvfzhiLOBb\nr3MI/y4ConN9uaMPunGpDwdw0DIFa7KuQWThPOTm9gUmPYUlmy6d0AMShtY8WULw\nO31imO/mKy0W09o/dYsmYLkNs6DPmQl3oJ3xToNasQKBgQDl08l7Wtxk0hDSKWB4\ncoDTmHIy8VSP/n1J0mW5z5gVXTudygYEciMz7QFF3QLGJoWqVEK/gUee5q5qFneQ\n+s44UW7ubF9W2ELzu3W1CA7Wo0S0XzUBPu6digONxAQgVoAG7OTYhejpCv0YArvu\nTVOun4kVPOS6qvNQlULorFumYwKBgQDf4k/81vgpkCkGFO+H+JHwu+Z+CRKOfSRI\nOzrW/f4jFt6bkZL6jZLmKAwHPrgbPJHndhJW3ayrTJHwSPMzyJRzwN2zHqhOLlxx\nAWuA7xDjCgY+jr51ARdM1pQ3+M6K/NbpMpvgrOl/8cdXZSB+WHzeJX7/qY8SS+se\nDOmXOr0DKQKBgQDPYUttA4/babHD8ZIbHTcht21Uim7Df9+NvUwNXkTdAkPJHYJQ\ngK1DLZj4cXUPV7NE/sM8CmuV9pFrKNq695UdPF3cxe1Bb+L6Cy0rLRo2kxxrpX0u\nopqtjNuoEDeo9mSP2zKkLjD8F+5IvC7X2O6po0sO3uOFjLwA+q5lRSFuAQKBgBJo\n3KTw1FUumoD6hbvLj8yY1to0SsdWuP4LiMoW9qfSAJoQPWLG83ZjgqGx4Zezwlej\nGNz1u3YWhMWaag0vCC4AhPpuoe5T15wfPsTKY7wXne3U9QpP/ad+2Y9EsU8yfUWN\nuM2fyk+QBRFFqodZJWNq9+dz/OTHQ10kOK0L0nEJAoGBAIH5vkhu5zJOj0rVjWlR\njM9fCaPZbFPrGstAhbawlSUu97RvPORZoh+Be0MoN+9Eo9Pd/t5brN55NOjZl7kA\nnUtIYEL7F9csDJSwcPUIfK4w+gFAglz07DGEuUKWrpKBoCdjaA3BlGNK/pkrqcH1\n7zOBTZ+l5+fH6Iw9jIAPtlkR\n-----END PRIVATE KEY-----\n",
    "client_email": "blog-sheet@root-isotope-468903-h9.iam.gserviceaccount.com",
    "client_id": "105693710590461283402",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/blog-sheet%40root-isotope-468903-h9.iam.gserviceaccount.com",
    "universe_domain": "googleapis.com"
  };

const app = express();

// CORS configuration for production
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8080',
    'https://your-frontend-domain.com', // Replace with your actual domain
    /^https:\/\/.*\.netlify\.app$/,
    /^https:\/\/.*\.vercel\.app$/,
    /^https:\/\/.*\.github\.io$/
  ],
  credentials: true
}));

app.use(express.json());

const auth = new google.auth.GoogleAuth({
  credentials: serviceAccountKey,
  scopes: [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive"
  ],
});

const sheets = google.sheets({ version: "v4", auth });

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

/**
 * GET / (root endpoint - returns all data including articles and polls)
 */
app.get("/", async (req, res) => {
  try {
    console.log('Fetching all data from spreadsheet...');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A1:I",
    });
    const rows = response.data.values || [];
    
    const transformedData = rows.map((row, index) => ({
      ID: row[0] || '',
      Option: row[1] || '',
      Count: row[2] || '',
      Title: row[3] || '',
      Date: row[4] || '',
      Genre: row[5] || '',
      Introduction: row[6] || '',
      'Full Content': row[7] || '',
      'Article URL': row[7] || '',
      Like: row[8] || '0'
    }));
    
    console.log(`Returning ${transformedData.length} rows`);
    res.json(transformedData);
  } catch (err) {
    console.error('Error fetching all data:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /articles
 */
app.get("/articles", async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A4:I",
    });
    const rows = response.data.values || [];
    const articles = rows.map(row => ({
      id: row[0],
      title: row[3],
      date: row[4],
      genre: row[5],
      intro: row[6],
      full: row[7],
      likes: row[8] ? parseInt(row[8]) : 0,
      Title: row[3],
      Like: row[8] ? parseInt(row[8]) : 0
    }));
    res.json(articles);
  } catch (err) {
    console.error('Error fetching articles:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /like
 */
app.post("/like", async (req, res) => {
  const { articleId, newLikeCount } = req.body;
  try {
    const data = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A1:I",
    });
    const rows = data.data.values || [];
    let targetRow = null;
    
    rows.forEach((row, idx) => {
      if (row[3] === articleId) {
        targetRow = idx + 1;
      }
    });

    if (!targetRow) {
      return res.status(404).json({ error: "Article not found" });
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Sheet1!I${targetRow}`,
      valueInputOption: "RAW",
      requestBody: { values: [[newLikeCount]] },
    });

    res.json({ success: true, message: `Updated likes for "${articleId}" to ${newLikeCount}` });
  } catch (err) {
    console.error('Error updating likes:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /Title/:title
 */
app.patch("/Title/:title", async (req, res) => {
  const { title } = req.params;
  const { Like } = req.body;
  
  try {
    const data = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A1:I",
    });
    const rows = data.data.values || [];
    let targetRow = null;
    
    rows.forEach((row, idx) => {
      if (row[3] === decodeURIComponent(title)) {
        targetRow = idx + 1;
      }
    });

    if (!targetRow) {
      return res.status(404).json({ error: "Article not found" });
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Sheet1!I${targetRow}`,
      valueInputOption: "RAW",
      requestBody: { values: [[Like]] },
    });

    res.json({ success: true, message: `Updated likes for "${title}" to ${Like}` });
  } catch (err) {
    console.error('Error updating likes via PATCH:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /poll
 */
app.post("/poll", async (req, res) => {
  const { pollId, option, newCount } = req.body;
  try {
    const data = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A1:C10",
    });
    const rows = data.data.values || [];
    let targetRow = null;
    
    rows.forEach((row, idx) => {
      if (row[0] === pollId && row[1] === option) {
        targetRow = idx + 1;
      }
    });

    if (!targetRow) {
      return res.status(404).json({ error: "Poll option not found" });
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Sheet1!C${targetRow}`,
      valueInputOption: "RAW",
      requestBody: { values: [[newCount]] },
    });

    res.json({ success: true, message: `Updated ${pollId} option ${option} to ${newCount}` });
  } catch (err) {
    console.error('Error updating poll:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /:rowIndex
 */
app.put("/:rowIndex", async (req, res) => {
  const { rowIndex } = req.params;
  const updateData = req.body;
  
  try {
    const targetRow = parseInt(rowIndex) + 1;
    
    const values = [
      [
        updateData.ID || '',
        updateData.Option || '',
        updateData.Count || '',
        updateData.Title || '',
        updateData.Date || '',
        updateData.Genre || '',
        updateData.Introduction || '',
        updateData['Full Content'] || '',
        updateData.Like || ''
      ]
    ];
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Sheet1!A${targetRow}:I${targetRow}`,
      valueInputOption: "RAW",
      requestBody: { values },
    });

    res.json({ success: true, message: `Updated row ${targetRow}` });
  } catch (err) {
    console.error('Error updating row:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /poll-data
 */
app.get("/poll-data", async (req, res) => {
  try {
    const pollRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A1:C10",
    });
    const rows = pollRes.data.values || [];
    
    const pollData = rows
      .filter(row => row[0] === 'trolley')
      .map((row, index) => ({
        ID: row[0],
        Option: row[1],
        Count: row[2] || '0'
      }));
    
    res.json(pollData);
  } catch (err) {
    console.error('Error fetching poll data:', err);
    res.status(500).json({ error: err.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Endpoint ${req.method} ${req.path} not found` });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});