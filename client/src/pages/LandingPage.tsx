import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LegoMinifig, { LegoMinifigProps } from "@/components/LegoMinifig";

export type AvatarId = 'builder' | 'cop' | 'bro' | 'suit' | 'rockstar' | 'spaceman';

interface AvatarDef {
  id: AvatarId;
  name: string;
  tagline: string;
  fig: LegoMinifigProps;
}

const AVATARS: AvatarDef[] = [
  {
    id: 'builder',
    name: 'Builder Brad',
    tagline: 'Bladder of steel',
    fig: {
      bodyColor: '#F57C00',
      legColor: '#C94B00',
      hairStyle: 'cap',
      capColor: '#F2CD37',
      hairColor: '#3D2000',
      faceStyle: 'happy',
      accessory: 'vest',
    },
  },
  {
    id: 'cop',
    name: 'Officer Mike',
    tagline: 'Law & order... room',
    fig: {
      bodyColor: '#14192B',
      legColor: '#14192B',
      hairStyle: 'cap',
      capColor: '#14192B',
      hairColor: '#1A1A1A',
      faceStyle: 'stern',
      accessory: 'badge',
    },
  },
  {
    id: 'bro',
    name: 'Chad Thundercock',
    tagline: 'Bro code enforcer',
    fig: {
      bodyColor: '#C91A09',
      legColor: '#14192B',
      hairStyle: 'short',
      hairColor: '#3D2000',
      faceStyle: 'happy',
      accessory: null,
    },
  },
  {
    id: 'suit',
    name: 'Corporate Carl',
    tagline: 'Next to me = fired',
    fig: {
      bodyColor: '#1A2F5A',
      legColor: '#14192B',
      hairStyle: 'slick',
      hairColor: '#7A7A7A',
      faceStyle: 'stern',
      accessory: 'tie',
    },
  },
  {
    id: 'rockstar',
    name: 'Rock Randy',
    tagline: 'Living on the edge',
    fig: {
      bodyColor: '#6B2FAB',
      legColor: '#14192B',
      hairStyle: 'spiky',
      hairColor: '#111111',
      faceStyle: 'happy',
      accessory: null,
    },
  },
  {
    id: 'spaceman',
    name: 'Space Steve',
    tagline: 'Zero-G bathroom pro',
    fig: {
      bodyColor: '#D8D8D8',
      legColor: '#888888',
      hairStyle: 'none',
      hairColor: '#111',
      faceStyle: 'happy',
      accessory: 'glasses',
    },
  },
];

// A row of Lego studs for decoration
const StudBar = ({ color, count = 18 }: { color: string; count?: number }) => (
  <div className="stud-row">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="stud" style={{ width: 18, height: 10, background: color }} />
    ))}
  </div>
);

interface LandingPageProps {
  onStart: (name: string, avatarId: AvatarId) => void;
}

