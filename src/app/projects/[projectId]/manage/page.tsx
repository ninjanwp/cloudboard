"use client";

import { Project, ProjectMember } from "../../../context/ProjectContext";

import { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useProject } from "../../../context/ProjectContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../../../../firebase";
import { FaUserPlus, FaUserMinus, FaCrown, FaTrash, FaShield, FaRobot, FaEye, FaEyeSlash, FaGear, FaMessage, FaCalendar } from "react-icons/fa6";
import { useParams, useRouter } from 'next/navigation';
import { IconSelector } from "../../../components/IconSelector";
import * as FaIcons from "react-icons/fa6";
import { Modal } from "../../../components/Modal";
import { FaPen } from "react-icons/fa6";
import { getUserDisplayName } from "../../../utils/userUtils";
import { ActivityLogs } from "../../../components/ActivityLogs";
import { UserAvatar } from "../../../components/UserAvatar";
import { hasAdminAccess, getUserProjectRole, canRemoveMember, canPromoteMember, getDefaultNavigationPermissions } from "../../../utils/projectUtils";
import type { NavigationPermissions, ProjectRole } from "../../../context/ProjectContext";

export default function ProjectManagePage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { user, inviteUserToProject, removeUserFromProject, deleteProject, leaveProject } = useAuth();
  const { currentProject, setCurrentProject } = useProject();
  const [members, setMembers] = useState<string[]>([]);
  const [, setMemberRoles] = useState<ProjectMember[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [hasAdminPermissions, setHasAdminPermissions] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [error, setError] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [memberDisplayNames, setMemberDisplayNames] = useState<{ [email: string]: string }>({});
  
  // API Key management
  const [openAIApiKey, setOpenAIApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [savingApiKey, setSavingApiKey] = useState(false);
  
  // Navigation permissions
  const [navigationPermissions, setNavigationPermissions] = useState<NavigationPermissions>(getDefaultNavigationPermissions());
  const [savingNavPermissions, setSavingNavPermissions] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    const fetchProjectDetails = async () => {
      const projectRef = doc(db, "projects", projectId);
      const projectSnap = await getDoc(projectRef);
      if (projectSnap.exists()) {
        const projectData = projectSnap.data() as Omit<Project, 'id'>;
        setMembers(projectData.members || []);
        
        // Set up role-based permissions
        if (user?.email) {
          const adminAccess = hasAdminAccess({ ...projectData, id: projectId } as Project, user.email);
          setHasAdminPermissions(adminAccess);
          
          const role = getUserProjectRole({ ...projectData, id: projectId } as Project, user.email);
          setUserRole(role || "");
          
          // Check access - only owners and administrators can access this page
          if (!adminAccess) {
            router.replace(`/projects/${projectId}`);
            return;
          }
        }
        
        // Load member roles if available
        if (projectData.memberRoles) {
          setMemberRoles(projectData.memberRoles);
        }
        
        // Load API key
        setOpenAIApiKey(projectData.openAIApiKey || "");
        
        // Load navigation permissions
        setNavigationPermissions(projectData.navigationPermissions || getDefaultNavigationPermissions());
        
        const fullProject: Project = {
          id: projectId,
          name: projectData.name,
          owner: projectData.owner,
          ownerEmail: projectData.members.find(m => 
            m === projectData.members[0]  // First member is always the owner
          ) || '',
          members: projectData.members || [],
          memberRoles: projectData.memberRoles,
          createdAt: projectData.createdAt,
          icon: projectData.icon,
          openAIApiKey: projectData.openAIApiKey,
          navigationPermissions: projectData.navigationPermissions
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
  }, [projectId, user, setCurrentProject, router]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!newMemberEmail) return;
    
    try {
      await inviteUserToProject(projectId, newMemberEmail);
      setNewMemberEmail("");
      setError("");
    } catch (err) {
      setError("Failed to send invitation");
      console.error("Invitation error:", err);
    }
  };

  const handleSaveApiKey = async () => {
    setSavingApiKey(true);
    try {
      const projectRef = doc(db, "projects", projectId);
      await updateDoc(projectRef, {
        openAIApiKey: openAIApiKey
      });
      setError("");
    } catch (err) {
      setError("Failed to save API key");
      console.error("Save API key error:", err);
    }
    setSavingApiKey(false);
  };

  const handleSaveNavigationPermissions = async () => {
    setSavingNavPermissions(true);
    try {
      const projectRef = doc(db, "projects", projectId);
      await updateDoc(projectRef, {
        navigationPermissions: navigationPermissions
      });
      
      // Update the current project context
      if (currentProject) {
        setCurrentProject({
          ...currentProject,
          navigationPermissions: navigationPermissions
        });
      }
      
      setError("");
    } catch (err) {
      setError("Failed to save navigation permissions");
      console.error("Save navigation permissions error:", err);
    }
    setSavingNavPermissions(false);
  };

  const handlePermissionChange = (navItem: string, role: ProjectRole, checked: boolean) => {
    setNavigationPermissions(prev => {
      const newPermissions = { ...prev };
      if (!newPermissions[navItem]) {
        newPermissions[navItem] = [];
      }
      
      if (checked) {
        if (!newPermissions[navItem].includes(role)) {
          newPermissions[navItem] = [...newPermissions[navItem], role];
        }
      } else {
        newPermissions[navItem] = newPermissions[navItem].filter(r => r !== role);
      }
      
      return newPermissions;
    });
  };

  const handlePromoteMember = async (email: string) => {
    if (!currentProject || !user?.email) return;
    
    if (!canPromoteMember(currentProject, user.email, email)) {
      setError("You don't have permission to promote this member");
      return;
    }

    try {
      const projectRef = doc(db, "projects", projectId);
      
      // Initialize memberRoles if it doesn't exist
      let updatedMemberRoles = currentProject.memberRoles || [];
      
      // If no memberRoles, create from existing members
      if (!currentProject.memberRoles) {
        updatedMemberRoles = currentProject.members.map(member => ({
          email: member,
          role: member === currentProject.ownerEmail ? "owner" : "member",
          joinedAt: new Date().toISOString()
        }));
      }
      
      // Update the specific member's role
      updatedMemberRoles = updatedMemberRoles.map(member => 
        member.email === email 
          ? { ...member, role: "administrator" as const }
          : member
      );
      
      await updateDoc(projectRef, {
        memberRoles: updatedMemberRoles
      });
      
      setMemberRoles(updatedMemberRoles);
      setError("");
    } catch (err) {
      setError("Failed to promote member");
      console.error("Promote member error:", err);
    }
  };

  const handleDemoteMember = async (email: string) => {
    if (!currentProject || !user?.email) return;
    
    if (getUserProjectRole(currentProject, user.email) !== "owner") {
      setError("Only owners can demote administrators");
      return;
    }

    try {
      const projectRef = doc(db, "projects", projectId);
      
      const updatedMemberRoles = (currentProject.memberRoles || []).map(member => 
        member.email === email 
          ? { ...member, role: "member" as const }
          : member
      );
      
      await updateDoc(projectRef, {
        memberRoles: updatedMemberRoles
      });
      
      setMemberRoles(updatedMemberRoles);
      setError("");
    } catch (err) {
      setError("Failed to demote member");
      console.error("Demote member error:", err);
    }
  };

  const handleRemoveMember = async (email: string) => {
    if (!currentProject || !user?.email) return;
    
    if (!canRemoveMember(currentProject, user.email, email)) {
      setError("You don't have permission to remove this member");
      return;
    }
    
    if (window.confirm(`Are you sure you want to remove ${email} from the project?`)) {
      try {
        await removeUserFromProject(projectId, email);
      } catch (err) {
        setError("Failed to remove member");
        console.error("Remove member error:", err);
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
      } catch (err) {
        setError("Failed to delete project");
        console.error("Delete project error:", err);
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
    } catch (err) {
      setError("Failed to update project");
      console.error("Update project error:", err);
    }
  };

  const handleLeaveProject = async () => {
    if (window.confirm('Are you sure you want to leave this project? You will need to be invited again to rejoin.')) {
      try {
        await leaveProject(projectId);
        router.replace('/');
      } catch (err) {
        setError("Failed to leave project");
        console.error("Leave project error:", err);
      }
    }
  };

  const getMemberRole = (email: string): string => {
    if (!currentProject) return "member";
    return getUserProjectRole(currentProject, email) || "member";
  };

  const IconComponent = currentProject?.icon 
    ? (FaIcons as Record<string, React.ComponentType>)[currentProject.icon] 
    : FaIcons.FaStar;

  if (!currentProject) return null;

  return (
    <div className="container mx-auto max-w-5xl p-6 mt-20">
      <div className="mb-10">
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-8">
          <div className="flex items-center justify-between">
            <div 
              className="flex items-center gap-6 group cursor-pointer"
              onClick={() => {
                if (hasAdminPermissions) {
                  setEditName(currentProject.name);
                  setEditIcon(currentProject.icon || "FaStar");
                  setShowEditModal(true);
                }
              }}
            >
              <div className="relative">
                <div className="w-16 h-16 flex items-center justify-center bg-gradient-to-br from-[var(--accent)]/10 to-[var(--accent)]/5 rounded-2xl border-2 border-[var(--accent)]/20">
                  <IconComponent className="w-8 h-8 text-[var(--accent)]" />
                </div>
                {hasAdminPermissions && (
                  <div className="absolute -bottom-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-6 h-6 bg-[var(--accent)] rounded-full flex items-center justify-center">
                      <FaPen className="w-3 h-3 text-white" />
                    </div>
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[var(--text)] mb-1">{currentProject.name}</h1>
                <p className="text-[var(--text-secondary)] flex items-center gap-2">
                  <span>Project Management</span>
                  {userRole && (
                    <>
                      <span>•</span>
                      <span className="text-xs bg-[var(--accent)]/10 text-[var(--accent)] px-2 py-1 rounded-full font-medium">
                        {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* API Key Management Section */}
      {hasAdminPermissions && (
        <div className="mb-8 bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6">
          <h3 className="text-lg font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
            <FaRobot className="text-[var(--accent)]" />
            AI Assistant Configuration
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">OpenAI API Key</label>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={openAIApiKey}
                  onChange={(e) => setOpenAIApiKey(e.target.value)}
                  className="w-full p-3 pr-20 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text)] focus:border-[var(--accent)] outline-none"
                  placeholder="sk-..."
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="p-1 hover:bg-[var(--surface-hover)] rounded"
                  >
                    {showApiKey ? <FaEyeSlash className="text-[var(--text-secondary)]" /> : <FaEye className="text-[var(--text-secondary)]" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveApiKey}
                    disabled={savingApiKey}
                    className="px-3 py-1 bg-[var(--accent)] text-white rounded text-sm hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
                  >
                    {savingApiKey ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Project-specific API key for AI assistant features. Get your key from{" "}
                <a 
                  href="https://platform.openai.com/api-keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[var(--accent)] hover:underline"
                >
                  OpenAI Platform
                </a>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Permissions Section */}
      {hasAdminPermissions && (
        <div className="mb-8 bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[var(--text)] flex items-center gap-2">
              <FaGear className="text-[var(--accent)]" />
              Navigation Permissions
            </h3>
            <button
              onClick={handleSaveNavigationPermissions}
              disabled={savingNavPermissions}
              className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
            >
              {savingNavPermissions ? "Saving..." : "Save Permissions"}
            </button>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            Control which team roles can access different sections of the project. Board access is always available to all members.
          </p>
          
          <div className="space-y-4">
            {[
              { key: "manage", label: "Manage", icon: <FaGear className="w-4 h-4" />, description: "Project settings, member management, and permissions" },
              { key: "chat", label: "Chat", icon: <FaMessage className="w-4 h-4" />, description: "Team communication and discussions" },
              { key: "calendar", label: "Calendar", icon: <FaCalendar className="w-4 h-4" />, description: "Project timeline and scheduling" },
            ].map((navItem) => (
              <div key={navItem.key} className="bg-[var(--background)] rounded-lg p-4 border border-[var(--border)]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-[var(--accent)]/10 rounded-lg flex items-center justify-center">
                    {navItem.icon}
                  </div>
                  <div>
                    <h4 className="font-medium text-[var(--text)]">{navItem.label}</h4>
                    <p className="text-xs text-[var(--text-secondary)]">{navItem.description}</p>
                  </div>
                </div>
                
                <div className="flex gap-6 ml-11">
                  {(["owner", "administrator", "member"] as ProjectRole[]).map((role) => (
                    <label key={role} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={role === "owner" || navigationPermissions[navItem.key]?.includes(role) || false}
                        onChange={(e) => handlePermissionChange(navItem.key, role, e.target.checked)}
                        disabled={role === "owner"} // Owners always have access
                        className="w-4 h-4 text-[var(--accent)] border-2 border-[var(--border)] rounded focus:ring-[var(--accent)] focus:ring-2 disabled:opacity-50"
                      />
                      <span className={`text-sm capitalize ${role === "owner" ? "text-[var(--text-secondary)]" : "text-[var(--text)]"}`}>
                        {role}
                        {role === "owner" && <span className="text-xs ml-1">(always)</span>}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasAdminPermissions && (
        <div className="mb-8 bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6">
          <h3 className="text-lg font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
            <FaUserPlus className="text-[var(--accent)]" />
            Invite Team Members
          </h3>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="flex gap-3">
              <input
                type="email"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                placeholder="Enter email address to invite"
                className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 text-[var(--text)] focus:border-[var(--accent)] focus:outline-none transition-colors"
              />
              <button
                type="submit"
                className="rounded-lg bg-[var(--accent)] px-6 py-3 text-white hover:bg-[var(--accent-hover)] flex items-center gap-2 font-medium transition-colors"
              >
                <FaUserPlus />
                <span>Send Invite</span>
              </button>
            </div>
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
          </form>
        </div>
      )}

    <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
      <div className="p-6 border-b border-[var(--border)]">
        <h2 className="text-xl font-bold text-[var(--text)] flex items-center gap-2">
          <div className="w-8 h-8 bg-[var(--accent)]/10 rounded-lg flex items-center justify-center">
            <FaCrown className="w-4 h-4 text-[var(--accent)]" />
          </div>
          Project Members
          <span className="text-sm font-normal text-[var(--text-secondary)] ml-2">
            ({members.length} member{members.length !== 1 ? 's' : ''})
          </span>
        </h2>
      </div>
      <div className="divide-y divide-[var(--border)]">
        {members.map((member) => (
          <div
            key={member}
            className="flex items-center justify-between p-6 hover:bg-[var(--background)]/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <UserAvatar
                email={member}
                displayName={memberDisplayNames[member]}
                size="md"
                className="ring-2 ring-[var(--border)]"
              />
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[var(--text)]">
                    {memberDisplayNames[member] || member}
                  </span>
                  {member === members[0] && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/10 text-yellow-500 rounded-full text-xs font-medium">
                      <FaCrown className="w-3 h-3" />
                      Owner
                    </div>
                  )}
                  {getMemberRole(member) === "administrator" && member !== members[0] && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-purple-500/10 text-purple-500 rounded-full text-xs font-medium">
                      <FaShield className="w-3 h-3" />
                      Administrator
                    </div>
                  )}
                  {member === user?.email && (
                    <div className="px-2 py-1 bg-[var(--accent)]/10 text-[var(--accent)] rounded-full text-xs font-medium">
                      You
                    </div>
                  )}
                </div>
                <span className="text-sm text-[var(--text-secondary)]">{member}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Role management buttons */}
              {currentProject && user?.email && canPromoteMember(currentProject, user.email, member) && getMemberRole(member) === "member" && (
                <button
                  onClick={() => handlePromoteMember(member)}
                  className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 p-2 rounded-lg flex items-center gap-2 transition-colors"
                  title={`Promote ${memberDisplayNames[member] || member} to Administrator`}
                >
                  <FaShield className="w-4 h-4" />
                  <span className="text-sm font-medium">Promote</span>
                </button>
              )}
              
              {currentProject && user?.email && getUserProjectRole(currentProject, user.email) === "owner" && getMemberRole(member) === "administrator" && (
                <button
                  onClick={() => handleDemoteMember(member)}
                  className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 p-2 rounded-lg flex items-center gap-2 transition-colors"
                  title={`Demote ${memberDisplayNames[member] || member} to Member`}
                >
                  <FaUserMinus className="w-4 h-4" />
                  <span className="text-sm font-medium">Demote</span>
                </button>
              )}
              
              {currentProject && user?.email && canRemoveMember(currentProject, user.email, member) && (
                <button
                  onClick={() => handleRemoveMember(member)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-lg flex items-center gap-2 transition-colors"
                  title={`Remove ${memberDisplayNames[member] || member} from project`}
                >
                  <FaUserMinus className="w-4 h-4" />
                  <span className="text-sm font-medium">Remove</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="mt-12 bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
      <div className="p-6 border-b border-[var(--border)]">
        <h2 className="text-xl font-bold text-[var(--text)] flex items-center gap-2">
          <div className="w-8 h-8 bg-[var(--accent)]/10 rounded-lg flex items-center justify-center">
            <FaUserPlus className="w-4 h-4 text-[var(--accent)]" />
          </div>
          Recent Activity
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Track what&apos;s happening in your project
        </p>
      </div>
      <div className="p-6">
        <ActivityLogs projectId={projectId} />
      </div>
    </div>

    {userRole === "owner" ? (
      <div className="mt-12">
        <div className="border border-red-500/20 rounded-xl bg-gradient-to-r from-red-500/5 to-red-600/5 p-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <FaTrash className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-red-500 mb-2">Delete Project</h2>
              <p className="text-[var(--text-secondary)] mb-6 leading-relaxed">
                Permanently delete this project and all its data. This action cannot be undone and will remove all boards, tasks, and project history.
              </p>
              <button
                onClick={handleDeleteProject}
                className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2 font-medium transition-colors"
              >
                <FaTrash className="w-4 h-4" />
                Delete Project Forever
              </button>
            </div>
          </div>
        </div>
      </div>
    ) : (
      <div className="mt-12">
        <div className="border border-orange-500/20 rounded-xl bg-gradient-to-r from-orange-500/5 to-red-500/5 p-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <FaUserMinus className="w-5 h-5 text-orange-500" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-orange-500 mb-2">Leave Project</h2>
              <div className="text-[var(--text-secondary)] mb-6 space-y-3">
                <p className="leading-relaxed">
                  Are you sure you want to leave this project? This action will:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1 text-sm">
                  <li>Remove your access to all project boards and tasks</li>
                  <li>Unassign you from all current tasks</li>
                  <li>Require a new invitation to rejoin</li>
                </ul>
              </div>
              <button
                onClick={handleLeaveProject}
                className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2 font-medium transition-colors"
              >
                <FaUserMinus className="w-4 h-4" />
                Leave Project
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)}>
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[var(--accent)]/10 rounded-xl flex items-center justify-center">
            <FaPen className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <h2 className="text-2xl font-bold text-[var(--text)]">Edit Project</h2>
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-3">Project Name</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className={`w-full rounded-lg border bg-[var(--background)] p-3 text-[var(--text)] focus:outline-none transition-colors ${
                error ? 'border-red-500 focus:border-red-500' : 'border-[var(--border)] focus:border-[var(--accent)]'
              }`}
              placeholder="Enter project name"
            />
            {error && (
              <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-3">Project Icon</label>
            <IconSelector
              selectedIcon={editIcon}
              setSelectedIcon={setEditIcon}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-[var(--border)]">
          <button
            onClick={() => setShowEditModal(false)}
            className="px-6 py-2 text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface)] rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => handleUpdateProject({ name: editName, icon: editIcon })}
            className="px-6 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] font-medium transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </Modal>
    </div>
  );
}

