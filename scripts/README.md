# Mock Data Generator

This script generates realistic mock data for your Cloudboard Firestore database. It creates tasks with all the required fields matching your existing data structure.

## Prerequisites

1. **Firebase Project Setup**: Ensure your Firebase project is configured and accessible
2. **Environment Variables**: Set up your `.env` file with Firebase configuration
3. **Project Structure**: Your target project must exist in Firestore with at least one board

## Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Configuration**:
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env and fill in your Firebase configuration values
   # IMPORTANT: Also add ADMIN_EMAIL and ADMIN_PASSWORD
   ```

3. **Admin User Setup**:
   - The script requires authentication with a user who is a member of the target project
   - Add `ADMIN_EMAIL` and `ADMIN_PASSWORD` to your `.env` file
   - Ensure this user is already a member of project `SBunsdGzfUNiD2vPjTgh`

4. **Verify Project Structure**:
   - Ensure project `SBunsdGzfUNiD2vPjTgh` exists in your Firestore
   - Ensure the project has at least one board created
   - Ensure the admin user is a member of the project

## Usage

### Method 1: Using npm script (Recommended)
```bash
npm run generate-mock-data
```

### Method 2: Direct execution
```bash
node scripts/generate-mock-data.js
```

## Configuration

You can customize the script by editing `scripts/generate-mock-data.js`:

- **`PROJECT_ID`**: Change the target project ID (currently set to "SBunsdGzfUNiD2vPjTgh")
- **`NUM_TASKS`**: Number of tasks to generate (default: 25)
- **`SAMPLE_USERS`**: Add or modify user emails and UIDs
- **`TASK_TITLES`**: Customize task titles
- **`TASK_DESCRIPTIONS`**: Customize task descriptions

## Generated Data Structure

Each generated task will have the following fields matching your existing structure:

```javascript
{
  title: "string",              // Random realistic task title
  description: "string",        // Random realistic description
  column: "string",            // One of: "backlog", "todo", "doing", "done"
  createdAt: "ISO string",     // Random date within last 30 days
  lastModified: "ISO string",  // Date after createdAt
  createdBy: {
    email: "string",           // Random from SAMPLE_USERS
    uid: "string"              // Corresponding UID
  },
  order: number,               // Random order between 100-9999
  duration: number,            // Random duration between 15-480 minutes
  assignment: {                // 70% chance to be assigned
    assignedTo: "string",      // Email from SAMPLE_USERS
    assignedAt: "ISO string"   // Date after createdAt
  }
}
```

## Features

- ✅ **Realistic Data**: Uses actual development task titles and descriptions
- ✅ **Proper Field Types**: Matches your exact Firestore schema
- ✅ **Random Distribution**: Tasks distributed across all columns
- ✅ **Assignment Logic**: 70% of tasks get assigned to random users
- ✅ **Date Logic**: Proper chronological ordering of dates
- ✅ **Error Handling**: Comprehensive error checking and reporting
- ✅ **Progress Feedback**: Real-time progress updates during generation

## Sample Output

```
🚀 Starting mock data generation for project: SBunsdGzfUNiD2vPjTgh
📊 Will generate 25 mock tasks
✅ Project found: My Project
📋 Found 1 board(s):
   - Main Board (abc123)
🎯 Adding tasks to board: Main Board

📝 Generating tasks...

✅ Created task 1/25: "Implement user authentication system" (xyz789)
   📍 Column: todo | 🕒 Duration: 120min | 👤 Created by: nick.pfef@gmail.com
   📝 Assigned to: alice.johnson@example.com

✅ Created task 2/25: "Design dashboard wireframes" (def456)
   📍 Column: doing | 🕒 Duration: 60min | 👤 Created by: bob.smith@example.com

...

🎉 Successfully generated 25 mock tasks!
📂 Location: projects/SBunsdGzfUNiD2vPjTgh/boards/abc123/cards/
✨ Mock data generation complete!
```

## Troubleshooting

### Common Issues

1. **"Project does not exist"**
   - Verify the PROJECT_ID in the script matches your Firestore project
   - Ensure you have read access to the project

2. **"No boards found"**
   - Create at least one board in your project through the UI first
   - Check Firestore rules allow reading boards collection

3. **"Permission denied"**
   - Verify your Firebase configuration in .env
   - **Add ADMIN_EMAIL and ADMIN_PASSWORD to your .env file**
   - Ensure the admin user is a member of the target project
   - Check Firestore security rules allow writes to the cards collection

4. **"Authentication failed"**
   - Verify ADMIN_EMAIL and ADMIN_PASSWORD are correct
   - Ensure the user account exists in Firebase Auth
   - Make sure the user is a member of the target project

4. **"Module not found"**
   - Run `npm install` to install dependencies
   - Ensure you're in the project root directory

### Environment Variables

Make sure your `.env` file contains valid values:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_actual_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_actual_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_actual_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_actual_app_id

# Admin credentials for script authentication
ADMIN_EMAIL=nick.pfef@gmail.com
ADMIN_PASSWORD=your_actual_password
```

## Safety Notes

- The script only adds data, it doesn't modify or delete existing tasks
- Each run creates new tasks with unique IDs
- Tasks are added to the first board found in the project
- Generated data is realistic but fictional

## Customization Examples

### Change target project:
```javascript
const PROJECT_ID = "your_different_project_id";
```

### Generate more tasks:
```javascript
const NUM_TASKS = 50;
```

### Add your team members:
```javascript
const SAMPLE_USERS = [
  { email: "your.email@company.com", uid: "your_uid_here" },
  { email: "teammate@company.com", uid: "teammate_uid" },
  // ... add more team members
];
```
