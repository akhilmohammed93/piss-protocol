import React from 'react';
import { motion } from 'framer-motion';

// Renders a single Lego stud row for decoration
const StudRow = ({ count = 8, color = '#F2CD37' }: { count?: number; color?: string }) => (
  <div className="flex justify-center gap-2 mb-1">
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        style={{
          width: 18, height: 10, borderRadius: '50%',
          background: color,
          border: '2px solid rgba(0,0,0,0.2)',
          boxShadow: 'inset 0 2px 3px rgba(255,255,255,0.4), 0 2px 3px rgba(0,0,0,0.2)',
        }}
      />
    ))}
  </div>
);

const Header = () => (
  <motion.header
    initial={{ y: -30, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ duration: 0.6, type: 'spring', stiffness: 120 }}
    className="mb-6 text-center"
  >
    {/* Lego stud decorations above */}
    <StudRow count={10} color="#F2CD37" />

    {/* Main header brick */}
    <div
      className="inline-block px-6 py-3 mb-2"
      style={{
        background: '#F2CD37',
        border: '4px solid #C8A500',
        borderRadius: 6,
        boxShadow: '5px 5px 0 rgba(0,0,0,0.3)',
      }}
    >
      <h1
        className="text-4xl sm:text-5xl md:text-6xl font-['Bangers'] drop-shadow-sm tracking-widest"
        style={{ color: '#14192B', textShadow: '2px 2px 0 rgba(255,255,255,0.3)' }}
      >
        🚽 URINAL PROTOCOL 🚽
      </h1>
    </div>

    {/* Sub-brick */}
    <div
      className="inline-block px-4 py-1"
      style={{
        background: '#C91A09',
        border: '3px solid #900012',
        borderRadius: 4,
        boxShadow: '4px 4px 0 rgba(0,0,0,0.25)',
      }}
    >
      <p
        className="text-base sm:text-lg font-['Bangers'] tracking-widest"
        style={{ color: '#FFFFFF', textShadow: '1px 1px 0 rgba(0,0,0,0.3)' }}
      >
        💦 MASTER THE ART OF BATHROOM ETIQUETTE 💦
      </p>
    </div>

    {/* Lego stud decorations below */}
    <div className="mt-2">
      <StudRow count={10} color="#C91A09" />
    </div>
  </motion.header>
);

export default Header;
