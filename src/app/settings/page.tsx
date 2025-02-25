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

export default function Settings() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"success" | "error" | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.uid) return;
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setFirstName(data.firstName || "");
        setLastName(data.lastName || "");
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
      }, { merge: true });
      setSaveStatus("success");
    } catch (error) {
      console.error("Error saving profile:", error);
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

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
                      className="input-themed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-adaptive-secondary mb-1">Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="input-themed"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-adaptive-secondary mb-1">Email</label>
                  <input
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="w-full rounded border border-neutral-700 bg-neutral-900/50 p-2 text-neutral-500"
                  />
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
