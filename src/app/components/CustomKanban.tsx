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
import { FiPlus, FiTrash } from "react-icons/fi";
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
import { Badge } from "./Badge"; // We'll create this component
import classNames from "classnames";
import * as FaIcons from "react-icons/fa6";
import { IconSelector } from "./IconSelector";
import { getUserDisplayName } from "../utils/userUtils";
import { createLog } from "../utils/logUtils";

const iconOptions = Object.keys(FaIcons).map((key) => ({
  name: key,
  icon: (FaIcons as { [key: string]: React.ComponentType })[key],
}));

const GridBackground = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 0.2 }}
    className="absolute z-0 pointer-events-none inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"
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
        router.replace('/');
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
          router.replace('/');
        }
      } catch (error) {
        console.error("Error checking project access:", error);
        setProjectError(true);
        router.replace('/');
      }
    };

    checkProjectAccess();
  }, [projectId, user, router]);

  return (
    <div className="w-full h-full">
      {projectError ? (
        <div className="flex h-full w-full items-center justify-center">
          <p className="text-neutral-400">This project is no longer accessible</p>
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
        cardsData.push({ id: doc.id, ...doc.data() } as CardType);
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
      <div className="h-full w-full overflow-auto bg-neutral-950/80">
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

const colorMap: { [key: string]: string } = {
  "blue-400": "bg-blue-400 text-blue-400",
  "red-400": "bg-red-400 text-red-400",
  "yellow-300": "bg-yellow-300 text-yellow-300",
  "green-400": "bg-green-400 text-green-400",
};

const Column = ({
  title,
  headingColor,
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
      };

      await updateCard(cardId, {
        column,
        order: newOrder,
      });

      setCards((prevCards) => {
        const newCards = prevCards.filter((c) => c.id !== cardId);
        return [...newCards, updatedCard];
      });

      await createLog(
        projectId,
        'task',
        'moved a task',
        `Moved "${card.title}" to ${column}`,
        user?.email || 'unknown'
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

  // Sort filtered cards by order
  const filteredCards = cards
    .filter((c) => c.column === column)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <div className="flex-grow w-56 shrink-0 px-2">
      <div
        className={classNames(
          "mb-1 flex items-center justify-start gap-2 rounded",
          colorMap[headingColor].split(" ")[0] + " bg-opacity-10"
        )}
      >
        <span
          className={classNames(
            "rounded-l bg-neutral-800/80 font-mono px-3 py-2",
            colorMap[headingColor].split(" ")[1]
          )}
        >
          {filteredCards.length}
        </span>
        <h3 className="font-bold">{title}</h3>
      </div>
      <div
        onDrop={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={classNames(
          "h-full w-full transition-colors rounded border",
          active
            ? "bg-blue-300/5 border-blue-400/50"
            : "border-transparent"  // Changed from border-neutral-800/0
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
            />
            <DropIndicator
              beforeId={filteredCards[index + 1]?.id || null}
              column={column}
            />
          </React.Fragment>
        ))}
        <AddCard
          column={column}
          cards={cards}
          projectId={projectId}
          boardId={boardId}
        />
      </div>
    </div>
  );
};

type CardProps = CardType & {
  handleDragStart: (e: DragEvent, card: CardType) => void;
  updateCard: (cardId: string, data: Partial<CardType>) => Promise<void>;
  deleteCard: (cardId: string) => Promise<void>;
  projectId: string;
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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [userDisplayNames, setUserDisplayNames] = useState<{ [email: string]: string }>({});

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
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const IconComponent =
    iconOptions.find((option) => option.name === props.icon)?.icon ||
    FaIcons.FaStar;

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
            icon: props.icon,
            createdBy: props.createdBy,
          })
        }
        className="cursor-grab rounded border border-neutral-700 bg-neutral-800 p-3 hover:border-neutral-600 active:cursor-grabbing select-none"  // Added select-none
      >
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <IconComponent className="text-neutral-100 font-bold text-2xl" />
            <p className="text-xl font-bold text-neutral-100">{props.title}</p>
          </div>
          <p className="text-sm text-neutral-400 capitalize">
            {props.priority && <Badge priority={props.priority} />}
          </p>
        </div>
        {props.description && (
          <p className="mt-2 line-clamp-5 text-xs text-neutral-400 whitespace-pre-wrap break-words">
            {props.description}
          </p>
        )}
        {props.links && props.links.length > 0 && (
          <div className="mt-2 space-y-1 w-min">
            {props.links.map((link, index) => (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300"
              >
                <FaIcons.FaLink className="text-[10px]" />
                <span className="truncate">{link.title || link.url}</span>
              </a>
            ))}
          </div>
        )}
        <div className="mt-2 flex items-center justify-between text-xs">
          <div className="text-neutral-400">
            {props.assignment?.assignedTo && (
              <span className="font-bold">
                Assigned to:{" "}
                <span className="text-blue-400">
                  {userDisplayNames[props.assignment.assignedTo] || props.assignment.assignedTo}
                </span>
              </span>
            )}
          </div>
        </div>
        <div className="mt-2 text-xs flex flex-col gap-1 text-neutral-500">
          <p>Posted: {new Date(props.createdAt).toLocaleDateString()}</p>
          {/* <p>Posted by: {props.createdBy.email}</p> */}
        </div>
      </motion.div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        {isEditing ? (
          <CardEdit
            card={{
              title: props.title,
              id: props.id,
              column: props.column,
              description: props.description,
              createdBy: props.createdBy,
              createdAt: props.createdAt,
              priority: props.priority,
              icon: props.icon,
              links: props.links,
              assignment: props.assignment,
            }}
            onClose={() => {
              setIsEditing(false);
              setIsModalOpen(false);
            }}
            updateCard={props.updateCard}
            deleteCard={props.deleteCard}
            projectId={props.projectId} // Add this
          />
        ) : (
          <CardOverview
            card={{
              title: props.title,
              id: props.id,
              column: props.column,
              description: props.description,
              createdBy: props.createdBy,
              createdAt: props.createdAt,
              priority: props.priority,
              icon: props.icon,
              links: props.links,
              assignment: props.assignment,
            }}
            onEdit={() => setIsEditing(true)}
            updateCard={props.updateCard}
            projectId={props.projectId}
          />
        )}
      </Modal>
    </>
  );
};

