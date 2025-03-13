import {
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../../firebase";

export type LogType = "task" | "member" | "project" | "assignment" | "chat";

export interface LogEntry {
  type: LogType;
  action: string;
  details: string;
  actor: string;
  timestamp: Timestamp;
  id?: string; // Optional since it might not be set immediately
  uniqueId?: string; // Added for React key uniqueness
}

export const createLog = async (
  projectId: string,
  type: LogType,
  action: string,
  details: string,
  actor: string
) => {
  const logsRef = collection(db, `projects/${projectId}/logs`);
  await addDoc(logsRef, {
    type,
    action,
    details,
    actor,
    timestamp: serverTimestamp(),
  });
};

export const getLogIcon = (type: LogType) => {
  switch (type) {
    case "task":
      return "📝";
    case "member":
      return "👥";
    case "project":
      return "📊";
    case "assignment":
      return "✅";
    case "chat":
      return "💬";
    default:
      return "📌";
  }
};

// Update the timestamp handling to handle null/undefined cases
export const formatLogDate = (timestamp: Timestamp | null | undefined) => {
  if (!timestamp) return "unknown date";

  try {
    const date = timestamp.toDate();
    const now = new Date();
    const diffInMilliseconds = now.getTime() - date.getTime();
    const diffInMinutes = diffInMilliseconds / (1000 * 60);
    const diffInHours = diffInMinutes / 60;
    const diffInDays = diffInHours / 24;

    if (diffInMinutes < 2) {
      return "just now";
    } else if (diffInMinutes < 60) {
      return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
        -Math.floor(diffInMinutes),
        "minute"
      );
    } else if (diffInHours < 24) {
      return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
        -Math.floor(diffInHours),
        "hour"
      );
    } else {
      return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
        -Math.floor(diffInDays),
        "day"
      );
    }
  } catch (error) {
    console.error("Error formatting timestamp:", error);
    return "invalid date";
  }
};
