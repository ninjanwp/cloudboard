"use client";

import React, {
  Dispatch,
  SetStateAction,
  useState,
  DragEvent,
  FormEvent,
  useEffect,
} from "react";
import {
  FiPlus,
  FiTrash,
  FiEdit,
  FiStar,
  FiFlag,
  FiBell,
} from "react-icons/fi";
import { FaGraduationCap } from "react-icons/fa";
import { motion } from "framer-motion";
import { FaFire } from "react-icons/fa";
import { auth, db } from "../../../firebase";
import {
  collection,
  onSnapshot,
  setDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { Modal } from "./Modal";
import { useAuth } from "../context/AuthContext";
import { Badge } from "./Badge"; // We'll create this component
import classNames from "classnames";
import * as FaIcons from "react-icons/fa6";
import { IconSelector } from "./IconSelector";

const iconOptions = Object.keys(FaIcons).map((key) => ({
  name: key,
  icon: (FaIcons as { [key: string]: React.ComponentType })[key],
}));

export const CustomKanban = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p className="text-neutral-400">
          Please sign in to use the Kanban board
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Board userId={user.uid} />
    </div>
  );
};

const Board = ({ userId }: { userId: string }) => {
  const [cards, setCards] = useState<CardType[]>([]);

  useEffect(() => {
    const cardsRef = collection(db, `users/${userId}/cards`);
    const unsubscribe = onSnapshot(cardsRef, (snapshot) => {
      const cardsData: CardType[] = [];
      snapshot.forEach((doc) => {
        cardsData.push({ id: doc.id, ...doc.data() } as CardType);
      });
      setCards(cardsData);
    });

    return () => unsubscribe();
  }, [userId]);

  const updateCard = async (cardId: string, data: Partial<CardType>) => {
    try {
      await setDoc(
        doc(db, `users/${userId}/cards`, cardId),
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
    await deleteDoc(doc(db, `users/${userId}/cards`, cardId));
  };

  return (
    <div className="flex flex-col h-full w-full p-6">
      <div className="flex h-full w-full">
        <Column
          title="Backlog"
          column="backlog"
          headingColor="blue-400"
          cards={cards}
          setCards={setCards}
          updateCard={updateCard}
          deleteCard={deleteCard}
        />
        <Column
          title="To Do"
          column="todo"
          headingColor="red-400"
          cards={cards}
          setCards={setCards}
          updateCard={updateCard}
          deleteCard={deleteCard}
        />

        <Column
          title="In Progress"
          column="doing"
          headingColor="yellow-300"
          cards={cards}
          setCards={setCards}
          updateCard={updateCard}
          deleteCard={deleteCard}
        />

        <Column
          title="Done"
          column="done"
          headingColor="green-400"
          cards={cards}
          setCards={setCards}
          updateCard={updateCard}
          deleteCard={deleteCard}
        />
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
}: ColumnProps) => {
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
          "h-full w-full transition-colors rounded",
          active
            ? "bg-blue-300/5 border border-blue-400/50 h-screen"
            : "bg-neutral-800/0 border-neutral-800/0"
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
            />
            <DropIndicator
              beforeId={filteredCards[index + 1]?.id || null}
              column={column}
            />
          </React.Fragment>
        ))}
        <AddCard column={column} setCards={setCards} cards={cards} />
      </div>
    </div>
  );
};

type CardProps = CardType & {
  handleDragStart: Function;
  updateCard: (cardId: string, data: Partial<CardType>) => Promise<void>;
  deleteCard: (cardId: string) => Promise<void>;
};

