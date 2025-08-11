"use client";

import { useAuth } from "../context/AuthContext";
import { Header } from "../components/Header";
import { useState, useEffect, useRef } from "react";
import { doc, getDoc, setDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../../firebase";
import { FaChevronLeft, FaFolderOpen } from "react-icons/fa6";
import { useRouter } from "next/navigation";
import { useTheme } from "../context/ThemeContext";
import { ThemeName, themes } from "../types/theme";
import Image from "next/image";
import { AvatarColor, AvatarSettings, clearAvatarSettingsCache } from "../utils/avatarUtils";
import { Project } from "../context/ProjectContext";
import { getUserProjectRole } from "../utils/projectUtils";

// Avatar crop adjustment component
const AvatarCropAdjuster = ({ 
  photoURL, 
  settings, 
  onSettingsChange 
}: { 
  photoURL: string;
  settings: AvatarSettings;
  onSettingsChange: (settings: AvatarSettings) => void;
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent text selection
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    
    // Prevent text selection during drag
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    e.preventDefault(); // Prevent default behavior

    const rect = containerRef.current.getBoundingClientRect();
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    // Convert pixel movement to percentage (inverted for intuitive feel)
    const percentX = -(deltaX / rect.width) * 100 * 0.5; // Reduced sensitivity
    const percentY = -(deltaY / rect.height) * 100 * 0.5;
    
    // Calculate the boundaries based on zoom level
    const zoom = settings.cropZoom || 1;
    
    // When zoomed in, we can pan more. When zoomed out (zoom = 1), we're constrained to 50% center
    const panRange = Math.max(0, (zoom - 1) * 50);
    const minBound = 50 - panRange;
    const maxBound = 50 + panRange;
    
    const newCropX = Math.max(minBound, Math.min(maxBound, (settings.cropX || 50) + percentX));
    const newCropY = Math.max(minBound, Math.min(maxBound, (settings.cropY || 50) + percentY));
    
    onSettingsChange({
      ...settings,
      cropX: newCropX,
      cropY: newCropY
    });
    
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    // Restore text selection
    document.body.style.userSelect = '';
    document.body.style.webkitUserSelect = '';
  };

  // Global mouse event listeners for better drag experience
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        if (!containerRef.current) return;
        
        const rect = containerRef.current.getBoundingClientRect();
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        
        const percentX = -(deltaX / rect.width) * 100 * 0.5;
        const percentY = -(deltaY / rect.height) * 100 * 0.5;
        
        // Calculate the boundaries based on zoom level
        const zoom = settings.cropZoom || 1;
        
        // When zoomed in, we can pan more. When zoomed out (zoom = 1), we're constrained to 50% center
        // The available panning range increases with zoom
        const panRange = Math.max(0, (zoom - 1) * 50); // At 1x zoom: 0 range, at 2x zoom: 50 range, at 3x zoom: 100 range
        const minBound = 50 - panRange;
        const maxBound = 50 + panRange;
        
        const newCropX = Math.max(minBound, Math.min(maxBound, (settings.cropX || 50) + percentX));
        const newCropY = Math.max(minBound, Math.min(maxBound, (settings.cropY || 50) + percentY));
        
        onSettingsChange({
          ...settings,
          cropX: newCropX,
          cropY: newCropY
        });
        
        setDragStart({ x: e.clientX, y: e.clientY });
      };

      const handleGlobalMouseUp = () => {
        setIsDragging(false);
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, dragStart, settings, onSettingsChange]);

  const handleZoomChange = (zoom: number) => {
    // Calculate the new boundaries for the zoom level
    const panRange = Math.max(0, (zoom - 1) * 50);
    const minBound = 50 - panRange;
    const maxBound = 50 + panRange;
    
    // Constrain current crop position to new bounds
    const constrainedCropX = Math.max(minBound, Math.min(maxBound, settings.cropX || 50));
    const constrainedCropY = Math.max(minBound, Math.min(maxBound, settings.cropY || 50));
    
    onSettingsChange({
      ...settings,
      cropZoom: zoom,
      cropX: constrainedCropX,
      cropY: constrainedCropY
    });
  };

  return (
    <div className="space-y-4">
      {/* Custom slider styles */}
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: var(--accent);
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: var(--accent);
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .slider:focus {
          outline: none;
        }
        
        .slider:focus::-webkit-slider-thumb {
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
        }
      `}</style>
      
      <div className="text-sm text-adaptive-secondary mb-2">Adjust Image Position & Zoom</div>
      
      {/* Preview with crop adjustment */}
      <div 
        ref={containerRef}
        className={`relative w-32 h-32 mx-auto rounded-full overflow-hidden border-2 ${isDragging ? 'border-blue-500 cursor-grabbing' : 'border-[var(--border)] cursor-grab'} select-none`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDragStart={(e) => e.preventDefault()} // Prevent HTML5 drag
        draggable={false}
      >
        <div 
          className="w-full h-full relative pointer-events-none"
          style={{
            transform: `scale(${settings.cropZoom || 1})`,
            transformOrigin: `${settings.cropX || 50}% ${settings.cropY || 50}%`
          }}
        >
          <Image
            src={photoURL}
            alt="Avatar crop preview"
            width={128}
            height={128}
            className="object-cover w-full h-full pointer-events-none select-none"
            style={{
              objectPosition: `${settings.cropX || 50}% ${settings.cropY || 50}%`
            }}
            unoptimized
            draggable={false}
          />
        </div>
        
        {/* Center crosshair - only show when not dragging for cleaner look */}
        {!isDragging && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-2 h-2 border border-white bg-black bg-opacity-50 rounded-full"></div>
          </div>
        )}
        
        {/* Drag indicator */}
        {isDragging && (
          <div className="absolute inset-0 bg-blue-500 bg-opacity-10 flex items-center justify-center pointer-events-none">
            <div className="text-xs text-blue-600 font-medium bg-white bg-opacity-90 px-2 py-1 rounded">
              Dragging...
            </div>
          </div>
        )}
      </div>
      
      {/* Instructions */}
      <p className="text-xs text-adaptive-secondary text-center">
        Drag to reposition • Use zoom slider to adjust size
      </p>
      
      {/* Zoom control */}
      <div className="space-y-2">
        <label className="block text-sm text-adaptive-secondary">Zoom: {((settings.cropZoom || 1) * 100).toFixed(0)}%</label>
        <div className="relative">
          <input
            type="range"
            min="1"
            max="3"
            step="0.1"
            value={settings.cropZoom || 1}
            onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-[var(--border)] rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${((settings.cropZoom || 1) - 1) / 2 * 100}%, var(--border) ${((settings.cropZoom || 1) - 1) / 2 * 100}%, var(--border) 100%)`
            }}
          />
          {/* Slider track markers */}
          <div className="flex justify-between text-xs text-adaptive-secondary mt-1 px-1">
            <span>100%</span>
            <span>200%</span>
            <span>300%</span>
          </div>
        </div>
      </div>
      
      {/* Reset button */}
      <button
        type="button"
        onClick={() => onSettingsChange({
          ...settings,
          cropX: 50,
          cropY: 50,
          cropZoom: 1
        })}
        className="w-full px-3 py-2 text-sm bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded-lg transition-colors"
      >
        Reset Position
      </button>
    </div>
  );
};

