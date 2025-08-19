// server.js
const express = require("express");
const { google } = require("googleapis");
const path = require("path");

const app = express();
app.use(express.json());

// Serve static frontend
app.use(express.static(path.join(__dirname)));

// --- Google Sheets Auth ---
let auth;
try {
  if (!process.env.GOOGLE_CREDENTIALS_JSON) throw new Error("GOOGLE_CREDENTIALS_JSON not set");
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);

  auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  console.log("✅ GoogleAuth configured");
} catch (err) {
  console.error("❌ Google Sheets auth failed:", err.message);
}

// --- Helper: get Sheets client ---
function getSheetsClient() {
  if (!auth) throw new Error("GoogleAuth not initialized");
  return google.sheets({ version: "v4", auth });
}

// --- /articles endpoint ---
app.get("/articles", async (req, res) => {
  try {
    const sheets = getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: "Sheet1!A:E", // Adjust columns as needed
    });

    const rows = response.data.values || [];
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
    console.error("❌ /articles error:", err.stack);
    res.status(500).json({ error: "Failed to fetch articles" });
  }
});

// --- /like endpoint ---
app.post("/like", async (req, res) => {
  try {
    const { articleId, newLikeCount } = req.body;
    console.log(`📌 Like request: ${articleId}, new likes: ${newLikeCount}`);

    // Optionally: write back to Google Sheets here

    res.json({ success: true, articleId, newLikeCount });
  } catch (err) {
    console.error("❌ /like error:", err.stack);
    res.status(500).json({ error: err.message });
  }
});

// --- Serve frontend ---
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// --- Catch-all 404 ---
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// --- Start server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