type CardOverviewProps = {
  card: CardType;
  onEdit: () => void;
  updateCard: (cardId: string, data: Partial<CardType>) => Promise<void>;
  projectId: string;
};

const CardOverview = ({
  card,
  onEdit,
  updateCard,
  projectId,
}: CardOverviewProps) => {
  const { user } = useAuth();
  const [projectMembers, setProjectMembers] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchProjectMembers = async () => {
      try {
        const projectRef = doc(db, "projects", projectId);
        const projectSnap = await getDoc(projectRef);
        if (projectSnap.exists()) {
          setProjectMembers(projectSnap.data().members || []);
        } else {
          router.push("/projects");
        }
      } catch (error) {
        console.error("Error fetching project members:", error);
        router.push("/projects");
      }
    };
    fetchProjectMembers();
  }, [projectId, router]);

  const isMemberActive = (email: string) => {
    return projectMembers.includes(email);
  };

  const handleAssign = async (email: string) => {
    await updateCard(card.id, {
      assignment: {
        assignedTo: email,
        assignedAt: new Date().toISOString(),
      },
    });

    await createLog(
      projectId,
      'assignment',
      'took a task',
      `${email} took "${card.title}"`,
      user?.email || 'unknown'
    );
  };

  const handleUnassign = async () => {
    await updateCard(card.id, {
      assignment: {
        assignedTo: null,
        assignedAt: new Date().toISOString(),
      },
    });

    await createLog(
      projectId,
      'assignment',
      'abandoned a task',
      `Abandoned "${card.title}"`,
      user?.email || 'unknown'
    );
  };

  const IconComponent =
    iconOptions.find((option) => option.name === card.icon)?.icon ||
    FaIcons.FaStar;

  return (
    <div className="space-y-8 p-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <IconComponent className="text-neutral-100 text-4xl flex-shrink-0" />
          <h2 className="text-4xl font-bold text-neutral-100 break-words overflow-hidden">{card.title}</h2>
        </div>
        <button
          onClick={onEdit}
          className="text-neutral-400 flex gap-2 justify-center items-center text-2xl hover:text-neutral-100 flex-shrink-0"
        >
          <FaIcons.FaPen />
        </button>
      </div>

      {/* Priority and other existing sections */}
      {/* ...existing code... */}

      {/* Assignment Section */}
      <div className="border-t border-neutral-700 pt-4">
        <p className="text-sm font-medium text-neutral-300 mb-2 whitespace-pre-wrap break-words">
          {card.description}
        </p>
        <TaskAssignmentOverview
          currentAssignee={card.assignment?.assignedTo || null}
          onAssign={handleAssign}
          onUnassign={handleUnassign}
          currentUserEmail={user?.email || null}
        />
      </div>

      {/* Creator info section */}
      <div className="text-xs text-neutral-500">
        <p>Created by: {card.createdBy.email}</p>
        <p>
          Created on:{" "}
          {new Date(card.createdAt).toLocaleDateString() +
            " @ " +
            new Date(card.createdAt).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
};

// Update CardEditProps interface to include projectId
interface CardEditProps {
  card: CardType;
  onClose: () => void;
  updateCard: (cardId: string, data: Partial<CardType>) => Promise<void>;
  deleteCard: (cardId: string) => Promise<void>;
  projectId: string; // Add this
}

const CardEdit = ({
  card,
  onClose,
  updateCard,
  deleteCard,
  projectId,
}: CardEditProps) => {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || "");
  const [priority, setPriority] = useState<Priority | "">(card.priority || "");
  const [selectedIcon, setSelectedIcon] = useState(card.icon);
  const [links, setLinks] = useState<{ url: string; title: string }[]>(card.links || []);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkTitle, setNewLinkTitle] = useState("");
  const { user } = useAuth();
  const [projectMembers, setProjectMembers] = useState<string[]>([]);
  const [assignedMember, setAssignedMember] = useState<string>(
    card.assignment?.assignedTo || ""
  );

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

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this card?")) {
      await createLog(
        projectId,
        'task',
        'deleted a task',
        `Deleted "${card.title}"`,
        user?.email || 'unknown'
      );
      await deleteCard(card.id);
      onClose();
    }
  };

  const handleAssign = async (email: string) => {
    setAssignedMember(email);
  };

  const handleUnassign = async () => {
    setAssignedMember("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const changes: string[] = [];
    if (title !== card.title) changes.push(`title from "${card.title}" to "${title}"`);
    if (description !== (card.description || "")) changes.push("description");
    if (priority !== card.priority) changes.push("priority");
    if (selectedIcon !== card.icon) changes.push("icon");

    // Log all changes if any were made
    if (changes.length > 0) {
      await createLog(
        projectId,
        'task',
        'edited a task',
        `Modified ${card.title}: changed ${changes.join(", ")}`,
        user?.email || 'unknown'
      );
    }

    const assignmentChanged = assignedMember !== (card.assignment?.assignedTo || "");
    const updatedCard: Partial<CardType> = {
      title,
      description,
      icon: selectedIcon,
      links,
      lastModified: new Date().toISOString(),
      assignment: assignedMember
        ? {
            assignedTo: assignedMember,
            assignedAt: new Date().toISOString(),
          }
        : {
            assignedTo: null,
            assignedAt: new Date().toISOString(),
          },
    };

    if (priority) {
      updatedCard.priority = priority as Priority;
    }

    await updateCard(card.id, updatedCard);

    // Log assignment changes
    if (assignmentChanged) {
      if (assignedMember) {
        await createLog(
          projectId,
          'assignment',
          'assigned a task',
          `Assigned "${title}" to ${assignedMember}`,
          user?.email || 'unknown'
        );
      } else {
        await createLog(
          projectId,
          'assignment',
          'unassigned a task',
          `Removed assignment from "${title}"`,
          user?.email || 'unknown'
        );
      }
    }

    onClose();
  };

  const addLink = () => {
    if (!newLinkUrl) return;
    try {
      new URL(newLinkUrl); // Validate URL
      setLinks([
        ...links,
        { url: newLinkUrl, title: newLinkTitle || newLinkUrl },
      ]);
      setNewLinkUrl("");
      setNewLinkTitle("");
    } catch {
      alert("Please enter a valid URL");
    }
  };

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 h-[80vh] pb-20 overflow-y-scroll pr-9"
    >
      <div>
        <label className="mb-1 block text-sm text-neutral-400">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded border border-neutral-700 bg-neutral-900 p-2 text-neutral-100"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-neutral-400">Priority</label>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority | "")}
          className="w-full rounded border border-neutral-700 bg-neutral-900 p-2 text-neutral-100"
        >
          <option value="">None</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm text-neutral-400">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={7}
          className="w-full rounded border border-neutral-700 bg-neutral-900 p-2 text-neutral-100"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-neutral-400">Icon</label>
        <IconSelector
          selectedIcon={selectedIcon}
          setSelectedIcon={setSelectedIcon}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-neutral-400">Links</label>
        <div className="space-y-2">
          {links.map((link, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={link.title}
                onChange={(e) => {
                  const newLinks = [...links];
                  newLinks[index].title = e.target.value;
                  setLinks(newLinks);
                }}
                className="flex-1 rounded border border-neutral-700 bg-neutral-900 p-2 text-neutral-100 text-sm"
                placeholder="Link title"
              />
              <input
                type="url"
                value={link.url}
                onChange={(e) => {
                  const newLinks = [...links];
                  newLinks[index].url = e.target.value;
                  setLinks(newLinks);
                }}
                className="flex-1 rounded border border-neutral-700 bg-neutral-900 p-2 text-neutral-100 text-sm"
                placeholder="https://..."
              />
              <button
                type="button"
                onClick={() => removeLink(index)}
                className="text-red-400 hover:text-red-300"
              >
                <FiTrash />
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newLinkTitle}
              onChange={(e) => setNewLinkTitle(e.target.value)}
              className="flex-1 rounded border border-neutral-700 bg-neutral-900 p-2 text-neutral-100 text-sm"
              placeholder="Link title"
            />
            <input
              type="url"
              value={newLinkUrl}
              onChange={(e) => setNewLinkUrl(e.target.value)}
              className="flex-1 rounded border border-neutral-700 bg-neutral-900 p-2 text-neutral-100 text-sm"
              placeholder="https://..."
            />
            <button
              type="button"
              onClick={addLink}
              className="text-blue-400 hover:text-blue-300"
            >
              <FiPlus />
            </button>
          </div>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm text-neutral-400">
          Assignment
        </label>
        <TaskAssignment
          currentAssignee={assignedMember}
          projectMembers={projectMembers}
          onAssign={handleAssign}
          onUnassign={handleUnassign}
          currentUserEmail={user?.email || null}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-neutral-400">
          Created by
        </label>
        <input
          type="text"
          value={card.createdBy.email}
          readOnly
          className="w-full rounded border border-neutral-700 bg-neutral-900/50 p-2 text-neutral-400 pointer-events-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-neutral-400">
          Created on
        </label>
        <input
          type="text"
          value={
            new Date(card.createdAt).toLocaleDateString() +
            " @ " +
            new Date(card.createdAt).toLocaleTimeString()
          }
          readOnly
          className="w-full rounded border border-neutral-700 bg-neutral-900/50 p-2 text-neutral-400 pointer-events-none"
        />
      </div>
      <div className="flex justify-between h-18 absolute bottom-0 left-0 w-full p-4 rounded bg-neutral-800">
        <button
          type="button"
          onClick={handleDelete}
          className="rounded flex justify-center items-center gap-1.5 py-2 text-sm text-red-400 hover:text-red-300"
        >
          <FiTrash />
          <span>Delete</span>
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-neutral-400 hover:text-neutral-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600"
          >
            Save Changes
          </button>
        </div>
      </div>
    </form>
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
      className="my-1 h-1 rounded w-full bg-blue-400/50 opacity-0"
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
  const [selectedIcon, setSelectedIcon] = useState(iconOptions[0].name);
  const [priority, setPriority] = useState<Priority | "">("");
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
      icon: selectedIcon,
      id: newCardId,
      createdAt: new Date().toISOString(),
      createdBy: {
        uid: user.uid,
        email: user.email || "", 
      },
      order: newOrder,
      assignment: {
        assignedTo: assignedMember,
        assignedAt: new Date().toISOString(),
      },
    };

    if (priority) {
      newCard.priority = priority as Priority;
    }

    try {
      await setDoc(
        doc(db, `projects/${projectId}/boards/${boardId}/cards`, newCardId),
        newCard
      );
      await createLog(
        projectId,
        'task',
        'created a new task',
        `Created "${text.trim()}"`,
        user.email || 'unknown'
      );

      // If there's an initial assignment, create assignment log
      if (assignedMember) {
        await createLog(
          projectId,
          'assignment',
          'assigned a task',
          `Assigned "${text.trim()}" to ${assignedMember}`,
          user.email || 'unknown'
        );
      }

      setIsModalOpen(false);
      setText("");
      setDescription("");
      setPriority("");
    } catch (error) {
      console.error("Error adding card:", error);
    }
  };

  return (
    <>
      <motion.button
        layout
        onClick={() => setIsModalOpen(true)}
        className="flex w-full justify-center items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-400 transition-colors hover:text-neutral-50 hover:bg-neutral-700 border border-neutral-700 rounded"
      >
        <FiPlus />
      </motion.button>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-neutral-400">Title</label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full rounded border border-neutral-700 bg-neutral-900 p-2 text-neutral-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-400">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full rounded border border-neutral-700 bg-neutral-900 p-2 text-neutral-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-400">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority | "")}
              className="w-full rounded border border-neutral-700 bg-neutral-900 p-2 text-neutral-100"
            >
              <option value="">None</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-400">Icon</label>
            <IconSelector
              selectedIcon={selectedIcon}
              setSelectedIcon={setSelectedIcon}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-400">
              Assignment
            </label>
            <TaskAssignment
              currentAssignee={assignedMember}
              projectMembers={projectMembers}
              onAssign={(email) => setAssignedMember(email)}
              onUnassign={() => setAssignedMember(null)}
              currentUserEmail={user?.email || null}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded bg-blue-500 px-3 py-1.5 text-xs text-white hover:bg-blue-600"
            >
              Add Card
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
};

