import express from "express";
import { google } from "googleapis";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Allow only your Netlify frontend
app.use(
  cors({
    origin: "https://cogitocomputo.netlify.app",
  })
);

app.use(express.json());

// ===== GOOGLE SHEETS SETUP =====
const serviceKey = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);

const auth = new google.auth.GoogleAuth({
  credentials: serviceKey,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });
const SPREADSHEET_ID = "1tY7Slk-rsQkgApNN3m-IRBLBJyIKRjje_W9s9QGg57A";

// ===== GET ARTICLES =====
app.get("/articles", async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A2:I",
    });

    const rows = response.data.values || [];
    const articles = rows.map((row, idx) => ({
      id: row[0] || `article${idx + 1}`,
      option: row[1] || "",
      likes: parseInt(row[2] || "0", 10),
      title: row[3] || "",
      date: row[4] || "",
      genre: row[5] || "",
      introduction: row[6] || "",
      fullContent: row[7] || "",
      image: row[8] || "",
    }));

    res.json(articles);
  } catch (err) {
    console.error("Error fetching articles:", err);
    res.status(500).json({ error: "Failed to fetch articles" });
  }
});

// ===== LIKE ARTICLE =====
app.post("/like", async (req, res) => {
  const { articleId } = req.body;

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A2:C",
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex((row) => row[0] === articleId);

    if (rowIndex === -1) {
      return res.status(404).json({ error: "Article not found" });
    }

    const currentLikes = parseInt(rows[rowIndex][2] || "0", 10);
    const newLikes = currentLikes + 1;

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Sheet1!C${rowIndex + 2}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[newLikes]],
      },
    });

    res.json({ success: true, likes: newLikes });
  } catch (err) {
    console.error("Error updating like:", err);
    res.status(500).json({ error: "Failed to update like" });
  }
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
