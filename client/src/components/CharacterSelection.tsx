import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// Character types with names and image paths
export type CharacterType = "johnny" | "rick" | "kanye" | "saltbae";

interface CharacterOption {
  id: CharacterType;
  name: string;
  image: string;
}

const characters: CharacterOption[] = [
  {
    id: "johnny",
    name: "Johnny Bravo",
    image: "💪" // Using emoji temporarily, would use actual images in production
  },
  {
    id: "rick",
    name: "Rick",
    image: "🧪" // Using emoji temporarily
  },
  {
    id: "kanye",
    name: "Kanye",
    image: "🎤" // Using emoji temporarily
  },
  {
    id: "saltbae",
    name: "Salt Bae",
    image: "🧂" // Using emoji temporarily
  }
];

interface CharacterSelectionProps {
  onSelect: (character: CharacterType) => void;
}

const CharacterSelection = ({ onSelect }: CharacterSelectionProps) => {
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterType | null>(null);

  const handleSelect = (character: CharacterType) => {
    setSelectedCharacter(character);
  };

  const handleConfirm = () => {
    if (selectedCharacter) {
      onSelect(selectedCharacter);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="p-6 max-w-md mx-auto">
        <h2 className="text-2xl font-bold text-center mb-6">Choose Your Character</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          {characters.map((character) => (
            <motion.div
              key={character.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`p-4 rounded-lg cursor-pointer border-2 ${
                selectedCharacter === character.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200"
              }`}
              onClick={() => handleSelect(character.id)}
            >
              <div className="flex flex-col items-center">
                <div className="text-5xl mb-2">{character.image}</div>
                <div className="font-medium">{character.name}</div>
              </div>
            </motion.div>
          ))}
        </div>
        
        <Button 
          className="w-full" 
          disabled={!selectedCharacter}
          onClick={handleConfirm}
        >
          Confirm Selection
        </Button>
      </Card>
    </motion.div>
  );
};

export default CharacterSelection;