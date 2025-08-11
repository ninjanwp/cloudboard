"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../../../firebase";
import { User } from "firebase/auth";
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  query,
  where,
  onSnapshot,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../../firebase"; // Import Firestore
import { useRouter } from "next/navigation";  // Add this import

type AuthContextType = {
  user: User | null;
  loading: boolean;  // Add this
  signInWithGoogle: () => Promise<void>;
  signInWithEmailPassword: (email: string, password: string) => Promise<void>;
  signUpWithEmailPassword: (email: string, password: string) => Promise<void>;
  handleSignOut: () => Promise<void>;
  createProject: (name: string, icon: string) => Promise<void>;
  inviteUserToProject: (projectId: string, email: string) => Promise<void>;
  createBoard: (projectId: string, name: string) => Promise<void>;
  invitations: ProjectInvitation[];
  acceptInvitation: (invitationId: string) => Promise<void>;
  declineInvitation: (invitationId: string) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  leaveProject: (projectId: string) => Promise<void>;
  removeUserFromProject: (projectId: string, email: string) => Promise<void>;
  cleanupUserAssignments: (projectId: string, email: string) => Promise<void>;
};

type ProjectInvitation = {
  id: string;
  projectId: string;
  projectName: string;
  fromEmail: string;
  toEmail: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,  // Add this
  signInWithGoogle: async () => {},
  signInWithEmailPassword: async () => {},
  signUpWithEmailPassword: async () => {},
  handleSignOut: async () => {},
  createProject: async () => {},
  inviteUserToProject: async () => {},
  createBoard: async () => {},
  invitations: [],
  acceptInvitation: async () => {},
  declineInvitation: async () => {},
  deleteProject: async () => {},
  leaveProject: async () => {},
  removeUserFromProject: async () => {},
  cleanupUserAssignments: async () => {},
});

