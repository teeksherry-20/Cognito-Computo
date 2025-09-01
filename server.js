import express from "express";
import { google } from "googleapis";
import path from "path";
import { fileURLToPath } from "url";
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

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

// ==== IN-MEMORY DATA STORE ====
let trolleyVotes = { A: 0, B: 0 }; // loaded from sheet on startup
let articleLikes = {}; // { articleId: count } - loaded from sheet on startup

// --- Load Google credentials ---
let credentials;
let auth;

// CORRECTED SPREADSHEET ID - matches your browser URL
const LOCAL_SPREADSHEET_ID = "1eHdXlQOsNwS1a8-69_cW0f8rYvH-BTiMU31bYFOEQa0";

// Your credentials (keep these secure in production)
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

// ==== NEW FUNCTIONS: UPDATE TROLLEY VOTES IN GOOGLE SHEET ====
async function updateTrolleyVoteInSheet(option, newCount) {
  if (!auth) {
    console.warn("Cannot update trolley votes: auth not configured");
    return false;
  }

  try {
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.SPREADSHEET_ID || LOCAL_SPREADSHEET_ID;
    
    // Find the trolley vote rows (should be rows 2 and 3)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1!A:C"
    });
    
    const rows = response.data.values || [];
    
    // Find the trolley option row
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const idCell = row[0] ? row[0].toString().trim() : "";
      const optionCell = row[1] ? row[1].toString().trim() : "";
      
      if (idCell === "trolley" && optionCell === option) {
        // Update the count column (column C, index 2)
        const range = `Sheet1!C${i + 1}`;
        
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range,
          valueInputOption: 'RAW',
          resource: {
            values: [[newCount]]
          }
        });
        
        console.log(`Updated trolley vote ${option} in sheet: ${newCount}`);
        return true;
      }
    }
    
    console.warn(`Trolley option ${option} not found in sheet`);
    return false;
    
  } catch (error) {
    console.error(`Failed to update trolley vote ${option} in sheet:`, error.message);
    return false;
  }
}

// ==== LOAD INITIAL TROLLEY VOTES FROM SHEET ====
async function loadTrolleyVotesFromSheet() {
  if (!auth) {
    console.warn("Cannot load trolley votes: auth not configured");
    return;
  }

  try {
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.SPREADSHEET_ID || LOCAL_SPREADSHEET_ID;
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1!A:C"
    });
    
    const rows = response.data.values || [];
    
    // Load trolley votes from sheet
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const idCell = row[0] ? row[0].toString().trim() : "";
      const optionCell = row[1] ? row[1].toString().trim() : "";
      
      if (idCell === "trolley" && (optionCell === "A" || optionCell === "B")) {
        const count = parseInt((row[2] || "0").toString(), 10);
        trolleyVotes[optionCell] = count;
        console.log(`Loaded ${count} votes for trolley option ${optionCell}`);
      }
    }
    
    console.log("Trolley votes loaded from sheet:", trolleyVotes);
    
  } catch (error) {
    console.error("Failed to load trolley votes from sheet:", error.message);
  }
}

// ==== NEW FUNCTION: UPDATE LIKES IN GOOGLE SHEET ====
async function updateLikeInSheet(articleId, newLikeCount) {
  if (!auth) {
    console.warn("⚠️ Cannot update sheet: auth not configured");
    return false;
  }

  try {
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.SPREADSHEET_ID || LOCAL_SPREADSHEET_ID;
    
    // Find the row for this article
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1!A:I"
    });
    
    const rows = response.data.values || [];
    
    // Find the article row
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const idCell = row[0] ? row[0].toString().trim() : "";
      
      if (idCell === `article${articleId}`) {
        // Update the likes column (column I, index 8)
        const range = `Sheet1!I${i + 1}`;
        
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range,
          valueInputOption: 'RAW',
          resource: {
            values: [[newLikeCount]]
          }
        });
        
        console.log(`✅ Updated likes for article ${articleId} in sheet: ${newLikeCount}`);
        return true;
      }
    }
    
    console.warn(`⚠️ Article ${articleId} not found in sheet`);
    return false;
    
  } catch (error) {
    console.error(`❌ Failed to update likes in sheet for article ${articleId}:`, error.message);
    return false;
  }
}

