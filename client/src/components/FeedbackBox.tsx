import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FeedbackBoxProps {
  message: string;
  visible: boolean;
  isSuccess: boolean;
}

const FeedbackBox: React.FC<FeedbackBoxProps> = ({ message, visible, isSuccess }) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className={`mb-4 p-3 text-sm font-medium ${isSuccess ? 'pp-feedback-success' : 'pp-feedback-fail'}`}
        >
          <div className="flex items-start gap-2">
            <span className="text-lg leading-none mt-0.5" role="img" aria-hidden>
              {isSuccess ? '✓' : '✕'}
            </span>
            <div className="flex-1 leading-snug">{message}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FeedbackBox;
