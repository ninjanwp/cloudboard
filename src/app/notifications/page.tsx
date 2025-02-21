"use client";

import { useAuth } from "../context/AuthContext";
import { FaCheck, FaX } from "react-icons/fa6";

export default function NotificationsPage() {
  const { invitations, acceptInvitation, declineInvitation } = useAuth();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Notifications</h1>
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
                    {invitation.fromEmail}
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
  );
}