// Avatar customization types and preview component
const AvatarPreview = ({ 
  email, 
  displayName, 
  photoURL, 
  settings 
}: { 
  email: string;
  displayName?: string;
  photoURL?: string;
  settings: AvatarSettings;
}) => {
  const getMonogram = (displayName: string | undefined, email: string) => {
    if (displayName) {
      const names = displayName.trim().split(/\s+/);
      if (names.length >= 2) {
        return (names[0].charAt(0) + names[1].charAt(0)).toUpperCase();
      }
      return displayName.substring(0, 2).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  const getInitials = (displayName: string | undefined, email: string) => {
    if (displayName) {
      return displayName.charAt(0).toUpperCase();
    }
    return email.charAt(0).toUpperCase();
  };

  const getAvatarColor = () => {
    if (settings.color === "auto") {
      const hashCode = Array.from(email).reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const colors = [
        "bg-blue-500", "bg-purple-500", "bg-green-500", "bg-yellow-500",
        "bg-pink-500", "bg-indigo-500", "bg-red-500", "bg-teal-500"
      ];
      return colors[hashCode % colors.length];
    }
    return `bg-${settings.color}-500`;
  };

  const renderAvatar = () => {
    if (settings.style === "photo" && photoURL) {
      return (
        <div className="w-12 h-12 rounded-full overflow-hidden relative">
          <div 
            className="w-full h-full relative"
            style={{
              transform: `scale(${settings.cropZoom || 1})`,
              transformOrigin: `${settings.cropX || 50}% ${settings.cropY || 50}%`
            }}
          >
            <Image
              src={photoURL}
              alt="Avatar preview"
              width={48}
              height={48}
              className="object-cover w-full h-full"
              style={{
                objectPosition: `${settings.cropX || 50}% ${settings.cropY || 50}%`
              }}
              unoptimized
            />
          </div>
        </div>
      );
    }

    const colorClass = getAvatarColor();
    const text = settings.style === "initials" ? getInitials(displayName, email) : getMonogram(displayName, email);

    return (
      <div className={`w-12 h-12 ${colorClass} text-white font-medium rounded-full flex items-center justify-center`}>
        {text}
      </div>
    );
  };

  return (
    <div className="flex items-center gap-3 p-4 bg-[var(--background)] rounded-lg border border-[var(--border)]">
      {renderAvatar()}
      <div>
        <div className="font-medium text-[var(--text)]">
          {settings.showFullName ? (displayName || email) : (displayName?.split(' ')[0] || email.split('@')[0])}
        </div>
        <div className="text-sm text-[var(--text-secondary)]">{email}</div>
      </div>
    </div>
  );
};

export default function Settings() {
  const router = useRouter();
  const { user, leaveProject } = useAuth();
  const { theme, setTheme } = useTheme();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"success" | "error" | null>(null);
  
  // Projects list
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  
  // Avatar settings
  const [avatarSettings, setAvatarSettings] = useState<AvatarSettings>({
    style: "monogram",
    color: "auto",
    showFullName: false,
    useCustomColor: false,
    cropX: 50,
    cropY: 50,
    cropZoom: 1
  });

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.uid) return;
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setFirstName(data.firstName || "");
        setLastName(data.lastName || "");
        setPhotoURL(data.photoURL || "");
        
        // Load avatar settings
        if (data.avatarSettings) {
          setAvatarSettings({
            style: data.avatarSettings.style || "monogram",
            color: data.avatarSettings.color || "auto",
            showFullName: data.avatarSettings.showFullName || false,
            useCustomColor: data.avatarSettings.useCustomColor || false,
            cropX: data.avatarSettings.cropX || 50,
            cropY: data.avatarSettings.cropY || 50,
            cropZoom: data.avatarSettings.cropZoom || 1
          });
        }
      }
    };
    fetchUserProfile();
  }, [user]);

  // Load user's projects
  useEffect(() => {
    if (!user?.email) return;

    const projectsRef = collection(db, "projects");
    const q = query(projectsRef, where("members", "array-contains", user.email));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsData: Project[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        projectsData.push({ 
          id: doc.id, 
          ...data,
          createdAt: data.createdAt // Keep as Timestamp
        } as Project);
      });
      setProjects(projectsData);
      setLoadingProjects(false);
    }, (error) => {
      console.error("Error fetching projects:", error);
      setLoadingProjects(false);
    });

    return () => unsubscribe();
  }, [user?.email]);

  const handleLeaveProject = async (projectId: string, projectName: string) => {
    if (window.confirm(`Are you sure you want to leave "${projectName}"? You will need to be invited again to rejoin.`)) {
      try {
        await leaveProject(projectId);
      } catch (error) {
        console.error("Error leaving project:", error);
        // Could add error handling UI here
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;

    setIsSaving(true);
    setSaveStatus(null);

    try {
      await setDoc(doc(db, "users", user.uid), {
        firstName,
        lastName,
        email: user.email,
        photoURL: photoURL.trim() || null,
        avatarSettings,
      }, { merge: true });
      
      // Clear avatar settings cache for this user
      clearAvatarSettingsCache(user.uid);
      
      setSaveStatus("success");
    } catch (error) {
      console.error("Error saving profile:", error);
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  const displayName = firstName && lastName ? `${firstName} ${lastName}` : "";

  const colorOptions: { value: AvatarColor; label: string; bgClass: string }[] = [
    { value: "auto", label: "Auto", bgClass: "bg-gradient-to-r from-blue-500 to-purple-500" },
    { value: "blue", label: "Blue", bgClass: "bg-blue-500" },
    { value: "purple", label: "Purple", bgClass: "bg-purple-500" },
    { value: "green", label: "Green", bgClass: "bg-green-500" },
    { value: "yellow", label: "Yellow", bgClass: "bg-yellow-500" },
    { value: "pink", label: "Pink", bgClass: "bg-pink-500" },
    { value: "indigo", label: "Indigo", bgClass: "bg-indigo-500" },
    { value: "red", label: "Red", bgClass: "bg-red-500" },
    { value: "teal", label: "Teal", bgClass: "bg-teal-500" },
  ];

  return (
    <>
      <Header />
      <main className="pt-16">
        <div className="max-w-2xl mx-auto p-6">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-[var(--surface-hover)] rounded-lg transition-colors"
            >
              <FaChevronLeft className="text-[var(--text-secondary)]" />
            </button>
            <h1 className="text-2xl font-bold text-adaptive">Settings</h1>
          </div>
          
          <div className="space-y-6">
            {/* Profile Section */}
            <div className="bg-[var(--surface)] rounded-lg p-6">
              <h2 className="text-lg font-semibold text-adaptive mb-4">Profile Information</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-adaptive-secondary mb-1">First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text)] focus:border-[var(--accent)] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-adaptive-secondary mb-1">Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text)] focus:border-[var(--accent)] outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-adaptive-secondary mb-1">Email</label>
                  <input
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text-secondary)] cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm text-adaptive-secondary mb-1">Profile Photo URL</label>
                  <input
                    type="url"
                    value={photoURL}
                    onChange={(e) => setPhotoURL(e.target.value)}
                    className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text)] focus:border-[var(--accent)] outline-none"
                    placeholder="https://example.com/photo.jpg"
                  />
                  <p className="text-xs text-adaptive-secondary mt-1">
                    Optional: Add a URL to your profile photo
                  </p>
                </div>
                <div className="flex items-center justify-between pt-4">
                  {saveStatus && (
                    <p className={`text-sm ${saveStatus === "success" ? "text-green-400" : "text-red-400"}`}>
                      {saveStatus === "success" ? "Changes saved successfully" : "Error saving changes"}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="rounded bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600 disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>

            {/* Projects Section */}
            <div className="bg-[var(--surface)] rounded-lg p-6">
              <h2 className="text-lg font-semibold text-adaptive mb-4 flex items-center gap-2">
                <FaFolderOpen className="text-[var(--accent)]" />
                Your Projects
              </h2>
              {loadingProjects ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)] mx-auto"></div>
                  <p className="text-adaptive-secondary mt-2">Loading projects...</p>
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-8">
                  <FaFolderOpen className="text-4xl text-adaptive-secondary mx-auto mb-3" />
                  <p className="text-adaptive-secondary">You&apos;re not a member of any projects yet.</p>
                  <button
                    onClick={() => router.push('/projects')}
                    className="mt-3 px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
                  >
                    Create a Project
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {projects.map((project) => {
                    const userRole = getUserProjectRole(project, user?.email || "");
                    return (
                      <div
                        key={project.id}
                        className="flex items-center justify-between p-4 bg-[var(--background)] rounded-lg border border-[var(--border)] hover:border-[var(--accent)]/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[var(--accent)]/10 rounded-lg flex items-center justify-center">
                            <FaFolderOpen className="text-[var(--accent)]" />
                          </div>
                          <div>
                            <h3 className="font-medium text-[var(--text)]">{project.name}</h3>
                            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                              <span>{project.members.length} member{project.members.length !== 1 ? 's' : ''}</span>
                              {userRole && (
                                <>
                                  <span>•</span>
                                  <span className="capitalize">{userRole}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => router.push(`/projects/${project.id}`)}
                            className="px-3 py-1.5 bg-[var(--accent)] text-white rounded text-sm hover:bg-[var(--accent-hover)] transition-colors"
                          >
                            Open
                          </button>
                          {userRole !== "owner" && (
                            <button
                              onClick={() => handleLeaveProject(project.id, project.name)}
                              className="px-3 py-1.5 text-red-400 border border-red-400/30 rounded text-sm hover:bg-red-400/10 transition-colors"
                            >
                              Leave
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div className="mt-4 pt-4 border-t border-[var(--border)]">
                    <button
                      onClick={() => router.push('/projects')}
                      className="w-full px-4 py-2 border border-[var(--border)] text-[var(--text)] rounded-lg hover:bg-[var(--surface)] transition-colors"
                    >
                      Create New Project
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Avatar Customization Section */}
            <div className="bg-[var(--surface)] rounded-lg p-6">
              <h2 className="text-lg font-semibold text-adaptive mb-4">Avatar Settings</h2>
              
              {/* Avatar Preview */}
              <div className="mb-6">
                <label className="block text-sm text-adaptive-secondary mb-2">Preview</label>
                <AvatarPreview
                  email={user?.email || ""}
                  displayName={displayName}
                  photoURL={photoURL}
                  settings={avatarSettings}
                />
              </div>

              {/* Avatar Style */}
              <div className="mb-6">
                <label className="block text-sm text-adaptive-secondary mb-2">Avatar Style</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setAvatarSettings(prev => ({ ...prev, style: "photo" }))}
                    className={`p-3 rounded-lg border-2 transition-all text-center ${
                      avatarSettings.style === "photo"
                        ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                        : 'border-[var(--border)] hover:border-[var(--accent)]/50'
                    }`}
                  >
                    <div className="text-sm font-medium text-adaptive mb-1">Photo</div>
                    <div className="text-xs text-adaptive-secondary">Use profile photo</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvatarSettings(prev => ({ ...prev, style: "monogram" }))}
                    className={`p-3 rounded-lg border-2 transition-all text-center ${
                      avatarSettings.style === "monogram"
                        ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                        : 'border-[var(--border)] hover:border-[var(--accent)]/50'
                    }`}
                  >
                    <div className="text-sm font-medium text-adaptive mb-1">Monogram</div>
                    <div className="text-xs text-adaptive-secondary">Two initials</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvatarSettings(prev => ({ ...prev, style: "initials" }))}
                    className={`p-3 rounded-lg border-2 transition-all text-center ${
                      avatarSettings.style === "initials"
                        ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                        : 'border-[var(--border)] hover:border-[var(--accent)]/50'
                    }`}
                  >
                    <div className="text-sm font-medium text-adaptive mb-1">Initial</div>
                    <div className="text-xs text-adaptive-secondary">Single letter</div>
                  </button>
                </div>
              </div>

              {/* Photo Crop Adjustment - only show if using photo and photoURL exists */}
              {avatarSettings.style === "photo" && photoURL.trim() && (
                <div className="mb-6">
                  <AvatarCropAdjuster
                    photoURL={photoURL}
                    settings={avatarSettings}
                    onSettingsChange={setAvatarSettings}
                  />
                </div>
              )}

              {/* Message when photo style is selected but no photo URL */}
              {avatarSettings.style === "photo" && !photoURL.trim() && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    Add a profile photo URL above to use the photo avatar style and adjust cropping.
                  </p>
                </div>
              )}

              {/* Color Selection - only show if not using photo */}
              {avatarSettings.style !== "photo" && (
                <div className="mb-6">
                  <label className="block text-sm text-adaptive-secondary mb-2">Avatar Color</label>
                  <div className="grid grid-cols-3 gap-2">
                    {colorOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setAvatarSettings(prev => ({ ...prev, color: option.value }))}
                        className={`p-2 rounded-lg border-2 transition-all flex items-center gap-2 ${
                          avatarSettings.color === option.value
                            ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                            : 'border-[var(--border)] hover:border-[var(--accent)]/50'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full ${option.bgClass}`}></div>
                        <span className="text-xs text-adaptive">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Display Options */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-adaptive">Show Full Name</label>
                    <p className="text-xs text-adaptive-secondary">Display full name instead of first name only</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAvatarSettings(prev => ({ ...prev, showFullName: !prev.showFullName }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      avatarSettings.showFullName ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        avatarSettings.showFullName ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Theme Section */}
            <div className="bg-[var(--surface)] rounded-lg p-6">
              <h2 className="text-lg font-semibold text-adaptive mb-4">Theme Settings</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {(Object.keys(themes) as ThemeName[]).map((themeName) => (
                  <button
                    key={themeName}
                    onClick={() => setTheme(themeName)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      theme === themeName
                        ? 'border-[var(--accent)]'
                        : 'border-transparent hover:border-[var(--border)]'
                    }`}
                    style={{
                      backgroundColor: themes[themeName].background,
                    }}
                  >
                    <div
                      className="w-full h-8 rounded mb-2"
                      style={{
                        backgroundColor: themes[themeName].surface,
                      }}
                    />
                    <p style={{ 
                      color: themes[themeName].text,
                      fontWeight: theme === themeName ? 'bold' : 'normal'
                    }}>
                      {themeName.charAt(0).toUpperCase() + themeName.slice(1)}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
