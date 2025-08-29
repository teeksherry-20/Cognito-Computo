// server.js
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { google } from "googleapis";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// ===== Google Sheets Setup =====
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const SPREADSHEET_ID = process.env.SHEET_ID;

// Load service account credentials
let credentials;
try {
  credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS || fs.readFileSync("root-isotope-468903-h9-1e1bd3d2e348.json", "utf-8"));
} catch (err) {
  console.error("❌ Failed to load Google credentials:", err);
  process.exit(1);
}

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: SCOPES,
});

const sheets = google.sheets({ version: "v4", auth });

// ===== In-memory likes & votes =====
let likes = {};
let votes = { A: 0, B: 0 };

// ===== Routes =====

// ✅ Fetch all articles
app.get("/articles", async (req, res) => {
  try {
    const range = "Sheet1!A:I"; // ID, Genre, Intro, Title, Date, FullContent, Likes, Author, Image
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range,
    });

    const rows = response.data.values || [];

    const articles = rows
      .map((row, index) => {
        // Only requirement: Title (col D)
        if (!row[3]) return null;

        return {
          id: row[0] || `article-${index}`,
          genre: row[1] || "General",
          intro: row[2] || "",
          title: row[3],
          date: row[4] || new Date().toISOString(),
          fullContent: row[5] || "",
          likes: parseInt(row[6]) || 0,
          author: row[7] || "Anonymous",
          imageUrl: row[8] || "",
        };
      })
      .filter((article) => article !== null);

    console.log(`✅ Successfully processed ${articles.length} articles`);
    res.json(articles);
  } catch (error) {
    console.error("❌ Error fetching articles:", error);
    res.status(500).send("Error fetching articles");
  }
});

// ✅ Like an article
app.post("/like", (req, res) => {
  const { articleId } = req.body;
  if (!articleId) return res.status(400).send("Missing articleId");

  likes[articleId] = (likes[articleId] || 0) + 1;
  res.json({ likes: likes[articleId] });
});

// ✅ Get article likes
app.get("/likes/:articleId", (req, res) => {
  const articleId = req.params.articleId;
  res.json({ likes: likes[articleId] || 0 });
});

// ✅ Vote (Trolley Problem)
app.post("/vote", (req, res) => {
  const { choice } = req.body;
  if (choice === "A" || choice === "B") {
    votes[choice]++;
  }
  res.json(votes);
});

// ✅ Get votes
app.get("/votes", (req, res) => {
  res.json(votes);
});

// ===== Start Server =====
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
