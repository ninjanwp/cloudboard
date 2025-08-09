"use client";

import { useRouter } from "next/navigation"; // Change this import
import React, {
  Dispatch,
  SetStateAction,
  useState,
  DragEvent,
  FormEvent,
  useEffect,
} from "react";
import { FiPlus, FiCalendar, FiClock, FiUser } from "react-icons/fi";
import { motion } from "framer-motion";
import { db } from "../../../firebase";
import {
  collection,
  onSnapshot,
  setDoc,
  doc,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import { Modal } from "./Modal";
import { useAuth } from "../context/AuthContext";
import classNames from "classnames";
import { FaLink } from "react-icons/fa6";
import { getUserDisplayName } from "../utils/userUtils";
import { createLog } from "../utils/logUtils";

const GridBackground = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 0.5 }}
    className="absolute -z-10 pointer-events-none inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"
  />
);

export const CustomKanban = ({
  projectId,
  boardId,
}: {
  projectId: string;
  boardId: string;
}) => {
  const { user } = useAuth();
  const [projectError, setProjectError] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkProjectAccess = async () => {
      if (!projectId || !user) {
        router.replace("/");
        return;
      }

      try {
        const projectRef = doc(db, "projects", projectId);
        const projectSnap = await getDoc(projectRef);

        if (
          !projectSnap.exists() ||
          !projectSnap.data().members.includes(user?.email)
        ) {
          setProjectError(true);
          router.replace("/");
        }
      } catch (error) {
        console.error("Error checking project access:", error);
        setProjectError(true);
        router.replace("/");
      }
    };

    checkProjectAccess();
  }, [projectId, user, router]);

  return (
    <div className="w-full h-full">
      {projectError ? (
        <div className="flex h-full w-full items-center justify-center">
          <p className="text-neutral-400">
            This project is no longer accessible
          </p>
        </div>
      ) : !user ? (
        <div className="flex h-full w-full items-center justify-center">
          <p className="text-neutral-400">
            Please sign in to use the Kanban board
          </p>
        </div>
      ) : (
        <Board projectId={projectId} boardId={boardId} />
      )}
    </div>
  );
};

