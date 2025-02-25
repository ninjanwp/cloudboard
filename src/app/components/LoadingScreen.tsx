import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export const LoadingScreen = () => {
  const [showLoader, setShowLoader] = useState(true);
  
  useEffect(() => {
    // Set a minimum delay of 1.5 seconds before hiding the loading screen
    const timer = setTimeout(() => {
      setShowLoader(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);

  if (!showLoader) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="flex flex-col items-center justify-center space-y-6 px-4 w-full max-w-xs text-center">
        <div 
          className="w-16 h-16 border-4 rounded-full animate-spin mx-auto"
          style={{
            borderColor: 'var(--accent)',
            borderTopColor: 'transparent',
          }}
        />
        
        <div className="space-y-2 flex flex-col items-center">
          <motion.h2 
            className="text-2xl font-bold text-[var(--accent)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            cloudboard
          </motion.h2>
          
          <motion.p 
            className="text-[var(--text)] text-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Loading your workspace...
          </motion.p>
        </div>
      </div>
    </div>
  );
};
