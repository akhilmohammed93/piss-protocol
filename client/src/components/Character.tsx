import { useMemo } from "react";
import { CharacterType } from "./CharacterSelection";
import LegoMinifig from "./LegoMinifig";

interface CharacterProps {
  type?: CharacterType;
  isPlayer?: boolean;
  isWalking?: boolean;
  position?: number;
}

// Map avatar type → Lego fig props
const TYPE_CONFIGS = {
  johnny:  { bodyColor: '#C91A09', hairColor: '#3D2000', hairStyle: 'short'  as const, accessory: null     },
  rick:    { bodyColor: '#0055BF', hairColor: '#6BB0D6', hairStyle: 'spiky'  as const, accessory: null     },
  kanye:   { bodyColor: '#237841', hairColor: '#111111', hairStyle: 'short'  as const, accessory: 'glasses' as const },
  saltbae: { bodyColor: '#F57C00', hairColor: '#3D2000', hairStyle: 'slick'  as const, accessory: null     },
};

// Fallback palette for random occupied characters (generic users)
const FALLBACK_BODIES = ['#C91A09','#0055BF','#237841','#F57C00','#6B2FAB','#14192B'];
const FALLBACK_LEGS   = ['#14192B','#14192B','#14192B','#14192B','#14192B','#0055BF'];
const FALLBACK_HAIRS  = ['#3D2000','#111111','#4A3000','#666666','#111111','#2A1500'];
const FALLBACK_STYLES = ['short','spiky','slick','short','mohawk','slick'] as const;

const Character = ({ type, isPlayer = false, isWalking = false }: CharacterProps) => {
  const idx = useMemo(() => Math.floor(Math.random() * FALLBACK_BODIES.length), []);

  const figProps = type
    ? { legColor: '#14192B', ...TYPE_CONFIGS[type] }
    : {
        bodyColor: FALLBACK_BODIES[idx],
        legColor:  FALLBACK_LEGS[idx],
        hairColor: FALLBACK_HAIRS[idx],
        hairStyle: FALLBACK_STYLES[idx],
        accessory: null as null,
      };

  const delay = useMemo(() => Math.random() * 0.6, []);

  return (
    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-10">
      <LegoMinifig
        {...figProps}
        faceStyle={isPlayer ? 'happy' : 'happy'}
        isWalking={isWalking}
        swayDelay={delay}
        size="w-[44px] h-[97px] sm:w-[50px] sm:h-[110px] md:w-[56px] md:h-[123px]"
      />
    </div>
  );
};

export default Character;
