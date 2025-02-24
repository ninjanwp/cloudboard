import { collection, query, orderBy, limit, getDocs, startAfter, where, QueryConstraint, DocumentSnapshot, DocumentData } from "firebase/firestore";
import { useEffect, useState, useCallback } from "react";
import { db } from "../../../firebase";
import { LogEntry, getLogIcon, formatLogDate, LogType } from "../utils/logUtils";
import { getUserDisplayName } from "../utils/userUtils";

export const ActivityLogs = ({ projectId }: { projectId: string }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userNames, setUserNames] = useState<{[key: string]: string}>({});
  const [lastVisible, setLastVisible] = useState<DocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [selectedType, setSelectedType] = useState<LogType | null>(null);
  const ITEMS_PER_PAGE = 20;

  const LOG_TYPES: Array<{ label: string; value: LogType | null }> = [
    { label: 'All', value: null },
    { label: '📝 Tasks', value: 'task' },
    { label: '👥 Members', value: 'member' },
    { label: '📊 Project', value: 'project' },
    { label: '✅ Assignments', value: 'assignment' },
  ] as const;

  const fetchLogs = useCallback(async (loadMore = false) => {
    setIsLoading(true);
    try {
      const logsRef = collection(db, `projects/${projectId}/logs`);
      
      let q;
      if (selectedType) {
        // When filtering by type, include both type filter and timestamp ordering
        q = query(
          logsRef,
          where('type', '==', selectedType),
          orderBy('timestamp', 'desc'),
          limit(ITEMS_PER_PAGE + 1)
        );
      } else {
        // When showing all, just use timestamp order
        q = query(
          logsRef,
          orderBy('timestamp', 'desc'),
          limit(ITEMS_PER_PAGE + 1)
        );
      }

      if (loadMore && lastVisible) {
        q = query(q, startAfter(lastVisible));
      }

      const querySnapshot = await getDocs(q);
      
      let docs = querySnapshot.docs;
      
      setHasMore(docs.length > ITEMS_PER_PAGE);
      
      const logsData = docs.slice(0, ITEMS_PER_PAGE).map(doc => ({
        type: doc.data().type as LogType,
        action: doc.data().action as string,
        details: doc.data().details as string,
        actor: doc.data().actor as string,
        timestamp: doc.data().timestamp,
        id: doc.id,
      }));

      setLastVisible(docs[docs.length - 1] || null);
      setLogs(prev => loadMore ? [...prev, ...logsData] : logsData);

      // Fetch usernames for new logs
      const actors = new Set(logsData.map(log => log.actor));
      const names = { ...userNames };
      for (const actor of actors) {
        if (!names[actor]) {
          names[actor] = await getUserDisplayName(actor);
        }
      }
      setUserNames(names);
    } catch (error) {
      console.error("Error fetching logs:", error);
    }
    setIsLoading(false);
  }, [projectId, selectedType, lastVisible]);

  useEffect(() => {
    if (projectId) {
      setLogs([]); // Clear logs when filter changes
      setLastVisible(null);
      setHasMore(true);
      fetchLogs();
    }
  }, [projectId, selectedType]);

  const handleLoadMore = () => {
    fetchLogs(true);
  };

  if (isLoading && logs.length === 0) {
    return <div className="text-center py-8 text-neutral-400">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Type Filters */}
      <div className="flex flex-wrap gap-2">
        {LOG_TYPES.map(type => (
          <button
            key={type.value || 'all'}
            onClick={() => setSelectedType(type.value)}
            className={`px-3 py-1 rounded ${
              selectedType === type.value
                ? 'bg-blue-600 text-white'
                : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-8 text-neutral-400">No logs to display</div>
      ) : (
        <>
          <div className="space-y-2">
            {logs.map((log, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded bg-neutral-800/50 border border-neutral-700"
              >
                <span className="text-xl">{getLogIcon(log.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-neutral-300">
                    <span className="font-medium text-blue-400">
                      {userNames[log.actor] || log.actor}
                    </span>{' '}
                    {log.action}
                  </p>
                  <p className="text-xs text-neutral-400 mt-1">{log.details}</p>
                </div>
                <span className="text-xs text-neutral-500 whitespace-nowrap">
                  {formatLogDate(log.timestamp)}
                </span>
              </div>
            ))}
          </div>
          
          {/* Load More Button */}
          {hasMore && (
            <div className="flex justify-center mt-4">
              <button
                onClick={handleLoadMore}
                disabled={isLoading}
                className="px-4 py-2 rounded bg-neutral-800 text-neutral-300 hover:bg-neutral-700 disabled:opacity-50"
              >
                {isLoading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
