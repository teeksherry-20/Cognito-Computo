import express from "express";
import fetch from "node-fetch";
import { google } from "googleapis";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === GOOGLE AUTH ===
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_KEY),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const LOCAL_SPREADSHEET_ID = "1_9tdU0ivf_5I06v77gEsGbfbR88pmPCtTwSCMCHgwhM";

// === MIDDLEWARE ===
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// === ROUTES ===

// Fetch all articles
app.get("/articles", async (req, res) => {
  try {
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.SPREADSHEET_ID || LOCAL_SPREADSHEET_ID;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1!A:I",
    });

    const rows = response.data.values || [];
    const articles = rows
      .filter(r => r[0] && r[0] !== "trolley")
      .map(r => ({
        id: r[0],
        option: r[1] || "",
        count: r[2] || "0",
        title: r[3] || "",
        date: r[4] || "",
        genre: r[5] || "",
        introduction: r[6] || "",
        content: r[7] || "",
        likes: r[8] || "0",
      }));

    res.json(articles);
  } catch (err) {
    console.error("❌ Error fetching articles:", err.message);
    res.status(500).json({ error: "Failed to fetch articles" });
  }
});

// ==== ARTICLE LIKE ====
app.post("/like", async (req, res) => {
  const { articleId } = req.body; // e.g. "article3"
  try {
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.SPREADSHEET_ID || LOCAL_SPREADSHEET_ID;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1!A:I",
    });

    const rows = response.data.values || [];
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === articleId) {
        const likeIndex = 8; // col I
        rows[i][likeIndex] = (parseInt(rows[i][likeIndex] || "0", 10) + 1).toString();

        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `Sheet1!A${i + 1}:I${i + 1}`,
          valueInputOption: "RAW",
          requestBody: { values: [rows[i]] },
        });

        return res.json({ likes: parseInt(rows[i][likeIndex], 10) });
      }
    }

    res.status(404).json({ error: "Article not found" });
  } catch (err) {
    console.error("❌ Failed to record like:", err.message);
    res.status(500).json({ error: "Failed to record like" });
  }
});

// === GET current likes ===
app.get("/likes/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.SPREADSHEET_ID || LOCAL_SPREADSHEET_ID;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1!A:I",
    });

    const rows = response.data.values || [];
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === id) {
        const likeIndex = 8;
        return res.json({ likes: parseInt(rows[i][likeIndex] || "0", 10) });
      }
    }

    res.status(404).json({ error: "Article not found" });
  } catch (err) {
    console.error("❌ Error fetching likes:", err.message);
    res.status(500).json({ error: "Failed to fetch likes" });
  }
});

// ==== TROLLEY VOTE ====
app.post("/vote", async (req, res) => {
  const { option } = req.body; // "A" or "B"
  try {
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.SPREADSHEET_ID || LOCAL_SPREADSHEET_ID;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1!A:C",
    });

    const rows = response.data.values || [];
    let updated = false;

    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === "trolley" && rows[i][1] === option) {
        rows[i][2] = (parseInt(rows[i][2] || "0", 10) + 1).toString();
        updated = true;
        break;
      }
    }

    if (!updated) {
      rows.push(["trolley", option, "1"]);
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Sheet1!A:C",
      valueInputOption: "RAW",
      requestBody: { values: rows },
    });

    const tally = rows
      .filter(r => r[0] === "trolley")
      .reduce((acc, r) => ({ ...acc, [r[1]]: parseInt(r[2] || "0", 10) }), {});

    res.json({ votes: tally });
  } catch (err) {
    console.error("❌ Failed to record vote:", err.message);
    res.status(500).json({ error: "Failed to record vote" });
  }
});

// === GET current votes ===
app.get("/votes", async (req, res) => {
  try {
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId = process.env.SPREADSHEET_ID || LOCAL_SPREADSHEET_ID;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1!A:C",
    });

    const rows = response.data.values || [];
    const tally = rows
      .filter(r => r[0] === "trolley")
      .reduce((acc, r) => ({ ...acc, [r[1]]: parseInt(r[2] || "0", 10) }), {});

    res.json({ votes: tally });
  } catch (err) {
    console.error("❌ Error fetching votes:", err.message);
    res.status(500).json({ error: "Failed to fetch votes" });
  }
});

// === START SERVER ===
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
