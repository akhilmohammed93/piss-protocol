import React from 'react';
import { motion } from 'framer-motion';

interface ActionButtonsProps {
  onReset: () => void;
  onNextLevel: () => void;
  showNextLevel: boolean;
  showRestart?: boolean;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  onReset,
  onNextLevel,
  showNextLevel,
  showRestart = false,
}) => {
  return (
    <div className="flex gap-2">
      {showRestart && (
        <motion.button
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 12 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={onReset}
          className="flex-1 pp-btn-primary pp-btn-hold"
          style={{ flex: '0 0 auto', padding: '12px 20px' }}
        >
          ↺ Restart
        </motion.button>
      )}

      <motion.button
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 12 }}
        whileHover={showNextLevel ? { scale: 1.02 } : {}}
        whileTap={showNextLevel ? { scale: 0.97 } : {}}
        onClick={showNextLevel ? onNextLevel : undefined}
        disabled={!showNextLevel}
        className={`pp-btn-primary ${showNextLevel ? 'pp-btn-success' : ''}`}
        style={{ flex: 1, padding: '14px 20px' }}
      >
        Next Level →
      </motion.button>
    </div>
  );
};

export default ActionButtons;
