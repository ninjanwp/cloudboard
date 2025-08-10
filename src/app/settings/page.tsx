"use client";

import { useAuth } from "../context/AuthContext";
import { Header } from "../components/Header";
import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { FaChevronLeft } from "react-icons/fa6";
import { useRouter } from "next/navigation";
import { useTheme } from "../context/ThemeContext";
import { ThemeName, themes } from "../types/theme";
import Image from "next/image";
import { AvatarColor, AvatarSettings, clearAvatarSettingsCache } from "../utils/avatarUtils";

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
          <Image
            src={photoURL}
            alt="Avatar preview"
            width={48}
            height={48}
            className="object-cover"
            unoptimized
          />
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
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"success" | "error" | null>(null);
  
  // Avatar settings
  const [avatarSettings, setAvatarSettings] = useState<AvatarSettings>({
    style: "monogram",
    color: "auto",
    showFullName: false,
    useCustomColor: false
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
            useCustomColor: data.avatarSettings.useCustomColor || false
          });
        }
      }
    };
    fetchUserProfile();
  }, [user]);

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
