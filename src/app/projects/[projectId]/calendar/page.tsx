"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Calendar } from '../../../components/Calendar';
import { LoadingScreen } from '../../../components/LoadingScreen';
import { useAuth } from '../../../context/AuthContext';
import { db } from '../../../../../firebase';
import { 
  doc, 
  getDoc, 
  collection, 
  getDocs,
  setDoc  
} from 'firebase/firestore';

export default function CalendarPage() {
  const { projectId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [defaultBoardId, setDefaultBoardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDefaultBoard = async () => {
      if (!user || !projectId) return;

      try {
        // First verify project access
        const projectRef = doc(db, 'projects', projectId as string);
        const projectSnap = await getDoc(projectRef);

        if (!projectSnap.exists() || !projectSnap.data().members.includes(user.email)) {
          setError('Project not found or access denied');
          setLoading(false);
          return;
        }

        // Get the first board or create a default one
        const boardsRef = collection(db, `projects/${projectId}/boards`);
        const boardsSnap = await getDocs(boardsRef);

        if (boardsSnap.empty) {
          // Create default board if none exists
          const defaultBoard = doc(boardsRef);
          await setDoc(defaultBoard, {
            name: 'Default Board',
            createdAt: new Date().toISOString(),
          });
          setDefaultBoardId(defaultBoard.id);
        } else {
          setDefaultBoardId(boardsSnap.docs[0].id);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching project:', err);
        setError('Error loading project');
        setLoading(false);
      }
    };

    fetchDefaultBoard();
  }, [projectId, user]);

  if (authLoading || loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h1 className="text-2xl text-red-400 mb-4">Error</h1>
          <p className="text-neutral-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!defaultBoardId) {
    return null;
  }

  return (
    <Calendar
      projectId={projectId as string}
      boardId={defaultBoardId}
    />
  );
}
