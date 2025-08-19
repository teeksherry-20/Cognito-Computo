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
}

// Authenticate with Google Sheets
let auth;
if (credentials) {
  auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

// ✅ ARTICLES ENDPOINT WITH DEBUG LOGGING
app.get("/articles", async (req, res) => {
  try {
    console.log("📌 /articles request received");

    if (!auth) {
      console.error("❌ Auth is not initialized");
      return res.status(500).json({ error: "Auth not initialized" });
    }

    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.SPREADSHEET_ID;

    if (!spreadsheetId) {
      console.error("❌ SPREADSHEET_ID is missing in environment variables");
      return res.status(500).json({ error: "Spreadsheet ID not set" });
    }

    console.log("📌 Using Spreadsheet ID:", spreadsheetId);

    const range = "Articles!A2:D"; // <-- change "Articles" if your sheet/tab name is different
    console.log("📌 Fetching range:", range);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    if (!response.data.values) {
      console.error("❌ No data returned from Sheets");
      return res.status(500).json({ error: "No data found in spreadsheet" });
    }

    console.log("📌 Data rows received:", response.data.values.length);

    const articles = response.data.values.map((row, i) => ({
      title: row[0] || `Untitled ${i + 1}`,
      intro: row[1] || "",
      genre: row[2] || "General",
      date: row[3] || new Date().toISOString(),
      likes: 0,
    }));

    res.json(articles);
  } catch (err) {
    console.error("❌ Error fetching articles:", err.message, err.stack);
    res.status(500).json({ error: err.message });
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

// ✅ Serve index.html for frontend routes
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
