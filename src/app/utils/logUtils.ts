import { collection, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "../../../firebase";

export type LogType = 'task' | 'member' | 'project' | 'assignment';

export interface LogEntry {
  type: LogType;
  action: string;
  details: string;
  actor: string;
  timestamp: Timestamp;
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
    case 'task':
      return '📝';
    case 'member':
      return '👥';
    case 'project':
      return '📊';
    case 'assignment':
      return '✅';
    default:
      return '📌';
  }
};

export const formatLogDate = (timestamp: Timestamp) => {
  if (!timestamp) return '';
  
  const date = timestamp.toDate();
  const now = new Date();
  const diffInMilliseconds = now.getTime() - date.getTime();
  const diffInMinutes = diffInMilliseconds / (1000 * 60);
  const diffInHours = diffInMinutes / 60;
  const diffInDays = diffInHours / 24;

  if (diffInMinutes < 2) {
    return 'just now';
  } else if (diffInMinutes < 60) {
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
      -Math.floor(diffInMinutes),
      'minute'
    );
  } else if (diffInHours < 24) {  // Changed from 48 to 24
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
      -Math.floor(diffInHours),
      'hour'
    );
  } else {
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
      -Math.floor(diffInDays),
      'day'
    );
  }
};
