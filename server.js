// server.js
const express = require("express");
const { google } = require("googleapis");
const path = require("path");

const app = express();
app.use(express.json());

// Serve static files (frontend)
app.use(express.static(path.join(__dirname)));

// --- Load Google credentials from environment ---
let credentials;
try {
  credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
  console.log("✅ Loaded Google credentials");
} catch (err) {
  console.error("❌ Failed to load Google credentials:", err.message);
}

// --- Google Auth setup ---
let auth;
if (credentials) {
  auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

// --- /articles endpoint ---
app.get("/articles", async (req, res) => {
  if (!auth) return res.status(500).json({ error: "Google auth not configured" });

  try {
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.SPREADSHEET_ID;
    const range = "Sheet1!A:E"; // Adjust sheet/tab & columns

    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    const rows = response.data.values || [];
    console.log("📥 Fetched rows:", rows.length);

    if (!rows.length) return res.json([]);

    const articles = rows.slice(1).map((row) => ({
      date: row[0] || "",
      title: row[1] || "",
      intro: row[2] || "",
      genre: row[3] || "",
      likes: parseInt(row[4] || "0", 10),
    }));

    res.json(articles);
  } catch (err) {
    console.error("❌ /articles error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch articles" });
  }
});

// --- /like endpoint ---
app.post("/like", async (req, res) => {
  try {
    const { articleId, newLikeCount } = req.body;
    console.log(`📌 Like request: ${articleId}, new count: ${newLikeCount}`);
    // Note: you could update Google Sheet here if desired
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

// --- Catch-all 404 handler ---
app.use((req, res) => {
  console.log("⚠️ 404 for path:", req.originalUrl);
  res.status(404).json({ error: "Endpoint not found" });
});

// --- Start server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