// ==== LOAD INITIAL LIKES FROM SHEET ====
async function loadLikesFromSheet() {
  if (!auth) {
    console.warn("⚠️ Cannot load likes: auth not configured");
    return;
  }

  try {
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.SPREADSHEET_ID || LOCAL_SPREADSHEET_ID;
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1!A:I"
    });
    
    const rows = response.data.values || [];
    
    // Load likes from sheet
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const idCell = row[0] ? row[0].toString().trim() : "";
      
      if (idCell.startsWith("article")) {
        const articleNumber = idCell.replace("article", "").trim();
        const articleKey = `article${articleNumber}`;
        const likes = parseInt((row[8] || "0").toString(), 10);
        
        articleLikes[articleKey] = likes;
        console.log(`📊 Loaded ${likes} likes for ${articleKey}`);
      }
    }
    
    console.log("✅ Likes loaded from sheet:", articleLikes);
    
  } catch (error) {
    console.error("❌ Failed to load likes from sheet:", error.message);
  }
}

// ==== FIXED ARTICLES ENDPOINT ====
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
    
    // Get data from the correct range
    const range = "Sheet1!A:I"; // A through I to match your columns

    const response = await sheets.spreadsheets.values.get({ 
      spreadsheetId, 
      range 
    });
    
    const rows = response.data.values || [];
    console.log("📋 Total rows fetched:", rows.length);

    if (!rows.length) {
      console.log("⚠️ No data found in spreadsheet");
      return res.json([]);
    }

    // Log first few rows for debugging
    console.log("📊 Header row:", rows[0]);
    console.log("📊 First data row:", rows[1]);

    // Parse articles correctly based on your sheet structure
    const articles = [];
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      // Skip empty rows
      if (!row || row.length === 0) continue;
      
      // Check if this is an article row (starts with "article")
      const idCell = row[0] ? row[0].toString().trim() : "";
      
      if (idCell.startsWith("article")) {
        // Extract article number from ID (e.g., "article 1" -> 1)
        const articleNumber = idCell.replace("article", "").trim();
        const articleId = parseInt(articleNumber) || i;
        const articleKey = `article${articleId}`;
        
        // Map columns correctly based on your sheet:
        // A: ID, B: Option, C: Count, D: Title, E: Date, F: Genre, G: Introduction, H: Full Content, I: Likes
        const article = {
          id: articleId,
          title: (row[3] || "").toString().trim(), // Column D (index 3)
          date: (row[4] || "").toString().trim(), // Column E (index 4)
          genre: (row[5] || "").toString().trim(), // Column F (index 5)  
          intro: (row[6] || "").toString().trim(), // Column G (index 6)
          fullContent: (row[7] || "").toString().trim(), // Column H (index 7)
          likes: articleLikes[articleKey] || parseInt((row[8] || "0").toString(), 10) // Use in-memory count or sheet value
        };
        
        // Only add if title exists and is not empty
        if (article.title && article.title.length > 0) {
          articles.push(article);
          console.log(`✅ Added article ${articleId}: "${article.title}" (${article.likes} likes)`);
        } else {
          console.log(`⚠️ Skipping article ${articleId}: no title found`);
        }
      }
    }

    // Sort articles by ID to maintain order
    articles.sort((a, b) => a.id - b.id);

    console.log("✅ Successfully processed", articles.length, "articles");
    console.log("📄 Article IDs found:", articles.map(a => a.id));
    
    if (articles.length > 0) {
      console.log("📄 Sample article structure:", {
        id: articles[0].id,
        title: articles[0].title,
        date: articles[0].date,
        genre: articles[0].genre,
        hasIntro: !!articles[0].intro,
        hasFullContent: !!articles[0].fullContent,
        likes: articles[0].likes
      });
    }
    
    res.json(articles);
    
  } catch (err) {
    console.error("❌ /articles error:", err.message);
    console.error("🔍 Error details:", err);
    
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
      troubleshooting.push(`🔧 Share your Google Sheet with: ${credentials?.client_email || 'service account email not found'}`);
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

// ==== UPDATED TROLLEY VOTES WITH SHEET PERSISTENCE ====
app.post("/vote", async (req, res) => {
  const { choice } = req.body;
  if (choice === "A" || choice === "B") {
    trolleyVotes[choice]++;
    console.log(`Vote received: ${choice}. New count:`, trolleyVotes[choice]);
    
    // Update the Google Sheet with the new vote count
    await updateTrolleyVoteInSheet(choice, trolleyVotes[choice]);
  }
  res.json(trolleyVotes);
});

app.get("/votes", (req, res) => {
  res.json(trolleyVotes);
});

// Legacy trolley votes endpoint for backward compatibility
app.get("/trolley-votes", (req, res) => {
  res.json(trolleyVotes);
});

app.post("/trolley-vote", async (req, res) => {
  const { option } = req.body;
  if (option === "A" || option === "B") {
    trolleyVotes[option]++;
    console.log(`Trolley vote received: ${option}. New count:`, trolleyVotes[option]);
    
    // Update the Google Sheet with the new vote count
    await updateTrolleyVoteInSheet(option, trolleyVotes[option]);
  }
  res.json(trolleyVotes);
});

// ==== UPDATED ARTICLE LIKES WITH SHEET PERSISTENCE ====
app.post("/like", async (req, res) => {
  const { articleId } = req.body;
  const articleKey = `article${articleId}`;
  
  if (!articleLikes[articleKey]) articleLikes[articleKey] = 0;
  articleLikes[articleKey]++;
  
  console.log(`👍 Like received for article ${articleId}. New count:`, articleLikes[articleKey]);
  
  // Update the Google Sheet with the new like count
  await updateLikeInSheet(articleId, articleLikes[articleKey]);
  
  res.json({ likes: articleLikes[articleKey] });
});

app.get("/likes/:id", (req, res) => {
  const articleKey = `article${req.params.id}`;
  const likes = articleLikes[articleKey] || 0;
  res.json({ likes });
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
      environment: process.env.NODE_ENV || 'development',
      trolleyVotes,
      articleLikes
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
      serviceAccount: credentials?.client_email,
      spreadsheetId: process.env.SPREADSHEET_ID || LOCAL_SPREADSHEET_ID,
      timestamp: new Date().toISOString()
    });
  }
});

