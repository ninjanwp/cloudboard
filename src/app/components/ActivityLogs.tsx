import { collection, query, orderBy, limit, getDocs, startAfter, where, DocumentSnapshot, DocumentData } from "firebase/firestore";
import { useEffect, useState, useCallback, useRef } from "react";
import { db } from "../../../firebase";
import { LogEntry, getLogIcon, formatLogDate, LogType } from "../utils/logUtils";
import { getUserDisplayName } from "../utils/userUtils";

const LOG_TYPES = [
  { label: 'All', value: null },
  { label: 'Tasks', value: 'task' },
  { label: 'Assignments', value: 'assignment' },
  { label: 'Members', value: 'member' },
  { label: 'Projects', value: 'project' }
];

export const ActivityLogs = ({ projectId }: { projectId: string }) => {
  // Convert ref to state for proper re-rendering
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const userNamesRef = useRef<{[key: string]: string}>({});
  const [lastVisible, setLastVisible] = useState<DocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [selectedType, setSelectedType] = useState<LogType | null>(null);
  // Remove updateCounter as we don't need it anymore
  
  const isMounted = useRef(true);
  const prevProjectIdRef = useRef<string | null>(null);
  const prevSelectedTypeRef = useRef<LogType | null>(null);
  const isCurrentlyFetching = useRef(false);
  const ITEMS_PER_PAGE = 20;

  // Cleanup function for when component unmounts
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Simplified type change handler
  const handleTypeChange = (type: LogType | null) => {
    if (type !== selectedType) {
      setIsLoading(true);
      setSelectedType(type);
    }
  };

  // Updated fetch logs function that uses state instead of ref
  const fetchLogs = useCallback(async (loadMore = false) => {
    if (isCurrentlyFetching.current || !projectId) return;
    
    isCurrentlyFetching.current = true;
    
    try {
      if (!loadMore) {
        setIsLoading(true);
        setLogs([]); // Clear existing logs for new fetch
      }
      
      console.log("Fetching logs for project:", projectId, "type:", selectedType || "all");
      
      const logsCollection = collection(db, `projects/${projectId}/logs`);
      
      let q;
      if (selectedType) {
        q = query(
          logsCollection,
          where('type', '==', selectedType),
          orderBy('timestamp', 'desc'),
          limit(ITEMS_PER_PAGE + 1)
        );
      } else {
        q = query(
          logsCollection,
          orderBy('timestamp', 'desc'),
          limit(ITEMS_PER_PAGE + 1)
        );
      }

      if (loadMore && lastVisible) {
        q = query(q, startAfter(lastVisible));
      }

      const querySnapshot = await getDocs(q);
      console.log(`Query returned ${querySnapshot.docs.length} documents`);
      
      if (!isMounted.current) return;
      
      const docs = querySnapshot.docs;
      
      // Process documents into log entries
      const logEntries = docs.slice(0, ITEMS_PER_PAGE).map((doc, index) => {
        const data = doc.data();
        return {
          type: (data.type || 'task') as LogType,
          action: data.action || 'performed an action',
          details: data.details || '',
          actor: data.actor || 'unknown',
          timestamp: data.timestamp,
          id: doc.id,
          uniqueId: `${Date.now()}-${index}-${doc.id}`
        };
      });
      
      // Update logs state directly
      if (loadMore) {
        setLogs(prevLogs => [...prevLogs, ...logEntries]);
      } else {
        setLogs(logEntries);
      }
      
      // Load user names for the logs
      const uniqueActors = [...new Set(logEntries.map(log => log.actor))];
      fetchUserNames(uniqueActors);
      
      if (docs.length > 0) {
        setLastVisible(docs[docs.length - 1]);
      }
      
      setHasMore(docs.length > ITEMS_PER_PAGE);
      setIsLoading(false);
      
      console.log("Logs updated, now have", loadMore ? logs.length + logEntries.length : logEntries.length, "logs");
      
    } catch (error) {
      console.error("Error fetching logs:", error);
      setIsLoading(false);
    } finally {
      isCurrentlyFetching.current = false;
    }
  }, [projectId, selectedType, lastVisible, ITEMS_PER_PAGE, logs.length, fetchUserNames]);

  // Fetch user names for all actors
  const fetchUserNames = useCallback(async (actors: string[]) => {
    const newNames: {[key: string]: string} = {};
    
    for (const actor of actors) {
      if (!userNamesRef.current[actor]) {
        newNames[actor] = await getUserDisplayName(actor);
      }
    }

    if (Object.keys(newNames).length > 0) {
      userNamesRef.current = { ...userNamesRef.current, ...newNames };
    }
  }, []);

  // Fetch logs when project or selectedType changes
  useEffect(() => {
    if (!projectId) return;
    
    // Only fetch if project or type changed
    if (prevProjectIdRef.current !== projectId || 
        prevSelectedTypeRef.current !== selectedType) {
      
      console.log("Project or type changed, fetching new logs");
      prevProjectIdRef.current = projectId;
      prevSelectedTypeRef.current = selectedType;
      
      // Clear existing data
      setLogs([]);
      setLastVisible(null);
      setHasMore(true);
      
      // Fetch new logs
      fetchLogs(false);
    }
  }, [projectId, selectedType, fetchLogs]);

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      fetchLogs(true);
    }
  };

  // Updated render function that uses logs state directly
  return (
    <div className="space-y-6 relative">

      {/* Type Filters */}
      <div className="flex flex-wrap gap-2">
        {LOG_TYPES.map(type => (
          <button
            key={type.value || 'all'}
            onClick={() => handleTypeChange(type.value as LogType | null)}
            disabled={isLoading}
            className={`px-3 py-1 rounded ${
              selectedType === type.value
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-hover)]'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {isLoading && <div className="text-center py-8 text-[var(--text-secondary)]">Loading logs...</div>}

      {/* Empty state */}
      {!isLoading && logs.length === 0 && (
        <div className="text-center py-8 text-[var(--text-secondary)]">No logs to display</div>
      )}

      {/* Logs list - Using logs state directly */}
      {logs.length > 0 && (
        <div className="space-y-2">
          {logs.map((log, index) => (
            <div
              key={log.uniqueId || index}
              className="flex items-start gap-3 p-3 rounded bg-[var(--surface)] border border-[var(--border)]"
            >
              <span className="text-xl">{getLogIcon(log.type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--text)]">
                  <span className="font-medium text-[var(--accent)]">
                    {userNamesRef.current[log.actor] || log.actor}
                  </span>{' '}
                  {log.action}
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">{log.details}</p>
              </div>
              <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap">
                {formatLogDate(log.timestamp)}
              </span>
            </div>
          ))}
        </div>
      )}
      
      {/* Load More Button */}
      {!isLoading && logs.length > 0 && hasMore && (
        <div className="flex justify-center mt-4">
          <button
            onClick={handleLoadMore}
            className="px-4 py-2 rounded bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-hover)]"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
};
