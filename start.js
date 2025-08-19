#!/usr/bin/env node

import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🚀 Starting Cogito Computo Blog Server...\n");

// Check if required files exist
const requiredFiles = [
  "server.js",
  "package.json",
  "index.html",
  "client.js",
  "styles.css"
];

const missingFiles = requiredFiles.filter(file => {
  const filePath = path.join(__dirname, file);
  return !fs.existsSync(filePath);
});

if (missingFiles.length > 0) {
  console.error("❌ Missing required files:");
  missingFiles.forEach(file => console.error(`   - ${file}`));
  process.exit(1);
}

console.log("✅ All required files found");

// Step 1: Verify GOOGLE_CREDENTIALS_JSON environment variable
function verifyEnv() {
  return new Promise((resolve, reject) => {
    console.log("\n🔍 Verifying GOOGLE_CREDENTIALS_JSON environment variable...");
    const raw = process.env.GOOGLE_CREDENTIALS_JSON;
    if (!raw) {
      reject(new Error("❌ GOOGLE_CREDENTIALS_JSON is not set in the environment"));
      return;
    }

    try {
      JSON.parse(raw);
      console.log("✅ GOOGLE_CREDENTIALS_JSON is valid JSON\n");
      resolve();
    } catch (err) {
      reject(new Error("❌ GOOGLE_CREDENTIALS_JSON contains invalid JSON"));
    }
  });
}

// Step 2: Install dependencies if needed and start server
async function start() {
  try {
    await verifyEnv();

    if (!fs.existsSync(path.join(__dirname, "node_modules"))) {
      console.log("📦 Installing dependencies...");

      const npmInstall = spawn("npm", ["install"], { stdio: "inherit", shell: true });
      npmInstall.on("close", code => {
        if (code !== 0) {
          console.error("❌ Failed to install dependencies");
          process.exit(1);
        }
        console.log("✅ Dependencies installed successfully\n");
        startServer();
      });
    } else {
      startServer();
    }
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

function startServer() {
  console.log("🔄 Starting server...\n");

  const server = spawn("node", ["server.js"], { stdio: "inherit", shell: true });

  server.on("error", err => {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  });

  server.on("close", code => {
    console.log(`\n📴 Server stopped with exit code ${code}`);
    process.exit(code);
  });

  process.on("SIGINT", () => {
    console.log("\n🛑 Shutting down server...");
    server.kill("SIGTERM");
  });
}

// Run the startup sequence
start();
