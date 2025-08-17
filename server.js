import express from "express";
import cors from "cors";
import { google } from "googleapis";
import fs from "fs";

// Load service account from file (do NOT expose to frontend!)
const serviceAccountKey = JSON.parse(
  fs.readFileSync("root-isotope-468903-h9-99f70f4b9a07.json", "utf8")
);

const SPREADSHEET_ID = "1eHdXlQOsNwS1a8-69_cW0f8rYvH-BTiMU31bYFOEQa0";

const app = express();
app.use(cors());
app.use(express.json());

const auth = new google.auth.GoogleAuth({
  credentials: serviceAccountKey,
  scopes: [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
  ],
});

const sheets = google.sheets({ version: "v4", auth });

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Fetch all articles
app.get("/articles", async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A4:I",
    });
    const rows = response.data.values || [];
    const articles = rows.map((row) => ({
      id: row[0],
      title: row[3],
      date: row[4],
      genre: row[5],
      intro: row[6],
      full: row[7],
      likes: row[8] ? parseInt(row[8]) : 0,
    }));
    res.json(articles);
  } catch (err) {
    console.error("Error fetching articles:", err);
    res.status(500).json({ error: err.message });
  }
});

// Like an article
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

    res.json({
      success: true,
      message: `Updated likes for "${articleId}" to ${newLikeCount}`,
    });
  } catch (err) {
    console.error("Error updating likes:", err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
