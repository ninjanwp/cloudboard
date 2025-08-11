"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaPaperPlane, FaRobot, FaSpinner, FaBrain, FaXmark } from "react-icons/fa6";
import { UserAvatar } from "./UserAvatar";
import { useAuth } from "../context/AuthContext";
import { getAIResponse } from "../utils/aiService";

interface Message {
  id: string;
  type: "user" | "ai";
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

interface ProjectAIProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectAI: React.FC<ProjectAIProps> = ({ projectId, isOpen, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Initial greeting message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: "greeting",
        type: "ai",
        content: "Hi! I'm your project AI assistant. I can help you understand your project by analyzing all tasks, assignments, and project data. What would you like to know?\n\nTry asking:\n• \"What tasks are overdue?\"\n• \"Who has the most work assigned?\"\n• \"What's our progress this week?\"\n• \"Which tasks are blocked?\"\n• \"Show me high priority tasks\"",
        timestamp: new Date()
      }]);
    }
  }, [isOpen, messages.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: input.trim(),
      timestamp: new Date()
    };

    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: "ai",
      content: "",
      timestamp: new Date(),
      isLoading: true
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Call the AI service
      const response = await getAIResponse(input.trim(), projectId, user?.uid || "");
      
      setMessages(prev => 
        prev.map(msg => 
          msg.id === loadingMessage.id 
            ? { ...msg, content: response, isLoading: false }
            : msg
        )
      );
    } catch (error) {
      console.error("AI request failed:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      setMessages(prev => 
        prev.map(msg => 
          msg.id === loadingMessage.id 
            ? { 
                ...msg, 
                content: errorMessage, 
                isLoading: false 
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-[var(--background)] rounded-lg shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <FaBrain className="text-white text-sm" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--text)]">Project AI Assistant</h2>
              <p className="text-sm text-[var(--text-secondary)]">Ask questions about your project</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--surface-hover)] rounded-lg transition-colors"
          >
            <FaXmark className="text-[var(--text-secondary)]" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${message.type === "user" ? "flex-row-reverse" : ""}`}
              >
                <div className="flex-shrink-0">
                  {message.type === "user" ? (
                    <UserAvatar email={user?.email || ""} size="sm" />
                  ) : (
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <FaRobot className="text-white text-xs" />
                    </div>
                  )}
                </div>
                <div className={`max-w-[70%] ${message.type === "user" ? "text-right" : ""}`}>
                  <div
                    className={`px-4 py-2 rounded-lg ${
                      message.type === "user"
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--surface)] text-[var(--text)]"
                    }`}
                  >
                    {message.isLoading ? (
                      <div className="flex items-center gap-2">
                        <FaSpinner className="animate-spin" />
                        <span>Thinking...</span>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    )}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-[var(--border)]">
          {/* Quick Questions */}
          {messages.length <= 1 && (
            <div className="mb-4">
              <div className="text-xs text-[var(--text-secondary)] mb-2">Quick questions:</div>
              <div className="flex flex-wrap gap-2">
                {[
                  "What tasks are overdue?",
                  "Who has the most work?",
                  "Show me high priority tasks",
                  "What's our progress?",
                  "Which tasks are done this week?"
                ].map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => setInput(question)}
                    className="px-3 py-1 text-xs bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded-full transition-colors"
                    disabled={isLoading}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about tasks, progress, assignments, deadlines..."
              className="flex-1 px-4 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text)] focus:border-[var(--accent)] outline-none"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FaPaperPlane />
            </button>
          </div>
          <div className="text-xs text-[var(--text-secondary)] mt-2">
            Ask questions like: &quot;What tasks are overdue?&quot;, &quot;Who is working on what?&quot;, &quot;What&apos;s our progress this week?&quot;
          </div>
        </form>
      </motion.div>
    </div>
  );
};
