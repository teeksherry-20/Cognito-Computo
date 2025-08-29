import express from "express";
import { google } from "googleapis";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://cogitocomputo.netlify.app",
      /\.netlify\.app$/,
    ],
    credentials: true,
  })
);

// Serve static files (frontend)
app.use(express.static(path.join(__dirname)));

// --- Load Google credentials ---
let credentials;
let auth;

const LOCAL_SPREADSHEET_ID = "1eHdXlQOsNwS1a8-69_cW0f8rYvH-BTiMU31bYFOEQa0";

const LOCAL_CREDENTIALS = {
  type: "service_account",
  project_id: "root-isotope-468903-h9",
  private_key_id: "338015a726007eb7360aac3d60a0c0c6753edf99",
  private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n") || "-----BEGIN PRIVATE KEY-----\nXXXX\n-----END PRIVATE KEY-----\n",
  client_email: "blog-sheet@root-isotope-468903-h9.iam.gserviceaccount.com",
  client_id: "105693710590461283402",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url:
    "https://www.googleapis.com/robot/v1/metadata/x509/blog-sheet%40root-isotope-468903-h9.iam.gserviceaccount.com",
  universe_domain: "googleapis.com",
};

try {
  const rawCredentials =
    process.env.GOOGLE_CREDENTIALS_JSON ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (rawCredentials) {
    credentials = JSON.parse(rawCredentials);
    if (credentials.private_key) {
      credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
    }
    console.log("✅ Loaded Google credentials from environment");
  } else {
    credentials = LOCAL_CREDENTIALS;
    console.log("✅ Using local Google credentials for development");
  }

  console.log("🔧 Service account email:", credentials.client_email);
} catch (err) {
  console.error("❌ Failed to load Google credentials:", err.message);
}

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

// ==== ARTICLES ENDPOINT ====
app.get("/articles", async (req, res) => {
  if (!auth) {
    return res.status(500).json({ error: "Google auth not configured" });
  }
  try {
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId =
      process.env.SPREADSHEET_ID || LOCAL_SPREADSHEET_ID;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1!A:I",
    });

    const rows = response.data.values || [];
    const articles = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const idCell = row[0] ? row[0].toString().trim() : "";
      if (idCell.startsWith("article")) {
        const articleNumber = idCell.replace("article", "").trim();
        const articleId = parseInt(articleNumber) || i;

        const article = {
          id: articleId,
          title: (row[3] || "").toString().trim(),
          date: (row[4] || "").toString().trim(),
          genre: (row[5] || "").toString().trim(),
          intro: (row[6] || "").toString().trim(),
          fullContent: (row[7] || "").toString().trim(),
          likes: parseInt((row[8] || "0").toString(), 10),
        };

        if (article.title) {
          articles.push(article);
        }
      }
    }

    articles.sort((a, b) => a.id - b.id);
    res.json(articles);
  } catch (err) {
    console.error("❌ /articles error:", err.message);
    res.status(500).json({ error: "Failed to fetch articles" });
  }
});

// ==== ARTICLE LIKE ====
app.post("/like", async (req, res) => {
  const { articleId } = req.body; // e.g. "article3"
  try {
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId =
      process.env.SPREADSHEET_ID || LOCAL_SPREADSHEET_ID;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1!A:I",
    });

    const rows = response.data.values || [];

    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === articleId) {
        const likeIndex = 8; // Column I
        rows[i][likeIndex] = (
          parseInt(rows[i][likeIndex] || "0", 10) + 1
        ).toString();

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

app.get("/likes/:id", async (req, res) => {
  const articleId = `article${req.params.id}`;
  try {
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId =
      process.env.SPREADSHEET_ID || LOCAL_SPREADSHEET_ID;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1!A:I",
    });

    const rows = response.data.values || [];
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === articleId) {
        return res.json({
          likes: parseInt(rows[i][8] || "0", 10),
        });
      }
    }

    res.status(404).json({ error: "Article not found" });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch likes" });
  }
});

// ==== TROLLEY VOTE ====
app.post("/vote", async (req, res) => {
  const { option } = req.body; // "A" or "B"
  try {
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId =
      process.env.SPREADSHEET_ID || LOCAL_SPREADSHEET_ID;

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
      .filter((r) => r[0] === "trolley")
      .reduce(
        (acc, r) => ({ ...acc, [r[1]]: parseInt(r[2] || "0", 10) }),
        {}
      );

    res.json({ votes: tally });
  } catch (err) {
    console.error("❌ Failed to record vote:", err.message);
    res.status(500).json({ error: "Failed to record vote" });
  }
});

app.get("/votes", async (req, res) => {
  try {
    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheetId =
      process.env.SPREADSHEET_ID || LOCAL_SPREADSHEET_ID;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sheet1!A:C",
    });

    const rows = response.data.values || [];
    const tally = rows
      .filter((r) => r[0] === "trolley")
      .reduce(
        (acc, r) => ({ ...acc, [r[1]]: parseInt(r[2] || "0", 10) }),
        {}
      );

    res.json({ votes: tally });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch votes" });
  }
});

// --- Serve index.html ---
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// --- Start server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
