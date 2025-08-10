import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../../firebase";

export type AvatarStyle = "monogram" | "photo" | "initials";
export type AvatarColor = "auto" | "blue" | "purple" | "green" | "yellow" | "pink" | "indigo" | "red" | "teal";

export interface AvatarSettings {
  style: AvatarStyle;
  color: AvatarColor;
  showFullName: boolean;
  useCustomColor: boolean;
}

const defaultAvatarSettings: AvatarSettings = {
  style: "monogram",
  color: "auto",
  showFullName: false,
  useCustomColor: false
};

// Cache for avatar settings
const avatarSettingsCache = new Map<string, AvatarSettings>();

export const getUserAvatarSettings = async (userUid: string): Promise<AvatarSettings> => {
  // Check cache first
  if (avatarSettingsCache.has(userUid)) {
    return avatarSettingsCache.get(userUid)!;
  }

  try {
    // Try to find user by UID
    const userRef = doc(db, "users", userUid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const data = userDoc.data();
      const settings = data.avatarSettings || defaultAvatarSettings;
      avatarSettingsCache.set(userUid, settings);
      return settings;
    }
  } catch (error) {
    console.error("Error fetching avatar settings:", error);
  }

  // Return default settings if not found
  avatarSettingsCache.set(userUid, defaultAvatarSettings);
  return defaultAvatarSettings;
};

export const getUserAvatarSettingsByEmail = async (email: string): Promise<AvatarSettings> => {
  try {
    // Query users collection by email
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      const data = userDoc.data();
      const settings = data.avatarSettings || defaultAvatarSettings;
      avatarSettingsCache.set(userDoc.id, settings);
      return settings;
    }
  } catch (error) {
    console.error("Error fetching avatar settings by email:", error);
  }

  return defaultAvatarSettings;
};

export const getAvatarColor = (email: string, color: AvatarColor): string => {
  if (color === "auto") {
    const hashCode = Array.from(email).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      "bg-blue-500", "bg-purple-500", "bg-green-500", "bg-yellow-500",
      "bg-pink-500", "bg-indigo-500", "bg-red-500", "bg-teal-500"
    ];
    return colors[hashCode % colors.length];
  }
  return `bg-${color}-500`;
};

export const getAvatarText = (
  displayName: string | undefined, 
  email: string, 
  style: AvatarStyle
): string => {
  if (style === "initials") {
    if (displayName) {
      return displayName.charAt(0).toUpperCase();
    }
    return email.charAt(0).toUpperCase();
  }

  // Default to monogram
  if (displayName) {
    const names = displayName.trim().split(/\s+/);
    if (names.length >= 2) {
      return (names[0].charAt(0) + names[1].charAt(0)).toUpperCase();
    }
    return displayName.substring(0, 2).toUpperCase();
  }
  return email.substring(0, 2).toUpperCase();
};

// Clear cache when settings are updated
export const clearAvatarSettingsCache = (userUid?: string) => {
  if (userUid) {
    avatarSettingsCache.delete(userUid);
  } else {
    avatarSettingsCache.clear();
  }
};