// ==== NEW DEBUG ENDPOINT ====
app.get("/debug-sheet", async (req, res) => {
  if (!auth) {
    return res.status(500).json({ error: "No auth configured" });
  }
  
  try {
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.SPREADSHEET_ID || LOCAL_SPREADSHEET_ID;
    
    // Get raw data to debug
    const response = await sheets.spreadsheets.values.get({ 
      spreadsheetId, 
      range: "Sheet1!A:I"
    });
    
    const rows = response.data.values || [];
    
    res.json({
      totalRows: rows.length,
      headerRow: rows[0] || [],
      allRows: rows.map((row, index) => ({
        rowNumber: index + 1,
        data: row
      })),
      articleRows: rows.filter((row, index) => {
        if (index === 0) return false; // Skip header
        const idCell = row[0] ? row[0].toString().trim() : "";
        return idCell.startsWith("article");
      }),
      currentLikes: articleLikes
    });
    
  } catch (err) {
    res.status(500).json({ 
      error: err.message,
      code: err.code 
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
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Server URL: http://localhost:${PORT}`);
  
  // Load likes from sheet on startup
  console.log("📊 Loading likes from Google Sheet...");
  await loadLikesFromSheet();
  
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
    console.log("   Grant 'Editor' permission (required for updating likes)");
    console.log("");
    console.log("3. 🔗 Test endpoints:");
    console.log("   - Health: http://localhost:" + PORT + "/health");
    console.log("   - Auth test: http://localhost:" + PORT + "/test-auth");
    console.log("   - Debug sheet: http://localhost:" + PORT + "/debug-sheet");
    console.log("   - Articles: http://localhost:" + PORT + "/articles");
  }
});