const Card = ({
  title,
  id,
  column,
  description,
  createdBy,
  createdAt,
  priority,
  icon,
  links,
  handleDragStart,
  updateCard,
  deleteCard,
}: CardProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleCardClick = () => {
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const IconComponent =
    iconOptions.find((option) => option.name === icon)?.icon || FaIcons.FaStar;

  return (
    <>
      <motion.div
        layout
        layoutId={id}
        draggable="true"
        onClick={handleCardClick}
        onDragStart={(e) => handleDragStart(e, { title, id, column })}
        className="cursor-grab rounded border border-neutral-700 bg-neutral-800 p-3 hover:border-neutral-600 active:cursor-grabbing"
      >
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <IconComponent className="text-neutral-100 font-bold text-2xl" />
            <p className="text-xl font-bold text-neutral-100">{title}</p>
          </div>
          <p className="text-sm text-neutral-400 capitalize">
            {priority && <Badge priority={priority} />}
          </p>
        </div>
        {description && (
          <p className="mt-2 line-clamp-5 text-xs text-neutral-400 whitespace-pre-wrap">
            {description}
          </p>
        )}
        {links && links.length > 0 && (
          <div className="mt-2 space-y-1 w-min">
            {links.map((link, index) => (
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
        <div className="mt-2 text-xs flex flex-col gap-1 text-neutral-500">
          <p>Created on: {new Date(createdAt).toLocaleDateString()}</p>
          <p>Posted by: {createdBy.email}</p>
        </div>
      </motion.div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        {isEditing ? (
          <CardEdit
            card={{
              title,
              id,
              column,
              description,
              createdBy,
              createdAt,
              priority,
              icon,
              links,
            }}
            onClose={() => {
              setIsEditing(false);
              setIsModalOpen(false);
            }}
            updateCard={updateCard}
            deleteCard={deleteCard}
          />
        ) : (
          <CardOverview
            card={{
              title,
              id,
              column,
              description,
              createdBy,
              createdAt,
              priority,
              icon,
              links,
            }}
            onEdit={() => setIsEditing(true)}
          />
        )}
      </Modal>
    </>
  );
};

const CardOverview = ({
  card,
  onEdit,
}: {
  card: CardType;
  onEdit: () => void;
}) => {
  const IconComponent =
    iconOptions.find((option) => option.name === card.icon)?.icon ||
    FaIcons.FaStar;
  return (
    <div className="space-y-8 p-4">
      <div className="flex justify-start gap-2 items-center">
        <IconComponent className="text-neutral-100 text-4xl" />
        <h2 className="text-4xl font-bold text-neutral-100">{card.title}</h2>
        <button
          onClick={onEdit}
          className="text-neutral-400 flex gap-2 justify-center items-center text-2xl hover:text-neutral-100"
        >
          <FaIcons.FaPen />
        </button>
      </div>
      <div className="flex items-center gap-2 capitalize">
        {card.priority && <Badge priority={card.priority} />}
      </div>
      <div>
        <p className="text-neutral-100 whitespace-pre-wrap">
          {card.description || "No description"}
        </p>
      </div>
      {card.links && card.links.length > 0 && (
        <div className="space-y-2 w-min">
          <h3 className="text-sm font-medium text-neutral-300">Links</h3>
          <div className="space-y-1">
            {card.links.map((link, index) => (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm truncate"
              >
                <FaIcons.FaLink className="text-[10px]" />
                {link.title || link.url}
              </a>
            ))}
          </div>
        </div>
      )}
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

interface CardEditProps {
  card: CardType;
  onClose: () => void;
  updateCard: (cardId: string, data: Partial<CardType>) => Promise<void>;
  deleteCard: (cardId: string) => Promise<void>;
}

const CardEdit = ({ card, onClose, updateCard, deleteCard }: CardEditProps) => {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || "");
  const [priority, setPriority] = useState<Priority | "">(card.priority || "");
  const [selectedIcon, setSelectedIcon] = useState(card.icon);
  const [links, setLinks] = useState<{ url: string; title: string }[]>(
    card.links || []
  );
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkTitle, setNewLinkTitle] = useState("");

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this card?")) {
      await deleteCard(card.id);
      onClose();
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const updatedCard: Partial<CardType> = {
      title,
      description,
      icon: selectedIcon,
      links,
      lastModified: new Date().toISOString(),
    };

    if (priority) {
      updatedCard.priority = priority as Priority;
    }

    await updateCard(card.id, updatedCard);
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
    } catch (e) {
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
  setCards: Dispatch<SetStateAction<CardType[]>>;
  cards: CardType[]; // Add this
};

const AddCard = ({ column, setCards, cards }: AddCardProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [text, setText] = useState("");
  const [description, setDescription] = useState("");
  const [selectedIcon, setSelectedIcon] = useState(iconOptions[0].name);
  const [priority, setPriority] = useState<Priority | "">("");
  const { user } = useAuth();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!text.trim().length || !user) return;

    // Get max order of current column
    const columnCards = cards
      .filter((c) => c.column === column)
      .sort((a, b) => (b.order || 0) - (a.order || 0));

    const newOrder =
      columnCards.length > 0 ? (columnCards[0].order || 0) + 1000 : 1000;

    const newCard: Partial<CardType> = {
      column,
      title: text.trim(),
      description: description.trim(),
      icon: selectedIcon,
      id: doc(collection(db, "users")).id,
      createdAt: new Date().toISOString(),
      createdBy: {
        uid: user.uid,
        email: user.email || "",
      },
      order: newOrder,
    };

    if (priority) {
      newCard.priority = priority as Priority;
    }

    try {
      const userDoc = doc(db, `users/${user.uid}/cards`, newCard.id || "");
      await setDoc(userDoc, newCard);
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
};

type Priority = "low" | "medium" | "high";
