// server.js - Fixed version with correct spreadsheet ID
import express from "express";
import { google } from "googleapis";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

import cors from 'cors';

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://cogitocomputo.netlify.app',
    /\.netlify\.app$/
  ],
  credentials: true
}));

// Serve static files (frontend)
app.use(express.static(path.join(__dirname)));

// --- Load Google credentials ---
let credentials;
let auth;

// CORRECTED SPREADSHEET ID - matches your browser URL
const LOCAL_SPREADSHEET_ID = "1eHdXlQOsNwS1a8-69_cW0f8rYvH-BTiMU31bYFOEQa0";

// Updated local credentials
const LOCAL_CREDENTIALS = {
  "type": "service_account",
  "project_id": "root-isotope-468903-h9",
  "private_key_id": "338015a726007eb7360aac3d60a0c0c6753edf99",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCizLk9kgAXXB0o\nhOyH/VHpPuLl8RLA5PhFFQme0thcNLDGX3QhhzeE1+6DSSi/IR0eKaVNDddGRmR+\nRcL5jIKCdl7PA4MLyFIlnPA1KtBcwRaXADeJDEgrJOV5N9qxm63aBsueHNiQnVvb\nM1xFUqw7OXSwAvLVH2GdXSLlZyRAz03ikXbzHMDXoL/wQ+SFJajw367IgXa81Xhh\nl3+1qqwm96O3rntvwfHMFLD0w58Bmlf0u7eQRmHCoi9joOaTHKN0ZS1BhrRyZJzC\nle4sk/PAhHgtnJLG6p1EQauTv/NUgS3e9mhysQPJeKB77B0q7Y8jf2GNJU/fWp4S\nIbzNVoWfAgMBAAECggEACb69e+0Ial2ONUW3rvA//flQtbj3iWprXh9DQymV3/cb\nedRu7C7e6OnQEjXH5aEC0DJn/bPNZhyCmXhtkmiRy2Nwi23HY2YrXKsHSfd1H4hD\nZOiTanW8wDBmOBpa0fTitEFh4OYTJJz2yalKZa/sNWNcE8kpZg6J1lSj6R2Ccwqd\nR7n6dAq2GAt5ndYC46bHTtsDhbTa6KDxYMghmj40myHGs+HLglOzIuUw6c6kEJz5\ntLwMYEE5zIl80RcgEuyV1RnRvAV//b4mbkHeAux0/KTUOBWRzRwxwnQUpBuSw9yQ\n0vU9WmmYZb86J0BnNWrqKbKyr/jFUmR08Nu4RssboQKBgQDS70UgjMYSQ3RBE+P2\nFU7XtandtORHC4admgexWQCdxHZ8dM9TyhyFeCikSjAGpe5mYNfEfhfv/5HB47C6\nUnPYd56N2UD07I5PaL/SLDuthDL3lY4ERips5MhsznBfaHMoy77877NqXsRJ44QO\nLJC60p9wg3RccyDq5TsS8fqUkQKBgQDFlMpV4FtfHNkvfTC0L2NAUjmC+7SjbO3i\nK+R7ydmz+6LFZjVEe3ogyZ9zgpqFSWW1CfRzvIaqz7SGIP6EvJpjHrtYF7skp29R\nCz+ccGyj3yUBrSX9uGof4thAhTcddChWrSbTGI+nr4JLFDn1KfIY/Z3xQVMomIx8\n/gEEqPTPLwKBgD8jcdyxZqSW3liQfJ7vd98nuIXtnJsLfyrzrTPPwVh4M0NDr7+T\n8v+cnQW4UzHaP0cT2+IsIDwtktKntgG/pn94JtSs4D2wBVUNtMVTijWBKcRkVtM+\nsXpQ7RFspcRZPodKnYuWsGy5myXG3YNkoZnaa/FA1/bIW2UUYp9kIS6RAoGBAIjq\n1dfy1H6xuBN/louWtxmwoSgSkxgY+TQdJIVf2FwwCZjvfgRJ6NTlw3hBTiEFPtTY\n5Cx7vXqK2teD77w+EmKTvlGKiGYbHTm1KMyY38AjdzqVKVmMPQaBpUf4yLvBbd66\nuMfaIlqadhjfGFa7TYhh39x6X00ngVtwjXYUOymDAoGAU9XIQi13s4x1CawsgswD\nZlJZ/zBtqZGiVyzlp9/E0mWiQo9NmJPoqXeuGu9TxRitsMX5KsH0rWigxy7Rs8Eu\nE7wZ2bNFIgGDRIE99CgVOHb8tJmF8nq22gCwpG6686oDPk+KXLT19FSeR19ulztz\nDSeFukZosSODHMgQx/4K5D0=\n-----END PRIVATE KEY-----\n",
  "client_email": "blog-sheet@root-isotope-468903-h9.iam.gserviceaccount.com",
  "client_id": "105693710590461283402",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/blog-sheet%40root-isotope-468903-h9.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

try {
  // First try environment variables (for production)
  const rawCredentials = process.env.GOOGLE_CREDENTIALS_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  
  if (rawCredentials) {
    credentials = JSON.parse(rawCredentials);
    // Fix private key format if needed
    if (credentials.private_key) {
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    }
    console.log("✅ Loaded Google credentials from environment");
  } else {
    credentials = LOCAL_CREDENTIALS;
    console.log("✅ Using local Google credentials for development");
  }
  
  console.log("🔧 Service account email:", credentials.client_email);
  console.log("🔑 Private key format check:", credentials.private_key.includes('\n') ? '✅ Correct' : '❌ Needs fixing');
  
} catch (err) {
  console.error("❌ Failed to load Google credentials:", err.message);
}

// --- Google Auth setup ---
if (credentials) {
  try {
    auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    
    console.log("✅ Google Auth initialized successfully");
    
  } catch (authErr) {
    console.error("❌ Failed to initialize Google Auth:", authErr.message);
  }
}

// --- /articles endpoint ---
app.get("/articles", async (req, res) => {
  console.log("📡 Received request for articles");
  
  if (!auth) {
    console.error("❌ Google auth not configured");
    return res.status(500).json({ 
      error: "Google auth not configured",
      details: "Authentication was not properly initialized"
    });
  }

  try {
    console.log("📊 Fetching articles from Google Sheets...");
    
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.SPREADSHEET_ID || LOCAL_SPREADSHEET_ID;
    
    console.log("📋 Using spreadsheet ID:", spreadsheetId);
    
    // Updated range to match your sheet structure: A-I columns
    const range = "Sheet1!A:I";

    const response = await sheets.spreadsheets.values.get({ 
      spreadsheetId, 
      range 
    });
    
    const rows = response.data.values || [];
    console.log("📋 Fetched rows:", rows.length);

    if (!rows.length) {
      console.log("⚠️ No data found in spreadsheet");
      return res.json([]);
    }

    console.log("📊 First few rows:", rows.slice(0, 3));

    // Filter out non-article rows (trolley poll data) and map to article format
    // Based on your sheet: A=ID, B=Option, C=Count, D=Title, E=Date, F=Genre, G=Introduction, H=FullContent, I=Like
    const articles = rows.slice(1) // Skip header row
      .filter(row => {
        // Only include rows that have article data (not trolley poll data)
        // Check if row has a proper title and date, and starts with "article"
        return row[0] && row[0].toString().startsWith('article') && row[3] && row[4];
      })
      .map((row, index) => ({
        id: index + 1,
        date: row[4] || "", // Column E - Date
        title: row[3] || "", // Column D - Title  
        intro: row[6] || "", // Column G - Introduction
        genre: row[5] || "", // Column F - Genre
        likes: parseInt(row[8] || "0", 10), // Column I - Like
        fullContent: row[7] || "" // Column H - Full Content (if needed)
      }));

    console.log("✅ Successfully processed", articles.length, "articles");
    if (articles.length > 0) {
      console.log("📄 Sample article:", articles[0]);
    }
    
    res.json(articles);
    
  } catch (err) {
    console.error("❌ /articles error:", err.message);
    console.error("🔍 Error code:", err.code);
    
    // Enhanced error handling
    let errorMessage = "Failed to fetch articles: " + err.message;
    let troubleshooting = [];
    
    if (err.code === 404) {
      errorMessage = "Spreadsheet not found (404 error)";
      troubleshooting.push("❌ The spreadsheet ID might be incorrect");
      troubleshooting.push("❌ The spreadsheet might have been deleted or moved");
      troubleshooting.push(`🔍 Current ID: ${LOCAL_SPREADSHEET_ID}`);
      troubleshooting.push("✅ Go to your Google Sheet and copy the ID from the URL");
      troubleshooting.push("✅ Update LOCAL_SPREADSHEET_ID in server.js");
    } else if (err.code === 403) {
      errorMessage = "Permission denied accessing the Google Sheet (403 error)";
      troubleshooting.push(`🔧 Share your Google Sheet with: ${credentials.client_email}`);
      troubleshooting.push("✅ Grant 'Editor' or 'Viewer' access to the service account");
    } else if (err.message.includes('invalid_grant') || err.message.includes('Invalid JWT Signature')) {
      errorMessage = "JWT Signature error - service account credentials are invalid";
      troubleshooting.push("❌ The private key in your service account JSON might be corrupted");
      troubleshooting.push("✅ Generate new service account credentials");
    }
    
    res.status(500).json({ 
      error: errorMessage,
      code: err.code,
      serviceAccountEmail: credentials?.client_email || 'Not available',
      spreadsheetId: LOCAL_SPREADSHEET_ID,
      troubleshooting: troubleshooting
    });
  }
});

// --- /trolley-votes endpoint ---
app.get("/trolley-votes", async (req, res) => {
  console.log("🚃 Received request for trolley votes");
  
  if (!auth) {
    return res.status(500).json({ error: "Google auth not configured" });
  }

  try {
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.SPREADSHEET_ID || LOCAL_SPREADSHEET_ID;
    const range = "Sheet1!A:C";

    const response = await sheets.spreadsheets.values.get({ 
      spreadsheetId, 
      range 
    });
    
    const rows = response.data.values || [];
    
    // Extract trolley vote data (rows with "trolley" in column A)
    const trolleyVotes = { A: 0, B: 0 };
    
    rows.forEach(row => {
      if (row[0] === 'trolley') {
        const option = row[1]; // Column B - Option (A or B)
        const count = parseInt(row[2] || "0", 10); // Column C - Count
        if (option === 'A' || option === 'B') {
          trolleyVotes[option] = count;
        }
      }
    });

    console.log("🚃 Trolley votes:", trolleyVotes);
    res.json(trolleyVotes);
    
  } catch (err) {
    console.error("❌ /trolley-votes error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- /like endpoint ---
app.post("/like", async (req, res) => {
  try {
    const { articleId, newLikeCount } = req.body;
    console.log(`👍 Like request: ${articleId}, new count: ${newLikeCount}`);
    
    // TODO: Update the like count in Google Sheets if needed
    // This would require finding the right row and updating column I
    
    res.json({ success: true, articleId, newLikeCount });
  } catch (err) {
    console.error("❌ /like error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- Serve index.html ---
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// --- Enhanced health check endpoint ---
app.get("/health", (req, res) => {
  const healthData = {
    status: "ok", 
    timestamp: new Date().toISOString(),
    server: {
      auth: !!auth,
      credentials: !!credentials,
      serviceAccountEmail: credentials ? credentials.client_email : null,
      spreadsheetId: process.env.SPREADSHEET_ID || LOCAL_SPREADSHEET_ID,
      environment: process.env.NODE_ENV || 'development'
    }
  };
  
  res.json(healthData);
});

// --- Test credentials endpoint ---
app.get("/test-auth", async (req, res) => {
  if (!auth) {
    return res.status(500).json({ 
      error: "No auth configured",
      hasCredentials: !!credentials,
      hasAuth: !!auth
    });
  }
  
  try {
    console.log("🧪 Testing Google Sheets API authentication...");
    
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.SPREADSHEET_ID || LOCAL_SPREADSHEET_ID;
    
    // Try to get spreadsheet metadata
    const metadata = await sheets.spreadsheets.get({ spreadsheetId });
    
    res.json({
      status: "success",
      message: "Authentication test passed",
      spreadsheet: {
        title: metadata.data.properties.title,
        id: spreadsheetId,
        sheets: metadata.data.sheets.map(sheet => ({
          title: sheet.properties.title,
          sheetId: sheet.properties.sheetId
        }))
      },
      serviceAccount: credentials.client_email,
      timestamp: new Date().toISOString()
    });
    
  } catch (testErr) {
    console.error("❌ Auth test failed:", testErr.message);
    
    res.status(500).json({
      status: "failed",
      error: testErr.message,
      code: testErr.code,
      serviceAccount: credentials.client_email,
      spreadsheetId: process.env.SPREADSHEET_ID || LOCAL_SPREADSHEET_ID,
      timestamp: new Date().toISOString()
    });
  }
});

// --- Catch-all 404 handler ---
app.use((req, res) => {
  if (!req.originalUrl.includes('favicon')) {
    console.log("⚠️ 404 for path:", req.originalUrl);
  }
  res.status(404).json({ error: "Endpoint not found" });
});

// --- Start server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Server URL: http://localhost:${PORT}`);
  
  // Enhanced startup diagnostics
  console.log("\n📋 Environment Status:");
  console.log("- GOOGLE_CREDENTIALS_JSON:", !!process.env.GOOGLE_CREDENTIALS_JSON ? "✅ Set" : "❌ Using local");
  console.log("- SPREADSHEET_ID:", !!process.env.SPREADSHEET_ID ? "✅ Set" : "❌ Using local");
  console.log("- Auth initialized:", !!auth ? "✅ Yes" : "❌ No");
  console.log("- Service account email:", credentials ? credentials.client_email : "Not available");
  
  if (credentials) {
    console.log("\n🔧 IMPORTANT SETUP STEPS:");
    console.log("1. 📋 Verify your Google Sheet ID is correct:");
    console.log("   Current ID:", LOCAL_SPREADSHEET_ID);
    console.log("   Get the correct ID from your Google Sheet URL");
    console.log("");
    console.log("2. 🔧 Share your Google Sheet with the service account:");
    console.log("   Email:", credentials.client_email);
    console.log("   Grant 'Editor' or 'Viewer' permission");
    console.log("");
    console.log("3. 🔗 Test endpoints:");
    console.log("   - Health: http://localhost:" + PORT + "/health");
    console.log("   - Auth test: http://localhost:" + PORT + "/test-auth");
    console.log("   - Articles: http://localhost:" + PORT + "/articles");
  }
});
