import { motion } from "framer-motion";
import { type ReactNode } from "react";

export interface LegoMinifigProps {
  bodyColor?: string;
  legColor?: string;
  hairColor?: string;
  hairStyle?: 'short' | 'spiky' | 'slick' | 'cap' | 'none' | 'mohawk';
  capColor?: string;
  faceStyle?: 'happy' | 'stern' | 'creepy';
  accessory?: 'glasses' | 'tie' | 'badge' | 'vest' | null;
  torsoDetail?: ReactNode;
  isWalking?: boolean;
  swayDelay?: number;
  size?: string; // tailwind w/h class e.g. "w-[60px] h-[132px]"
}

const YELLOW = '#F2CD37';
const YELLOW_D = '#C8A400';

const LegoMinifig = ({
  bodyColor = '#0055BF',
  legColor = '#14192B',
  hairColor = '#3D2000',
  hairStyle = 'short',
  capColor = '#F57C00',
  faceStyle = 'happy',
  accessory = null,
  torsoDetail,
  isWalking = false,
  swayDelay = 0,
  size = 'w-[54px] h-[118px]',
}: LegoMinifigProps) => {

  const hipColor = legColor;

  const smile =
    faceStyle === 'stern'  ? 'M35 53 Q50 55 65 53' :
    faceStyle === 'creepy' ? 'M30 55 Q50 68 70 55' :
                             'M34 53 Q50 63 66 53';

  const eyeL = faceStyle === 'stern'  ? [35, 38] :
               faceStyle === 'creepy' ? [34, 40] : [35, 38];
  const eyeR = faceStyle === 'stern'  ? [65, 38] :
               faceStyle === 'creepy' ? [66, 40] : [65, 38];

  const eyebrowL = faceStyle === 'stern'  ? 'M27 30 L42 34' :
                   faceStyle === 'happy'  ? 'M29 30 L42 33' : 'M26 28 L42 35';
  const eyebrowR = faceStyle === 'stern'  ? 'M73 30 L58 34' :
                   faceStyle === 'happy'  ? 'M71 30 L58 33' : 'M74 28 L58 35';

  return (
    <motion.div
      className={`relative ${size}`}
      animate={{
        y:      isWalking ? [0, -5, 0]     : [0, -2, 0],
        rotate: isWalking ? [0, 1.5, 0, -1.5, 0] : [0, 0.8, 0, -0.8, 0],
      }}
      transition={{
        duration: isWalking ? 0.65 : 2.8,
        ease: 'easeInOut',
        repeat: Infinity,
        delay: swayDelay,
      }}
    >
      <svg viewBox="0 0 100 210" className="w-full h-full">
        {/* ─── HAIR (rendered first so head clips bottom) ─── */}
        {hairStyle === 'short' && (
          <path d={`M19 38 Q18 6 50 4 Q82 6 81 38`} fill={hairColor}/>
        )}
        {hairStyle === 'slick' && (
          <path d="M19 35 L19 20 Q28 6 50 4 Q72 6 81 20 L81 35 Q68 22 50 21 Q32 22 19 35 Z" fill={hairColor}/>
        )}
        {hairStyle === 'mohawk' && (
          <rect x="42" y="1" width="16" height="24" rx="4" fill={hairColor}/>
        )}
        {hairStyle === 'spiky' && (
          <>
            <path d="M24 30 L32 5 L40 26" fill={hairColor}/>
            <path d="M40 26 L50 2 L60 26" fill={hairColor}/>
            <path d="M60 26 L68 5 L76 30" fill={hairColor}/>
          </>
        )}
        {hairStyle === 'cap' && (
          <>
            {/* Dome */}
            <ellipse cx="50" cy="19" rx="34" ry="20" fill={capColor}/>
            {/* Brim */}
            <rect x="8" y="24" width="84" height="14" rx="4" fill={capColor} stroke="rgba(0,0,0,0.2)" strokeWidth="1"/>
            {/* Cap stud */}
            <ellipse cx="50" cy="1" rx="9" ry="4.5" fill={capColor} stroke="rgba(0,0,0,0.2)" strokeWidth="1"/>
            <rect x="41" y="1" width="18" height="10" rx="1" fill={capColor}/>
          </>
        )}

        {/* ─── HEAD STUD ─── */}
        <ellipse cx="50" cy="15" rx="13" ry="6" fill={YELLOW_D}/>
        <rect x="37" y="15" width="26" height="9" rx="1" fill={YELLOW}/>

        {/* ─── HEAD BLOCK ─── */}
        <rect x="19" y="22" width="62" height="46" rx="9" fill={YELLOW} stroke={YELLOW_D} strokeWidth="1.5"/>

        {/* ─── FACE ─── */}
        {/* Eyebrows */}
        <path d={eyebrowL} fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round"/>
        <path d={eyebrowR} fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round"/>
        {/* Eyes */}
        <circle cx={eyeL[0]} cy={eyeL[1]} r="6" fill="white"/>
        <circle cx={eyeR[0]} cy={eyeR[1]} r="6" fill="white"/>
        <circle cx={eyeL[0]} cy={eyeL[1]+1} r="2.8" fill="#111"/>
        <circle cx={eyeR[0]} cy={eyeR[1]+1} r="2.8" fill="#111"/>
        {/* Smile */}
        <path d={smile} fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round"/>
        {/* Accessory: glasses */}
        {accessory === 'glasses' && (
          <>
            <rect x="21" y="32" width="24" height="14" rx="5" fill="none" stroke="#333" strokeWidth="2.5"/>
            <rect x="55" y="32" width="24" height="14" rx="5" fill="none" stroke="#333" strokeWidth="2.5"/>
            <line x1="45" y1="39" x2="55" y2="39" stroke="#333" strokeWidth="2"/>
          </>
        )}

        {/* ─── NECK ─── */}
        <rect x="37" y="68" width="26" height="9" rx="2" fill={YELLOW}/>

        {/* ─── TORSO ─── */}
        <rect x="16" y="75" width="68" height="56" rx="4" fill={bodyColor} stroke="rgba(0,0,0,0.22)" strokeWidth="1.5"/>
        {/* Torso detail (tie, badge, etc.) */}
        {accessory === 'tie' && (
          <>
            <path d="M46 75 L50 88 L54 75 Z" fill="white"/>
            <path d="M46 88 L44 120 L50 128 L56 120 L54 88 Z" fill="#C91A09" stroke="#900012" strokeWidth="0.5"/>
          </>
        )}
        {accessory === 'badge' && (
          <rect x="26" y="82" width="18" height="13" rx="2" fill="#F2CD37" stroke="#C8A400" strokeWidth="1"/>
        )}
        {accessory === 'vest' && (
          <>
            <rect x="16" y="75" width="24" height="56" rx="4" fill={capColor} stroke="rgba(0,0,0,0.2)" strokeWidth="1"/>
            <rect x="60" y="75" width="24" height="56" rx="4" fill={capColor} stroke="rgba(0,0,0,0.2)" strokeWidth="1"/>
            {/* Vest stripes */}
            {[0,1,2].map(i => (
              <line key={i} x1="17" y1={84+i*10} x2="38" y2={84+i*10} stroke="rgba(0,0,0,0.15)" strokeWidth="2"/>
            ))}
          </>
        )}
        {torsoDetail}

        {/* ─── ARM CONNECTOR BUMPS ─── */}
        <rect x="5"  y="77" width="13" height="11" rx="5" fill={bodyColor}/>
        <rect x="82" y="77" width="13" height="11" rx="5" fill={bodyColor}/>
        {/* ─── ARMS ─── */}
        <motion.rect
          x="5" y="86" width="12" height="38" rx="6"
          fill={bodyColor} stroke="rgba(0,0,0,0.15)" strokeWidth="1"
          animate={isWalking ? { rotate: [10, -10, 10] } : {}}
          style={{ transformOrigin: '11px 86px' }}
          transition={{ duration: 0.65, repeat: Infinity, ease: 'easeInOut', delay: swayDelay+0.3 }}
        />
        <motion.rect
          x="83" y="86" width="12" height="38" rx="6"
          fill={bodyColor} stroke="rgba(0,0,0,0.15)" strokeWidth="1"
          animate={isWalking ? { rotate: [-10, 10, -10] } : {}}
          style={{ transformOrigin: '89px 86px' }}
          transition={{ duration: 0.65, repeat: Infinity, ease: 'easeInOut', delay: swayDelay }}
        />
        {/* ─── HANDS ─── */}
        <circle cx="11"  cy="128" r="9" fill={YELLOW} stroke={YELLOW_D} strokeWidth="1.5"/>
        <circle cx="89"  cy="128" r="9" fill={YELLOW} stroke={YELLOW_D} strokeWidth="1.5"/>

        {/* ─── HIP ─── */}
        <rect x="18" y="131" width="64" height="18" rx="3" fill={hipColor} stroke="rgba(0,0,0,0.25)" strokeWidth="1"/>
        {/* Hip stud detail */}
        <circle cx="36" cy="140" r="4" fill="rgba(0,0,0,0.12)"/>
        <circle cx="64" cy="140" r="4" fill="rgba(0,0,0,0.12)"/>

        {/* ─── LEGS ─── */}
        <motion.rect
          x="18" y="148" width="28" height="44" rx="3"
          fill={legColor} stroke="rgba(0,0,0,0.25)" strokeWidth="1"
          animate={isWalking ? { rotate: [-14, 14, -14] } : {}}
          style={{ transformOrigin: '32px 148px' }}
          transition={{ duration: 0.65, repeat: Infinity, ease: 'easeInOut', delay: swayDelay }}
        />
        <motion.rect
          x="54" y="148" width="28" height="44" rx="3"
          fill={legColor} stroke="rgba(0,0,0,0.25)" strokeWidth="1"
          animate={isWalking ? { rotate: [14, -14, 14] } : {}}
          style={{ transformOrigin: '68px 148px' }}
          transition={{ duration: 0.65, repeat: Infinity, ease: 'easeInOut', delay: swayDelay+0.325 }}
        />
        {/* ─── FEET ─── */}
        <rect x="13" y="186" width="35" height="14" rx="4" fill={legColor}/>
        <rect x="52" y="186" width="35" height="14" rx="4" fill={legColor}/>
      </svg>
    </motion.div>
  );
};

export default LegoMinifig;
