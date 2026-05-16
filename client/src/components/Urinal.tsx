import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface UrinalProps {
  index: number;
  isOccupied: boolean;
  isSelected: boolean;
  totalUrinals: number;
  onClick: (index: number) => void;
  isBoss?: boolean;
  isUnclean?: boolean;
}

// A single Lego stud element
const Stud = ({ cx, fill = '#F0F0F0', stroke = '#D0D0D0' }: { cx: number; fill?: string; stroke?: string }) => (
  <ellipse cx={cx} cy={0} rx={6} ry={3} fill={fill} stroke={stroke} strokeWidth="0.8"/>
);

const Urinal = ({ index, isOccupied, isSelected, totalUrinals, onClick, isBoss = false, isUnclean = false }: UrinalProps) => {
  const sizeClass = totalUrinals > 5
    ? 'w-[62px] h-[96px] sm:w-[72px] sm:h-[112px] md:w-[82px] md:h-[128px]'
    : 'w-[82px] h-[128px] sm:w-[92px] sm:h-[144px] md:w-[102px] md:h-[160px]';

  const isInteractive = !isOccupied && !isBoss;

  const [showPissStream, setShowPissStream] = useState(false);
  const [streamHeight, setStreamHeight] = useState(0);

  useEffect(() => {
    if (isSelected) {
      setShowPissStream(true);
      let h = 0;
      const id = setInterval(() => {
        h += 5;
        if (h > 65) {
          clearInterval(id);
          setTimeout(() => setShowPissStream(false), 2000);
        } else {
          setStreamHeight(h);
        }
      }, 100);
      return () => clearInterval(id);
    } else {
      setShowPissStream(false);
      setStreamHeight(0);
    }
  }, [isSelected]);

  // Glow colour based on state
  const glowFilter = isSelected
    ? 'drop-shadow(0 0 8px rgba(91,124,247,0.90))'
    : isBoss
    ? 'drop-shadow(0 0 6px rgba(26,47,90,0.70))'
    : isUnclean
    ? 'drop-shadow(0 0 5px rgba(245,200,66,0.55))'
    : undefined;

  const tileStateClass = isSelected
    ? 'selected'
    : isUnclean
    ? 'danger'
    : isBoss
    ? 'boss-urinal'
    : isOccupied
    ? 'occupied'
    : '';

  return (
    <motion.div
      id={`urinal-${index}`}
      className={`relative pp-urinal-tile ${tileStateClass} ${sizeClass} ${isInteractive ? 'cursor-pointer' : 'cursor-default'}`}
      whileHover={isInteractive ? { y: -4, scale: 1.04 } : {}}
      animate={isSelected ? { y: -4 } : {}}
      onClick={() => isInteractive && onClick(index)}
      style={{ filter: glowFilter, transition: 'filter 0.3s ease' }}
    >
      {/* Number badge */}
      <div className="absolute top-1 left-1 z-10 w-4 h-4 rounded-sm flex items-center justify-center text-[8px] font-bold"
        style={{ background: '#F2CD37', border: '1px solid #C8A500', color: '#14192B' }}>
        {index + 1}
      </div>

      {/* Selected highlight */}
      {isSelected && (
        <motion.div
          className="absolute inset-0 rounded-sm z-20 pointer-events-none"
          animate={{ boxShadow: ['0 0 0px #06D6A0', '0 0 10px #06D6A0', '0 0 0px #06D6A0'] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* ─── LEGO BRICK URINAL SVG ─── */}
      <svg viewBox="0 0 100 160" className="w-full h-full">
        <defs>
          <linearGradient id={`brickGrad${index}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#E8E8E8"/>
            <stop offset="40%"  stopColor="#FFFFFF"/>
            <stop offset="100%" stopColor="#D8D8D8"/>
          </linearGradient>
          {isUnclean && (
            <linearGradient id={`uncleanGrad${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="rgba(200,165,0,0.25)"/>
              <stop offset="100%" stopColor="rgba(180,140,0,0.15)"/>
            </linearGradient>
          )}
        </defs>

        {/* ── WALL PIPE ── */}
        <rect x="43" y="0"  width="14" height="16" rx="3"
          fill="#B0B0B0" stroke="#909090" strokeWidth="1.5"/>
        {/* Pipe elbow */}
        <rect x="35" y="12" width="30" height="10" rx="3"
          fill="#B0B0B0" stroke="#909090" strokeWidth="1.5"/>

        {/* ── TOP TANK BRICK (with 2 studs) ── */}
        {/* Studs on top */}
        <g transform="translate(0, 20)">
          <Stud cx={36}/><Stud cx={64}/>
        </g>
        <rect x="22" y="20" width="56" height="16" rx="2"
          fill={`url(#brickGrad${index})`} stroke="#C8C8C8" strokeWidth="1.5"/>

        {/* ── BODY BRICK 1 (3 studs) ── */}
        <g transform="translate(0, 34)">
          <Stud cx={30}/><Stud cx={50}/><Stud cx={70}/>
        </g>
        <rect x="16" y="34" width="68" height="18" rx="2"
          fill={`url(#brickGrad${index})`} stroke="#C8C8C8" strokeWidth="1.5"/>

        {/* ── BODY BRICK 2 (3 studs) ── */}
        <g transform="translate(0, 50)">
          <Stud cx={30}/><Stud cx={50}/><Stud cx={70}/>
        </g>
        <rect x="16" y="50" width="68" height="18" rx="2"
          fill={`url(#brickGrad${index})`} stroke="#C8C8C8" strokeWidth="1.5"/>

        {/* ── BOWL SECTION (2 bricks tall) ── */}
        <g transform="translate(0, 66)">
          <Stud cx={28}/><Stud cx={50}/><Stud cx={72}/>
        </g>
        <rect x="16" y="66" width="68" height="20" rx="2"
          fill={`url(#brickGrad${index})`} stroke="#C8C8C8" strokeWidth="1.5"/>

        {/* Brick seam */}
        <line x1="16" y1="78" x2="84" y2="78" stroke="#C0C0C0" strokeWidth="1.5" strokeDasharray="4 3"/>

        <rect x="16" y="86" width="68" height="30" rx="2"
          fill={`url(#brickGrad${index})`} stroke="#C8C8C8" strokeWidth="1.5"/>

        {/* Bowl interior (oval basin) */}
        <ellipse cx="50" cy="102" rx="25" ry="14"
          fill={isUnclean ? "#D4C882" : "#D8EFFA"}
          stroke={isUnclean ? "#B8A640" : "#A8CCE0"} strokeWidth="1.5"/>

        {/* Water shimmer */}
        {!isUnclean && (
          <motion.ellipse cx="50" cy="110" rx="16" ry="5"
            fill="rgba(100,190,240,0.4)"
            animate={{ ry: [5, 6, 5], opacity: [0.4, 0.6, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* ── DRAIN BRICK ── */}
        <rect x="28" y="116" width="44" height="14" rx="2"
          fill="#E0E0E0" stroke="#C0C0C0" strokeWidth="1.5"/>
        <circle cx="50" cy="123" r="6"   fill="#C8C8C8" stroke="#A8A8A8" strokeWidth="1.5"/>
        <circle cx="50" cy="123" r="3.5" fill="#B0B0B0"/>
        {/* Drain cross slots */}
        <line x1="46" y1="123" x2="54" y2="123" stroke="#909090" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="50" y1="119" x2="50" y2="127" stroke="#909090" strokeWidth="1.5" strokeLinecap="round"/>

        {/* ── FLUSH BUTTON (Lego 1×1 brick on side) ── */}
        <rect x="72" y="24" width="10" height="7" rx="2"
          fill="#C91A09" stroke="#900012" strokeWidth="1"/>
        <ellipse cx="77" cy="24" rx="3" ry="1.5" fill="#E02020" stroke="#900012" strokeWidth="0.8"/>

        {/* ── UNCLEAN OVERLAY ── */}
        {isUnclean && (
          <>
            <motion.rect x="16" y="34" width="68" height="82" rx="2"
              fill={`url(#uncleanGrad${index})`}
              animate={{ opacity: [0.4, 0.6, 0.4] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            {/* Stain blobs */}
            <motion.ellipse cx="38" cy="72" rx="8" ry="5"
              fill="rgba(190,155,0,0.35)"
              animate={{ opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
            <motion.ellipse cx="65" cy="85" rx="6" ry="4"
              fill="rgba(185,148,0,0.3)"
              animate={{ opacity: [0.25, 0.45, 0.25] }}
              transition={{ duration: 3.5, repeat: Infinity }}
            />
            {/* Drip */}
            <motion.circle cx="50" cy="108" r="2"
              fill="rgba(200,165,0,0.7)"
              animate={{ cy: [108, 120, 120], opacity: [0.7, 0.9, 0], r: [2, 2.5, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 2, ease: 'easeIn' }}
            />
            {/* Warning stud - yellow Lego 1×1 */}
            <rect x="42" y="54" width="16" height="10" rx="2"
              fill="#F2CD37" stroke="#C8A500" strokeWidth="1"/>
            <ellipse cx="50" cy="54" rx="4" ry="2" fill="#FFE566" stroke="#C8A500" strokeWidth="0.8"/>
            <text x="50" y="62" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#7A6000">!</text>
            {/* Flies */}
            <motion.circle cx="62" cy="70" r="1.2" fill="rgba(30,30,30,0.7)"
              animate={{ cx: [62,65,61,63,62], cy: [70,72,68,71,70] }}
              transition={{ duration: 1.8, repeat: Infinity, repeatType: 'reverse' }}
            />
            <motion.circle cx="38" cy="80" r="1" fill="rgba(30,30,30,0.7)"
              animate={{ cx: [38,35,40,37,38], cy: [80,82,78,81,80] }}
              transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse', delay: 0.4 }}
            />
            {/* Smell lines */}
            {[0, 1, 2].map(i => (
              <motion.path key={i}
                d={`M ${36 + i*14} 52 Q ${32 + i*14} 46 ${36 + i*14} 40 Q ${40 + i*14} 34 ${36 + i*14} 28`}
                fill="none" stroke="rgba(140,130,0,0.3)" strokeWidth="1.5" strokeDasharray="2 2"
                animate={{ opacity: [0, 0.4, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: i * 0.6 }}
              />
            ))}
          </>
        )}

        {/* ── PISSING STREAM ── */}
        <AnimatePresence>
          {showPissStream && (
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}>
              <motion.path
                d={`M 50 55 Q 45 ${55 + streamHeight * 0.3} 50 ${55 + streamHeight * 0.6} Q 55 ${55 + streamHeight * 0.9} 50 ${55 + streamHeight}`}
                fill="none" stroke="rgba(255,240,100,0.85)" strokeWidth="4"
                strokeLinecap="round"
                animate={{
                  d: [
                    `M 50 55 Q 45 ${55 + streamHeight*0.3} 50 ${55 + streamHeight*0.6} Q 55 ${55 + streamHeight*0.9} 50 ${55 + streamHeight}`,
                    `M 50 55 Q 55 ${55 + streamHeight*0.3} 50 ${55 + streamHeight*0.6} Q 45 ${55 + streamHeight*0.9} 50 ${55 + streamHeight}`
                  ]
                }}
                transition={{ duration: 0.4, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
              />
              {/* Splash drops at bottom */}
              {streamHeight > 50 && (
                <g>
                  {[-8, -3, 3, 8].map((offset, i) => (
                    <motion.circle key={i}
                      cx={50 + offset} cy={55 + streamHeight}
                      r={1.5 + (i % 2)}
                      fill="rgba(180,230,255,0.8)"
                      animate={{ cy: [55 + streamHeight, 55 + streamHeight - 6 - i*2, 55 + streamHeight + 4], opacity: [0.8, 0.9, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.12 }}
                    />
                  ))}
                </g>
              )}
            </motion.g>
          )}
        </AnimatePresence>
      </svg>
    </motion.div>
  );
};

export default Urinal;
