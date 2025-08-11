#!/usr/bin/env node

/**
 * Mock Data Generator for Cloudboard Firestore
 * 
 * This script generates realistic mock data for tasks in the specified project.
 * It uses Firebase Admin SDK to bypass authentication requirements.
 * 
 * Usage: node scripts/generate-mock-data.js
 */

const admin = require('firebase-admin');
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
    // Fallback to default credentials (if running on Google Cloud or with gcloud auth)
    admin.initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    });
  }
} catch (error) {
  console.error("❌ Failed to initialize Firebase Admin:", error.message);
  console.log("💡 See setup instructions below for service account configuration");
  process.exit(1);
}

const db = admin.firestore();

// Configuration
const PROJECT_ID = "SBunsdGzfUNiD2vPjTgh";
const NUM_TASKS = 25; // Number of mock tasks to generate

// Sample data for realistic task generation
const TASK_TITLES = [
  "Implement user authentication system",
  "Design dashboard wireframes", 
  "Set up CI/CD pipeline",
  "Write unit tests for API endpoints",
  "Optimize database queries",
  "Create user onboarding flow",
  "Fix mobile responsive layout",
  "Add real-time notifications",
  "Implement search functionality",
  "Review code security vulnerabilities",
  "Update documentation",
  "Migrate legacy components",
  "Setup monitoring and logging",
  "Integrate payment gateway",
  "Build admin panel",
  "Implement data export feature",
  "Create email templates",
  "Add multi-language support",
  "Optimize image loading",
  "Setup error tracking",
  "Implement caching strategy",
  "Add dark mode support",
  "Create API documentation",
  "Setup backup system",
  "Implement social login"
];

const TASK_DESCRIPTIONS = [
  "This task involves implementing secure user authentication with email/password and social login options.",
  "Create comprehensive wireframes for the main dashboard showing key metrics and user actions.",
  "Set up automated testing and deployment pipeline using GitHub Actions.",
  "Write comprehensive unit tests to ensure API reliability and catch regressions early.",
  "Analyze and optimize slow database queries to improve application performance.",
  "Design and implement a smooth onboarding experience for new users.",
  "Fix responsive design issues on mobile devices and tablets.",
  "Add real-time push notifications for important user actions and updates.",
  "Implement full-text search across all user content with filters and sorting.",
  "Conduct security audit and fix any vulnerabilities found in the codebase.",
  "Update all project documentation including API docs and user guides.",
  "Migrate old components to new design system and modern React patterns.",
  "Setup comprehensive monitoring, logging and alerting for production environment.",
  "Integrate Stripe payment processing for subscription and one-time payments.",
  "Build comprehensive admin panel for user and content management.",
  "Allow users to export their data in CSV, PDF and JSON formats.",
  "Design and implement responsive email templates for all notifications.",
  "Add internationalization support for multiple languages and locales.",
  "Implement lazy loading and optimization for images and media files.",
  "Setup error tracking and reporting using Sentry or similar service.",
  "Implement Redis caching to improve application response times.",
  "Add dark mode theme with smooth transitions and user preference storage.",
  "Create comprehensive API documentation with examples and testing tools.",
  "Setup automated backup system for database and user files.",
  "Allow users to login with Google, GitHub, and other social providers."
];

const COLUMNS = ["backlog", "todo", "doing", "done"];

// Sample user emails (you can customize these)
const SAMPLE_USERS = [
  { email: "nick.pfef@gmail.com", uid: "AdFS3qYSjuQNGa4x6RzfRq9dPx73" },
  { email: "alice.johnson@example.com", uid: "Bx8K9LmN2pQr5tUv7wXy1ZaB3cD4" },
  { email: "bob.smith@example.com", uid: "CvF6gH8jK9mN2pQr5tUv7wXy1ZaB" },
  { email: "sarah.wilson@example.com", uid: "DmN2pQr5tUv7wXy1ZaB3cD4eF6gH" },
  { email: "mike.davis@example.com", uid: "EpQr5tUv7wXy1ZaB3cD4eF6gH8jK" }
];

// Utility functions
function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomDate(daysAgo = 30) {
  const now = new Date();
  const randomDays = Math.floor(Math.random() * daysAgo);
  const date = new Date(now.getTime() - (randomDays * 24 * 60 * 60 * 1000));
  return date.toISOString();
}

function getRandomAugust2025Date() {
  // Generate random date in August 2025 (1st to 31st)
  const year = 2025;
  const month = 7; // August (0-indexed)
  const day = getRandomInt(1, 31);
  
  const date = new Date(year, month, day);
  
  // Format as YYYY-MM-DD string
  return date.toISOString().split('T')[0];
}

function getRandomScheduleDate() {
  // 80% chance to have a scheduled date in August 2025
  if (Math.random() > 0.2) {
    return getRandomAugust2025Date();
  }
  return null;
}

