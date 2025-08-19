// server.js
const express = require("express");
const { google } = require("googleapis");
const path = require("path");

const app = express();
app.use(express.json());

// Serve static files (your frontend)
app.use(express.static(path.join(__dirname)));

// Load credentials from environment variable
let credentials;
try {
  credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
  console.log("✅ Loaded Google credentials from environment");
} catch (err) {
  console.error("❌ Failed to load Google credentials:", err.message);
  credentials = null; // fallback
}

// Authenticate with Google Sheets
let auth;
if (credentials) {
  try {
    auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
  } catch (err) {
    console.error("❌ GoogleAuth initialization failed:", err.message);
    auth = null;
  }
}

// ✅ ARTICLES ENDPOINT (only if auth available)
app.get("/articles", async (req, res) => {
  if (!auth) {
    console.warn("⚠️ Google Sheets auth not available, returning empty array");
    return res.json([]);
  }

  try {
    console.log("📥 /articles request received");

    const sheets = google.sheets({ version: "v4", auth });
    const range = "Sheet1!A:D";

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range,
    });

    const rows = response.data.values || [];
    console.log("✅ Rows fetched:", rows.length);

    if (!rows.length) return res.json([]);

    const articles = rows.slice(1).map((row) => ({
      date: row[0],
      title: row[1],
      intro: row[2],
      genre: row[3],
      likes: parseInt(row[4] || "0", 10),
    }));

    res.json(articles);
  } catch (err) {
    console.error("❌ Error in /articles:", err.message, err.stack);
    res.status(500).json({ error: "Failed to fetch articles" });
  }
});

// ✅ LIKE ENDPOINT
app.post("/like", async (req, res) => {
  try {
    const { articleId, newLikeCount } = req.body;
    console.log(`📌 Like request for: ${articleId}, new count: ${newLikeCount}`);
    res.json({ success: true, articleId, newLikeCount });
  } catch (err) {
    console.error("❌ Error in /like:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Serve index.html for frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ✅ Catch-all handler
app.use((req, res) => {
  console.log("⚠️ 404 for path:", req.originalUrl);
  res.status(404).json({ error: "Endpoint not found" });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
