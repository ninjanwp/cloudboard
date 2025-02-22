"use client";

import React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./context/AuthContext";
import { SignInModal } from "./components/SignInModal";
import { FaArrowRight } from "react-icons/fa6";
import { motion } from "framer-motion";
import { LoadingScreen } from "./components/LoadingScreen";
import { Header } from "./components/Header";

export default function Home(): React.ReactElement {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/projects');
    }
  }, [user, loading, router]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <React.Fragment>
      <div className="min-h-screen bg-black overflow-x-hidden">
        <Header extraPadding={true} />
        <main>
          {/* Hero Section */}
          <section className="relative container mx-auto px-4 py-32">
            {/* Grid Background */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] left-[50%] -translate-x-1/2 w-screen h-full"
            />
            
            <div className="max-w-4xl mx-auto text-center space-y-8 relative z-10">
              {/* Gradient Background */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl -z-10"
              />
              
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-6xl font-bold text-white tracking-tight relative"
              >
                Collaborate in <br />
                <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent font-bold">
                Real-Time
                </span>
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-xl text-neutral-400 max-w-2xl mx-auto"
              >
                Streamline your workflow with an intuitive kanban board. <br />Designed for modern agile teams.
              </motion.p>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex gap-4 justify-center"
              >
                <button
                  onClick={() => setIsSignInModalOpen(true)}
                  className="group px-8 py-4 rounded-lg bg-white text-black hover:bg-neutral-200 transition-colors flex items-center gap-2 font-medium"
                >
                  Get Started 
                  <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.div>
            </div>
          </section>

          {/* Features Section */}
          <section className="container mx-auto px-4 py-32">
            <div className="grid md:grid-cols-3 gap-8 relative">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="p-8 rounded-2xl bg-neutral-900/40 border border-neutral-800 backdrop-blur-sm hover:border-neutral-700 transition-colors"
              >
                <h3 className="text-2xl font-bold text-white mb-3">Kanban Boards</h3>
                <p className="text-neutral-400 leading-relaxed">
                  Visualize your workflow with customizable kanban boards. Drag and drop tasks between columns.
                </p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="p-8 rounded-2xl bg-neutral-900/40 border border-neutral-800 backdrop-blur-sm hover:border-neutral-700 transition-colors"
              >
                <h3 className="text-2xl font-bold text-white mb-3">Team Collaboration</h3>
                <p className="text-neutral-400 leading-relaxed">
                  Work together with your team in real-time. Share projects, assign tasks, and track progress.
                </p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="p-8 rounded-2xl bg-neutral-900/40 border border-neutral-800 backdrop-blur-sm hover:border-neutral-700 transition-colors"
              >
                <h3 className="text-2xl font-bold text-white mb-3">Real-time Updates</h3>
                <p className="text-neutral-400 leading-relaxed">
                  See changes instantly as they happen. Never miss an update or modification to your projects.
                </p>
              </motion.div>
            </div>
          </section>

          {/* Warning Banner */}
          <section className="container mx-auto px-4 py-12">
              <motion.div
              initial={{ opacity: 0, scale: 0, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ 
              type: "spring",
              stiffness: 400,
              damping: 15
              }}
              className="bg-yellow-500/5 border border-yellow-500/10 rounded-2xl p-6 max-w-lg mx-auto text-center backdrop-blur-sm">
              <p className="text-yellow-500/80 font-medium mb-2">
                ⚠️ Developer Note
              </p>
              <p className="text-yellow-500/60 text-sm">
                This application is currently in active development. All data and access may be reset or removed without notice.
              </p>
            </motion.div>
          </section>
        </main>

        <SignInModal
          isOpen={isSignInModalOpen}
          onClose={() => setIsSignInModalOpen(false)}
        />
      </div>
    </React.Fragment>
  );
}