function generateMockTask(index) {
  const createdBy = getRandomElement(SAMPLE_USERS);
  const createdAt = getRandomDate(30);
  const lastModified = new Date(new Date(createdAt).getTime() + getRandomInt(0, 5) * 24 * 60 * 60 * 1000).toISOString();
  
  // Generate random scheduled date in August 2025
  const scheduledDate = getRandomScheduleDate();
  
  // 70% chance to have assignment
  const hasAssignment = Math.random() > 0.3;
  let assignment = null;
  
  if (hasAssignment) {
    const assignedUser = getRandomElement(SAMPLE_USERS);
    const assignedAt = new Date(new Date(createdAt).getTime() + getRandomInt(0, 2) * 24 * 60 * 60 * 1000).toISOString();
    
    assignment = {
      assignedTo: assignedUser.email,
      assignedAt: assignedAt
    };
  }

  const task = {
    title: getRandomElement(TASK_TITLES),
    description: getRandomElement(TASK_DESCRIPTIONS),
    column: getRandomElement(COLUMNS),
    createdAt: createdAt,
    lastModified: lastModified,
    createdBy: {
      email: createdBy.email,
      uid: createdBy.uid
    },
    order: getRandomInt(100, 9999),
    duration: getRandomInt(15, 480) // 15 minutes to 8 hours
  };

  // Add optional fields
  if (assignment) {
    task.assignment = assignment;
  }
  
  if (scheduledDate) {
    task.date = scheduledDate;
  }

  return task;
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

async function generateMockData() {
  try {
    console.log(`🚀 Starting mock data generation for project: ${PROJECT_ID}`);
    console.log(`📊 Will generate ${NUM_TASKS} mock tasks`);
    console.log(`🔧 Using Firebase Admin SDK (bypasses authentication)`);
    
    // Check if project exists and get its boards
    const projectRef = db.doc(`projects/${PROJECT_ID}`);
    const projectDoc = await projectRef.get();
    
    if (!projectDoc.exists) {
      console.error(`❌ Project ${PROJECT_ID} does not exist!`);
      return;
    }
    
    const projectData = projectDoc.data();
    console.log(`✅ Project found: ${projectData.name || 'Untitled Project'}`);
    
    // Get all boards in the project
    const boards = await getProjectBoards(PROJECT_ID);
    
    if (boards.length === 0) {
      console.error(`❌ No boards found in project ${PROJECT_ID}!`);
      console.log("💡 You need to create at least one board in your project first.");
      return;
    }
    
    console.log(`📋 Found ${boards.length} board(s):`);
    boards.forEach(board => {
      console.log(`   - ${board.name} (${board.id})`);
    });
    
    // Use the first board for adding tasks
    const targetBoard = boards[0];
    console.log(`🎯 Adding tasks to board: ${targetBoard.name}`);
    
    const cardsRef = db.collection(`projects/${PROJECT_ID}/boards/${targetBoard.id}/cards`);
    
    console.log("\n📝 Generating tasks...\n");
    
    for (let i = 0; i < NUM_TASKS; i++) {
      const task = generateMockTask(i);
      
      try {
        const docRef = await cardsRef.add(task);
        console.log(`✅ Created task ${i + 1}/${NUM_TASKS}: "${task.title}" (${docRef.id})`);
        console.log(`   📍 Column: ${task.column} | 🕒 Duration: ${task.duration}min | 👤 Created by: ${task.createdBy.email}`);
        if (task.date) {
          console.log(`   📅 Scheduled: ${task.date}`);
        }
        if (task.assignment) {
          console.log(`   📝 Assigned to: ${task.assignment.assignedTo}`);
        }
        console.log("");
        
        // Small delay to avoid overwhelming Firestore
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Failed to create task ${i + 1}:`, error);
      }
    }
    
    console.log(`🎉 Successfully generated ${NUM_TASKS} mock tasks!`);
    console.log(`📂 Location: projects/${PROJECT_ID}/boards/${targetBoard.id}/cards/`);
    console.log("\n📊 Task Distribution:");
    console.log("   - Backlog: ~25%");
    console.log("   - Todo: ~25%");
    console.log("   - Doing: ~25%");
    console.log("   - Done: ~25%");
    console.log("\n📅 Scheduling:");
    console.log("   - ~80% of tasks have scheduled dates in August 2025");
    console.log("   - ~20% of tasks are unscheduled");
    console.log("   - Dates spread throughout August 1-31");
    console.log("\n✨ Mock data generation complete!");
    
  } catch (error) {
    console.error("❌ Error generating mock data:", error);
    if (error.code === 'permission-denied') {
      console.log("💡 This might be a Firestore rules issue. Admin SDK should bypass rules.");
      console.log("💡 Check your Firebase project configuration.");
    }
  }
}

// Run the script
if (require.main === module) {
  // Check if properly configured
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    console.error("❌ Missing Firebase configuration!");
    console.log("\n📋 SETUP INSTRUCTIONS:");
    console.log("1. Create a service account in your Firebase Console:");
    console.log("   - Go to Project Settings > Service Accounts");
    console.log("   - Click 'Generate new private key'");
    console.log("   - Download the JSON file");
    console.log("");
    console.log("2. Add the service account to your .env file:");
    console.log("   FIREBASE_SERVICE_ACCOUNT='paste_the_entire_json_content_here'");
    console.log("   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id");
    console.log("");
    console.log("3. Alternatively, if running on Google Cloud:");
    console.log("   - Just set NEXT_PUBLIC_FIREBASE_PROJECT_ID");
    console.log("   - The script will use default credentials");
    console.log("");
    process.exit(1);
  }

  generateMockData()
    .then(() => {
      console.log("\n🏁 Script execution completed.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Script failed:", error);
      console.log("\n📋 TROUBLESHOOTING:");
      console.log("1. Verify your Firebase project ID");
      console.log("2. Check service account permissions");
      console.log("3. Ensure the project exists and has boards");
      process.exit(1);
    });
}

module.exports = { generateMockData };
