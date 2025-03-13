"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import { db } from "../../../../../firebase";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  where,
  Timestamp,
} from "firebase/firestore";
import { FaPaperPlane, FaSpinner } from "react-icons/fa6";
import { getUserDisplayName } from "../../../utils/userUtils";
import { createLog } from "../../../utils/logUtils";
import { motion, AnimatePresence } from "framer-motion";

type Message = {
  id: string;
  text: string;
  sender: string;
  senderName: string;
  timestamp: any;
};

type TypingUser = {
  id: string;
  displayName: string;
  timestamp: Date;
};

export default function ProjectChatPage() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userDisplayNames, setUserDisplayNames] = useState<{
    [email: string]: string;
  }>({});
  const [projectMembers, setProjectMembers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypedRef = useRef<number>(0);

  // Fetch project members
  useEffect(() => {
    const fetchProjectMembers = async () => {
      try {
        const projectRef = doc(db, "projects", projectId as string);
        const projectSnap = await getDoc(projectRef);

        if (!projectSnap.exists()) {
          setError("Project not found");
          return;
        }

        const members = projectSnap.data().members || [];
        setProjectMembers(members);

        // Load display names for all members
        const names: { [email: string]: string } = {};
        for (const member of members) {
          names[member] = await getUserDisplayName(member);
        }
        setUserDisplayNames(names);
      } catch (err) {
        console.error("Error fetching project members:", err);
        setError("Failed to load project data");
      }
    };

    if (projectId) {
      fetchProjectMembers();
    }
  }, [projectId]);

  // Fetch messages
  useEffect(() => {
    if (!projectId) return;

    const messagesRef = collection(db, `projects/${projectId}/chat`);
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const messagesData: Message[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          messagesData.push({
            id: doc.id,
            text: data.text,
            sender: data.sender,
            senderName: data.senderName || data.sender,
            timestamp: data.timestamp?.toDate() || new Date(),
          });
        });
        setMessages(messagesData);
        setLoading(false);

        // Scroll to bottom when new messages arrive
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      },
      (error) => {
        console.error("Error fetching messages:", error);
        setLoading(false);
        setError("Failed to load messages");
      }
    );

    return () => unsubscribe();
  }, [projectId]);

  // Set up typing indicator listener
  useEffect(() => {
    if (!projectId || !user?.email) return;

    const typingRef = collection(db, `projects/${projectId}/typing`);
    // Simplify the query to avoid requiring a composite index
    const q = query(typingRef, orderBy("timestamp", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = new Date().getTime();
      const typingData: TypingUser[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        const timestamp = data.timestamp?.toDate();

        // Filter out own typing status and ensure recent timestamp in client code
        if (
          data.email !== user.email &&
          timestamp &&
          now - timestamp.getTime() < 10000
        ) {
          typingData.push({
            id: doc.id,
            displayName: data.displayName || data.email,
            timestamp: timestamp,
          });
        }
      });

      setTypingUsers(typingData);
    });

    return () => unsubscribe();
  }, [projectId, user?.email]);

  // Clean up typing status when component unmounts
  useEffect(() => {
    return () => {
      if (projectId && user?.email) {
        const typingDocRef = doc(
          db,
          `projects/${projectId}/typing`,
          user.email
        );
        deleteDoc(typingDocRef).catch(console.error);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [projectId, user?.email]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Debounced function to update typing status
  const updateTypingStatus = useCallback(() => {
    if (!projectId || !user?.email) return;

    const now = Date.now();
    // Only update if it's been more than 2 seconds since the last update
    if (now - lastTypedRef.current > 2000) {
      lastTypedRef.current = now;

      const typingDocRef = doc(db, `projects/${projectId}/typing`, user.email);
      setDoc(typingDocRef, {
        email: user.email,
        displayName: user.displayName || user.email,
        timestamp: serverTimestamp(),
      }).catch(console.error);
    }

    // Clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set typing status to expire after 5 seconds of no typing
    typingTimeoutRef.current = setTimeout(() => {
      if (projectId && user?.email) {
        const typingDocRef = doc(
          db,
          `projects/${projectId}/typing`,
          user.email
        );
        deleteDoc(typingDocRef).catch(console.error);
      }
    }, 5000);
  }, [projectId, user]);

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setNewMessage(text);

    // Only update typing status if there is text
    if (text.trim()) {
      updateTypingStatus();
    } else if (typingTimeoutRef.current) {
      // If the input is cleared, remove typing status immediately
      clearTimeout(typingTimeoutRef.current);
      if (projectId && user?.email) {
        const typingDocRef = doc(
          db,
          `projects/${projectId}/typing`,
          user.email
        );
        deleteDoc(typingDocRef).catch(console.error);
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !user?.email || sending) return;

    try {
      setSending(true);

      // Clear typing indicator immediately when sending
      if (projectId && user?.email) {
        const typingDocRef = doc(
          db,
          `projects/${projectId}/typing`,
          user.email
        );
        await deleteDoc(typingDocRef);
      }

      const senderName = await getUserDisplayName(user.email);

      // Add message to Firestore
      await addDoc(collection(db, `projects/${projectId}/chat`), {
        text: newMessage,
        sender: user.email,
        senderName: senderName,
        timestamp: serverTimestamp(),
      });

      // Create activity log
      await createLog(
        projectId as string,
        "chat",
        "sent a message",
        `${senderName} sent a message`,
        user.email
      );

      setNewMessage("");

      // Reset the typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatMessageDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString();
    }
  };

  const groupMessagesByDate = () => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = "";
    let currentGroup: Message[] = [];

    messages.forEach((message) => {
      const messageDate = formatMessageDate(new Date(message.timestamp));

      if (messageDate !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({
            date: currentDate,
            messages: [...currentGroup],
          });
        }
        currentDate = messageDate;
        currentGroup = [message];
      } else {
        currentGroup.push(message);
      }
    });

    if (currentGroup.length > 0) {
      groups.push({
        date: currentDate,
        messages: [...currentGroup],
      });
    }

    return groups;
  };

  // Format the typing indicator text
  const formatTypingText = () => {
    if (typingUsers.length === 0) return null;

    if (typingUsers.length === 1) {
      return `${typingUsers[0].displayName} is typing...`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].displayName} and ${typingUsers[1].displayName} are typing...`;
    } else {
      return `${typingUsers[0].displayName} and ${
        typingUsers.length - 1
      } others are typing...`;
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-[var(--text-secondary)]">
          <p className="text-xl mb-2">{error}</p>
          <p>Please check your connection and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <FaSpinner className="animate-spin text-[var(--accent)] text-2xl" />
          </div>
        ) : (
          <div className="h-full flex flex-col overflow-y-auto">
            <div className="flex-1 overflow-y-auto pr-2">
              {groupMessagesByDate().map((group, groupIndex) => (
                <div key={`group-${groupIndex}`} className="mb-6">
                  <div className="flex justify-center mb-4">
                    <div className="bg-[var(--surface)] px-4 py-1 rounded-full text-sm text-[var(--text-secondary)]">
                      {group.date}
                    </div>
                  </div>

                  <AnimatePresence>
                    {group.messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex mb-4 ${
                          message.sender === user?.email
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            message.sender === user?.email
                              ? "bg-[var(--accent)] text-white"
                              : "bg-[var(--surface)] text-[var(--text)]"
                          }`}
                        >
                          <div className="flex items-center mb-1">
                            <span
                              className={`text-sm font-medium ${
                                message.sender === user?.email
                                  ? "text-white/80"
                                  : "text-[var(--accent)]"
                              }`}
                            >
                              {message.sender === user?.email
                                ? "You"
                                : userDisplayNames[message.sender] ||
                                  message.senderName ||
                                  message.sender}
                            </span>
                            <span
                              className={`ml-2 text-xs ${
                                message.sender === user?.email
                                  ? "text-white/60"
                                  : "text-[var(--text-secondary)]"
                              }`}
                            >
                              {formatMessageTime(new Date(message.timestamp))}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap break-words">
                            {message.text}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Typing indicator */}
      <AnimatePresence>
        {typingUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="px-4 pb-2 text-sm text-[var(--text-secondary)] italic"
          >
            <div className="flex items-center gap-2">
              <TypingAnimation />
              {formatTypingText()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <form
        onSubmit={handleSendMessage}
        className="border-t border-[var(--border)] p-4 bg-[var(--surface)]"
      >
        <div className="flex items-center">
          <input
            type="text"
            value={newMessage}
            onChange={handleMessageChange}
            placeholder="Type a message..."
            className="flex-1 rounded-l border border-[var(--border)] bg-[var(--background)] p-3 text-[var(--text)] focus:outline-none"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className={`rounded-r p-3 flex items-center justify-center ${
              !newMessage.trim() || sending
                ? "bg-[var(--surface)] text-[var(--text-secondary)]"
                : "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
            }`}
          >
            {sending ? (
              <FaSpinner className="animate-spin" />
            ) : (
              <FaPaperPlane />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// Animated typing indicator component
const TypingAnimation = () => {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]"
          initial={{ y: 0 }}
          animate={{ y: [0, -5, 0] }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            repeatType: "loop",
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  );
};