import { getDefaultNavigationPermissions } from "../utils/projectUtils";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);  // Add this
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([]);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();  // Add this

  useEffect(() => {
    setMounted(true);
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);  // Add this
      // Clear invitations when user logs out
      if (!user) {
        setInvitations([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.email) return;

    const invitesRef = collection(db, "invitations");
    const q = query(
      invitesRef,
      where("toEmail", "==", user.email),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const invitesData: ProjectInvitation[] = [];
      snapshot.forEach((doc) => {
        invitesData.push({ id: doc.id, ...doc.data() } as ProjectInvitation);
      });
      setInvitations(invitesData);
    });

    return () => unsubscribe();
  }, [user?.email]);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in with Google", error);
    }
  };

  const signInWithEmailPassword = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Error signing in with email/password", error);
    }
  };

  const signUpWithEmailPassword = async (email: string, password: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Error signing up with email/password", error);
    }
  };

  const handleSignOut = async () => {
    try {
      // Navigate home first, then sign out
      router.replace('/');
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  const createProject = async (name: string, icon: string) => {
    if (!user) return;
    const projectRef = doc(collection(db, "projects"));
    await setDoc(projectRef, {
      name,
      icon,
      owner: user.uid,
      members: [user.email],
      memberRoles: [
        {
          email: user.email || "",
          role: "owner",
          joinedAt: new Date().toISOString()
        }
      ],
      navigationPermissions: getDefaultNavigationPermissions(),
      createdAt: new Date().toISOString(),
    });
  };

  const inviteUserToProject = async (projectId: string, email: string) => {
    const projectRef = doc(db, "projects", projectId);
    const projectSnap = await getDoc(projectRef);

    if (!projectSnap.exists()) return;

    const invitationRef = doc(collection(db, "invitations"));
    await setDoc(invitationRef, {
      projectId,
      projectName: projectSnap.data().name,
      fromEmail: user?.email,
      toEmail: email,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
  };

  const acceptInvitation = async (invitationId: string) => {
    try {
      if (!user?.email) {
        throw new Error("No user email found");
      }

      console.log("Starting invitation acceptance for:", { invitationId, userEmail: user.email });

      const invitationRef = doc(db, "invitations", invitationId);
      const invitationSnap = await getDoc(invitationRef);

      if (!invitationSnap.exists()) {
        throw new Error("Invitation not found");
      }

      const invitation = invitationSnap.data() as ProjectInvitation;
      console.log("Processing invitation:", invitation);

      if (invitation.status !== "pending" || invitation.toEmail !== user.email) {
        throw new Error("Invalid invitation");
      }

      // Update invitation status first
      console.log("DEBUG: About to update invitation status");
      await updateDoc(invitationRef, { status: "accepted" });
      console.log("DEBUG: Successfully updated invitation status");

      // Get current project data
      const projectRef = doc(db, "projects", invitation.projectId);
      const projectSnap = await getDoc(projectRef);
      
      if (!projectSnap.exists()) {
        throw new Error("Project not found");
      }

      const projectData = projectSnap.data();
      console.log("DEBUG: Current project data:", projectData);
      
      // Check if user is already a member
      if (projectData.members && projectData.members.includes(user.email)) {
        console.log("User is already a member");
        return;
      }

      // Prepare new memberRoles entry
      const newMemberRole = {
        email: user.email,
        role: "member",
        joinedAt: new Date().toISOString()
      };

      console.log("DEBUG: About to update project with:", {
        members: arrayUnion(user.email),
        memberRoles: arrayUnion(newMemberRole)
      });

      // Update project with new member and role using arrayUnion for both
      try {
        console.log("DEBUG: Starting project update...");
        await updateDoc(projectRef, {
          members: arrayUnion(user.email),
          memberRoles: arrayUnion(newMemberRole)
        });
        console.log("DEBUG: Project update successful!");
      } catch (projectError) {
        console.error("DEBUG: Project update failed:", projectError);
        throw projectError;
      }

      console.log("Successfully accepted invitation and added user to project");
    } catch (error) {
      console.error("Error accepting invitation:", error);
      throw error;
    }
  };

  const declineInvitation = async (invitationId: string) => {
    const invitationRef = doc(db, "invitations", invitationId);
    await updateDoc(invitationRef, { status: "declined" });
  };

  const createBoard = async (projectId: string, name: string) => {
    const boardRef = doc(collection(db, `projects/${projectId}/boards`));
    await setDoc(boardRef, {
      name,
      createdAt: new Date().toISOString(),
    });
  };

  const deleteProject = async (projectId: string) => {
    if (!user) return;

    const projectRef = doc(db, "projects", projectId);
    const projectSnap = await getDoc(projectRef);

    if (!projectSnap.exists() || projectSnap.data().owner !== user.uid) {
      throw new Error("Unauthorized to delete this project");
    }

    // Delete all boards and cards within the project first
    const boardsRef = collection(db, `projects/${projectId}/boards`);
    const boardsSnap = await getDocs(boardsRef);

    const batch = writeBatch(db);

    // Delete boards and their cards
    for (const boardDoc of boardsSnap.docs) {
      const cardsRef = collection(boardDoc.ref, "cards");
      const cardsSnap = await getDocs(cardsRef);
      cardsSnap.docs.forEach((cardDoc) => {
        batch.delete(cardDoc.ref);
      });
      batch.delete(boardDoc.ref);
    }

    // Delete the project
    batch.delete(projectRef);

    // Execute all deletes in one batch
    await batch.commit();
  };

  const cleanupUserAssignments = async (projectId: string, email: string) => {
    const boardsRef = collection(db, `projects/${projectId}/boards`);
    const boardsSnap = await getDocs(boardsRef);
    const batch = writeBatch(db);

    for (const boardDoc of boardsSnap.docs) {
      const cardsRef = collection(boardDoc.ref, "cards");
      const cardsSnap = await getDocs(cardsRef);

      for (const cardDoc of cardsSnap.docs) {
        const card = cardDoc.data();
        if (card.assignment) {
          const updatedAssignment = {
            ...card.assignment,
            assignedTo: Array.isArray(card.assignment.assignedTo)
              ? card.assignment.assignedTo.filter((e: string) => e !== email)
              : [],
            acceptedBy: Array.isArray(card.assignment.acceptedBy)
              ? card.assignment.acceptedBy.filter((e: string) => e !== email)
              : [],
          };

          batch.update(cardDoc.ref, { assignment: updatedAssignment });
        }
      }
    }

    await batch.commit();
  };

  const leaveProject = async (projectId: string) => {
    if (!user?.email) return;

    // First clean up all assignments for this user
    await cleanupUserAssignments(projectId, user.email);

    // Then remove the user from the project
    const projectRef = doc(db, "projects", projectId);
    await updateDoc(projectRef, {
      members: arrayRemove(user.email),
    });
  };

  const removeUserFromProject = async (projectId: string, email: string) => {
    if (!user) return;

    const projectRef = doc(db, "projects", projectId);
    const projectSnap = await getDoc(projectRef);

    if (!projectSnap.exists() || projectSnap.data().owner !== user.uid) {
      throw new Error("Unauthorized to remove members from this project");
    }

    // First clean up all assignments for this user
    await cleanupUserAssignments(projectId, email);

    // Then remove the user from the project
    await updateDoc(projectRef, {
      members: arrayRemove(email),
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading: loading || !mounted,  // Include mounted state
        signInWithGoogle,
        signInWithEmailPassword,
        signUpWithEmailPassword,
        handleSignOut,
        createProject,
        inviteUserToProject,
        createBoard,
        invitations,
        acceptInvitation,
        declineInvitation,
        deleteProject,
        leaveProject,
        removeUserFromProject,
        cleanupUserAssignments,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
