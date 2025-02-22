import { collection, query, orderBy, onSnapshot, limit, startAfter, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../../../firebase";
import { LogEntry, LogType, getLogIcon, formatLogDate } from "../utils/logUtils";
import { getUserDisplayName } from "../utils/userUtils";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";

export const ActivityLogs = ({ projectId }: { projectId: string }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedType, setSelectedType] = useState<LogType | 'all'>('all');
  const [userNames, setUserNames] = useState<{[key: string]: string}>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const logsPerPage = 10;

  // Function to fetch logs
  const fetchLogs = async (isNewQuery: boolean = false) => {
    setIsLoading(true);
    try {
      const logsRef = collection(db, `projects/${projectId}/logs`);
      let q = query(
        logsRef,
        orderBy('timestamp', 'desc'),
        limit(logsPerPage)
      );

      if (!isNewQuery && lastDoc) {
        q = query(
          logsRef,
          orderBy('timestamp', 'desc'),
          startAfter(lastDoc),
          limit(logsPerPage)
        );
      }

      const snapshot = await getDocs(q);
      const logsData: LogEntry[] = [];
      const actors = new Set<string>();

      snapshot.forEach((doc) => {
        const data = doc.data() as LogEntry;
        logsData.push(data);
        actors.add(data.actor);
      });

      if (isNewQuery) {
        setLogs(logsData);
      } else {
        setLogs(prevLogs => [...prevLogs, ...logsData]);
      }

      setHasMore(snapshot.docs.length === logsPerPage);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);

      // Fetch user names for new actors
      const names: {[key: string]: string} = { ...userNames };
      for (const actor of actors) {
        if (!userNames[actor]) {
          names[actor] = await getUserDisplayName(actor);
        }
      }
      setUserNames(names);
    } catch (error) {
      console.error("Error fetching logs:", error);
    }
    setIsLoading(false);
  };

  // Reset pagination when type changes
  useEffect(() => {
    setCurrentPage(1);
    setLastDoc(null);
    fetchLogs(true);
  }, [selectedType, projectId]);

  const handleNextPage = () => {
    if (hasMore && !isLoading) {
      setCurrentPage(prev => prev + 1);
      fetchLogs();
    }
  };

  const filteredLogs = logs.filter(
    log => selectedType === 'all' || log.type === selectedType
  );

  const types: { type: LogType | 'all'; label: string }[] = [
    { type: 'all', label: 'All Activity' },
    { type: 'task', label: 'Tasks' },
    { type: 'member', label: 'Members' },
    { type: 'project', label: 'Project' },
    { type: 'assignment', label: 'Assignments' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {types.map(({ type, label }) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
              selectedType === type
                ? 'bg-blue-500 text-white'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filteredLogs.map((log, index) => (
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

        {filteredLogs.length === 0 && !isLoading && (
          <div className="text-center py-8 text-neutral-400">
            No activity logs to display
          </div>
        )}

        {isLoading && (
          <div className="text-center py-4 text-neutral-400">
            Loading...
          </div>
        )}

        {hasMore && !isLoading && filteredLogs.length > 0 && (
          <button
            onClick={handleNextPage}
            className="w-full p-2 mt-4 border border-neutral-700 rounded bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200 flex items-center justify-center gap-2"
          >
            <span>Load More</span>
            <FaChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
