import { motion, AnimatePresence } from "framer-motion";
import { FiX } from "react-icons/fi";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const Modal = ({ isOpen, onClose, children }: ModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 mt-16 flex items-start justify-center bg-black/60 py-3 overflow-y-auto z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.5 }}
            className="relative w-full max-w-xs sm:max-w-md rounded-lg shadow-xl p-3 my-auto"
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors"
            >
              <FiX size={20} />
            </button>
            <div className="text-[var(--text)] [&_label]:text-[var(--text-secondary)] [&_p]:text-[var(--text)] [&_h2]:text-[var(--text)]">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
