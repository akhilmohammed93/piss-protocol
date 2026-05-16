import React from 'react';
import { motion } from 'framer-motion';

interface LivesIndicatorProps {
  lives: number;
  maxLives: number;
}

const LivesIndicator: React.FC<LivesIndicatorProps> = ({ lives, maxLives }) => {
  return (
    <div className="flex items-center gap-2">
      <span className="pp-stat-label">Lives</span>
      <div className="flex gap-1.5">
        {Array.from({ length: maxLives }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.08, type: 'spring', stiffness: 500, damping: 14 }}
            className={`pp-life ${i >= lives ? 'lost' : ''}`}
          />
        ))}
      </div>
    </div>
  );
};

export default LivesIndicator;
