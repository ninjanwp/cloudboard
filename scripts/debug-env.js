#!/usr/bin/env node

/**
 * Debug script to validate the service account JSON in .env file
 */

require('dotenv').config();

console.log("🔍 Debugging Firebase Service Account JSON...\n");

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error("❌ FIREBASE_SERVICE_ACCOUNT not found in .env file");
  console.log("💡 Make sure you have added FIREBASE_SERVICE_ACCOUNT='{\"type\":\"service_account\",...}' to your .env file");
  process.exit(1);
}

console.log("✅ FIREBASE_SERVICE_ACCOUNT found in .env");
console.log("📏 Length:", process.env.FIREBASE_SERVICE_ACCOUNT.length, "characters");
console.log("🔤 First 100 characters:", process.env.FIREBASE_SERVICE_ACCOUNT.substring(0, 100));
console.log("🔤 Last 100 characters:", process.env.FIREBASE_SERVICE_ACCOUNT.substring(-100));

try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  console.log("\n✅ JSON parsing successful!");
  console.log("📋 Service account details:");
  console.log("   - Type:", serviceAccount.type);
  console.log("   - Project ID:", serviceAccount.project_id);
  console.log("   - Client Email:", serviceAccount.client_email);
  console.log("   - Has Private Key:", serviceAccount.private_key ? "Yes" : "No");
  
  if (serviceAccount.project_id !== process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    console.log("\n⚠️  Warning: Service account project_id doesn't match NEXT_PUBLIC_FIREBASE_PROJECT_ID");
    console.log("   Service Account:", serviceAccount.project_id);
    console.log("   .env file:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
  }
  
} catch (error) {
  console.error("\n❌ JSON parsing failed:", error.message);
  console.log("\n🔧 Common issues and fixes:");
  console.log("1. Make sure the JSON is on a single line in .env file");
  console.log("2. Don't add extra quotes around the JSON");
  console.log("3. Escape any backslashes in the private key (\\n should stay as \\n)");
  console.log("4. Make sure there are no trailing spaces or newlines");
  console.log("\n📝 Correct format in .env file:");
  console.log('FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"..."}');
  console.log("\n🚫 Incorrect formats:");
  console.log('FIREBASE_SERVICE_ACCOUNT="{...}"  # Extra quotes');
  console.log('FIREBASE_SERVICE_ACCOUNT={"type": # Broken across lines');
  console.log('                         "service_account"}');
}
