import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../../firebase";

export const getUserDisplayName = async (email: string): Promise<string> => {
  try {
    // First try to find user by email query
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userData = querySnapshot.docs[0].data();
      if (userData.firstName && userData.lastName) {
        return `${userData.firstName} ${userData.lastName}`;
      }
    }
    return email; // Fallback to email if no name found
  } catch (error) {
    console.error("Error fetching user display name:", error);
    return email; // Fallback to email on error
  }
};
