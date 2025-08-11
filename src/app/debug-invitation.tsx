"use client";

import React, { useState } from 'react';
import { db } from '../../firebase';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useAuth } from './context/AuthContext';

export default function DebugInvitation() {
  const { user } = useAuth();
  const [projectId, setProjectId] = useState('');
  const [testResults, setTestResults] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log(message);
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testFirestoreRules = async () => {
    if (!user?.email || !projectId) {
      addLog('❌ Missing user email or project ID');
      return;
    }

    addLog('🔍 Starting Firestore rules test...');
    addLog(`User: ${user.email}`);
    addLog(`Project ID: ${projectId}`);

    try {
      // Test 1: Read project
      addLog('📖 Test 1: Reading project...');
      const projectRef = doc(db, 'projects', projectId);
      const projectSnap = await getDoc(projectRef);
      
      if (!projectSnap.exists()) {
        addLog('❌ Project does not exist');
        return;
      }

      const projectData = projectSnap.data();
      addLog(`✅ Project read successful`);
      addLog(`Current members: ${JSON.stringify(projectData.members)}`);
      addLog(`Current memberRoles: ${JSON.stringify(projectData.memberRoles)}`);

      // Test 2: Check if user is already a member
      if (projectData.members && projectData.members.includes(user.email)) {
        addLog('ℹ️ User is already a member of this project');
        return;
      }

      // Test 3: Try to add user to members only
      addLog('📝 Test 2: Trying to add user to members array...');
      try {
        await updateDoc(projectRef, {
          members: arrayUnion(user.email)
        });
        addLog('✅ Successfully added user to members array');
      } catch (error) {
        addLog(`❌ Failed to add user to members: ${error}`);
        return;
      }

      // Test 4: Try to update memberRoles
      addLog('📝 Test 3: Trying to update memberRoles...');
      try {
        const updatedMemberRoles = [
          ...(projectData.memberRoles || []),
          {
            email: user.email,
            role: 'member',
            joinedAt: new Date().toISOString()
          }
        ];

        await updateDoc(projectRef, {
          memberRoles: updatedMemberRoles
        });
        addLog('✅ Successfully updated memberRoles');
      } catch (error) {
        addLog(`❌ Failed to update memberRoles: ${error}`);
      }

      // Final verification
      addLog('🔍 Final verification...');
      const finalSnap = await getDoc(projectRef);
      if (finalSnap.exists()) {
        const finalData = finalSnap.data();
        addLog(`Final members: ${JSON.stringify(finalData.members)}`);
        addLog(`Final memberRoles: ${JSON.stringify(finalData.memberRoles)}`);
        
        if (finalData.members && finalData.members.includes(user.email)) {
          addLog('🎉 SUCCESS: User is now a member of the project!');
        } else {
          addLog('❌ FAILURE: User was not added to the project');
        }
      }

    } catch (error) {
      addLog(`❌ Test failed with error: ${error}`);
    }
  };

  const clearLogs = () => {
    setTestResults([]);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-[var(--surface)] rounded-lg p-6 border border-[var(--border)]">
        <h1 className="text-2xl font-bold text-[var(--text)] mb-4">Debug Invitation System</h1>
        
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2">
              Project ID to test:
            </label>
            <input
              type="text"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="Enter project ID"
              className="w-full p-3 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text)]"
            />
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={testFirestoreRules}
              disabled={!user?.email || !projectId}
              className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              Test Firestore Rules
            </button>
            <button
              onClick={clearLogs}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Clear Logs
            </button>
          </div>
        </div>

        <div className="bg-[var(--background)] rounded-lg p-4 border border-[var(--border)]">
          <h3 className="text-lg font-semibold text-[var(--text)] mb-2">Test Results:</h3>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {testResults.length === 0 ? (
              <p className="text-[var(--text-secondary)]">No tests run yet</p>
            ) : (
              testResults.map((result, index) => (
                <div key={index} className="text-sm font-mono text-[var(--text)] break-words">
                  {result}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-4 text-sm text-[var(--text-secondary)]">
          <p>Current user: {user?.email || 'Not logged in'}</p>
          <p>Instructions: Enter a project ID where you should be able to join, then click "Test Firestore Rules"</p>
        </div>
      </div>
    </div>
  );
}
