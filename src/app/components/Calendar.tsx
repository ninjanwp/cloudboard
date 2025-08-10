"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FiChevronLeft, FiChevronRight, FiCalendar, FiClock, FiPlus, FiX } from "react-icons/fi";
import { collection, onSnapshot, addDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { useAuth } from "../context/AuthContext";
import { getUserDisplayName } from "../utils/userUtils";
import { UserAvatar } from "./UserAvatar";

type CalendarTask = {
  id: string;
  title: string;
  description?: string;
  date?: string;
  duration?: number;
  assignment?: {
    assignedTo: string | null;
  };
  column: string;
  createdBy: {
    uid: string;
    email: string;
  };
};

type CalendarView = "day" | "week" | "month";

export const Calendar = ({ projectId, boardId }: { projectId: string; boardId: string }) => {
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>("week");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const [userDisplayNames, setUserDisplayNames] = useState<{
    [email: string]: string;
  }>({});
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    const cardsRef = collection(db, `projects/${projectId}/boards/${boardId}/cards`);
    const unsubscribe = onSnapshot(cardsRef, (snapshot) => {
      const tasksData: CalendarTask[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.date) {
          tasksData.push({ id: doc.id, ...data } as CalendarTask);
        }
      });
      setTasks(tasksData);
    });

    return () => unsubscribe();
  }, [projectId, boardId]);

  // Load display names for assigned users
  useEffect(() => {
    const loadDisplayNames = async () => {
      const uniqueEmails = new Set<string>();
      
      // Collect all unique assigned emails
      tasks.forEach(task => {
        if (task.assignment?.assignedTo) {
          uniqueEmails.add(task.assignment.assignedTo);
        }
      });

      // Load display names for emails we don't have cached
      const newDisplayNames: {[email: string]: string} = {};
      
      for (const email of uniqueEmails) {
        if (!userDisplayNames[email]) {
          const displayName = await getUserDisplayName(email);
          newDisplayNames[email] = displayName;
        }
      }

      // Update state with new display names
      if (Object.keys(newDisplayNames).length > 0) {
        setUserDisplayNames(prev => ({ ...prev, ...newDisplayNames }));
      }
    };

    if (tasks.length > 0) {
      loadDisplayNames();
    }
  }, [tasks, userDisplayNames]);

    // Create task function
  const createTask = async (taskData: {
    title: string;
    description?: string;
    date?: string;
    duration?: number;
  }) => {
    if (!user) return;

    try {
      const cardsRef = collection(db, `projects/${projectId}/boards/${boardId}/cards`);
      
      // Filter out undefined values
      const cleanTaskData: {
        title: string;
        column: string;
        createdBy: {
          uid: string;
          email: string | null;
        };
        createdAt: string;
        assignment: { assignedTo: null };
        links: never[];
        description?: string;
        date?: string;
        duration?: number;
      } = {
        title: taskData.title,
        column: "todo",
        createdBy: {
          uid: user.uid,
          email: user.email,
        },
        createdAt: new Date().toISOString(),
        assignment: { assignedTo: null },
        links: [],
      };

      // Only add fields if they have values
      if (taskData.description && taskData.description.trim()) {
        cleanTaskData.description = taskData.description.trim();
      }
      
      if (taskData.date) {
        cleanTaskData.date = taskData.date;
      }
      
      if (taskData.duration) {
        cleanTaskData.duration = taskData.duration;
      }

      await addDoc(cardsRef, cleanTaskData);
      setShowCreateModal(false);
    } catch (error) {
      console.error("Error creating task:", error);
    }
  };

  const handleDateClick = (date: Date) => {
    setCurrentDate(date);
    setView('day');
  };

  const handleCreateTaskClick = (date: Date, time?: string) => {
    setSelectedDate(date);
    setSelectedTime(time || "");
    setShowCreateModal(true);
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (view === 'day') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const getTasksForDate = (date: Date) => {
    return tasks.filter(task => {
      if (!task.date) return false;
      
      // Compare dates by year, month, day to avoid timezone issues
      const taskDate = new Date(task.date + 'T00:00:00'); // Force local timezone
      const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      
      return taskDate.getFullYear() === compareDate.getFullYear() &&
             taskDate.getMonth() === compareDate.getMonth() &&
             taskDate.getDate() === compareDate.getDate();
    });
  };

  // Function to get task color based on status and urgency
  const getTaskColor = (task: CalendarTask) => {
    const now = new Date();
    const taskDate = task.date ? new Date(task.date + 'T00:00:00') : null;
    
    if (task.column === 'done') return 'border-l-green-600';
    if (task.column === 'in-progress') return 'border-l-blue-600';
    if (taskDate && taskDate < now) return 'border-l-orange-600'; // Overdue - changed from bright red to orange
    if (task.assignment?.assignedTo) return 'border-l-purple-600'; // Assigned
    return 'border-l-slate-600'; // Default - more neutral color
  };

  // Function to format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  };

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

  // Function to truncate text for calendar display
  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const renderDayView = () => {
    const dayTasks = getTasksForDate(currentDate);

    return (
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-4">
          <div 
            className="border-2 border-dashed border-[var(--border)] rounded-lg p-4 text-center cursor-pointer hover:bg-[var(--surface)] transition-colors"
            onClick={() => handleCreateTaskClick(currentDate)}
            title="Click to create new task"
          >
            <FiPlus className="mx-auto mb-2 text-2xl text-[var(--text-secondary)]" />
            <p className="text-[var(--text-secondary)]">Add new task for {formatDate(currentDate)}</p>
          </div>
          
          {dayTasks.length === 0 ? (
            <div className="text-center py-8">
              <FiCalendar className="mx-auto mb-4 text-4xl text-[var(--text-secondary)]" />
              <p className="text-[var(--text-secondary)]">No tasks scheduled for this day</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dayTasks.map(task => (
                <button
                  key={task.id}
                  onClick={() => router.push(`/projects/${projectId}/task/${task.id}?boardId=${boardId}`)}
                  className={`w-full p-3 rounded-lg bg-[var(--surface)] text-[var(--text)] text-left hover:opacity-95 hover:scale-[1.01] hover:shadow-md transition-all duration-150 ease-out cursor-pointer border-l-3 ${getTaskColor(task)} relative`}
                  title={`${task.title}${task.assignment?.assignedTo ? ` (${userDisplayNames[task.assignment.assignedTo] || task.assignment.assignedTo})` : ''}${task.description ? `\n${task.description}` : ''}`}
                >
                  {/* Status badge in top right corner */}
                  <div className="absolute top-2 right-2">
                    <span className="capitalize font-medium px-2 py-1 bg-[var(--background)] rounded text-[var(--text-secondary)] text-xs leading-none">
                      {task.column === 'todo' ? 'Todo' : task.column === 'in-progress' ? 'In Progress' : task.column === 'done' ? 'Done' : task.column}
                    </span>
                  </div>
                  
                  {/* Main content with right margin to avoid status badge */}
                  <div className="pr-20">
                    <div className="font-medium text-sm mb-2 line-clamp-2">
                      {task.title}
                    </div>
                    
                    {task.description && (
                      <div className="text-sm opacity-80 mb-3 line-clamp-2">
                        {task.description}
                      </div>
                    )}
                    
                    {/* Bottom info row */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        {task.duration && (
                          <span className="text-[var(--text-secondary)] flex items-center gap-1">
                            <FiClock className="w-3 h-3" />
                            {formatDuration(task.duration)}
                          </span>
                        )}
                      </div>
                      {task.assignment?.assignedTo && (
                        <div className="flex items-center gap-2">
                          <UserAvatar
                            email={task.assignment.assignedTo}
                            displayName={userDisplayNames[task.assignment.assignedTo]}
                            size="sm"
                          />
                          <span className="text-[var(--accent)] font-medium text-sm">
                            {userDisplayNames[task.assignment.assignedTo]?.split(' ')[0] || task.assignment.assignedTo.split('@')[0]}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      return day;
    });

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="grid grid-cols-7 border-b border-[var(--border)]">
          {weekDays.map((day) => {
            const dayKey = day.toISOString();
            const isHovered = hoveredDay === dayKey;
            const isToday = day.toDateString() === new Date().toDateString();
            return (
              <div 
                key={day.toISOString()} 
                className={`p-3 text-center border-r border-[var(--border)] transition-colors duration-200 ${
                  isHovered ? 'bg-[var(--accent)] text-white' : isToday ? 'bg-[var(--accent)]/10' : ''
                }`}
              >
                <div className={`text-sm ${isHovered ? 'text-white' : isToday ? 'text-[var(--accent)] font-semibold' : 'text-[var(--text-secondary)]'}`}>
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className={`text-lg font-medium ${isHovered ? 'text-white' : isToday ? 'text-[var(--accent)] font-bold' : 'text-[var(--text)]'}`}>
                  {day.getDate()}
                </div>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-7 flex-1 overflow-hidden">
          {weekDays.map((day, index) => {
            const dayTasks = getTasksForDate(day);
            const dayKey = day.toISOString();
            return (
              <motion.div 
                key={dayKey} 
                className={`border-r border-[var(--border)] p-2 h-full space-y-1 cursor-pointer relative group overflow-y-auto transition-colors`}
                onClick={() => handleDateClick(day)}
                title="Click to view day"
                onMouseEnter={() => setHoveredDay(dayKey)}
                onMouseLeave={() => setHoveredDay(null)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  duration: 0.3, 
                  delay: index * 0.05,
                  ease: "easeOut"
                }}
              >
                {dayTasks.map((task, taskIndex) => (
                  <motion.button
                    key={task.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/projects/${projectId}/task/${task.id}?boardId=${boardId}`);
                    }}
                    className={`w-full bg-[var(--surface)] text-[var(--text)] p-2.5 rounded-md text-xs hover:opacity-95 hover:scale-[1.01] hover:shadow-md transition-all duration-150 ease-out cursor-pointer text-left border-l-3 ${getTaskColor(task)} mb-1.5 relative`}
                    style={{ zIndex: taskIndex + 1 }}
                    title={`${task.title}${task.assignment?.assignedTo ? ` (${userDisplayNames[task.assignment.assignedTo] || task.assignment.assignedTo})` : ''}${task.description ? `\n${task.description}` : ''}`}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ 
                      duration: 0.2, 
                      delay: (index * 0.1) + (taskIndex * 0.05),
                      ease: "easeOut"
                    }}
                  >
                    {/* Status badge in top right corner */}
                    <div className="absolute top-1.5 right-1.5">
                      <span className="capitalize font-medium px-1.5 py-0.5 bg-[var(--background)] rounded text-[var(--text-secondary)] text-xs leading-none">
                        {task.column === 'todo' ? 'Todo' : task.column === 'in-progress' ? 'In Progress' : task.column === 'done' ? 'Done' : task.column}
                      </span>
                    </div>
                    
                    {/* Main content with right margin to avoid status badge */}
                    <div className="pr-16 pb-6">
                      <div className="font-medium text-xs leading-snug mb-1.5 line-clamp-2">
                        {task.title}
                      </div>
                      
                      {task.description && (
                        <div className="text-xs opacity-70 mb-1.5 line-clamp-1">
                          {task.description}
                        </div>
                      )}
                      
                      {/* Duration info */}
                      {task.duration && (
                        <div className="text-xs">
                          <span className="text-[var(--text-secondary)] flex items-center gap-1">
                            <FiClock className="w-2.5 h-2.5" />
                            {formatDuration(task.duration)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* User avatar in bottom right corner */}
                    {task.assignment?.assignedTo && (
                      <div className="absolute bottom-1.5 right-1.5">
                        <UserAvatar
                          email={task.assignment.assignedTo}
                          displayName={userDisplayNames[task.assignment.assignedTo]}
                          size="sm"
                        />
                      </div>
                    )}
                  </motion.button>
                ))}
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDate = new Date(startOfMonth);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    const days = [];
    const current = new Date(startDate);
    
    while (current <= endOfMonth || current.getDay() !== 0) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="grid grid-cols-7 border-b border-[var(--border)]">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 text-center text-sm text-[var(--text-secondary)] border-r border-[var(--border)]">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 flex-1 overflow-hidden" style={{ gridTemplateRows: `repeat(${Math.ceil(days.length / 7)}, 1fr)` }}>
          {days.map((day, index) => {
            const dayTasks = getTasksForDate(day);
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            const isToday = day.toDateString() === new Date().toDateString();
            const dayKey = day.toISOString();
            
            return (
              <motion.div
                key={dayKey}
                className={`border-r border-b border-[var(--border)] p-1 h-full cursor-pointer relative group overflow-y-auto transition-colors ${
                  !isCurrentMonth ? 'text-[var(--text-secondary)] bg-[var(--surface)] opacity-75' : ''
                } ${isToday ? 'ring-2 ring-[var(--accent)] ring-inset' : ''}`}
                onClick={() => handleDateClick(day)}
                title="Click to view day"
                onMouseEnter={() => setHoveredDay(dayKey)}
                onMouseLeave={() => setHoveredDay(null)}
                initial={{ opacity: 0, scale: 1 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ 
                  duration: 0.25, 
                  delay: index * 0.005,
                  ease: "easeOut"
                }}
              >
                <div className={`text-sm mb-1 font-medium ${
                  isToday ? 'text-[var(--accent)]' : day.getMonth() !== currentDate.getMonth() ? 'text-[var(--text-secondary)]' : 'text-[var(--text)]'
                }`}>
                  {day.getDate()}
                </div>
                <div className="space-y-1">
                  {dayTasks.slice(0, 3).map((task, taskIndex) => (
                    <motion.button
                      key={task.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/projects/${projectId}/task/${task.id}?boardId=${boardId}`);
                      }}
                      className={`w-full bg-[var(--surface)] text-[var(--text)] text-xs p-1 rounded hover:opacity-95 hover:scale-[1.01] hover:shadow-sm transition-all duration-150 ease-out cursor-pointer text-left border-l-2 ${getTaskColor(task)} relative`}
                      title={`${task.title} (${task.column})${task.assignment?.assignedTo ? ` - ${userDisplayNames[task.assignment.assignedTo] || task.assignment.assignedTo}` : ''}${task.description ? `\n${task.description}` : ''}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ 
                        duration: 0.2, 
                        delay: (index * 0.02) + (taskIndex * 0.1),
                        ease: "easeOut"
                      }}
                    >
                      <div className="font-medium text-xs leading-tight line-clamp-1 pr-4">
                        {truncateText(task.title, 15)}
                      </div>
                      {task.duration && (
                        <div className="text-xs opacity-60 flex items-center gap-0.5 mt-0.5">
                          <FiClock className="w-2 h-2" />
                          {formatDuration(task.duration)}
                        </div>
                      )}
                      
                      {/* User avatar in top right corner of task card */}
                      {task.assignment?.assignedTo && (
                        <div className="absolute top-0.5 right-0.5">
                          <UserAvatar
                            email={task.assignment.assignedTo}
                            displayName={userDisplayNames[task.assignment.assignedTo]}
                            size="xs"
                          />
                        </div>
                      )}
                    </motion.button>
                  ))}
                  {dayTasks.length > 3 && (
                    <motion.div 
                      className="text-xs text-[var(--text-secondary)] px-1 py-0.5 bg-[var(--background)] rounded truncate"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ 
                        duration: 0.2, 
                        delay: (index * 0.02) + (3 * 0.1),
                        ease: "easeOut"
                      }}
                    >
                      +{dayTasks.length - 3} more
                    </motion.div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-[var(--background)] overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-[var(--text)]">Calendar</h2>
          <div className="flex bg-[var(--surface)] rounded">
            {(['day', 'week', 'month'] as CalendarView[]).map(viewType => (
              <button
                key={viewType}
                onClick={() => setView(viewType)}
                className={`px-3 py-1 text-sm rounded ${
                  view === viewType 
                    ? 'bg-[var(--accent)] text-white' 
                    : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
                }`}
              >
                {viewType.charAt(0).toUpperCase() + viewType.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleCreateTaskClick(new Date())}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors font-medium"
          >
            <FiPlus className="w-4 h-4" />
            New Task
          </button>
          <button
            onClick={() => navigateDate('prev')}
            className="p-2 hover:bg-[var(--surface-hover)] rounded"
          >
            <FiChevronLeft />
          </button>
          <div className="text-lg font-medium text-[var(--text)] min-w-48 text-center">
            {currentDate.toLocaleDateString('en-US', { 
              month: 'long', 
              year: 'numeric',
              ...(view === 'day' && { day: 'numeric' })
            })}
          </div>
          <button
            onClick={() => navigateDate('next')}
            className="p-2 hover:bg-[var(--surface-hover)] rounded"
          >
            <FiChevronRight />
          </button>
        </div>
      </div>

      {/* Calendar Content */}
      <motion.div 
        key={view}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex-1 flex flex-col overflow-hidden"
      >
        {view === 'day' && renderDayView()}
        {view === 'week' && renderWeekView()}
        {view === 'month' && renderMonthView()}
      </motion.div>

      {/* Task Creation Modal */}
      {showCreateModal && (
        <TaskCreateModal
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          onCreateTask={createTask}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
};

// Task Creation Modal Component
const TaskCreateModal = ({ selectedDate, selectedTime, onCreateTask, onClose }: {
  selectedDate: Date | null;
  selectedTime: string;
  onCreateTask: (taskData: {
    title: string;
    description?: string;
    date: string;
    duration?: number;
  }) => void;
  onClose: () => void;
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(60);
  const [time, setTime] = useState(selectedTime || "09:00");
  const [date, setDate] = useState(
    selectedDate ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    const taskData: {
      title: string;
      date: string;
      description?: string;
      duration?: number;
    } = {
      title: title.trim(),
      date: date,
    };

    // Only add description if it has content
    if (description.trim()) {
      taskData.description = description.trim();
    }

    // Only add duration if it's not the default
    if (duration && duration !== 60) {
      taskData.duration = duration;
    }

    onCreateTask(taskData);

    setTitle("");
    setDescription("");
    setDuration(60);
    setTime("09:00");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6 w-full max-w-md shadow-xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-[var(--text)]">Create New Task</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--background)] rounded transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2">
              Task Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text)] focus:border-[var(--accent)] outline-none"
              placeholder="Enter task title..."
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text)] focus:border-[var(--accent)] outline-none resize-y"
              placeholder="Enter task description..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2">
              Date *
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-3 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text)] focus:border-[var(--accent)] outline-none [color-scheme:dark]"
              style={{ colorScheme: 'dark' }}
              required
            />
          </div>
            
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">
                Start Time
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full p-3 border border-[var(--border)] rounded bg-[var(--background)] text-[var(--text)] focus:border-[var(--accent)] outline-none [color-scheme:dark]"
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">
                Duration
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                className="w-full p-3 border border-[var(--border)] rounded bg-[var(--background)] text-[var(--text)] focus:border-[var(--accent)] outline-none"
              >
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
                <option value={180}>3 hours</option>
                <option value={240}>4 hours</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-[var(--border)] text-[var(--text)] rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors font-medium"
            >
              Create Task
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