const Board = ({
  projectId,
  boardId,
}: {
  projectId: string;
  boardId: string;
}) => {
  const [cards, setCards] = useState<CardType[]>([]);

  useEffect(() => {
    const cardsRef = collection(
      db,
      `projects/${projectId}/boards/${boardId}/cards`
    );
    const unsubscribe = onSnapshot(cardsRef, (snapshot) => {
      const cardsData: CardType[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        cardsData.push({ id: doc.id, ...data } as CardType);
      });
      setCards(cardsData);
    });

    return () => unsubscribe();
  }, [projectId, boardId]);

  const updateCard = async (cardId: string, data: Partial<CardType>) => {
    try {
      await setDoc(
        doc(db, `projects/${projectId}/boards/${boardId}/cards`, cardId),
        {
          ...data,
          lastModified: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Error updating card:", error);
    }
  };

  const deleteCard = async (cardId: string) => {
    await deleteDoc(
      doc(db, `projects/${projectId}/boards/${boardId}/cards`, cardId)
    );
  };

  return (
    <div className="relative w-full h-full">
      <GridBackground />
      <div className="h-full w-full overflow-auto pb-24">
        <div className="flex min-w-max p-6">
          <Column
            title="Backlog"
            column="backlog"
            headingColor="blue-400"
            cards={cards}
            setCards={setCards}
            updateCard={updateCard}
            deleteCard={deleteCard}
            projectId={projectId} // Add this
            boardId={boardId} // Add this
          />
          <Column
            title="To Do"
            column="todo"
            headingColor="red-400"
            cards={cards}
            setCards={setCards}
            updateCard={updateCard}
            deleteCard={deleteCard}
            projectId={projectId} // Add this
            boardId={boardId} // Add this
          />

          <Column
            title="Doing"
            column="doing"
            headingColor="yellow-300"
            cards={cards}
            setCards={setCards}
            updateCard={updateCard}
            deleteCard={deleteCard}
            projectId={projectId} // Add this
            boardId={boardId} // Add this
          />

          <Column
            title="Done"
            column="done"
            headingColor="green-400"
            cards={cards}
            setCards={setCards}
            updateCard={updateCard}
            deleteCard={deleteCard}
            projectId={projectId} // Add this
            boardId={boardId} // Add this
          />
        </div>
      </div>
    </div>
  );
};

type ColumnProps = {
  title: string;
  headingColor: string;
  cards: CardType[];
  column: ColumnType;
  setCards: Dispatch<SetStateAction<CardType[]>>;
  updateCard: (cardId: string, data: Partial<CardType>) => Promise<void>;
  deleteCard: (cardId: string) => Promise<void>;
  projectId: string; // Add this
  boardId: string; // Add this
};

const Column = ({
  title,
  // Remove or comment out the unused parameter
  // headingColor, 
  cards,
  column,
  setCards,
  updateCard,
  deleteCard,
  projectId, // Add this
  boardId, // Add this
}: ColumnProps) => {
  const { user } = useAuth();
  const [active, setActive] = useState(false);

  const handleDragStart = (e: DragEvent, card: CardType) => {
    e.dataTransfer.setData("cardId", card.id);
  };

  const handleDragEnd = async (e: DragEvent) => {
    const cardId = e.dataTransfer.getData("cardId");

    setActive(false);
    clearHighlights();

    const indicators = getIndicators();
    const { element } = getNearestIndicator(e, indicators);
    const before = element.dataset.before || "-1";

    if (before !== cardId) {
      const card = cards.find((c) => c.id === cardId);
      if (!card) return;

      // Get the cards in the target column
      const columnCards = cards
        .filter((c) => c.column === column)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      // Calculate new order
      let newOrder: number;
      if (before === "-1") {
        // Moving to the end
        newOrder =
          columnCards.length > 0
            ? (columnCards[columnCards.length - 1].order || 0) + 1000
            : 1000;
      } else {
        const beforeCard = cards.find((c) => c.id === before);
        const afterCard =
          columnCards[columnCards.findIndex((c) => c.id === before) - 1];

        if (!beforeCard) {
          newOrder = 1000;
        } else if (!afterCard) {
          newOrder = (beforeCard.order || 0) / 2;
        } else {
          newOrder = ((afterCard.order || 0) + (beforeCard.order || 0)) / 2;
        }
      }

      const updatedCard = {
        ...card,
        column,
        order: newOrder,
        lastModified: new Date().toISOString(), // Add this line
      };

      await updateCard(cardId, {
        column,
        order: newOrder,
        lastModified: new Date().toISOString(), // Add this line
      });

      setCards((prevCards) => {
        const newCards = prevCards.filter((c) => c.id !== cardId);
        return [...newCards, updatedCard];
      });

      await createLog(
        projectId,
        "task",
        "moved a task",
        `Moved "${card.title}" to ${column}`,
        user?.email || "unknown"
      );
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    highlightIndicator(e);

    setActive(true);
  };

  const clearHighlights = (els?: HTMLElement[]) => {
    const indicators = els || getIndicators();

    indicators.forEach((i) => {
      i.style.opacity = "0";
    });
  };

  const highlightIndicator = (e: DragEvent) => {
    const indicators = getIndicators();

    clearHighlights(indicators);

    const el = getNearestIndicator(e, indicators);

    el.element.style.opacity = "1";
  };

  const getNearestIndicator = (e: DragEvent, indicators: HTMLElement[]) => {
    const cursortY = e.clientY;
    const closestIndicator = indicators.reduce(
      (closest, indicator) => {
        const box = indicator.getBoundingClientRect();
        const offset = cursortY - box.top;

        if (offset < 0 && offset > closest.offset) {
          return { offset, element: indicator };
        } else if (offset > 0 && offset < Math.abs(closest.offset)) {
          return { offset, element: indicator };
        } else {
          return closest;
        }
      },
      {
        offset: Number.NEGATIVE_INFINITY,
        element: indicators[indicators.length - 1],
      }
    );

    return closestIndicator;
  };

  const getIndicators = () => {
    return Array.from(
      document.querySelectorAll(
        `[data-column="${column}"]`
      ) as unknown as HTMLElement[]
    );
  };

  const handleDragLeave = () => {
    clearHighlights();
    setActive(false);
  };

  // Sort filtered cards by order only
  const filteredCards = cards
    .filter((c) => c.column === column)
    .sort((a, b) => {
      // Sort by order only
      return (a.order || 0) - (b.order || 0);
    });

  return (
    <div className="flex-grow w-56 shrink-0 px-2">
      <div className="mb-3 flex items-center justify-between gap-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] p-3 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-[var(--accent)] text-white font-mono px-2 py-1 text-sm font-bold min-w-[28px] text-center">
            {filteredCards.length}
          </span>
          <h3 className="font-bold text-[var(--text)] text-lg">{title}</h3>
        </div>
        {column === "backlog" && (
          <AddCard
            column={column}
            cards={cards}
            projectId={projectId}
            boardId={boardId}
          />
        )}
      </div>
      <div
        onDrop={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={classNames(
          "min-h-[400px] w-full transition-all duration-200 rounded-xl border-2 border-dashed p-3",
          active
            ? "border-[var(--accent)] bg-[var(--accent)]/5"
            : "border-transparent"
        )}
      >
        <DropIndicator
          beforeId={filteredCards[0]?.id || null}
          column={column}
        />
        {filteredCards.map((card, index) => (
          <React.Fragment key={card.id}>
            <Card
              {...card}
              handleDragStart={handleDragStart}
              updateCard={updateCard}
              deleteCard={deleteCard}
              projectId={projectId}
              boardId={boardId}
            />
            <DropIndicator
              beforeId={filteredCards[index + 1]?.id || null}
              column={column}
            />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

type CardProps = CardType & {
  handleDragStart: (e: DragEvent, card: CardType) => void;
  updateCard: (cardId: string, data: Partial<CardType>) => Promise<void>;
  deleteCard: (cardId: string) => Promise<void>;
  projectId: string;
  boardId: string;
};

// Add this utility function before the Card component
const getTimeAgo = (lastModified: string | undefined, createdAt: string) => {
  const date = lastModified ? new Date(lastModified) : new Date(createdAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffTime / (1000 * 60));
      if (diffMinutes <= 1) {
        return "just now";
      }
      return `${diffMinutes}m ago`;
    }
    return `${diffHours}h ago`;
  } else if (diffDays === 1) {
    return "yesterday";
  }
  return `${diffDays} days ago`;
};

// Add these types near your other type definitions
type CardType = {
  title: string;
  id: string;
  column: ColumnType;
  createdAt: string;
  description?: string;
  createdBy: {
    uid: string;
    email: string;
  };
  lastModified?: string;
  order?: number;
  links?: { url: string; title: string }[];
  assignment?: {
    assignedTo: string | null;
    assignedAt: string;
  };
  // Date-focused fields
  date?: string;
  duration?: number; // in minutes
};

const Card = ({ ...props }: CardProps) => {
  const [projectMembers, setProjectMembers] = useState<string[]>([]);
  const router = useRouter();
  
  useEffect(() => {
    const fetchProjectMembers = async () => {
      try {
        const projectRef = doc(db, "projects", props.projectId);
        const projectSnap = await getDoc(projectRef);
        if (projectSnap.exists()) {
          setProjectMembers(projectSnap.data().members || []);
        } else {
          // Project was deleted
          router.push("/projects");
        }
      } catch (error) {
        console.error("Error fetching project members:", error);
        router.push("/projects");
      }
    };
    fetchProjectMembers();
  }, [props.projectId, router]);
  
  const [userDisplayNames, setUserDisplayNames] = useState<{
    [email: string]: string;
  }>({});
  
  useEffect(() => {
    const loadDisplayNames = async () => {
      const names: { [email: string]: string } = {};
      for (const member of projectMembers) {
        names[member] = await getUserDisplayName(member);
      }
      setUserDisplayNames(names);
    };
    loadDisplayNames();
  }, [projectMembers]);

  const handleCardClick = () => {
    router.push(`/projects/${props.projectId}/task/${props.id}?boardId=${props.boardId}`);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDateInfo = () => {
    if (props.date) {
      return `Date: ${formatDate(props.date)}`;
    }
    return null;
  };

  return (
    <>
      <motion.div
        layout
        layoutId={props.id}
        draggable="true"
        onClick={handleCardClick}
        onDragStart={(e) =>
          props.handleDragStart(e as unknown as DragEvent, {
            title: props.title,
            id: props.id,
            column: props.column,
            createdAt: props.createdAt,
            createdBy: props.createdBy,
            date: props.date,
            duration: props.duration,
          })
        }
        className="cursor-grab rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 mb-3 hover:border-[var(--accent)] hover:bg-[var(--background)] hover:scale-[1.02] hover:shadow-xl hover:-translate-y-1 hover:ring-1 hover:ring-[var(--accent)]/20 active:cursor-grabbing select-none transition-all duration-200 ease-out transform-gpu shadow-sm"
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2 items-start justify-between">
            <div className="flex items-start gap-3 flex-1 min-w-[60%]">
              <FiCalendar className="flex-shrink-0 text-lg text-[var(--accent)] mt-0.5" />
              <h3 className="text-lg font-bold text-[var(--text)] break-words leading-tight">
                {props.title}
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {getDateInfo() && (
                <span className="text-xs bg-[var(--accent)] text-white px-2 py-1 rounded-md font-medium">
                  {props.date && formatDate(props.date)}
                </span>
              )}
              <AgeBadge
                lastModified={props.lastModified}
                createdAt={props.createdAt}
              />
            </div>
          </div>

          {props.description && (
            <div className="bg-[var(--background)] border border-[var(--border)] rounded-lg p-3">
              <p className="text-sm text-[var(--text)] whitespace-pre-wrap break-words line-clamp-3">
                {props.description}
              </p>
            </div>
          )}

          {props.duration && (
            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <FiClock className="w-4 h-4" />
              <span>Duration: {Math.floor(props.duration / 60)}h {props.duration % 60}m</span>
            </div>
          )}

          {props.links && props.links.length > 0 && (
            <div className="space-y-2">
              {props.links.map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-2 text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] bg-[var(--background)] border border-[var(--border)] rounded-lg p-2 transition-colors"
                >
                  <FaLink className="text-xs flex-shrink-0" />
                  <span className="truncate">{link.title || link.url}</span>
                </a>
              ))}
            </div>
          )}

          {props.assignment?.assignedTo && (
            <div className="flex items-center gap-2 bg-[var(--background)] border border-[var(--border)] rounded-lg p-3">
              <FiUser className="w-4 h-4 text-[var(--accent)]" />
              <div className="flex flex-col">
                <span className="text-xs text-[var(--text-secondary)]">Assigned to</span>
                <span className="text-sm font-medium text-[var(--text)]">
                  {userDisplayNames[props.assignment.assignedTo] ||
                    props.assignment.assignedTo}
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-between text-xs text-[var(--text-secondary)] pt-2 border-t border-[var(--border)]">
            <div className="flex flex-col">
              <span>Created</span>
              <span className="font-medium">{new Date(props.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex flex-col text-right">
              <span>{props.lastModified ? "Updated" : "Unchanged"}</span>
              <span className="font-medium">{getTimeAgo(props.lastModified, props.createdAt)}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

type DropIndicatorProps = {
  beforeId: string | null;
  column: string;
};

const DropIndicator = ({ beforeId, column }: DropIndicatorProps) => {
  return (
    <div
      data-before={beforeId || "-1"}
      data-column={column}
      className="my-2 h-1 rounded-full w-full bg-[var(--accent)] opacity-0 transition-opacity duration-200 shadow-lg"
    />
  );
};

type AddCardProps = {
  column: ColumnType;
  cards: CardType[];
  projectId: string; // Add this
  boardId: string; // Add this
};

const AddCard = ({ column, cards, projectId, boardId }: AddCardProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [text, setText] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(60);
  const { user } = useAuth();
  const [assignedMember, setAssignedMember] = useState<string | null>(null);
  const [projectMembers, setProjectMembers] = useState<string[]>([]);

  useEffect(() => {
    const fetchProjectMembers = async () => {
      const projectRef = doc(db, "projects", projectId);
      const projectSnap = await getDoc(projectRef);
      if (projectSnap.exists()) {
        setProjectMembers(projectSnap.data().members || []);
      }
    };
    fetchProjectMembers();
  }, [projectId]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!text.trim().length || !user || !projectId || !boardId) return;

    // Calculate new order value
    const columnCards = cards
      .filter((c) => c.column === column)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    const newOrder =
      columnCards.length > 0
        ? (columnCards[columnCards.length - 1].order || 0) + 1000
        : 1000;

    const newCardId = doc(
      collection(db, "projects", projectId, "boards", boardId, "cards")
    ).id;

    const newCard: Partial<CardType> = {
      column,
      title: text.trim(),
      description: description.trim(),
      id: newCardId,
      createdAt: new Date().toISOString(),
      createdBy: {
        uid: user.uid,
        email: user.email || "",
      },
      order: newOrder,
      duration,
      assignment: {
        assignedTo: assignedMember,
        assignedAt: new Date().toISOString(),
      },
    };

    try {
      await setDoc(
        doc(db, `projects/${projectId}/boards/${boardId}/cards`, newCardId),
        newCard
      );
      await createLog(
        projectId,
        "task",
        "created a new task",
        `Created "${text.trim()}"`,
        user.email || "unknown"
      );

      // If there's an initial assignment, create assignment log
      if (assignedMember) {
        await createLog(
          projectId,
          "assignment",
          "assigned a task",
          `Assigned "${text.trim()}" to ${assignedMember}`,
          user.email || "unknown"
        );
      }

      setIsModalOpen(false);
      setText("");
      setDescription("");
      setDuration(60);
    } catch (error) {
      console.error("Error adding card:", error);
    }
  };

  return (
    <>
      <motion.button
        layout
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors font-medium shadow-sm"
      >
        <FiPlus className="w-4 h-4" />
        <span>New Task</span>
      </motion.button>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <form
          onSubmit={handleSubmit}
          className="space-y-6 max-h-[80vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <FiCalendar className="text-2xl text-[var(--accent)]" />
              <h2 className="text-2xl font-bold text-[var(--text)]">Create New Task</h2>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2">
              Task Title *
            </label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full p-3 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text)] focus:border-[var(--accent)] outline-none transition-colors"
              placeholder="Enter task title..."
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
              rows={4}
              className="w-full p-3 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text)] focus:border-[var(--accent)] outline-none resize-y transition-colors"
              placeholder="Enter task description..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2">
              Duration (minutes)
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
              className="w-full p-3 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text)] focus:border-[var(--accent)] outline-none transition-colors"
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

          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2">
              Assignment
            </label>
            <TaskAssignment
              currentAssignee={assignedMember || ""}
              projectMembers={projectMembers}
              onAssign={(email) => setAssignedMember(email)}
              onUnassign={() => setAssignedMember(null)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">
                Created by
              </label>
              <input
                type="text"
                value={user?.email || ""}
                readOnly
                className="w-full p-3 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text-secondary)] cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">
                Created on
              </label>
              <input
                type="text"
                value={new Date().toLocaleDateString()}
                readOnly
                className="w-full p-3 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text-secondary)] cursor-not-allowed"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-4 py-3 border border-[var(--border)] text-[var(--text)] rounded-lg hover:bg-[var(--surface)] transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors font-medium"
            >
              Create Task
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
};

type ColumnType = "backlog" | "todo" | "doing" | "done";
type Age = "recent" | "aging" | "stale";

// Add this new component after the Badge component
const AgeBadge = ({
  lastModified,
  createdAt,
}: {
  lastModified?: string;
  createdAt: string;
}) => {
  const getAge = (lastModified: string | undefined, createdAt: string): Age => {
    const date = lastModified ? new Date(lastModified) : new Date(createdAt);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays <= 2) return "recent";
    if (diffDays <= 5) return "aging";
    return "stale";
  };

  const age = getAge(lastModified, createdAt);
  const styles = {
    recent: "bg-green-500/10 text-green-600 border border-green-500/20",
    aging: "bg-yellow-500/10 text-yellow-600 border border-yellow-500/20",
    stale: "bg-red-500/10 text-red-600 border border-red-500/20",
  }[age];

  const label = {
    recent: "Recent",
    aging: "Aging",
    stale: "Stale",
  }[age];

  return (
    <span className={`text-xs px-2 py-1 rounded-md font-medium ${styles}`}>
      {label}
    </span>
  );
};

const TaskAssignment = ({
  currentAssignee,
  projectMembers,
  onAssign,
  onUnassign,
}: {
  currentAssignee: string | null;
  projectMembers: string[];
  onAssign: (email: string) => void;
  onUnassign: () => void;
}) => {
  const [userDisplayNames, setUserDisplayNames] = useState<{
    [email: string]: string;
  }>({});
  useEffect(() => {
    const loadDisplayNames = async () => {
      const names: { [email: string]: string } = {};
      for (const member of projectMembers) {
        names[member] = await getUserDisplayName(member);
      }
      setUserDisplayNames(names);
    };
    loadDisplayNames();
  }, [projectMembers]);

  return (
    <div className="space-y-3 bg-[var(--surface)] p-4 rounded-lg border border-[var(--border)]">
      <div className="flex flex-col gap-3">
        {projectMembers.map((member) => (
          <label
            key={member}
            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
              currentAssignee === member
                ? "bg-[var(--accent)]/10 border-2 border-[var(--accent)] ring-1 ring-[var(--accent)]/20"
                : "border-2 border-[var(--border)] hover:bg-[var(--background)] hover:border-[var(--accent)]/50"
            }`}
          >
            <input
              type="radio"
              name="assignee"
              checked={currentAssignee === member}
              onChange={() => onAssign(member)}
              className="w-4 h-4 text-[var(--accent)] border-2 border-[var(--border)] focus:ring-[var(--accent)] focus:ring-2"
            />
            <div className="flex-1">
              <span className="text-[var(--text)] font-medium">
                {userDisplayNames[member] || member}
              </span>
              {currentAssignee === member && (
                <span className="ml-2 text-xs text-[var(--accent)] font-medium bg-[var(--accent)]/10 px-2 py-1 rounded">
                  Assigned
                </span>
              )}
            </div>
          </label>
        ))}
      </div>
      {currentAssignee && (
        <button
          onClick={onUnassign}
          className="w-full p-3 bg-red-500/10 border-2 border-red-500/30 rounded-lg text-red-600 hover:bg-red-500/20 hover:border-red-500/50 transition-all duration-200 font-medium"
        >
          Unassign Task
        </button>
      )}
    </div>
  );
};
