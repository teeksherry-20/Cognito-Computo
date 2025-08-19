#!/usr/bin/env node

// verify-json.js - Simplified utility to check your service account JSON file
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonPath = path.join(__dirname, 'root-isotope-468903-h9-1e1bd3d2e348.json');

console.log('🔍 Verifying service account JSON file...\n');

try {
  if (!fs.existsSync(jsonPath)) {
    console.error('❌ Service account JSON file not found!');
    process.exit(1);
  }

  const rawData = fs.readFileSync(jsonPath, 'utf8');
  let serviceAccount;
  
  try {
    serviceAccount = JSON.parse(rawData);
  } catch (parseError) {
    console.error('❌ Invalid JSON format:', parseError.message);
    process.exit(1);
  }

  const requiredFields = [
    'type', 'project_id', 'private_key_id', 'private_key', 
    'client_email', 'client_id', 'auth_uri', 'token_uri'
  ];

  console.log('✅ JSON file found and parsed successfully');
  console.log('📋 Checking required fields:\n');

  let hasAllFields = true;

  for (const field of requiredFields) {
    if (serviceAccount[field]) {
      console.log(`✅ ${field}: Present`);
    } else {
      console.log(`❌ ${field}: Missing`);
      hasAllFields = false;
    }
  }

  console.log('\n📊 Summary:');
  if (hasAllFields) {
    console.log('✅ All required fields are present');
    console.log('✅ JSON structure is correct');
    console.log('\n🎉 Your service account file looks good!');
    console.log('\n🔧 If you\'re still getting errors, try:');
    console.log('1. Restart your server completely');
    console.log('2. Check that your system clock is synchronized');
    console.log('3. Verify the spreadsheet is shared with:', serviceAccount.client_email);
  } else {
    console.log('❌ Some required fields are missing');
    console.log('🔧 Please check your service account JSON file');
  }

} catch (error) {
  console.error('❌ Error reading service account file:', error.message);
  process.exit(1);
}
