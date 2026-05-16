import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface PlayerNameFormProps {
  onSubmit: (name: string) => void;
}

const PlayerNameForm: React.FC<PlayerNameFormProps> = ({ onSubmit }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Enter your name to continue'); return; }
    setError('');
    onSubmit(name.trim());
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="w-full"
    >
      <div className="pp-card p-6 max-w-md mx-auto">
        {/* Logo / title */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🚽</div>
          <h1 className="text-2xl font-black mb-1" style={{ color: 'var(--pp-text)' }}>
            Piss Protocol
          </h1>
          <p className="text-sm" style={{ color: 'var(--pp-text-dim)' }}>
            Master bathroom etiquette. 500 levels of glory await.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="playerName"
              className="block text-xs font-bold uppercase tracking-widest mb-2"
              style={{ color: 'var(--pp-text-dim)' }}
            >
              Your Codename
            </label>
            <input
              id="playerName"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter name…"
              className="pp-input"
              maxLength={15}
              autoFocus
            />
            {error && (
              <p className="mt-1.5 text-xs font-semibold" style={{ color: 'var(--pp-red)' }}>
                {error}
              </p>
            )}
          </div>

          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="pp-btn-primary w-full"
          >
            Start Game →
          </motion.button>
        </form>

        {/* Rules */}
        <div className="mt-6 pt-5" style={{ borderTop: '1px solid var(--pp-border)' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--pp-text-dim)' }}>
            How to play
          </p>
          <ul className="space-y-1.5 text-sm" style={{ color: 'var(--pp-text-dim)' }}>
            <li>Pick the urinal that best follows bathroom etiquette</li>
            <li>Never stand next to an occupied urinal if avoidable</li>
            <li>Watch for special characters — each bends the rules</li>
            <li>3 lives · Gain a life every 10 correct picks</li>
            <li>Hold It In when every option is compromised</li>
          </ul>
        </div>
      </div>
    </motion.div>
  );
};

export default PlayerNameForm;
