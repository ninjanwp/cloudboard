"use client";

import { useAuth } from "../context/AuthContext";
import { Header } from "../components/Header";
import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { FaChevronLeft } from "react-icons/fa6"; // Add this import
import { useRouter } from "next/navigation"; // Add this import

export default function Settings() {
  const router = useRouter(); // Add this
  const { user } = useAuth();
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
              className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <FaChevronLeft className="text-neutral-400" />
            </button>
            <h1 className="text-2xl font-bold text-white">Settings</h1>
          </div>
          
          <div className="space-y-6">
            {/* Profile Section */}
            <div className="bg-neutral-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Profile Information</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-neutral-400 mb-1">First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full rounded border border-neutral-700 bg-neutral-900 p-2 text-neutral-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-400 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full rounded border border-neutral-700 bg-neutral-900 p-2 text-neutral-100"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">Email</label>
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
          </div>
        </div>
      </main>
    </>
  );
}
