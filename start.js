#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting Cogito Computo Blog Server...\n');

// Check if required files exist
const requiredFiles = [
  'server.js',
  'package.json',
  'root-isotope-468903-h9-1e1bd3d2e348.json',
  'index.html',
  'client.js',
  'styles.css'
];

const missingFiles = requiredFiles.filter(file => {
  const filePath = path.join(__dirname, file);
  return !fs.existsSync(filePath);
});

if (missingFiles.length > 0) {
  console.error('❌ Missing required files:');
  missingFiles.forEach(file => console.error(`   - ${file}`));
  console.error('\nPlease ensure all files are in the project directory.');
  process.exit(1);
}

console.log('✅ All required files found');

// Step 1: Run verify-json.js before starting
function runVerifier() {
  return new Promise((resolve, reject) => {
    console.log('\n🔍 Running service account verification...');
    const verifier = spawn('node', ['verify-json.js'], {
      stdio: 'inherit',
      shell: true
    });

    verifier.on('close', (code) => {
      if (code !== 0) {
        reject(new Error('❌ Service account verification failed. Fix the JSON file before continuing.'));
      } else {
        console.log('✅ Service account verification passed\n');
        resolve();
      }
    });
  });
}

// Step 2: Check dependencies and start server
async function start() {
  try {
    await runVerifier();

    if (!fs.existsSync(path.join(__dirname, 'node_modules'))) {
      console.log('📦 Installing dependencies...');

      const npmInstall = spawn('npm', ['install'], {
        stdio: 'inherit',
        shell: true
      });

      npmInstall.on('close', (code) => {
        if (code !== 0) {
          console.error('❌ Failed to install dependencies');
          process.exit(1);
        }
        console.log('✅ Dependencies installed successfully\n');
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
  console.log('🔄 Starting server...\n');

  const server = spawn('node', ['server.js'], {
    stdio: 'inherit',
    shell: true
  });

  server.on('error', (err) => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  });

  server.on('close', (code) => {
    console.log(`\n📴 Server stopped with exit code ${code}`);
    process.exit(code);
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    server.kill('SIGTERM');
  });
}

// Run the startup sequence
start();
