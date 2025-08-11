"use client";

import { useAuth } from "../context/AuthContext";
import { FaCheck, FaX, FaChevronLeft } from "react-icons/fa6"; // Add FaChevronLeft
import { Header } from "../components/Header";
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { useRouter } from "next/navigation"; // Add this import

export default function NotificationsPage() {
  const router = useRouter(); // Add this
  const { invitations, acceptInvitation, declineInvitation } = useAuth();
  const [senderNames, setSenderNames] = useState<{ [email: string]: string }>({});
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    const fetchSenderNames = async () => {
      const names: { [email: string]: string } = {};
      for (const invitation of invitations) {
        const userDoc = await getDoc(doc(db, "users", invitation.fromEmail));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.firstName && data.lastName) {
            names[invitation.fromEmail] = `${data.firstName} ${data.lastName}`;
          } else {
            names[invitation.fromEmail] = invitation.fromEmail;
          }
        }
      }
      setSenderNames(names);
    };
    fetchSenderNames();
  }, [invitations]);

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      setProcessing(invitationId);
      console.log("Attempting to accept invitation:", invitationId);
      await acceptInvitation(invitationId);
      console.log("Invitation accepted successfully");
      // Show success message or redirect
      router.push('/projects'); // Redirect to projects page
    } catch (error) {
      console.error("Failed to accept invitation:", error);
      alert("Failed to accept invitation. Please try again.");
    } finally {
      setProcessing(null);
    }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    try {
      setProcessing(invitationId);
      await declineInvitation(invitationId);
    } catch (error) {
      console.error("Failed to decline invitation:", error);
      alert("Failed to decline invitation. Please try again.");
    } finally {
      setProcessing(null);
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
            <h1 className="text-2xl font-bold text-[var(--text)]">Notifications</h1>
          </div>
          <div className="bg-[var(--surface)] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-[var(--text)] mb-4">Project Invitations</h2>
            <div className="space-y-4">
              {invitations.length === 0 ? (
                <p className="text-[var(--text-secondary)]">No pending invitations</p>
              ) : (
                invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="bg-[var(--surface)] rounded-lg p-4 flex items-center justify-between border border-[var(--border)]"
                  >
                    <div>
                      <p className="text-[var(--text)]">
                        <span className="text-[var(--text-secondary)]">
                          {senderNames[invitation.fromEmail] || invitation.fromEmail}
                        </span>{" "}
                        invited you to join{" "}
                        <span className="font-bold">{invitation.projectName}</span>
                      </p>
                      <p className="text-sm text-[var(--text-secondary)]">
                        {new Date(invitation.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptInvitation(invitation.id)}
                        disabled={processing === invitation.id}
                        className="p-2 bg-green-500 rounded hover:bg-green-600 text-white disabled:opacity-50"
                      >
                        {processing === invitation.id ? "..." : <FaCheck />}
                      </button>
                      <button
                        onClick={() => handleDeclineInvitation(invitation.id)}
                        disabled={processing === invitation.id}
                        className="p-2 bg-red-500 rounded hover:bg-red-600 text-white disabled:opacity-50"
                      >
                        {processing === invitation.id ? "..." : <FaX />}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
