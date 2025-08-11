"use client";

import React, { createContext, useContext, useState, useEffect, Suspense } from 'react';
import { usePathname } from 'next/navigation';

interface LoadingContextType {
  isLoading: boolean;
}

const LoadingContext = createContext<LoadingContextType>({ isLoading: false });

export const LoadingProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsLoading(false);
  }, [pathname]);

  return (
    <LoadingContext.Provider value={{ isLoading }}>
      {children}
      {isLoading && (
        <div className="fixed top-16 left-0 right-0 h-1 bg-neutral-900">
          <div className="h-full bg-blue-500 animate-loading-bar" />
        </div>
      )}
    </LoadingContext.Provider>
  );
};

export const LoadingProviderWithSuspense = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div>Loading...</div>}>
    <LoadingProvider>{children}</LoadingProvider>
  </Suspense>
);

export const useLoading = () => useContext(LoadingContext);
