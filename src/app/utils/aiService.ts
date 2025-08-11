import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase";

export interface ProjectContext {
  project: {
    id: string;
    name: string;
    description?: string;
    members: string[];
    createdAt: string;
  };
  boards: Array<{
    id: string;
    name: string;
    columns: string[];
  }>;
  tasks: Array<{
    id: string;
    title: string;
    description?: string;
    column: string;
    boardId: string;
    boardName: string;
    assignment?: {
      assignedTo: string | null;
      assignedBy?: string;
    };
    priority?: "low" | "medium" | "high";
    dueDate?: string;
    date?: string;
    duration?: number;
    order?: number;
    lastModified?: string;
    createdBy: {
      uid: string;
      email: string;
    };
    createdAt: string;
    tags?: string[];
  }>;
  members: Array<{
    email: string;
    displayName?: string;
    role?: string;
  }>;
}

export async function gatherProjectContext(projectId: string): Promise<ProjectContext> {
  const context: ProjectContext = {
    project: { id: projectId, name: "", members: [], createdAt: "" },
    boards: [],
    tasks: [],
    members: []
  };

  try {
    // Get project info
    const projectRef = doc(db, "projects", projectId);
    const projectSnap = await getDoc(projectRef);
    
    if (projectSnap.exists()) {
      const projectData = projectSnap.data();
      context.project = {
        id: projectId,
        name: projectData.name || "Untitled Project",
        description: projectData.description,
        members: projectData.members || [],
        createdAt: projectData.createdAt || ""
      };
      
      // Get member info
      context.members = projectData.members?.map((email: string) => ({
        email,
        displayName: email // Will be enhanced with actual display names if needed
      })) || [];
    }

    // Get all boards in the project
    const boardsRef = collection(db, `projects/${projectId}/boards`);
    const boardsSnap = await getDocs(boardsRef);
    
    for (const boardDoc of boardsSnap.docs) {
      const boardData = boardDoc.data();
      const boardInfo = {
        id: boardDoc.id,
        name: boardData.name || "Untitled Board",
        columns: boardData.columns || ["To Do", "In Progress", "Done"]
      };
      context.boards.push(boardInfo);

      // Get all tasks in this board
      const cardsRef = collection(db, `projects/${projectId}/boards/${boardDoc.id}/cards`);
      const cardsSnap = await getDocs(cardsRef);
      
      cardsSnap.forEach((cardDoc) => {
        const cardData = cardDoc.data();
        context.tasks.push({
          id: cardDoc.id,
          title: cardData.title || "Untitled Task",
          description: cardData.description,
          column: cardData.column || "To Do",
          boardId: boardDoc.id,
          boardName: boardInfo.name,
          assignment: cardData.assignment,
          priority: cardData.priority,
          dueDate: cardData.dueDate,
          date: cardData.date,
          duration: cardData.duration,
          order: cardData.order,
          lastModified: cardData.lastModified,
          createdBy: cardData.createdBy || { uid: "", email: "" },
          createdAt: cardData.createdAt || "",
          tags: cardData.tags
        });
      });
    }

    return context;
  } catch (error) {
    console.error("Error gathering project context:", error);
    throw new Error("Failed to gather project information");
  }
}

export async function getOpenAIApiKey(projectId: string, userUid?: string): Promise<string | null> {
  try {
    // First try to get project-specific API key
    const projectRef = doc(db, "projects", projectId);
    const projectSnap = await getDoc(projectRef);
    
    if (projectSnap.exists()) {
      const projectData = projectSnap.data();
      if (projectData.openAIApiKey) {
        return projectData.openAIApiKey;
      }
    }
    
    // Fallback to user's personal API key (deprecated but for backward compatibility)
    if (userUid) {
      const userRef = doc(db, "users", userUid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        return userData.openAIApiKey || null;
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error getting OpenAI API key:", error);
    return null;
  }
}

export async function callOpenAI(
  question: string, 
  context: ProjectContext, 
  apiKey: string
): Promise<string> {
  const systemPrompt = `You are a helpful project management AI assistant. You have access to complete information about a project including all tasks, boards, team members, assignments, and scheduling.

Project Information:
- Name: ${context.project.name}
- Description: ${context.project.description || "No description provided"}
- Members: ${context.members.map(m => m.displayName || m.email).join(", ")}
- Created: ${context.project.createdAt}

Boards: ${context.boards.map(b => `${b.name} (columns: ${b.columns.join(", ")})`).join("; ")}

Tasks (${context.tasks.length} total):
${context.tasks.map(task => {
  let taskInfo = `- "${task.title}" in ${task.boardName}/${task.column}`;
  
  // Add assignment info
  if (task.assignment?.assignedTo) {
    taskInfo += ` (assigned to ${task.assignment.assignedTo})`;
  }
  
  // Add scheduling info
  if (task.date) {
    taskInfo += ` (scheduled: ${task.date})`;
  }
  
  // Add due date if different from scheduled date
  if (task.dueDate && task.dueDate !== task.date) {
    taskInfo += ` (due: ${task.dueDate})`;
  }
  
  // Add priority
  if (task.priority) {
    taskInfo += ` [${task.priority} priority]`;
  }
  
  // Add duration if available
  if (task.duration) {
    taskInfo += ` (${task.duration}min)`;
  }
  
  // Add creation info
  taskInfo += ` [created by ${task.createdBy.email}`;
  if (task.createdAt) {
    const createdDate = new Date(task.createdAt).toLocaleDateString();
    taskInfo += ` on ${createdDate}`;
  }
  taskInfo += `]`;
  
  // Add description on new line if available
  if (task.description) {
    taskInfo += `\n  Description: ${task.description}`;
  }
  
  // Add tags if available
  if (task.tags && task.tags.length > 0) {
    taskInfo += `\n  Tags: ${task.tags.join(", ")}`;
  }
  
  return taskInfo;
}).join("\n")}

Additional Context:
- Tasks with dates are scheduled for specific days
- Task durations are in minutes
- Current date context: ${new Date().toISOString().split('T')[0]}
- You can analyze workload by date, person, or board
- You can identify overdue items, upcoming deadlines, and scheduling conflicts

Answer questions about the project based on this comprehensive information. Be helpful, concise, and provide specific details when available. When discussing dates or scheduling, always reference the actual date values from the tasks.`;

  const userPrompt = question;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Using the more cost-effective model
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "I couldn't generate a response.";
  } catch (error) {
    console.error("OpenAI API call failed:", error);
    throw error;
  }
}

export async function getAIResponse(question: string, projectId: string, userUid?: string): Promise<string> {
  try {
    // Get API key from project first, then user as fallback
    const apiKey = await getOpenAIApiKey(projectId, userUid);
    if (!apiKey) {
      return "❌ No OpenAI API key configured for this project. Please ask a project administrator to configure the API key in the project settings.";
    }

    // Gather project context
    const context = await gatherProjectContext(projectId);
    
    // Call OpenAI API
    const response = await callOpenAI(question, context, apiKey);
    return response;
  } catch (error) {
    console.error("AI service error:", error);
    if (error instanceof Error && error.message.includes("API error")) {
      return `❌ API Error: ${error.message}. Please check your API key configuration.`;
    }
    return "❌ Something went wrong while processing your question. Please try again.";
  }
}
