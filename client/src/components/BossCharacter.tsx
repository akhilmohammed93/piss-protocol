import React from 'react';
import { motion } from 'framer-motion';
import LegoMinifig from './LegoMinifig';

interface BossCharacterProps {
  position?: number;
  isAngry?: boolean;
}

const BossCharacter: React.FC<BossCharacterProps> = ({ isAngry = false }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-[88%] z-20"
    >
      <LegoMinifig
        bodyColor="#1A2F5A"
        legColor="#14192B"
        hairStyle="slick"
        hairColor="#7A7A7A"
        faceStyle="stern"
        accessory="tie"
        swayDelay={0.1}
        isWalking={false}
        size="w-[44px] h-[97px] sm:w-[50px] sm:h-[110px] md:w-[56px] md:h-[123px]"
      />

      {/* 👔 BOSS label badge */}
      <div
        className="absolute top-0 right-[-32px] text-[9px] font-bold px-1 py-[1px] rounded"
        style={{
          background: '#C91A09', color: 'white',
          border: '1.5px solid #900012',
          fontFamily: 'sans-serif',
          whiteSpace: 'nowrap',
        }}
      >
        👔 BOSS
      </div>

      {/* Speech bubble when angry */}
      {isAngry && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-[-34px] right-[-90px] bg-white rounded p-2 text-[10px] font-bold shadow-lg w-32 z-30"
          style={{ border: '2.5px solid #C0C0C0', boxShadow: '3px 3px 0 rgba(0,0,0,0.2)', fontFamily: 'sans-serif' }}
        >
          <div className="absolute bottom-[-12px] left-3 w-0 h-0
              border-l-[6px] border-l-transparent
              border-t-[8px] border-t-white
              border-r-[6px] border-r-transparent"/>
          🧱 Back off! Personal space!
        </motion.div>
      )}
    </motion.div>
  );
};

export default BossCharacter;
