import React from 'react';
import { motion } from 'framer-motion';
import { X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface InstructionsPanelProps {
  onClose: () => void;
}

const InstructionsPanel: React.FC<InstructionsPanelProps> = ({ onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
    >
      <Card className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#4A6EE0]">Urinal Protocol: Game Rules</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-bold text-lg mb-2">Basic Rules:</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>Choose the most appropriate urinal based on bathroom etiquette.</li>
              <li>Avoid standing directly next to another person when possible.</li>
              <li>If all urinals are empty, don't choose the middle one.</li>
              <li>Consider both entry and exit paths when making your choice.</li>
              <li>Maintain maximum possible distance between yourself and others.</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-bold text-lg mb-2">Boss Character:</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>The boss character appears in gold with a red tie.</li>
              <li>NEVER choose a urinal adjacent to the boss! This will cost you a life.</li>
              <li>The boss appears more frequently in higher levels.</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-bold text-lg mb-2">Game Progression:</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>Complete 100 increasingly difficult levels.</li>
              <li>Higher levels have more urinals and more occupants.</li>
              <li>You have 3 lives - choosing incorrectly can lose points, but choosing next to the boss costs a life!</li>
              <li>Game ends when you run out of lives or complete all levels.</li>
              <li>Your score determines your position on the leaderboard.</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-bold text-lg mb-2">Scoring:</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>+10 points for each correct urinal choice.</li>
              <li>Bonus points for higher levels (+1 per 10 levels).</li>
              <li>-2 points for incorrect choices.</li>
              <li>Complete all 100 levels for maximum points!</li>
            </ul>
          </div>
        </div>
        
        <Button 
          onClick={onClose}
          className="w-full mt-6 bg-[#4A6EE0] hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors"
        >
          Got It!
        </Button>
      </Card>
    </motion.div>
  );
};

export default InstructionsPanel;