const LandingPage = ({ onStart }: LandingPageProps) => {
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarId | null>(null);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [avatarError, setAvatarError] = useState('');

  const handleStart = () => {
    let ok = true;
    if (!name.trim()) { setNameError('Enter your name, mate!'); ok = false; }
    else setNameError('');
    if (!selectedAvatar) { setAvatarError('Pick a minifig first!'); ok = false; }
    else setAvatarError('');
    if (ok && selectedAvatar) onStart(name.trim(), selectedAvatar);
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ fontFamily: "'Bangers', cursive" }}
    >
      {/* ── YELLOW STUD TOP BAR ── */}
      <div className="lego-baseplate-yellow py-2">
        <StudBar color="#C8A400" />
      </div>

      {/* ── MAIN BLUE WALL AREA ── */}
      <div className="lego-wall flex-1 flex flex-col items-center justify-start py-8 px-4">

        {/* ── TITLE BRICK ── */}
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, type: 'spring', stiffness: 120 }}
          className="mb-6 text-center"
        >
          {/* Mini stud row on top of title brick */}
          <div className="flex justify-center gap-2 mb-[-4px]">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="stud" style={{ width: 22, height: 12, background: '#C8A400' }} />
            ))}
          </div>
          <div
            className="px-8 py-4"
            style={{
              background: '#F2CD37',
              border: '5px solid #C8A400',
              borderRadius: 6,
              boxShadow: '6px 6px 0 rgba(0,0,0,0.4)',
            }}
          >
            <h1
              className="text-5xl sm:text-6xl md:text-7xl tracking-widest leading-none"
              style={{ color: '#14192B', textShadow: '2px 2px 0 rgba(255,255,255,0.25)' }}
            >
              🚽 URINAL<br/>PROTOCOL
            </h1>
          </div>
          <div
            className="mt-[-4px] py-2 px-6"
            style={{
              background: '#C91A09',
              border: '4px solid #900012',
              borderRadius: 4,
              boxShadow: '5px 5px 0 rgba(0,0,0,0.4)',
              display: 'inline-block',
            }}
          >
            <p className="text-lg sm:text-xl tracking-widest text-white">
              💦 250 LEVELS OF BATHROOM ETIQUETTE 💦
            </p>
          </div>
        </motion.div>

        {/* ── MAIN CONTENT CARD ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-3xl"
        >
          <div
            className="lego-card p-6"
            style={{ background: '#F4F4F4' }}
          >

            {/* ── PICK YOUR MINIFIG ── */}
            <div
              className="text-center py-2 px-4 mb-4"
              style={{
                background: '#0055BF',
                border: '3px solid #003D8F',
                borderRadius: 4,
                boxShadow: '4px 4px 0 rgba(0,0,0,0.3)',
              }}
            >
              <h2 className="text-2xl sm:text-3xl text-white tracking-widest">
                🧱 PICK YOUR MINIFIG 🧱
              </h2>
              <p className="text-sm text-blue-200 tracking-wide" style={{ fontFamily: 'sans-serif' }}>
                (Men only — it's a urinal game 😅)
              </p>
            </div>

            {avatarError && (
              <p className="text-red-500 text-center text-base mb-2" style={{ fontFamily: 'sans-serif' }}>
                ⚠️ {avatarError}
              </p>
            )}

            {/* Avatar grid */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
              {AVATARS.map((av, i) => (
                <motion.div
                  key={av.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                  whileHover={{ y: -6, scale: 1.06 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => { setSelectedAvatar(av.id); setAvatarError(''); }}
                  className={`cursor-pointer p-2 flex flex-col items-center rounded transition-all ${
                    selectedAvatar === av.id ? 'lego-card-selected' : 'lego-card'
                  }`}
                  style={{
                    background: selectedAvatar === av.id ? '#FFFDE7' : '#FFFFFF',
                  }}
                >
                  {/* Lego minifig — large */}
                  <LegoMinifig
                    {...av.fig}
                    size="w-[52px] h-[110px] sm:w-[58px] sm:h-[126px]"
                    swayDelay={i * 0.15}
                  />
                  <div
                    className="mt-2 text-center text-xs leading-tight"
                    style={{ fontFamily: 'sans-serif', fontWeight: 700 }}
                  >
                    {av.name}
                  </div>
                  <div
                    className="text-[9px] text-gray-400 text-center leading-tight mt-[2px]"
                    style={{ fontFamily: 'sans-serif' }}
                  >
                    {av.tagline}
                  </div>
                  {selectedAvatar === av.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="mt-1 text-sm"
                    >
                      ✅
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>

            {/* ── NAME INPUT ── */}
            <div
              className="py-2 px-4 mb-4"
              style={{
                background: '#F2CD37',
                border: '3px solid #C8A400',
                borderRadius: 4,
                boxShadow: '4px 4px 0 rgba(0,0,0,0.3)',
              }}
            >
              <h2 className="text-2xl tracking-widest text-[#14192B] mb-2 text-center">
                👤 YOUR CODENAME
              </h2>
              <input
                className="lego-input w-full text-center bg-white py-3 px-4 outline-none"
                style={{ color: '#14192B' }}
                placeholder="Enter your name..."
                maxLength={14}
                value={name}
                onChange={e => { setName(e.target.value); setNameError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleStart()}
              />
              {nameError && (
                <p className="text-red-600 text-center text-sm mt-1" style={{ fontFamily: 'sans-serif' }}>
                  ⚠️ {nameError}
                </p>
              )}
            </div>

            {/* ── START BUTTON ── */}
            <motion.button
              whileHover={{ y: -3, scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleStart}
              className="lego-btn w-full py-4 text-3xl tracking-widest text-[#14192B]"
              style={{
                background: '#237841',
                color: '#FFFFFF',
                boxShadow: '5px 5px 0 rgba(0,0,0,0.4)',
              }}
            >
              🚀 START GAME! 🚀
            </motion.button>

            {/* Rules */}
            <div
              className="mt-4 p-3 grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm"
              style={{
                background: '#EEEEEE',
                border: '2px solid #CCCCCC',
                borderRadius: 4,
                fontFamily: 'sans-serif',
              }}
            >
              {[
                ['🎯', 'Pick the optimal urinal each level'],
                ['🙅', 'Never stand next to others if avoidable'],
                ['👔', 'Never stand next to your Boss'],
                ['👀', 'Avoid The Perv\'s creepy gaze'],
                ['🧹', 'Skip unclean urinals'],
                ['🤐', '"Hold It In" when all options are terrible'],
                ['❤️', '3 lives — choose wisely'],
                ['🏆', 'Complete 250 levels to become PISSMASTER'],
              ].map(([icon, rule], i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span>{icon}</span>
                  <span className="text-gray-600">{rule}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── RED STUD BOTTOM BAR ── */}
      <div className="lego-baseplate-red py-2">
        <StudBar color="#900012" />
      </div>
    </div>
  );
};

export default LandingPage;
