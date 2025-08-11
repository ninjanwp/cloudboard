"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { getUserData, UserData } from "../utils/userCache";
import { getAvatarColor, getAvatarText } from "../utils/avatarUtils";

interface UserAvatarProps {
  email: string;
  displayName?: string;
  photoURL?: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  cropX?: number; // Crop offset X as percentage (0-100)
  cropY?: number; // Crop offset Y as percentage (0-100)
  cropZoom?: number; // Zoom level (1-3)
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ 
  email, 
  displayName: propDisplayName, 
  photoURL: propPhotoURL, 
  size = "sm",
  className = "",
  cropX = 50,
  cropY = 50,
  cropZoom = 1
}) => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const sizeClasses = {
    xs: "w-4 h-4 text-xs",
    sm: "w-6 h-6 text-xs", 
    md: "w-8 h-8 text-sm",
    lg: "w-12 h-12 text-base"
  };

  useEffect(() => {
    let mounted = true;

    const loadUserData = async () => {
      try {
        const data = await getUserData(email);
        if (mounted) {
          setUserData(data);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error loading user data:", error);
        if (mounted) {
          // Fallback to props or email
          setUserData({
            email,
            displayName: propDisplayName || email,
            photoURL: propPhotoURL,
            avatarSettings: {
              style: "monogram",
              color: "auto",
              showFullName: false,
              useCustomColor: false,
              cropX: 50,
              cropY: 50,
              cropZoom: 1
            }
          });
          setLoading(false);
        }
      }
    };

    loadUserData();

    return () => {
      mounted = false;
    };
  }, [email, propDisplayName, propPhotoURL]);

  // Show loading state with a consistent placeholder to prevent flickering
  if (loading || !userData) {
    const fallbackColor = getAvatarColor(email, "auto");
    const fallbackText = propDisplayName 
      ? getAvatarText(propDisplayName, email, "monogram")
      : email.charAt(0).toUpperCase();

    return (
      <div className={`${sizeClasses[size]} ${fallbackColor} text-white font-medium rounded-full flex items-center justify-center shrink-0 ${className} opacity-70 animate-pulse`}>
        {fallbackText}
      </div>
    );
  }

  const { avatarSettings, photoURL, displayName } = userData;
  const finalDisplayName = displayName || propDisplayName || email;
  const finalPhotoURL = photoURL || propPhotoURL;

  // Use crop settings from avatar settings if available, otherwise use props
  const finalCropX = avatarSettings?.cropX ?? cropX;
  const finalCropY = avatarSettings?.cropY ?? cropY;
  const finalCropZoom = avatarSettings?.cropZoom ?? cropZoom;

  // If photo style is selected and photoURL is available, use photo
  if (avatarSettings?.style === "photo" && finalPhotoURL) {
    const sizePixels = parseInt(sizeClasses[size].split(' ')[0].replace('w-', '')) * 4;
    
    return (
      <div className={`${sizeClasses[size]} rounded-full overflow-hidden relative shrink-0 ${className}`}>
        <div 
          className="w-full h-full relative"
          style={{
            transform: `scale(${finalCropZoom})`,
            transformOrigin: `${finalCropX}% ${finalCropY}%`
          }}
        >
          <Image
            src={finalPhotoURL}
            alt={`${finalDisplayName}'s avatar`}
            width={sizePixels}
            height={sizePixels}
            className="object-cover w-full h-full"
            style={{
              objectPosition: `${finalCropX}% ${finalCropY}%`
            }}
            unoptimized
          />
        </div>
      </div>
    );
  }

  // Use text-based avatar (monogram or initials)
  const colorClass = getAvatarColor(email, avatarSettings?.color || "auto");
  const text = getAvatarText(finalDisplayName, email, avatarSettings?.style || "monogram");

  return (
    <div className={`${sizeClasses[size]} ${colorClass} text-white font-medium rounded-full flex items-center justify-center shrink-0 ${className}`}>
      {text}
    </div>
  );
};
