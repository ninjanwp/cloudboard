"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { db } from "../../../../../../firebase";
import { useAuth } from "../../../../context/AuthContext";
import { LoadingScreen } from "../../../../components/LoadingScreen";
import { FiArrowLeft, FiTrash, FiCalendar, FiClock, FiUser, FiLink, FiMoreVertical } from "react-icons/fi";
import { motion } from "framer-motion";
import { createLog } from "../../../../utils/logUtils";
import { getUserDisplayName } from "../../../../utils/userUtils";
import { UserAvatar } from "../../../../components/UserAvatar";

type CardType = {
  id: string;
  column: string;
  title: string;
  description?: string;
  createdBy: {
    uid: string;
    email: string;
  };
  createdAt: string;
  lastModified?: string;
  assignment?: {
    assignedTo: string | null;
  };
  links?: string[];
  date?: string;
  duration?: number;
};

export default function TaskPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  const projectId = params?.projectId as string;
  const taskId = params?.taskId as string;
  const boardId = searchParams?.get("boardId");
  
  const [task, setTask] = useState<CardType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createdByDisplayName, setCreatedByDisplayName] = useState<string>("");
  
  // Track which field is being edited
  const [editingField, setEditingField] = useState<string | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Project members for assignment dropdown
  const [projectMembers, setProjectMembers] = useState<string[]>([]);
  const [memberDisplayNames, setMemberDisplayNames] = useState<{ [email: string]: string }>({});

  // Function to format duration nicely
  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    } else if (minutes === 60) {
      return `1 hour`;
    } else if (minutes % 60 === 0) {
      return `${minutes / 60} hours`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}m`;
    }
  };

  // Auto-resize textarea function
  const autoResizeTextarea = (element: HTMLTextAreaElement) => {
    element.style.height = 'auto';
    element.style.height = `${Math.max(120, element.scrollHeight+2)}px`;
  };
  
  // Form state for editing
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    date: "",
    duration: 60,
    assignment: { assignedTo: null as string | null },
    links: [] as string[]
  });

  useEffect(() => {
    if (!projectId || !taskId || !boardId) {
      setError("Missing required parameters");
      setLoading(false);
      return;
    }

    const taskRef = doc(db, `projects/${projectId}/boards/${boardId}/cards`, taskId);
    
    const unsubscribe = onSnapshot(taskRef, (snapshot) => {
      if (snapshot.exists()) {
        const taskData = { id: snapshot.id, ...snapshot.data() } as CardType;
        setTask(taskData);
        
        // Initialize edit form with current task data
        setEditForm({
          title: taskData.title || "",
          description: taskData.description || "",
          date: taskData.date || "",
          duration: taskData.duration || 60,
          assignment: taskData.assignment || { assignedTo: null },
          links: taskData.links || []
        });
      } else {
        setError("Task not found");
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching task:", error);
      setError("Failed to load task");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [projectId, taskId, boardId]);

  // Load creator display name
  useEffect(() => {
    if (task?.createdBy?.email) {
      getUserDisplayName(task.createdBy.email)
        .then(displayName => setCreatedByDisplayName(displayName))
        .catch(error => {
          console.error("Error loading creator display name:", error);
          setCreatedByDisplayName(task.createdBy.email);
        });
    }
  }, [task?.createdBy?.email]);

  // Fetch project members for assignment dropdown
  useEffect(() => {
    const fetchProjectMembers = async () => {
      try {
        if (!projectId) return;
        
        const projectRef = doc(db, "projects", projectId);
        const projectSnap = await getDoc(projectRef);
        
        if (projectSnap.exists()) {
          const members = projectSnap.data().members || [];
          setProjectMembers(members);
          
          // Fetch display names for all members
          const names: { [email: string]: string } = {};
          for (const member of members) {
            names[member] = await getUserDisplayName(member);
          }
          setMemberDisplayNames(names);
        }
      } catch (error) {
        console.error("Error fetching project members:", error);
      }
    };

    fetchProjectMembers();
  }, [projectId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDropdown) {
        const target = event.target as Element;
        if (!target.closest('[data-dropdown]')) {
          setShowDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  // Auto-save function with debouncing
  const autoSave = (field: string, value: string | number | boolean | string[] | { assignedTo: string | null }) => {
    if (!task || !user || !boardId) return;

    setIsAutoSaving(true);
    
    const taskRef = doc(db, `projects/${projectId}/boards/${boardId}/cards`, taskId);
    
    // Create clean update object, removing undefined values
    const updateData: Record<string, string | number | boolean | string[] | { assignedTo: string | null } | null> = {
      lastModified: new Date().toISOString(),
    };

    // Only add the field if it has a value (not undefined)
    if (value !== undefined) {
      // Handle empty strings for optional fields
      if (typeof value === 'string' && value.trim() === '' && (field === 'description' || field === 'dueDate' || field === 'startDate')) {
        // For optional string fields that are empty, don't include them
        // We'll use setDoc with merge: false to remove the field entirely later if needed
        updateData[field] = value.trim() || null;
      } else {
        updateData[field] = value;
      }
    }

    const updatedTask = {
      ...task,
      ...updateData,
    };

    setDoc(taskRef, updatedTask)
      .then(() => {
        // Log the update
        return createLog(
          projectId,
          "task",
          "update",
          `Updated ${field} for task "${task.title}"`,
          user.uid
        );
      })
      .then(() => {
        setIsAutoSaving(false);
        setEditingField(null);
      })
      .catch((error) => {
        console.error("Error updating task:", error);
        setError("Failed to update task");
        setIsAutoSaving(false);
      });
  };

  // Handle field click to enter edit mode
  const handleFieldEdit = (fieldName: string) => {
    setEditingField(fieldName);
  };

  // Handle save on blur or enter
  const handleFieldSave = (fieldName: string, value: string | number | boolean | string[] | { assignedTo: string | null }) => {
    if (task && task[fieldName as keyof CardType] !== value) {
      autoSave(fieldName, value);
    } else {
      setEditingField(null);
    }
  };

    // Handle escape key to cancel editing
  const handleKeyDown = (e: React.KeyboardEvent, fieldName: string, value: string | number | boolean) => {
    if (e.key === 'Escape') {
      setEditingField(null);
      // Reset form value
      if (task) {
        setEditForm(prev => ({ ...prev, [fieldName]: task[fieldName as keyof CardType] }));
      }
    } else if (e.key === 'Enter' && fieldName !== 'description') {
      handleFieldSave(fieldName, value);
    }
  };

  const handleDelete = () => {
    if (!task || !user || !boardId) return;
    
    if (window.confirm("Are you sure you want to delete this task?")) {
      const taskRef = doc(db, `projects/${projectId}/boards/${boardId}/cards`, taskId);
      
      deleteDoc(taskRef)
        .then(() => {
          // Log the deletion
          return createLog(
            projectId,
            "task",
            "delete",
            `Deleted task "${task.title}"`,
            user.uid
          );
        })
        .then(() => {
          // Navigate back to the board
          router.push(`/projects/${projectId}`);
        })
        .catch((error) => {
          console.error("Error deleting task:", error);
          setError("Failed to delete task");
        });
    }
  };

  const addLink = () => {
    setEditForm(prev => ({
      ...prev,
      links: [...prev.links, ""]
    }));
  };

  const updateLink = (index: number, value: string) => {
    setEditForm(prev => ({
      ...prev,
      links: prev.links.map((link, i) => i === index ? value : link)
    }));
  };

  const removeLink = (index: number) => {
    setEditForm(prev => ({
      ...prev,
      links: prev.links.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (error || !task) {
    return (
      <div className="bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[var(--text)] mb-4">
            {error || "Task not found"}
          </h1>
          <button
            onClick={() => router.back()}
            className="text-[var(--accent)] hover:underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--background)] overflow-x-hidden">
      <div className="max-w-[120rem] mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors px-3 py-2 rounded-lg hover:bg-[var(--surface)] group"
          >
            <FiArrowLeft className="w-5 h-5 transition-transform group-hover:animate-pulse translate-x-1 group-hover:-translate-x-1 duration-200" />
            Back
          </button>
          
          <div className="flex items-center gap-3">
            {/* Auto-save indicator */}
            {isAutoSaving && (
              <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                <div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm">Saving...</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6 shadow-sm overflow-hidden"
            >
              {/* Title */}
              <div className="mb-3">
                {editingField === 'title' ? (
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                    onBlur={() => handleFieldSave('title', editForm.title)}
                    onKeyDown={(e) => handleKeyDown(e, 'title', editForm.title)}
                    className="w-full text-3xl leading-tight font-bold bg-[var(--surface)] px-2 py-1 rounded border border-[var(--accent)] focus:border-[var(--accent)] outline-none text-[var(--text)]"
                    placeholder="Task title..."
                    autoFocus
                  />
                ) : (
                  <h1 
                    className="text-3xl font-bold text-[var(--text)] leading-tight border border-transparent cursor-pointer px-2 py-1 rounded hover:bg-[var(--surface)] hover:border-[var(--border)] transition-all duration-200"
                    onClick={() => handleFieldEdit('title')}
                    title="Click to edit title"
                  >
                    {task.title}
                  </h1>
                )}
              </div>

              {/* Description */}
              <div className="mb-3">
                {editingField === 'description' ? (
                  <textarea
                    ref={(el) => {
                      if (el) {
                        autoResizeTextarea(el);
                      }
                    }}
                    value={editForm.description}
                    onChange={(e) => {
                      setEditForm(prev => ({ ...prev, description: e.target.value }));
                      autoResizeTextarea(e.target);
                    }}
                    onBlur={() => handleFieldSave('description', editForm.description)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setEditingField(null);
                        setEditForm({
                          title: task.title,
                          description: task.description || '',
                          date: task.date || '',
                          duration: task.duration || 60,
                          assignment: { assignedTo: task.assignment?.assignedTo || null },
                          links: task.links || []
                        });
                      }
                    }}
                    className="block px-3 py-1 w-full min-h-[120px] bg-[var(--surface)] border border-[var(--accent)] rounded-lg text-[var(--text)] focus:border-[var(--accent)] outline-none resize-none break-words overflow-hidden"
                    placeholder="Add a description..."
                    autoFocus
                  />
                ) : (
                  <div 
                    className="block min-h-[120px] px-3 py-1 bg-transparent border border-transparent rounded-lg cursor-pointer hover:bg-[var(--surface)] hover:border-[var(--border)] transition-all duration-200"
                    onClick={() => handleFieldEdit('description')}
                    title="Click to edit description"
                  >
                    {task.description ? (
                      <div className="text-[var(--text)] whitespace-pre-wrap">
                        {task.description}
                      </div>
                    ) : (
                      <div className="text-[var(--text-secondary)] italic">
                        Click to add a description...
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Links Section */}
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
                  <FiLink className="w-5 h-5" />
                  Links & Resources
                </h2>
                {editingField === 'links' ? (
                  <div className="space-y-3">
                    {editForm.links.map((link, index) => (
                      <div key={index} className="flex gap-3">
                        <input
                          type="url"
                          value={link}
                          onChange={(e) => updateLink(index, e.target.value)}
                          className="flex-1 p-3 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text)] focus:border-[var(--accent)] outline-none"
                          placeholder="https://example.com"
                        />
                        <button
                          onClick={() => removeLink(index)}
                          className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
                        >
                          <FiTrash className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-3">
                      <button
                        onClick={addLink}
                        className="text-[var(--accent)] hover:underline text-sm font-medium"
                      >
                        + Add another link
                      </button>
                      <button
                        onClick={() => handleFieldSave('links', editForm.links)}
                        className="px-3 py-1 bg-[var(--accent)] text-white rounded text-sm hover:bg-[var(--accent-hover)] transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {task.links && task.links.length > 0 ? (
                      task.links.map((link, index) => (
                        <a
                          key={index}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-[var(--accent)] hover:underline break-all p-2 rounded hover:bg-[var(--background)] transition-colors group"
                        >
                          <FiLink className="w-4 h-4 flex-shrink-0" />
                          {link}
                        </a>
                      ))
                    ) : (
                      <div 
                        className="text-[var(--text-secondary)] italic p-2 cursor-pointer hover:bg-[var(--surface)] rounded transition-colors"
                        onClick={() => handleFieldEdit('links')}
                        title="Click to add links"
                      >
                        Click to add links...
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Status Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-[var(--text)] mb-3">Task Status</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-secondary)]">Column:</span>
                  <span className="font-medium text-[var(--text)] capitalize">{task.column}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-secondary)]">Priority:</span>
                  <span className="px-2 py-1 bg-[var(--accent)] text-white text-xs rounded-full">
                    {task.date ? 'Scheduled' : 'Open'}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Date & Time Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
                <FiCalendar className="w-5 h-5" />
                Schedule
              </h3>
              <div className="space-y-3">
                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={editForm.date ? editForm.date.split('T')[0] : ''}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setEditForm(prev => ({ ...prev, date: newDate }));
                      handleFieldSave('date', newDate);
                    }}
                    className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text)] hover:bg-[var(--surface)] hover:border-[var(--accent)] focus:bg-[var(--surface)] focus:border-[var(--accent)] outline-none cursor-pointer [color-scheme:dark]"
                    style={{ colorScheme: 'dark' }}
                    title="Select date"
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    <FiClock className="inline w-4 h-4 mr-1" />
                    Duration
                  </label>
                  {editingField === 'duration' ? (
                    <div className="space-y-3">
                      {/* Preset duration buttons */}
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: '15 min', value: 15 },
                          { label: '30 min', value: 30 },
                          { label: '45 min', value: 45 },
                          { label: '1 hour', value: 60 },
                          { label: '2 hours', value: 120 },
                          { label: '4 hours', value: 240 },
                          { label: '1 day', value: 480 },
                          { label: '2 days', value: 960 },
                          { label: '1 week', value: 2400 }
                        ].map(({ label, value }) => (
                          <button
                            key={value}
                            onClick={() => {
                              setEditForm(prev => ({ ...prev, duration: value }));
                              handleFieldSave('duration', value);
                            }}
                            className={`px-3 py-2 text-sm rounded-lg border transition-all duration-200 ${
                              editForm.duration === value
                                ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                                : 'bg-[var(--background)] text-[var(--text)] border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--surface)]'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      
                      {/* Custom duration input */}
                      <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
                        <span className="text-sm text-[var(--text-secondary)]">Custom:</span>
                        <input
                          type="number"
                          min="1"
                          value={editForm.duration}
                          onChange={(e) => setEditForm(prev => ({ ...prev, duration: parseInt(e.target.value) || 60 }))}
                          onBlur={() => handleFieldSave('duration', editForm.duration)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              setEditingField(null);
                            } else if (e.key === 'Enter') {
                              handleFieldSave('duration', editForm.duration);
                            }
                          }}
                          className="flex-1 p-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text)] focus:border-[var(--accent)] outline-none"
                          placeholder="Minutes"
                        />
                        <span className="text-sm text-[var(--text-secondary)]">min</span>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingField(null)}
                          className="px-3 py-1 text-sm bg-[var(--surface)] text-[var(--text-secondary)] rounded-lg border border-[var(--border)] hover:bg-[var(--background)] transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleFieldSave('duration', editForm.duration)}
                          className="px-3 py-1 text-sm bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="text-[var(--text)] p-2 bg-[var(--background)] rounded-lg border border-[var(--border)] cursor-pointer hover:bg-[var(--surface)] hover:border-[var(--accent)] transition-all duration-200"
                      onClick={() => handleFieldEdit('duration')}
                      title="Click to edit duration"
                    >
                      <span>{formatDuration(task.duration || 60)}</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Assignment Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
                <FiUser className="w-5 h-5" />
                Assignment
              </h3>
              <div className="relative">
                {/* Custom Assignment Dropdown */}
                <AssignmentDropdown
                  currentAssignee={editForm.assignment.assignedTo}
                  projectMembers={projectMembers}
                  memberDisplayNames={memberDisplayNames}
                  onAssigneeChange={(assignee) => {
                    setEditForm(prev => ({ 
                      ...prev, 
                      assignment: { assignedTo: assignee } 
                    }));
                    handleFieldSave('assignment', { assignedTo: assignee });
                  }}
                />
              </div>
            </motion.div>

            {/* Meta Information Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-[var(--text)]">Details</h3>
                <div className="relative" data-dropdown>
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="p-1 rounded hover:bg-[var(--background)] transition-colors"
                    title="More options"
                  >
                    <FiMoreVertical className="w-4 h-4 text-[var(--text-secondary)]" />
                  </button>
                  
                  {showDropdown && (
                    <div className="absolute right-0 top-full mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg py-1 min-w-32 z-10">
                      <button
                        onClick={() => {
                          handleDelete();
                          setShowDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors flex items-center gap-2"
                      >
                        <FiTrash className="w-4 h-4" />
                        Delete Task
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-[var(--text-secondary)]">Created by:</span>
                  <div className="font-medium text-[var(--text)] mt-1">
                    {createdByDisplayName || task.createdBy.email}
                  </div>
                </div>
                <div>
                  <span className="text-[var(--text-secondary)]">Created:</span>
                  <div className="font-medium text-[var(--text)] mt-1">
                    {new Date(task.createdAt).toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-[var(--text-secondary)]">Last modified:</span>
                  <div className="font-medium text-[var(--text)] mt-1">
                    {task.lastModified 
                      ? new Date(task.lastModified).toLocaleString() 
                      : "Never"
                    }
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Assignment Dropdown Component
const AssignmentDropdown = ({
  currentAssignee,
  projectMembers,
  memberDisplayNames,
  onAssigneeChange
}: {
  currentAssignee: string | null;
  projectMembers: string[];
  memberDisplayNames: { [email: string]: string };
  onAssigneeChange: (assignee: string | null) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen) {
        const target = event.target as Element;
        if (!target.closest('[data-assignment-dropdown]')) {
          setIsOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const getCurrentAssigneeDisplay = () => {
    if (!currentAssignee) return "Unassigned";
    return memberDisplayNames[currentAssignee] || currentAssignee;
  };

  return (
    <div className="relative" data-assignment-dropdown>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text)] hover:bg-[var(--surface)] hover:border-[var(--accent)] focus:bg-[var(--surface)] focus:border-[var(--accent)] outline-none cursor-pointer flex items-center gap-3"
      >
        {currentAssignee && (
          <UserAvatar
            email={currentAssignee}
            displayName={memberDisplayNames[currentAssignee]}
            size="sm"
          />
        )}
        <span className="flex-1 text-left">{getCurrentAssigneeDisplay()}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          ▼
        </motion.div>
      </button>
      
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute top-full left-0 right-0 mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto"
        >
          <button
            onClick={() => {
              onAssigneeChange(null);
              setIsOpen(false);
            }}
            className="w-full p-3 text-left hover:bg-[var(--background)] transition-colors flex items-center gap-3"
          >
            <div className="w-6 h-6" /> {/* Empty space for alignment */}
            <span className="text-[var(--text-secondary)]">Unassigned</span>
          </button>
          
          {projectMembers.map((member) => (
            <button
              key={member}
              onClick={() => {
                onAssigneeChange(member);
                setIsOpen(false);
              }}
              className={`w-full p-3 text-left hover:bg-[var(--background)] transition-colors flex items-center gap-3 ${
                currentAssignee === member ? 'bg-[var(--accent)]/10' : ''
              }`}
            >
              <UserAvatar
                email={member}
                displayName={memberDisplayNames[member]}
                size="sm"
              />
              <span className="text-[var(--text)]">
                {memberDisplayNames[member] || member}
              </span>
              {currentAssignee === member && (
                <span className="ml-auto text-xs text-[var(--accent)] font-medium">
                  Assigned
                </span>
              )}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
};
