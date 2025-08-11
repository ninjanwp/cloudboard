import { Project, ProjectRole, ProjectMember, NavigationPermissions } from "../context/ProjectContext";

export const getUserProjectRole = (project: Project, userEmail: string): ProjectRole | null => {
  if (!userEmail) return null;
  
  // Check if user is the owner
  if (project.owner && userEmail === project.ownerEmail) {
    return "owner";
  }
  
  // Check memberRoles if available (new structure)
  if (project.memberRoles) {
    const memberRole = project.memberRoles.find(member => member.email === userEmail);
    return memberRole?.role || null;
  }
  
  // Fallback to old structure - if user is in members array, they're a member
  if (project.members.includes(userEmail)) {
    return "member";
  }
  
  return null;
};

export const hasAdminAccess = (project: Project, userEmail: string): boolean => {
  const role = getUserProjectRole(project, userEmail);
  return role === "owner" || role === "administrator";
};

export const canManageProject = (project: Project, userEmail: string): boolean => {
  return hasAdminAccess(project, userEmail);
};

export const canRemoveMember = (project: Project, userEmail: string, targetEmail: string): boolean => {
  const userRole = getUserProjectRole(project, userEmail);
  const targetRole = getUserProjectRole(project, targetEmail);
  
  // Only owners and administrators can remove members
  if (userRole !== "owner" && userRole !== "administrator") {
    return false;
  }
  
  // Owners can remove anyone except themselves
  if (userRole === "owner") {
    return targetEmail !== userEmail;
  }
  
  // Administrators can only remove regular members, not other admins or owners
  if (userRole === "administrator") {
    return targetRole === "member";
  }
  
  return false;
};

export const canPromoteMember = (project: Project, userEmail: string, targetEmail: string): boolean => {
  const userRole = getUserProjectRole(project, userEmail);
  
  // Only owners can promote members to administrator
  return userRole === "owner" && targetEmail !== userEmail;
};

// Navigation permission functions
export const getDefaultNavigationPermissions = (): NavigationPermissions => {
  return {
    manage: ["owner", "administrator"], // Only admins and owners can access manage by default
    chat: ["owner", "administrator", "member"], // Everyone can access chat by default
    calendar: ["owner", "administrator", "member"], // Everyone can access calendar by default
  };
};

export const canAccessNavigation = (
  project: Project, 
  userEmail: string, 
  navigationItem: string
): boolean => {
  const userRole = getUserProjectRole(project, userEmail);
  if (!userRole) return false;
  
  // Owners always have access to everything
  if (userRole === "owner") return true;
  
  // Board access is always available to all members
  if (navigationItem === "board") return true;
  
  // Get navigation permissions, default to inclusive permissions if not set
  const navPermissions = project.navigationPermissions || getDefaultNavigationPermissions();
  const allowedRoles = navPermissions[navigationItem];
  
  // If no specific permissions set for this item, default to member access
  if (!allowedRoles) {
    return true;
  }
  
  return allowedRoles.includes(userRole);
};
