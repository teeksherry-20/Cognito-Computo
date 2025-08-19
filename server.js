import express from "express";
import cors from "cors";
import { google } from "googleapis";

// Load service account from ENV instead of file
let serviceAccountKey;
try {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT) {
    throw new Error("Missing GOOGLE_SERVICE_ACCOUNT environment variable");
  }

  serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);

  const requiredFields = ["type", "project_id", "private_key_id", "private_key", "client_email"];
  const missingFields = requiredFields.filter(f => !serviceAccountKey[f]);

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
  }

  console.log("✅ Service account key loaded from environment variable");
  console.log(`🔧 Service account email: ${serviceAccountKey.client_email}`);
  console.log(`🗝️ Project ID: ${serviceAccountKey.project_id}`);

} catch (error) {
  console.error("❌ Error loading service account key:", error.message);
  process.exit(1);
}

const SPREADSHEET_ID = process.env.SPREADSHEET_ID || "YOUR_FALLBACK_SPREADSHEET_ID";

const app = express();

// Strong CORS configuration (allow all for dev)
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize Google Auth
let auth;
let sheets;

try {
  auth = new google.auth.GoogleAuth({
    credentials: serviceAccountKey,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive.readonly",
    ],
  });

  sheets = google.sheets({ version: "v4", auth });
  console.log("✅ Google Sheets API initialized");

} catch (error) {
  console.error("❌ Error initializing Google Auth:", error.message);
  process.exit(1);
}

// Middleware for request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    spreadsheetId: SPREADSHEET_ID,
    nodeVersion: process.version,
    serviceAccount: serviceAccountKey.client_email,
    projectId: serviceAccountKey.project_id
  });
});

// Test Google Sheets connection
app.get("/test-sheets", async (req, res) => {
  try {
    console.log("🧪 Testing Google Sheets connection...");
    const authClient = await auth.getClient();

    const response = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
      auth: authClient
    });

    console.log("✅ Successfully connected to Google Sheets");

    res.json({
      status: "success",
      spreadsheetTitle: response.data.properties.title,
      sheets: response.data.sheets.map(sheet => ({
        title: sheet.properties.title,
        id: sheet.properties.sheetId,
        rowCount: sheet.properties.gridProperties.rowCount,
        columnCount: sheet.properties.gridProperties.columnCount
      })),
      serviceAccount: serviceAccountKey.client_email,
      projectId: serviceAccountKey.project_id,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error("❌ Error testing sheets connection:", err.message);
    res.status(500).json({ error: "Failed to connect to Google Sheets", details: err.message });
  }
});

// Fetch articles
app.get("/articles", async (req, res) => {
  try {
    console.log("📥 Fetching articles from Google Sheets...");
    const authClient = await auth.getClient();
    console.log("🔑 Auth client acquired");

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A4:I",
      auth: authClient
    });

    console.log("📊 Data received from Sheets");

    const rows = response.data.values || [];
    if (rows.length === 0) {
      console.log("⚠️ No rows found in sheet");
      return res.json([]);
    }

    const articles = rows.map((row, index) => ({
      id: row[0] || `article-${index + 4}`,
      title: row[3] || `Untitled Article ${index + 1}`,
      date: row[4] || new Date().toISOString(),
      genre: row[5] || "General",
      intro: row[6] || "No description available.",
      full: row[7] || "No content available.",
      likes: row[8] ? parseInt(row[8], 10) || 0 : 0
    }));

    articles.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(articles);
  } catch (err) {
    console.error("❌ Error in /articles:", err.message, err.stack);
    res.status(500).json({ error: "Failed to fetch articles", details: err.message });
  }
});

// Like an article (use unique ID in col A)
app.post("/like", async (req, res) => {
  const { articleId, newLikeCount } = req.body;

  try {
    if (!articleId || typeof newLikeCount !== 'number') {
      return res.status(400).json({ error: "Invalid request" });
    }

    const authClient = await auth.getClient();
    const data = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A1:I",
      auth: authClient
    });

    const rows = data.data.values || [];
    let targetRow = null;

    rows.forEach((row, idx) => {
      if (row && row[0] && row[0] === articleId) { // ✅ match by unique ID in column A
        targetRow = idx + 1;
      }
    });

    if (!targetRow) {
      console.log(`⚠️ Article with ID ${articleId} not found`);
      return res.status(404).json({ error: "Article not found" });
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Sheet1!I${targetRow}`,
      valueInputOption: "RAW",
      requestBody: { values: [[newLikeCount.toString()]] },
      auth: authClient
    });

    console.log(`👍 Updated likes for article ${articleId} → ${newLikeCount}`);
    res.json({ success: true, articleId, newLikeCount });

  } catch (err) {
    console.error("❌ Error updating likes:", err.message, err.stack);
    res.status(500).json({ error: "Failed to update likes", details: err.message });
  }
});

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files (JS, CSS, images) from project root
app.use(express.static(__dirname));

// Root route → serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`🧪 Test Sheets: http://localhost:${PORT}/test-sheets`);
  console.log(`📖 Articles endpoint: http://localhost:${PORT}/articles`);
});

