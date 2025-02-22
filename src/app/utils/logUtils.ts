import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase";

export type LogType = 'task' | 'member' | 'project' | 'assignment';

export interface LogEntry {
  type: LogType;
  action: string;
  details: string;
  actor: string;
  timestamp: any;
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
      return '👤';
    case 'project':
      return '📊';
    case 'assignment':
      return '✅';
    default:
      return '📌';
  }
};

export const formatLogDate = (timestamp: any) => {
  if (!timestamp) return '';
  
  const date = timestamp.toDate();
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 24) {
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
      -Math.floor(diffInHours),
      'hour'
    );
  } else if (diffInHours < 48) {
    return 'yesterday';
  } else {
    return date.toLocaleDateString();
  }
};
