import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { AvatarSettings } from "./avatarUtils";

export interface UserData {
  uid?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  photoURL?: string;
  avatarSettings?: AvatarSettings;
}

// Global cache
const userCache = new Map<string, UserData>();
const pendingFetches = new Map<string, Promise<UserData>>();

export const getUserData = async (email: string): Promise<UserData> => {
  // Check cache first
  if (userCache.has(email)) {
    return userCache.get(email)!;
  }

  // Check if we're already fetching this user
  if (pendingFetches.has(email)) {
    return pendingFetches.get(email)!;
  }

  // Create fetch promise
  const fetchPromise = fetchUserData(email);
  pendingFetches.set(email, fetchPromise);

  try {
    const userData = await fetchPromise;
    userCache.set(email, userData);
    pendingFetches.delete(email);
    return userData;
  } catch (error) {
    pendingFetches.delete(email);
    throw error;
  }
};

const fetchUserData = async (email: string): Promise<UserData> => {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userData = querySnapshot.docs[0].data();
      const fullName = userData.firstName && userData.lastName 
        ? `${userData.firstName} ${userData.lastName}` 
        : undefined;

      return {
        uid: querySnapshot.docs[0].id,
        email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        displayName: fullName || email,
        photoURL: userData.photoURL,
        avatarSettings: userData.avatarSettings || {
          style: "monogram",
          color: "auto",
          showFullName: false,
          useCustomColor: false
        }
      };
    }

    // User not found, return minimal data
    return {
      email,
      displayName: email,
      avatarSettings: {
        style: "monogram",
        color: "auto",
        showFullName: false,
        useCustomColor: false
      }
    };
  } catch (error) {
    console.error("Error fetching user data:", error);
    return {
      email,
      displayName: email,
      avatarSettings: {
        style: "monogram",
        color: "auto",
        showFullName: false,
        useCustomColor: false
      }
    };
  }
};

// Batch fetch multiple users
export const batchGetUserData = async (emails: string[]): Promise<Map<string, UserData>> => {
  const results = new Map<string, UserData>();
  const uncachedEmails = emails.filter(email => !userCache.has(email));
  
  // Get cached data first
  emails.forEach(email => {
    if (userCache.has(email)) {
      results.set(email, userCache.get(email)!);
    }
  });

  if (uncachedEmails.length === 0) {
    return results;
  }

  // Fetch uncached users in parallel
  const fetchPromises = uncachedEmails.map(email => 
    getUserData(email).then(userData => ({ email, userData }))
  );

  try {
    const fetchedData = await Promise.all(fetchPromises);
    fetchedData.forEach(({ email, userData }) => {
      results.set(email, userData);
    });
  } catch (error) {
    console.error("Error batch fetching user data:", error);
    // Fill in missing data with fallbacks
    uncachedEmails.forEach(email => {
      if (!results.has(email)) {
        results.set(email, {
          email,
          displayName: email,
          avatarSettings: {
            style: "monogram",
            color: "auto",
            showFullName: false,
            useCustomColor: false
          }
        });
      }
    });
  }

  return results;
};

// Invalidate cache for a specific user
export const invalidateUserCache = (email: string) => {
  userCache.delete(email);
};

// Clear all cache
export const clearUserCache = () => {
  userCache.clear();
  pendingFetches.clear();
};

// Preload users for a project
export const preloadProjectUsers = async (projectId: string) => {
  try {
    const projectRef = doc(db, "projects", projectId);
    const projectSnap = await getDoc(projectRef);
    
    if (projectSnap.exists()) {
      const members = projectSnap.data().members || [];
      await batchGetUserData(members);
    }
  } catch (error) {
    console.error("Error preloading project users:", error);
  }
};