type ColumnType = "backlog" | "todo" | "doing" | "done";

type CardType = {
  title: string;
  id: string;
  column: ColumnType;
  createdAt: string;
  description?: string;
  priority?: Priority;
  icon: string;
  createdBy: {
    uid: string;
    email: string;
  };
  lastModified?: string;
  order?: number; // Add this field
  links?: { url: string; title: string }[];
  assignment?: {
    assignedTo: string | null; // Changed to string | null instead of undefined
    assignedAt: string;
  };
};

type Priority = "low" | "medium" | "high";

const TaskAssignment = ({
  currentAssignee,
  projectMembers,
  onAssign,
  onUnassign,
  currentUserEmail,
}: {
  currentAssignee: string | null;
  projectMembers: string[];
  onAssign: (email: string) => void;
  onUnassign: () => void;
  currentUserEmail: string | null;
}) => {
  const [userDisplayNames, setUserDisplayNames] = useState<{ [email: string]: string }>({});

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
    <div className="space-y-4 bg-neutral-900 p-1 rounded border border-neutral-700">
      <div className="flex flex-col gap-2">
        {projectMembers.map((member) => (
          <label
            key={member}
            className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
              currentAssignee === member
                ? "bg-blue-500/20 border border-blue-500"
                : "bg-neutral-800 border border-neutral-700 hover:bg-neutral-700"
            }`}
          >
            <input
              type="radio"
              name="assignee"
              checked={currentAssignee === member}
              onChange={() => onAssign(member)}
              className="hidden"
            />
            <span className="text-neutral-200">{userDisplayNames[member] || member}</span>
            {currentAssignee === member && (
              <span className="ml-auto text-xs text-blue-400">Assigned</span>
            )}
          </label>
        ))}
      </div>
      {currentAssignee && (
        <button
          onClick={onUnassign}
          className="w-full p-2 bg-red-500 rounded text-white hover:bg-red-600"
        >
          Unassign Task
        </button>
      )}
    </div>
  );
};

// Add a new component for the overview-specific assignment display
const TaskAssignmentOverview = ({
  currentAssignee,
  onAssign,
  onUnassign,
  currentUserEmail,
}: {
  currentAssignee: string | null;
  onAssign: (email: string) => void;
  onUnassign: () => void;
  currentUserEmail: string | null;
}) => {
  const [assigneeName, setAssigneeName] = useState<string>("");

  useEffect(() => {
    const loadDisplayName = async () => {
      if (currentAssignee) {
        const name = await getUserDisplayName(currentAssignee);
        setAssigneeName(name);
      }
    };
    loadDisplayName();
  }, [currentAssignee]);

  if (currentAssignee) {
    return (
      <div className="flex flex-col gap-2">
        <div className="p-2 rounded bg-blue-500/20 border border-blue-500">
          <div className="flex justify-between items-center">
            <span className="text-neutral-200">{assigneeName}</span>
            <span className="text-xs text-blue-400">Assigned</span>
          </div>
        </div>
        {currentAssignee === currentUserEmail && (
          <button
            onClick={onUnassign}
            className="w-full p-2 bg-red-500 rounded text-white hover:bg-red-600"
          >
            Abandon Task
          </button>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => currentUserEmail && onAssign(currentUserEmail)}
      className="w-full p-2 bg-blue-500 rounded text-white hover:bg-blue-600"
    >
      Take Task
    </button>
  );
};
