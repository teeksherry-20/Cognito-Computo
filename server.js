// server.js
import express from "express";
import { google } from "googleapis";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Serve static files (frontend)
app.use(express.static(path.join(__dirname)));

// --- Load Google credentials from environment ---
let credentials;
try {
  const rawCredentials = process.env.GOOGLE_CREDENTIALS_JSON;
  if (!rawCredentials) {
    throw new Error("GOOGLE_CREDENTIALS_JSON environment variable is not set");
  }
  
  credentials = JSON.parse(rawCredentials);
  
  // Fix private key format if needed
  if (credentials.private_key && !credentials.private_key.includes('\n')) {
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
  }
  
  console.log("✅ Loaded Google credentials for:", credentials.client_email);
} catch (err) {
  console.error("❌ Failed to load Google credentials:", err.message);
}

// --- Google Auth setup ---
let auth;
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
  if (!auth) {
    console.error("❌ Google auth not configured");
    return res.status(500).json({ error: "Google auth not configured" });
  }

  try {
    console.log("📊 Fetching articles from Google Sheets...");
    
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.SPREADSHEET_ID;
    
    if (!spreadsheetId) {
      throw new Error("SPREADSHEET_ID environment variable is not set");
    }
    
    const range = "Sheet1!A:E"; // Adjust sheet/tab & columns

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

    // Skip header row and map data
    const articles = rows.slice(1).map((row, index) => ({
      id: index + 1,
      date: row[0] || "",
      title: row[1] || "",
      intro: row[2] || "",
      genre: row[3] || "",
      likes: parseInt(row[4] || "0", 10),
    }));

    console.log("✅ Successfully processed", articles.length, "articles");
    res.json(articles);
    
  } catch (err) {
    console.error("❌ /articles error:", err.message);
    console.error("Full error:", err);
    
    // Return more specific error information
    if (err.code === 403) {
      res.status(500).json({ 
        error: "Permission denied - check if sheet is shared with service account email" 
      });
    } else if (err.code === 404) {
      res.status(500).json({ 
        error: "Spreadsheet not found - check SPREADSHEET_ID" 
      });
    } else {
      res.status(500).json({ 
        error: "Failed to fetch articles: " + err.message 
      });
    }
  }
});

// --- /like endpoint ---
app.post("/like", async (req, res) => {
  try {
    const { articleId, newLikeCount } = req.body;
    console.log(`👍 Like request: ${articleId}, new count: ${newLikeCount}`);
    
    // Note: you could update Google Sheet here if desired
    // For now, just acknowledge the like
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

// --- Health check endpoint ---
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    auth: !!auth,
    credentials: !!credentials
  });
});

// --- Catch-all 404 handler ---
app.use((req, res) => {
  // Don't log favicon requests
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
  
  // Log environment status
  console.log("\n📋 Environment Status:");
  console.log("- GOOGLE_CREDENTIALS_JSON:", !!process.env.GOOGLE_CREDENTIALS_JSON ? "✅ Set" : "❌ Missing");
  console.log("- SPREADSHEET_ID:", !!process.env.SPREADSHEET_ID ? "✅ Set" : "❌ Missing");
  console.log("- Auth initialized:", !!auth ? "✅ Yes" : "❌ No");
});
