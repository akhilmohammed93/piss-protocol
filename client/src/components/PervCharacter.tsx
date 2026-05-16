import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import LegoMinifig from './LegoMinifig';

interface PervCharacterProps {
  position?: number;
  isActive?: boolean;
}

const PervCharacter: React.FC<PervCharacterProps> = ({ isActive = false }) => {
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 200);
    }, 900 + Math.random() * 1200);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0, rotate: isActive ? [0, 2, -2, 2, 0] : 0 }}
      transition={{ duration: isActive ? 0.3 : 0.3, repeat: isActive ? Infinity : 0 }}
      className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-[88%] z-20"
    >
      {/* Sweat drop when active */}
      {isActive && (
        <motion.div
          className="absolute right-[-4px] top-2 text-sm select-none"
          animate={{ y: [0, 8, 0], opacity: [0, 1, 0] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          💧
        </motion.div>
      )}

      <LegoMinifig
        bodyColor="#C91A09"
        legColor="#14192B"
        hairStyle="short"
        hairColor="#5C3D11"
        faceStyle="creepy"
        accessory={null}
        swayDelay={0.2}
        isWalking={false}
        size="w-[44px] h-[97px] sm:w-[50px] sm:h-[110px] md:w-[56px] md:h-[123px]"
      />

      {/* 👀 PERV label badge */}
      <div
        className="absolute top-0 right-[-32px] text-[9px] font-bold px-1 py-[1px] rounded"
        style={{
          background: '#8B0000', color: 'white',
          border: '1.5px solid #600000',
          fontFamily: 'sans-serif',
          whiteSpace: 'nowrap',
        }}
      >
        👀 PERV
      </div>

      {/* Speech bubble when active */}
      {isActive && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-[-30px] right-[-95px] bg-white rounded p-2 text-[10px] font-bold shadow-lg w-36 z-30"
          style={{ border: '2.5px solid #C0C0C0', boxShadow: '3px 3px 0 rgba(0,0,0,0.2)', fontFamily: 'sans-serif' }}
        >
          <div className="absolute bottom-[-12px] left-3 w-0 h-0
              border-l-[6px] border-l-transparent
              border-t-[8px] border-t-white
              border-r-[6px] border-r-transparent"/>
          👀 *uncomfortable staring*
        </motion.div>
      )}
    </motion.div>
  );
};

export default PervCharacter;
