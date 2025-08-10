"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { getUserAvatarSettings, getUserAvatarSettingsByEmail, getAvatarColor, getAvatarText, AvatarSettings } from "../utils/avatarUtils";
import { getUserPhotoURL } from "../utils/userUtils";
import { useAuth } from "../context/AuthContext";

interface UserAvatarProps {
  email: string;
  displayName?: string;
  photoURL?: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  userUid?: string; // Optional UID for settings lookup
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ 
  email, 
  displayName, 
  photoURL, 
  size = "sm",
  className = "",
  userUid
}) => {
  const { user } = useAuth();
  const [avatarSettings, setAvatarSettings] = useState<AvatarSettings>({
    style: "monogram",
    color: "auto",
    showFullName: false,
    useCustomColor: false
  });
  const [userPhotoURL, setUserPhotoURL] = useState<string | null>(null);

  const sizeClasses = {
    xs: "w-4 h-4 text-xs",
    sm: "w-6 h-6 text-xs", 
    md: "w-8 h-8 text-sm",
    lg: "w-12 h-12 text-base"
  };

  useEffect(() => {
    const loadAvatarSettings = async () => {
      // Use provided userUid or current user's UID if this is the current user's avatar
      const uid = userUid || (email === user?.email ? user?.uid : null);
      
      if (uid) {
        const settings = await getUserAvatarSettings(uid);
        setAvatarSettings(settings);
      } else {
        // Fallback to email-based lookup for other users
        const settings = await getUserAvatarSettingsByEmail(email);
        setAvatarSettings(settings);
      }
    };
    loadAvatarSettings();
  }, [email, user?.email, user?.uid, userUid]);

  useEffect(() => {
    const loadPhotoURL = async () => {
      if (avatarSettings.style === "photo") {
        if (photoURL) {
          setUserPhotoURL(photoURL);
        } else {
          // Fetch from Firebase if not provided
          const fetchedPhotoURL = await getUserPhotoURL(email);
          setUserPhotoURL(fetchedPhotoURL);
        }
      }
    };
    loadPhotoURL();
  }, [email, photoURL, avatarSettings.style]);

  // If photo style is selected and photoURL is available, use photo
  if (avatarSettings.style === "photo" && userPhotoURL) {
    return (
      <div className={`${sizeClasses[size]} rounded-full overflow-hidden relative shrink-0 ${className}`}>
        <Image
          src={userPhotoURL}
          alt={`${displayName || email}'s avatar`}
          width={parseInt(sizeClasses[size].split(' ')[0].replace('w-', '')) * 4}
          height={parseInt(sizeClasses[size].split(' ')[0].replace('w-', '')) * 4}
          className="object-cover"
          unoptimized
        />
      </div>
    );
  }

  // Use text-based avatar (monogram or initials)
  const colorClass = getAvatarColor(email, avatarSettings.color);
  const text = getAvatarText(displayName, email, avatarSettings.style);

  return (
    <div className={`${sizeClasses[size]} ${colorClass} text-white font-medium rounded-full flex items-center justify-center shrink-0 ${className}`}>
      {text}
    </div>
  );
};
