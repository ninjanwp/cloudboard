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
  getDocs,
  setDoc,
  deleteDoc,
  where,
  Timestamp,
} from "firebase/firestore";
import { FaPaperPlane, FaSpinner, FaUser } from "react-icons/fa6";
import { getUserDisplayName } from "../../../utils/userUtils";
import { createLog } from "../../../utils/logUtils";
import { motion, AnimatePresence } from "framer-motion";

// Types defined as before
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
  photoURL?: string;
};

// User avatar component that displays profile image or fallback
const UserAvatar = ({
  email,
  photoURL,
  size = "md",
  className = "",
}: {
  email: string;
  photoURL?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) => {
  const sizeClasses = {
    sm: "w-6 h-6 text-xs",
    md: "w-9 h-9 text-sm",
    lg: "w-12 h-12 text-base",
  };

  const classes = `${sizeClasses[size]} rounded-full flex items-center justify-center flex-shrink-0 ${className}`;

  if (photoURL) {
    return (
      <div className={classes} style={{ overflow: "hidden" }}>
        <img
          src={photoURL}
          alt={email}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Fallback to first letter of email with colored background
  const initial = email.charAt(0).toUpperCase();
  const hashCode = Array.from(email).reduce(
    (acc, char) => acc + char.charCodeAt(0),
    0
  );
  const colors = [
    "bg-blue-500",
    "bg-purple-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-red-500",
    "bg-teal-500",
  ];
  const colorClass = colors[hashCode % colors.length];

  return (
    <div className={`${classes} ${colorClass} text-white font-medium`}>
      {initial}
    </div>
  );
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
  const [userPhotos, setUserPhotos] = useState<{
    [email: string]: string;
  }>({});
  const [projectMembers, setProjectMembers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypedRef = useRef<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch project members and their photos
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

        // Load display names and photos for all members
        const names: { [email: string]: string } = {};
        const photos: { [email: string]: string } = {};

        for (const member of members) {
          names[member] = await getUserDisplayName(member);

          // Get user photo if available
          const usersRef = collection(db, "users");
          const q = query(usersRef, where("email", "==", member));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            if (userData.photoURL) {
              photos[member] = userData.photoURL;
            }
          }
        }

        setUserDisplayNames(names);
        setUserPhotos(photos);
      } catch (err) {
        console.error("Error fetching project members:", err);
        setError("Failed to load project data");
      }
    };

    if (projectId) {
      fetchProjectMembers();
    }
  }, [projectId]);

  // Fetch messages (unchanged)
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

  // Set up typing indicator listener (unchanged)
  useEffect(() => {
    if (!projectId || !user?.email) return;

    const typingRef = collection(db, `projects/${projectId}/typing`);
    const q = query(typingRef, orderBy("timestamp", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = new Date().getTime();
      const typingData: TypingUser[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        const timestamp = data.timestamp?.toDate();

        // Filter out own typing status and ensure recent timestamp
        if (
          data.email !== user.email &&
          timestamp &&
          now - timestamp.getTime() < 10000
        ) {
          typingData.push({
            id: doc.id,
            displayName: data.displayName || data.email,
            timestamp: timestamp,
            photoURL: userPhotos[data.email],
          });
        }
      });

      setTypingUsers(typingData);
    });

    return () => unsubscribe();
  }, [projectId, user?.email, userPhotos]);

  // Clean up typing status (unchanged)
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

  // Debounced function to update typing status (unchanged)
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

  useEffect(() => {
    // Focus the input field when component mounts
    inputRef.current?.focus();
  }, []);

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

      // Use a short timeout to make sure the input is refocused after state updates
      setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
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

  // Group messages both by date and by consecutive sender
  const groupMessagesByDateAndSender = () => {
    const dateGroups: {
      date: string;
      messageGroups: { sender: string; messages: Message[] }[];
    }[] = [];
    let currentDate = "";
    let currentDateGroup: { sender: string; messages: Message[] }[] = [];
    let currentSender = "";
    let currentSenderMessages: Message[] = [];

    messages.forEach((message) => {
      const messageDate = formatMessageDate(new Date(message.timestamp));

      // Check if we need to start a new date group
      if (messageDate !== currentDate) {
        // First, close any open sender group
        if (currentSenderMessages.length > 0) {
          currentDateGroup.push({
            sender: currentSender,
            messages: [...currentSenderMessages],
          });
          currentSenderMessages = [];
        }

        // Then close the date group if it has messages
        if (currentDateGroup.length > 0) {
          dateGroups.push({
            date: currentDate,
            messageGroups: [...currentDateGroup],
          });
          currentDateGroup = [];
        }

        currentDate = messageDate;
        currentSender = message.sender;
        currentSenderMessages = [message];
      } else {
        // Same date, check if sender changed
        if (message.sender !== currentSender) {
          // Close current sender group
          if (currentSenderMessages.length > 0) {
            currentDateGroup.push({
              sender: currentSender,
              messages: [...currentSenderMessages],
            });
            currentSenderMessages = [];
          }

          currentSender = message.sender;
          currentSenderMessages = [message];
        } else {
          // Same sender, just add the message
          currentSenderMessages.push(message);
        }
      }
    });

    // Clean up any remaining groups
    if (currentSenderMessages.length > 0) {
      currentDateGroup.push({
        sender: currentSender,
        messages: [...currentSenderMessages],
      });
    }

    if (currentDateGroup.length > 0) {
      dateGroups.push({
        date: currentDate,
        messageGroups: [...currentDateGroup],
      });
    }

    return dateGroups;
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
              {groupMessagesByDateAndSender().map((dateGroup, dateIndex) => (
                <div key={`date-${dateIndex}`} className="mb-6">
                  <div className="flex justify-center mb-4">
                    <div className="bg-[var(--surface)] px-4 py-1 rounded-full text-sm text-[var(--text-secondary)]">
                      {dateGroup.date}
                    </div>
                  </div>

                  {dateGroup.messageGroups.map((senderGroup, sgIndex) => {
                    const isCurrentUser = senderGroup.sender === user?.email;
                    return (
                      <div
                        key={`${dateGroup.date}-${sgIndex}`}
                        className="mb-6"
                      >
                        <div
                          className={`flex items-start ${
                            isCurrentUser ? "justify-end" : ""
                          }`}
                        >
                          {/* Avatar for other users displayed on the left */}
                          {!isCurrentUser && (
                            <UserAvatar
                              email={senderGroup.sender}
                              photoURL={userPhotos[senderGroup.sender]}
                              className="mr-3 mt-0.5"
                              size="md"
                            />
                          )}

                          <div
                            className={`flex-1 max-w-[80%] ${
                              isCurrentUser ? "text-right" : ""
                            }`}
                          >
                            <div
                              className={`flex items-center mb-1 ${
                                isCurrentUser ? "justify-end" : ""
                              }`}
                            >
                              <span
                                className={`text-sm font-medium text-[var(--accent)]`}
                              >
                                {isCurrentUser
                                  ? "You"
                                  : userDisplayNames[senderGroup.sender] ||
                                    senderGroup.sender}
                              </span>
                              <span className="ml-2 text-xs text-[var(--text-secondary)]">
                                {formatMessageTime(
                                  new Date(senderGroup.messages[0].timestamp)
                                )}
                              </span>
                            </div>

                            <div className="space-y-1">
                              {senderGroup.messages.map((message, msgIndex) => (
                                <motion.div
                                  key={message.id}
                                  initial={{ opacity: 0, y: 5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: msgIndex * 0.05 }}
                                  className={`block w-full text-[var(--text)] ${
                                    isCurrentUser ? "text-right" : "text-left"
                                  }`}
                                >
                                  <p className="whitespace-pre-wrap break-words inline-block text-left">
                                    {message.text}
                                  </p>
                                </motion.div>
                              ))}
                            </div>
                          </div>

                          {/* Avatar for current user displayed on the right */}
                          {isCurrentUser && (
                            <UserAvatar
                              email={senderGroup.sender}
                              photoURL={user?.photoURL || undefined}
                              className="ml-3 mt-0.5"
                              size="md"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Typing indicator with avatars */}
      <AnimatePresence>
        {typingUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="px-4 pb-2 text-sm text-[var(--text-secondary)] italic"
          >
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {typingUsers.slice(0, 3).map((user) => (
                  <UserAvatar
                    key={user.id}
                    email={user.id}
                    photoURL={userPhotos[user.id]}
                    size="sm"
                    className="border-2 border-[var(--background)]"
                  />
                ))}
              </div>
              <div className="flex items-center gap-1">
                <TypingAnimation />
                {formatTypingText()}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <form
        onSubmit={handleSendMessage}
        className="border-t border-[var(--border)] p-4 bg-[var(--surface)]"
      >
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={handleMessageChange}
            placeholder="Type a message..."
            className="flex-1 rounded border border-[var(--border)] bg-[var(--background)] p-3 text-[var(--text)] focus:outline-none"
            disabled={sending}
            autoFocus
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className={`rounded p-3 flex items-center justify-center ${
              !newMessage.trim() || sending
                ? "bg-[var(--surface-hover)] text-[var(--text-secondary)]"
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
