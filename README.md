# Cloudboard: Interactive Kanban Board for Project Management

Cloudboard is a modern, collaborative Kanban board application designed for teams to manage tasks efficiently. It provides a visual workflow that helps teams track progress, organize work, and improve productivity.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Component Architecture](#component-architecture)
- [Data Structure](#data-structure)
- [Installation and Setup](#installation-and-setup)
- [Usage Guide](#usage-guide)
- [Task Management](#task-management)
- [Collaboration Features](#collaboration-features)
- [Project Configuration](#project-configuration)

## Overview

Cloudboard is a dynamic Kanban-style board application that enables teams to visualize and manage their workflow. It implements the classic board-column-card structure with modern features like drag-and-drop functionality, task prioritization, and team collaboration tools.

## Features

### Core Features

- **Interactive Kanban Board**: Intuitive drag-and-drop interface for managing tasks across different stages
- **Multiple Columns**: Organize tasks in standard workflow stages (Backlog, To Do, Doing, Done)
- **Task Prioritization**: Assign priority levels (High, Medium, Low) with visual indicators
- **Task Types**: Categorize tasks as regular tasks, bugs, or features
- **Task Sizing**: Estimate effort with size indicators (S, M, L, XL)
- **Real-time Updates**: Changes reflect immediately for all team members
- **Age Tracking**: Visual indicators for task age (Recent, Aging, Stale)

### Task Management

- **Detailed Task Cards**: Comprehensive information display with descriptions, metadata, and links
- **Task Assignment**: Assign tasks to team members with one click
- **Self-service Assignment**: Team members can "take" unassigned tasks
- **Task History**: Track creation and modification timestamps
- **Rich Descriptions**: Support for multi-line text descriptions
- **Link Attachments**: Add relevant URLs with custom titles to tasks

### Collaboration Features

- **Team Projects**: Access control at the project level
- **Activity Logging**: Track all task-related activities and changes
- **User Profiles**: Display names for better identification
- **Multi-user Support**: Designed for simultaneous use by team members

## Technology Stack

- **Frontend**: React.js with Next.js framework
- **UI Components**: Custom components with Framer Motion for animations
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: React hooks for local state, Firebase for global state
- **Database**: Firebase Firestore (Google Cloud)
- **Authentication**: Firebase Authentication
- **Hosting**: Personal Ubuntu Server

## Project Structure

The application is structured following Next.js conventions with React components organized by functionality:

```
cloudboard/
├── firebase.js        # Firebase configuration
├── src/
│   ├── app/           # Main application code
│   │   ├── components/   # React components
│   │   │   ├── CustomKanban.tsx      # Main Kanban board component
│   │   │   ├── Badge.tsx             # Priority badge component
│   │   │   ├── SizeIndicator.tsx     # Task size visualization
│   │   │   └── Modal.tsx             # Modal dialog component
│   │   ├── context/      # React context providers
│   │   │   └── AuthContext.tsx       # Authentication context
│   │   ├── utils/        # Utility functions
│   │   │   ├── userUtils.ts          # User-related helpers
│   │   │   └── logUtils.ts           # Logging functionality
│   │   └── projects/     # Project pages
│   │       └── [projectId]/          # Dynamic project route
│   │           └── page.tsx          # Project page component
```

## Component Architecture

The Kanban board is built with a hierarchical component structure:

1. **CustomKanban**: The root component that handles authentication and initial project loading
2. **Board**: Manages the cards collection and provides data operations (update, delete)
3. **Column**: Represents each workflow stage and handles drag-and-drop logic
4. **Card**: Visual representation of individual tasks with summary information
5. **CardOverview**: Detailed view of task information with assignment options
6. **CardEdit**: Form for editing all task details
7. **AddCard**: Interface for creating new tasks
8. **DropIndicator**: Visual guides for drag-and-drop positioning

### Component Relationship

```
CustomKanban
└── Board
    └── Column (multiple)
        ├── DropIndicator
        ├── Card (multiple)
        │   ├── CardOverview (modal)
        │   └── CardEdit (modal)
        └── AddCard
```

## Data Structure

### Card Type

```typescript
type CardType = {
  title: string;
  id: string;
  column: ColumnType;  // "backlog" | "todo" | "doing" | "done"
  createdAt: string;
  description?: string;
  priority: Priority;  // "low" | "medium" | "high"
  taskType: TaskType;  // "task" | "bug" | "feature"
  createdBy: {
    uid: string;
    email: string;
  };
  lastModified?: string;
  order?: number;
  links?: { url: string; title: string }[];
  assignment?: {
    assignedTo: string | null;
    assignedAt: string;
  };
  size: Size;  // "S" | "M" | "L" | "XL"
};
```

### Firebase Collections

```
projects/
└── {projectId}/
    ├── members: string[]  // Array of member emails
    └── boards/
        └── {boardId}/
            └── cards/
                └── {cardId}/  // Individual card documents
```

## Installation and Setup

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Firebase account

### Setup Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/cloudboard.git
   cd cloudboard
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a Firebase project and configure Firestore database

4. Create a `.env.local` file with your Firebase configuration:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
   NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
   ```

5. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

## Usage Guide

### Creating a Project

1. Sign in with your account
2. Navigate to the dashboard
3. Click "Create New Project"
4. Enter project details and add team members by email

### Managing Tasks

#### Creating Tasks

1. Navigate to a project board
2. Click the "Add Card" button in the appropriate column
3. Fill in task details:
   - Title (required)
   - Description
   - Task type (Task, Bug, Feature)
   - Priority (Low, Medium, High)
   - Size (S, M, L, XL)
   - Optional assignment

#### Moving Tasks

1. Drag a task card
2. Drop it in the desired column at the appropriate position
3. The task's status will update automatically
4. All team members will see the change in real-time

#### Editing Tasks

1. Click on any task card to view details
2. Click "Edit Item" to modify task details
3. Update any fields as needed
4. Click "Save Changes" to persist your changes

#### Task Assignment

1. From the task view, click "Take Task" to assign yourself
2. Or from the edit view, select any team member from the dropdown
3. Use "Unassign Task" to remove an assignment

## Task Management

### Task Classification

Each task in Cloudboard can be classified along multiple dimensions:

- **Column**: Represents the task's current stage in the workflow
  - Backlog: Not yet prioritized or scheduled
  - To Do: Ready to be worked on
  - Doing: Currently being worked on
  - Done: Completed tasks

- **Type**: Indicates the nature of the task
  - Task: Regular work item (simple, 1-2 hours)
  - Bug: Issue that needs to be fixed
  - Feature: Complex new functionality

- **Priority**: Indicates importance and urgency
  - High: Urgent tasks that require immediate attention
  - Medium: Important tasks that should be addressed soon
  - Low: Tasks that can wait if necessary

- **Size**: Indicates estimated effort
  - S: Small (quick task)
  - M: Medium (moderate effort)
  - L: Large (significant work)
  - XL: Extra Large (major undertaking)

### Task Aging

Tasks are automatically tracked for freshness:

- **Recent**: Updated within the last 2 days
- **Aging**: Last updated 3-5 days ago
- **Stale**: Not updated for more than 5 days

This helps teams identify tasks that may be stuck or forgotten.

## Collaboration Features

### Project Access Control

- Projects have a list of members who can access and modify boards
- Only project members can view and interact with project boards
- Unauthorized access attempts redirect to the home page

### Activity Logging

All significant actions are logged:

- Task creation, editing, and deletion
- Task movement between columns
- Task assignment changes

These logs help maintain transparency and track project history.

## Project Configuration

### CSS Theming

The application uses CSS variables for theming:

```css
:root {
  --text: #ffffff;
  --text-secondary: #94a3b8;
  --background: #0f172a;
  --surface: #1e293b;
  --surface-hover: #334155;
  --accent: #3b82f6;
  --accent-hover: #2563eb;
  --border: #334155;
  --border-hover: #475569;
}
```

---

© 2025 Cloudboard. All rights reserved.