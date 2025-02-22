"use client";

interface Project {
  id: string;
  name: string;
  owner: string;
  ownerEmail: string;
  members: string[];
  createdAt: any;
  icon?: string;
}

import { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useProject } from "../../../context/ProjectContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../../../../firebase";
import { FaUserPlus, FaUserMinus, FaCrown, FaTrash } from "react-icons/fa6";
import { useParams, useRouter } from 'next/navigation';
import { IconSelector } from "../../../components/IconSelector";
import * as FaIcons from "react-icons/fa6";
import { Modal } from "../../../components/Modal";
import { FaPen } from "react-icons/fa6";
import { getUserDisplayName } from "../../../utils/userUtils";
import { ActivityLogs } from "../../../components/ActivityLogs";

export default function ProjectManagePage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { user, inviteUserToProject, removeUserFromProject, deleteProject, leaveProject } = useAuth();
  const { currentProject, setCurrentProject } = useProject();
  const [members, setMembers] = useState<string[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [error, setError] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [memberDisplayNames, setMemberDisplayNames] = useState<{ [email: string]: string }>({});
  const router = useRouter();

  useEffect(() => {
    const fetchProjectDetails = async () => {
      const projectRef = doc(db, "projects", projectId);
      const projectSnap = await getDoc(projectRef);
      if (projectSnap.exists()) {
        const projectData = projectSnap.data() as Omit<Project, 'id'>;
        setMembers(projectData.members || []);
        setIsOwner(projectData.owner === user?.uid);
        const fullProject: Project = {
          id: projectId,
          name: projectData.name,
          owner: projectData.owner,
          ownerEmail: projectData.members.find(m => 
            m === projectData.members[0]  // First member is always the owner
          ) || '',
          members: projectData.members || [],
          createdAt: projectData.createdAt,
          icon: projectData.icon
        };
        setCurrentProject(fullProject);

        // Fetch display names for all members
        const names: { [email: string]: string } = {};
        for (const member of projectData.members || []) {
          names[member] = await getUserDisplayName(member);
        }
        setMemberDisplayNames(names);
      }
    };

    fetchProjectDetails();
  }, [projectId, user, setCurrentProject]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!newMemberEmail) return;
    
    try {
      await inviteUserToProject(projectId, newMemberEmail);
      setNewMemberEmail("");
    } catch (error) {
      setError("Failed to send invitation");
    }
  };

  const handleRemoveMember = async (email: string) => {
    if (window.confirm(`Are you sure you want to remove ${email} from the project?`)) {
      try {
        await removeUserFromProject(projectId, email);
      } catch (error) {
        setError("Failed to remove member");
      }
    }
  };

  const handleDeleteProject = async () => {
    if (window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      try {
        // First navigate away from the project
        router.replace('/');
        // Then delete the project
        await deleteProject(projectId);
        // Clear the current project from context
        setCurrentProject(null);
      } catch (error) {
        setError("Failed to delete project");
        // If deletion fails, we might want to navigate back to the project
        router.replace(`/projects/${projectId}`);
      }
    }
  };

  const handleUpdateProject = async (updates: { name?: string; icon?: string }) => {
    try {
      if (updates.name !== undefined) {
        const trimmedName = updates.name.trim();
        if (!trimmedName) {
          setError("Project name cannot be empty");
          return;
        }
        updates.name = trimmedName;
      }

      const projectRef = doc(db, "projects", projectId);
      await updateDoc(projectRef, updates);
      setShowEditModal(false);
      setError("");
    } catch (error) {
      setError("Failed to update project");
    }
  };

  const handleLeaveProject = async () => {
    if (window.confirm('Are you sure you want to leave this project? You will need to be invited again to rejoin.')) {
      try {
        await leaveProject(projectId);
        router.replace('/');
      } catch (error) {
        setError("Failed to leave project");
      }
    }
  };

  const IconComponent = currentProject?.icon 
    ? (FaIcons as Record<string, React.ComponentType>)[currentProject.icon] 
    : FaIcons.FaStar;

  if (!currentProject) return null;

  return (
    <div className="container mx-auto max-w-4xl p-6 mt-20">
      <div className="mb-8 space-y-6">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center gap-4 group cursor-pointer"
            onClick={() => {
              if (isOwner) {
                setEditName(currentProject.name);
                setEditIcon(currentProject.icon || "FaStar");
                setShowEditModal(true);
              }
            }}
          >
            <div className="w-12 h-12 flex items-center justify-center bg-neutral-800 rounded-lg">
              <IconComponent className="w-6 h-6 text-neutral-100" />
            </div>
            <h1 className="text-3xl font-bold text-white">{currentProject.name}</h1>
            {isOwner && (
              <button className="opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-neutral-800 rounded-full">
                <FaPen className="w-4 h-4 text-neutral-400" />
              </button>
            )}
          </div>
        </div>
        <p className="text-neutral-400">Project Management</p>
      </div>

      {isOwner && (
        <form onSubmit={handleInvite} className="mb-8">
          <div className="flex gap-2">
            <input
              type="email"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              placeholder="Enter email to invite"
              className="flex-1 rounded border border-neutral-700 bg-neutral-900 p-2 text-neutral-100"
            />
            <button
              type="submit"
              className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 flex items-center gap-2"
            >
              <FaUserPlus />
              <span>Invite</span>
            </button>
          </div>
          {error && <p className="mt-2 text-red-400 text-sm">{error}</p>}
        </form>
      )}

    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white mb-4">Project Members</h2>
      {members.map((member) => (
        <div
        key={member}
        className="flex items-center justify-between p-4 rounded bg-neutral-800 border border-neutral-700 h-[60px]"
        >
        <div className="flex items-center gap-2">
          <span 
            className="text-neutral-100"
            title={memberDisplayNames[member] ? `${memberDisplayNames[member]} (${member})` : member}
          >
            {memberDisplayNames[member] || member}
            {member === user?.email && (
              <span className="ml-1.5 text-neutral-400 text-sm">(you)</span>
            )}
          </span>
          {member === members[0] && ( // First member in the array is always the owner
            <FaCrown className="text-yellow-400" title="Project Owner" />
          )}
        </div>
        {isOwner && member !== user?.email && (
          <button
            onClick={() => handleRemoveMember(member)}
            className="text-red-400 hover:text-red-300 p-2 rounded flex items-center gap-2"
          >
            <FaUserMinus />Remove
          </button>
        )}
        </div>
      ))}
    </div>

    <div className="mt-16">
      <h2 className="text-xl font-bold text-white mb-6">Project Activity</h2>
      <ActivityLogs projectId={projectId} />
    </div>

    {isOwner ? (
      <div className="mt-16">
        <div className="border border-red-500/20 rounded-lg bg-red-500/5 p-6">
          <h2 className="text-xl font-bold text-red-500 mb-4">Danger Zone</h2>
          <p className="text-neutral-400 mb-6">
            Once you delete a project, there is no going back.
          </p>
          <button
            onClick={handleDeleteProject}
            className="px-4 py-3 bg-red-500 text-white rounded hover:bg-red-600 flex items-center gap-2"
          >
            <FaTrash />
            Delete Project
          </button>
        </div>
      </div>
    ) : (
      <div className="mt-16">
        <div className="border border-red-500/20 rounded-lg bg-red-500/5 p-6">
          <h2 className="text-xl font-bold text-red-500 mb-4">Leave Project</h2>
          <div className="space-y-4">
            <div className="text-neutral-400 space-y-2">
              <p>Before leaving the project, please note:</p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>You will lose access to all project boards and tasks</li>
                <li>Your assigned tasks will be unassigned</li>
                <li>You will need a new invitation to rejoin</li>
              </ul>
            </div>
            <button
              onClick={handleLeaveProject}
              className="px-4 py-3 bg-red-500 text-white rounded hover:bg-red-600 flex items-center gap-2"
            >
              <FaUserMinus />
              Leave Project
            </button>
          </div>
        </div>
      </div>
    )}

    <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)}>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Edit Project</h2>
        
        <div>
          <label className="block text-sm text-neutral-400 mb-2">Project Name</label>
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className={`w-full rounded border bg-neutral-900 p-2 text-neutral-100 ${
              error ? 'border-red-500' : 'border-neutral-700 focus:border-blue-500'
            }`}
            placeholder="Enter project name"
          />
          {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        </div>

        <div>
          <label className="block text-sm text-neutral-400 mb-2">Project Icon</label>
          <IconSelector
            selectedIcon={editIcon}
            setSelectedIcon={setEditIcon}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <button
            onClick={() => setShowEditModal(false)}
            className="px-4 py-2 text-neutral-400 hover:text-neutral-200"
          >
            Cancel
          </button>
          <button
            onClick={() => handleUpdateProject({ name: editName, icon: editIcon })}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Save Changes
          </button>
        </div>
      </div>
    </Modal>
    </div>
  );
}

