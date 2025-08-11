#!/usr/bin/env node

/**
 * Cleanup Script for Cloudboard Firestore
 * 
 * This script deletes all tasks (cards) from the specified project.
 * It uses Firebase Admin SDK and includes safety confirmations.
 * 
 * Usage: node scripts/cleanup-tasks.js
 */

const admin = require('firebase-admin');
const readline = require('readline');
require('dotenv').config();

// Initialize Firebase Admin SDK
try {
  // Try to use service account from environment variable
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    });
  } else {
    // Fallback to default credentials
    admin.initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    });
  }
} catch (error) {
  console.error("❌ Failed to initialize Firebase Admin:", error.message);
  console.log("💡 Make sure your .env file is configured with FIREBASE_SERVICE_ACCOUNT");
  process.exit(1);
}

const db = admin.firestore();

// Configuration
const PROJECT_ID = "SBunsdGzfUNiD2vPjTgh";

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function getProjectBoards(projectId) {
  try {
    const boardsRef = db.collection(`projects/${projectId}/boards`);
    const boardsSnap = await boardsRef.get();
    
    const boards = [];
    boardsSnap.forEach((doc) => {
      boards.push({
        id: doc.id,
        name: doc.data().name || 'Untitled Board'
      });
    });
    
    return boards;
  } catch (error) {
    console.error("Error fetching boards:", error);
    return [];
  }
}

async function countTasks(projectId) {
  try {
    const boards = await getProjectBoards(projectId);
    let totalTasks = 0;
    const boardTaskCounts = [];

    for (const board of boards) {
      const cardsRef = db.collection(`projects/${projectId}/boards/${board.id}/cards`);
      const cardsSnap = await cardsRef.get();
      const taskCount = cardsSnap.size;
      totalTasks += taskCount;
      
      boardTaskCounts.push({
        boardName: board.name,
        boardId: board.id,
        taskCount: taskCount
      });
    }

    return { totalTasks, boardTaskCounts };
  } catch (error) {
    console.error("Error counting tasks:", error);
    return { totalTasks: 0, boardTaskCounts: [] };
  }
}

async function deleteAllTasks(projectId) {
  try {
    const boards = await getProjectBoards(projectId);
    let totalDeleted = 0;

    console.log("\n🗑️  Starting task deletion...\n");

    for (const board of boards) {
      console.log(`📋 Processing board: ${board.name} (${board.id})`);
      
      const cardsRef = db.collection(`projects/${projectId}/boards/${board.id}/cards`);
      const cardsSnap = await cardsRef.get();
      
      if (cardsSnap.empty) {
        console.log("   ℹ️  No tasks found in this board");
        continue;
      }

      console.log(`   🔍 Found ${cardsSnap.size} tasks to delete`);
      
      // Delete in batches to avoid hitting Firestore limits
      const batch = db.batch();
      let batchCount = 0;
      let deletedInBoard = 0;

      for (const doc of cardsSnap.docs) {
        batch.delete(doc.ref);
        batchCount++;
        deletedInBoard++;

        // Commit batch every 500 operations (Firestore limit is 500)
        if (batchCount === 500) {
          await batch.commit();
          console.log(`   ✅ Deleted batch of ${batchCount} tasks`);
          batchCount = 0;
        }
      }

      // Commit remaining operations
      if (batchCount > 0) {
        await batch.commit();
        console.log(`   ✅ Deleted final batch of ${batchCount} tasks`);
      }

      console.log(`   🎉 Deleted ${deletedInBoard} tasks from ${board.name}`);
      totalDeleted += deletedInBoard;
      console.log("");
    }

    return totalDeleted;
  } catch (error) {
    console.error("Error deleting tasks:", error);
    throw error;
  }
}

async function main() {
  try {
    console.log("🧹 Cloudboard Task Cleanup Script");
    console.log("=================================\n");
    
    console.log(`🎯 Target Project: ${PROJECT_ID}`);
    
    // Check if project exists
    const projectRef = db.doc(`projects/${PROJECT_ID}`);
    const projectDoc = await projectRef.get();
    
    if (!projectDoc.exists) {
      console.error(`❌ Project ${PROJECT_ID} does not exist!`);
      process.exit(1);
    }
    
    const projectData = projectDoc.data();
    console.log(`✅ Project found: ${projectData.name || 'Untitled Project'}\n`);
    
    // Count existing tasks
    console.log("🔍 Analyzing existing tasks...");
    const { totalTasks, boardTaskCounts } = await countTasks(PROJECT_ID);
    
    if (totalTasks === 0) {
      console.log("ℹ️  No tasks found in this project. Nothing to delete!");
      rl.close();
      return;
    }
    
    console.log(`\n📊 Found ${totalTasks} tasks across ${boardTaskCounts.length} boards:`);
    boardTaskCounts.forEach(board => {
      console.log(`   - ${board.boardName}: ${board.taskCount} tasks`);
    });
    
    // Safety confirmation
    console.log("\n⚠️  WARNING: This action will permanently delete ALL tasks in this project!");
    console.log("⚠️  This action cannot be undone!");
    
    const confirm1 = await askQuestion("\n❓ Are you sure you want to delete all tasks? (type 'yes' to continue): ");
    
    if (confirm1.toLowerCase() !== 'yes') {
      console.log("❌ Operation cancelled by user");
      rl.close();
      return;
    }
    
    const confirm2 = await askQuestion(`❓ Please type the project ID '${PROJECT_ID}' to confirm: `);
    
    if (confirm2 !== PROJECT_ID) {
      console.log("❌ Project ID mismatch. Operation cancelled for safety.");
      rl.close();
      return;
    }
    
    console.log("\n✅ Confirmation received. Starting deletion...");
    
    const startTime = Date.now();
    const deletedCount = await deleteAllTasks(PROJECT_ID);
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log("🎉 Cleanup completed successfully!");
    console.log(`📊 Results:`);
    console.log(`   - Tasks deleted: ${deletedCount}`);
    console.log(`   - Time taken: ${duration} seconds`);
    console.log(`   - Project: ${projectData.name || PROJECT_ID}`);
    
    rl.close();
    
  } catch (error) {
    console.error("💥 Cleanup failed:", error);
    rl.close();
    process.exit(1);
  }
}

// Safety check for configuration
if (require.main === module) {
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    console.error("❌ Missing Firebase configuration!");
    console.log("💡 Make sure your .env file is configured with Firebase settings");
    process.exit(1);
  }
  
  main().catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  });
}

module.exports = { deleteAllTasks };
