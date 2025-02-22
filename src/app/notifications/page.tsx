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
            <h1 className="text-2xl font-bold text-white">Notifications</h1>
          </div>
          <div className="bg-neutral-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Project Invitations</h2>
            <div className="space-y-4">
              {invitations.length === 0 ? (
                <p className="text-neutral-400">No pending invitations</p>
              ) : (
                invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="bg-neutral-800 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-white">
                        <span className="text-neutral-400">
                          {senderNames[invitation.fromEmail] || invitation.fromEmail}
                        </span>{" "}
                        invited you to join{" "}
                        <span className="font-bold">{invitation.projectName}</span>
                      </p>
                      <p className="text-sm text-neutral-500">
                        {new Date(invitation.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => acceptInvitation(invitation.id)}
                        className="p-2 bg-green-500 rounded hover:bg-green-600"
                      >
                        <FaCheck />
                      </button>
                      <button
                        onClick={() => declineInvitation(invitation.id)}
                        className="p-2 bg-red-500 rounded hover:bg-red-600"
                      >
                        <FaX />
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
