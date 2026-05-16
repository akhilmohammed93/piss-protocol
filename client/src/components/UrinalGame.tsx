import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import LevelIndicator from "./LevelIndicator";
import InstructionsPanel from "./InstructionsPanel";
import Urinal from "./Urinal";
import FeedbackBox from "./FeedbackBox";
import ActionButtons from "./ActionButtons";
import LivesIndicator from "./LivesIndicator";
import PlayerNameForm from "./PlayerNameForm";
import Leaderboard from "./Leaderboard";
import CharacterDisplay from "./CharacterDisplay";
import BatchIntroScreen from "./BatchIntroScreen";
import { checkSelection } from "@/lib/gameRules";
import { type LevelData } from "@shared/levelGenerator";
import {
  evaluateHoldItIn,
  recordHoldItIn,
  resetHoldItInStreak,
  type LevelState,
} from "@/lib/ruleEngine";
import {
  buildGroupReactions,
  type GroupReaction,
  type CharacterType,
} from "@/lib/characterSystem";
import { apiRequest } from "@/lib/queryClient";
import { cacheHighscores, getCachedHighscores, cacheLevelBatch, getCachedLevelBatch } from "@/lib/offlineCache";
import { Highscore } from "@shared/schema";
import { useAudio } from "./AudioProvider";
import { createAnimation, AnimationPosition, injectAnimationStyles } from "./animations";

// Constants
const MAX_LIVES = 3;
const MAX_LEVEL = 500;
const TIMER_SECONDS = 30; // 30 seconds to make a decision

interface UrinalGameProps {
  initialPlayerName?: string;
  initialAvatarId?: string;
}

const UrinalGame = ({ initialPlayerName = '', initialAvatarId = 'bro' }: UrinalGameProps) => {
  // Get audio control functions from context
  const { playSound, toggleBgMusic, isMusicPlaying,
          startTimer, stopTimer } = useAudio();

  // Game phases — skip name-entry if player info was provided from landing page
  const [gamePhase, setGamePhase] = useState<'name-entry' | 'playing' | 'game-over' | 'leaderboard'>(
    initialPlayerName ? 'playing' : 'name-entry'
  );

  // Batch state
  const [currentBatch, setCurrentBatch] = useState(1);
  const [levelIndexInBatch, setLevelIndexInBatch] = useState(0); // 0–4 within the batch
  const [showBatchIntro, setShowBatchIntro] = useState(false);
  const [nextBatchNumber, setNextBatchNumber] = useState<number | null>(null);

  // Player information
  const [playerName, setPlayerName] = useState(initialPlayerName);

  // Animation states
  const [animationPosition, setAnimationPosition] = useState<AnimationPosition>({ x: 0, y: 0 });
  const gameContainerRef = useRef<HTMLDivElement>(null);

  // Inject animation styles when component mounts
  useEffect(() => {
    injectAnimationStyles();
  }, []);

  // Game state
  const [gameState, setGameState] = useState({
    currentLevel: 1,
    score: 0,
    maxLevel: MAX_LEVEL,
    selectedUrinal: null as number | null,
    levelComplete: false,
    lives: MAX_LIVES,
    playerName: initialPlayerName,
    gameOver: false,
    waitingForTurn: false, // Track if player is "holding it in"
    timerActive: false, // Track if timer is running
    isPissmaster: false,
    devMode: false, // Special developer testing mode
    devFeedback: '' // Feedback for the current level in dev mode
  });
  
  // Toggle dev mode with keyboard shortcut (Ctrl+Shift+D)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        setGameState(prev => ({
          ...prev,
          devMode: !prev.devMode,
          lives: prev.devMode ? MAX_LIVES : Infinity // Toggle between normal and infinite lives
        }));
        console.log("Developer mode " + (gameState.devMode ? "disabled" : "enabled"));
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState.devMode]);

  // UI states
  const [showInstructions, setShowInstructions] = useState(false);
  const [levelData, setLevelData] = useState({
    urinalCount:          3,
    occupiedPositions:    [] as number[],
    bossPosition:         null as number | null,
    pervPositions:        [] as number[],
    uncleanPositions:     [] as number[],
    janitorPositions:     [] as number[],
    phoneGuyPositions:    [] as number[],
    chatterboxPositions:  [] as number[],
    cautionConePositions: [] as number[],
    mirrorGuyPositions:   [] as number[],
    kidPositions:         [] as number[],
    patternEnforced:      false,
    forcedHoldLevel:      false,
    difficulty:           0,
  });
  const [feedback, setFeedback] = useState({
    message: "Choose a urinal to start!",
    visible: false,
    isSuccess: false
  });

  // Pants incident overlay (triggered after 2 consecutive hold-it-ins)
  const [pantsIncident, setPantsIncident] = useState(false);

  // Character interaction states
  const [hoverPosition, setHoverPosition]     = useState<number | null>(null);
  const [groupReactions, setGroupReactions]   = useState<GroupReaction[]>([]);
  const [lastFailedPos, setLastFailedPos]     = useState<number | null>(null);

  // Timer display
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Leaderboard data
  const [highscores, setHighscores] = useState<Highscore[]>([]);
  const [scoreSaved, setScoreSaved] = useState(false);

  // Load highscores from API (with offline fallback via Cache API)
  useEffect(() => {
    const fetchHighscores = async () => {
      try {
        const scores = await apiRequest('/api/game/highscores');
        const data = scores || [];
        setHighscores(data);
        await cacheHighscores(data);
      } catch (error) {
        console.error('Failed to fetch highscores, trying offline cache:', error);
        const cached = await getCachedHighscores();
        if (cached && Array.isArray(cached)) {
          setHighscores(cached as Highscore[]);
        }
      }
    };

    fetchHighscores();
  }, []);

  // Fetch current batch from server (with offline IndexedDB/Cache API fallback)
  const { data: batchLevels, isLoading: batchLoading, error: batchError, refetch: refetchBatch } = useQuery<LevelData[]>({
    queryKey: ['/api/game/levels/batch', currentBatch],
    queryFn: async () => {
      try {
        const res = await apiRequest(`/api/game/levels/batch/${currentBatch}`);
        const levels = res as LevelData[];
        // Cache the batch for offline use
        await cacheLevelBatch(currentBatch, levels);
        return levels;
      } catch (err) {
        // Network failed — try to serve from offline cache
        const cached = await getCachedLevelBatch(currentBatch);
        if (cached && Array.isArray(cached) && (cached as LevelData[]).length > 0) {
          return cached as LevelData[];
        }
        throw err;
      }
    },
    enabled: gamePhase === 'playing',
    staleTime: Infinity, // batch data never changes
    retry: 5,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  // Load level data from batch when batch/index changes
  useEffect(() => {
    if (gamePhase !== 'playing') return;
    if (batchLoading || !batchLevels || batchLevels.length === 0) return;

    const idx = Math.min(levelIndexInBatch, batchLevels.length - 1);
    const newLevelData = batchLevels[idx];
    if (!newLevelData) return;

    setLevelData(newLevelData);
    setGameState(prev => ({ 
      ...prev, 
      selectedUrinal: null, 
      levelComplete: false,
      timerActive: true
    }));
    setFeedback({ message: "Choose a urinal to start!", visible: false, isSuccess: false });
    setGroupReactions([]);
    setLastFailedPos(null);
    setHoverPosition(null);

    // Start timer for level
    setTimeLeft(TIMER_SECONDS);
    startTimer(() => {
      handleTimerComplete();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBatch, levelIndexInBatch, batchLevels, gamePhase]);

  // Handle timer updates
  useEffect(() => {
    if (gamePhase !== 'playing' || !gameState.timerActive || gameState.levelComplete) return;

    // Create a timer that counts down
    const timerInterval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 0) {
          clearInterval(timerInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [gamePhase, gameState.timerActive, gameState.levelComplete]);

  // Handle timer completion
  const handleTimerComplete = () => {
    if (gameState.levelComplete) return;

    // Player ran out of time
    playSound('failure');
    const newLives = gameState.lives - 1;
    const gameOver = newLives <= 0;

    setGameState(prev => ({
      ...prev,
      lives: newLives,
      gameOver: gameOver,
      timerActive: false,
      levelComplete: true
    }));

    // Array of timeout messages for variety
    const timeoutMessages = [
      "Time's up! Your bladder has lodged a formal complaint.",
      "Tick tock! Decision paralysis is not a bathroom strategy.",
      "The toilet gods have grown impatient with your indecision.",
      "Error 504: Bathroom Gateway Timeout. Please try selecting faster.",
      "Your hesitation has been noted by the Department of Urinary Affairs.",
      "Breaking news: Local person spends eternity deciding on urinal choice!",
      "The janitor is giving you side-eye for taking so long.",
      "Your bladder: 'Am I a joke to you?'",
      "Legend says some are still standing there, trying to decide...",
      "Nature called. Then hung up. Then blocked your number."
    ];

    setFeedback({
      message: timeoutMessages[Math.floor(Math.random() * timeoutMessages.length)],
      visible: true,
      isSuccess: false
    });

    // If game over, transition to game over screen
    if (gameOver) {
      setTimeout(() => {
        setGamePhase('game-over');
        setScoreSaved(false);
      }, 1500);
    }
  };

  // Handler for player name submission
  const handleNameSubmit = (name: string) => {
    setPlayerName(name);
    setGameState(prev => ({ 
      ...prev, 
      playerName: name,
      currentLevel: 1,
      score: 0,
      lives: MAX_LIVES,
      gameOver: false,
      isPissmaster: false
    }));
    setCurrentBatch(1);
    setLevelIndexInBatch(0);
    // Go directly to playing
    setGamePhase('playing');
    playSound('success');
  };

  // We're now using the playSound function from the AudioProvider
  // No need to define a local one here

  // Helper function to get the position of a urinal for animations
  const getUrinalPosition = (index: number): AnimationPosition => {
    const urinalElement = document.getElementById(`urinal-${index}`);
    if (urinalElement) {
      const rect = urinalElement.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    }
    // Fallback to center of container if element not found
    const containerRect = gameContainerRef.current?.getBoundingClientRect() || { width: window.innerWidth, height: window.innerHeight, left: 0, top: 0 };
    return {
      x: containerRect.left + containerRect.width / 2,
      y: containerRect.top + containerRect.height / 2
    };
  };

  // Build all-characters list for group reactions
  const allCharacters: Array<{ type: CharacterType; pos: number }> = [
    ...(levelData.bossPosition !== null ? [{ type: 'boss' as CharacterType, pos: levelData.bossPosition }] : []),
    ...levelData.pervPositions.map(pos      => ({ type: 'perv'       as CharacterType, pos })),
    ...levelData.janitorPositions.map(pos   => ({ type: 'janitor'    as CharacterType, pos })),
    ...levelData.phoneGuyPositions.map(pos  => ({ type: 'phoneGuy'   as CharacterType, pos })),
    ...levelData.chatterboxPositions.map(pos=> ({ type: 'chatterbox' as CharacterType, pos })),
    ...levelData.cautionConePositions.map(pos=>({ type: 'cone'       as CharacterType, pos })),
    ...levelData.mirrorGuyPositions.map(pos => ({ type: 'mirrorGuy'  as CharacterType, pos })),
    ...levelData.kidPositions.map(pos       => ({ type: 'kid'        as CharacterType, pos })),
  ];

  // Handle urinal selection
  const handleUrinalClick = (index: number) => {
    // Compute all blocked positions (chars that physically occupy a slot)
    const allBlocked = new Set([
      ...levelData.occupiedPositions,
      ...(levelData.bossPosition !== null ? [levelData.bossPosition] : []),
      ...levelData.janitorPositions,
      ...levelData.phoneGuyPositions,
      ...levelData.chatterboxPositions,
      ...levelData.cautionConePositions,
      ...levelData.mirrorGuyPositions,
      ...levelData.kidPositions,
    ]);

    // Don't allow clicks if level is complete or slot is physically blocked
    if (gameState.levelComplete || allBlocked.has(index)) return;

    // Play selection click sound
    playSound('select');

    // Check if selection is valid according to game rules
    const result = checkSelection(
      index,
      levelData.occupiedPositions,
      levelData.urinalCount,
      levelData.bossPosition,
      levelData.pervPositions,
      levelData.uncleanPositions as number[],
      gameState.waitingForTurn,
      levelData.janitorPositions,
      levelData.phoneGuyPositions,
      levelData.chatterboxPositions,
      levelData.cautionConePositions,
      levelData.mirrorGuyPositions,
      levelData.patternEnforced,
      levelData.kidPositions,
    );

    // Get the position of the selected urinal for animations
    const position = getUrinalPosition(index);
    setAnimationPosition(position);

    if (result.valid) {
      // Success!
      playSound('success');

      // Trigger group reactions (staggered)
      setGroupReactions(buildGroupReactions(allCharacters, 'selected', index));
      setLastFailedPos(null);

      // Stop the timer on successful selection
      stopTimer();

      // Check if this is a "hold it in" successful validation
      if (result.needToWait) {
        setGameState(prev => ({
          ...prev,
          waitingForTurn: true,
          score: prev.score + 5, // Give some points for patience
          levelComplete: true,
          timerActive: false
        }));
      } else {
        // Regular success - sequence of bathroom sounds and animations
        
        // First play zipper sound and animation
        playSound('zipper');
        createAnimation('zipper', position);
        
        // Then schedule pissing sound with a slight delay
        setTimeout(() => {
          playSound('pissing');
          
          // Create splash animation
          createAnimation('splash', position);
          
          // 10% chance of fart sound for humor
          if (Math.random() < 0.1) {
            setTimeout(() => {
              playSound('fart');
              createAnimation('fart', position);
            }, 800);
          }
          
          // Play flush at the end
          setTimeout(() => {
            playSound('flush');
            createAnimation('flush', position);
          }, 2000);
        }, 800);

        // Use the score from the result or default to acceptable (5) if not provided
        const pointsEarned = result.score || 5;

        // Add time bonus if quick selection (up to 5 bonus points)
        const timeBonus = timeLeft !== null ? Math.min(5, Math.floor(timeLeft / 2)) : 0;

        // Level bonus increases with level difficulty
        const levelBonus = Math.floor(gameState.currentLevel / 10);

        // Picking a urinal resets the hold-it-in streak
        resetHoldItInStreak();

        setGameState(prev => ({
          ...prev,
          score: prev.score + pointsEarned + timeBonus + levelBonus, // Points from decision quality + time bonus + level bonus
          selectedUrinal: index,
          levelComplete: true,
          waitingForTurn: false,
          timerActive: false
        }));
      }

      setFeedback({
        message: result.message,
        visible: true,
        isSuccess: true
      });
    } else {
      // Play failure sound
      playSound('failure');

      // If it's an unclean urinal, we don't lose a life, just show a warning
      if (result.isUnclean) {
        // Show unclean animation
        createAnimation('unclean', position);
        
        setFeedback({
          message: result.message,
          visible: true,
          isSuccess: false
        });
        return;
      }

      // Trigger failure group reactions
      setGroupReactions(buildGroupReactions(allCharacters, 'failed', index));
      setLastFailedPos(index);

      // All other failures cause life loss
      const newLives = gameState.lives - 1;
      const gameOver = newLives <= 0;

      setGameState(prev => ({
        ...prev,
        lives: newLives,
        gameOver: gameOver,
        selectedUrinal: null
      }));

      setFeedback({
        message: result.message,
        visible: true,
        isSuccess: false
      });

      // If game over, transition to game over screen
      if (gameOver) {
        setTimeout(() => {
          setGamePhase('game-over');
          setScoreSaved(false);
        }, 1500);
      }
    }
  };

  // Handle "Hold it in" button click
  const handleHoldItIn = () => {
    const levelState: LevelState = {
      totalUrinals:         levelData.urinalCount,
      occupiedPositions:    levelData.occupiedPositions,
      bossPosition:         levelData.bossPosition,
      pervPositions:        levelData.pervPositions,
      uncleanPositions:     levelData.uncleanPositions as number[],
      janitorPositions:     levelData.janitorPositions,
      phoneGuyPositions:    levelData.phoneGuyPositions,
      chatterboxPositions:  levelData.chatterboxPositions,
      cautionConePositions: levelData.cautionConePositions,
      mirrorGuyPositions:   levelData.mirrorGuyPositions,
      kidPositions:         levelData.kidPositions,
      patternEnforced:      levelData.patternEnforced,
    };

    const result = evaluateHoldItIn(levelState);

    if (result.valid) {
      playSound('success');
      stopTimer();

      // Score: 50 base + time bonus + small level bonus
      const holdScore = 50;
      const timeBonus = timeLeft !== null ? Math.min(3, Math.floor(timeLeft / 3)) : 0;
      const levelBonus = Math.floor(gameState.currentLevel / 20);

      setGameState(prev => ({
        ...prev,
        waitingForTurn: true,
        score: prev.score + holdScore + timeBonus + levelBonus,
        levelComplete: true,
        timerActive: false,
      }));

      // Pants incident tracking — 2 consecutive hold-it-ins = 💥 (-25 pts)
      const isPantsIncident = recordHoldItIn();
      if (isPantsIncident) {
        setPantsIncident(true);
        setGameState(prev => ({ ...prev, score: Math.max(0, prev.score - 25) }));
        setTimeout(() => setPantsIncident(false), 3000);
      }

      const holdMessages = [
        "Good call! Sometimes holding it in is the gentlemanly thing to do.",
        "Wise decision! A true urinal etiquette master knows when to wait.",
        "Patience is a virtue in bathroom etiquette. Well done!",
        "The true test of urinal discipline is knowing when to abstain. You passed!",
        "Your restraint is admirable. The bladder is strong, but etiquette is stronger!",
        "Holding it in shows true mastery of bathroom etiquette. Well played!",
        "A gentleman waits rather than compromises on proper urinal protocol.",
        "Bladder control is the highest form of urinal wisdom. Respect!",
      ];
      setFeedback({
        message: holdMessages[Math.floor(Math.random() * holdMessages.length)],
        visible: true,
        isSuccess: true,
      });
    } else {
      playSound('failure');
      setFeedback({
        message: result.reason,
        visible: true,
        isSuccess: false,
      });
    }
  };

  // Restart the game from level 1
  const resetLevel = () => {
    setGameState(prev => ({
      ...prev,
      currentLevel: 1,
      score: 0,
      selectedUrinal: null,
      levelComplete: false,
      lives: prev.devMode ? Infinity : MAX_LIVES,
      gameOver: false,
      waitingForTurn: false,
      timerActive: false,
      isPissmaster: false,
      devFeedback: ''
    }));
    setCurrentBatch(1);
    setLevelIndexInBatch(0);
    setFeedback({ message: "Starting a new game! Choose a urinal to begin.", visible: true, isSuccess: true });

    // Reset timer
    setTimeLeft(null);
    stopTimer();
  };

  // Advance to the next level (batch-aware)
  const goToNextLevel = () => {
    const nextLevel = gameState.currentLevel + 1;

    if (nextLevel > gameState.maxLevel) {
      setGamePhase('game-over');
      setScoreSaved(false);
      return;
    }

    const nextLevelIndex = levelIndexInBatch + 1;
    const nextBatch = Math.ceil(nextLevel / 5);

    setGameState(prev => ({
      ...prev,
      currentLevel: nextLevel,
      selectedUrinal: null,
      levelComplete: false,
      waitingForTurn: false,
      timerActive: false
    }));

    // Reset timer
    setTimeLeft(null);
    stopTimer();

    if (nextLevelIndex >= 5) {
      // Batch complete — show intro for next batch
      setNextBatchNumber(nextBatch);
      setShowBatchIntro(true);
    } else {
      setLevelIndexInBatch(nextLevelIndex);
    }
  };

  // Called when batch intro countdown finishes
  const handleBatchIntroDone = useCallback(() => {
    setShowBatchIntro(false);
    if (nextBatchNumber !== null) {
      setCurrentBatch(nextBatchNumber);
      setLevelIndexInBatch(0);
      setNextBatchNumber(null);
    }
  }, [nextBatchNumber]);

  // Save score to leaderboard
  const saveScore = async () => {
    if (scoreSaved) return;

    try {
      const newHighscore = await apiRequest('/api/game/highscores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          playerName: gameState.playerName,
          score: gameState.score
        })
      });

      if (newHighscore) {
        // Update local highscores list
        setHighscores(prev => [...prev, newHighscore as Highscore]);
        setScoreSaved(true);
      }
    } catch (error) {
      console.error('Failed to save highscore:', error);
    }
  };

  // Start a new game
  const startNewGame = () => {
    setGameState({
      currentLevel: 1,
      score: 0,
      maxLevel: MAX_LEVEL,
      selectedUrinal: null,
      levelComplete: false,
      lives: gameState.devMode ? Infinity : MAX_LIVES,
      playerName: playerName,
      gameOver: false,
      waitingForTurn: false,
      timerActive: false,
      isPissmaster: false,
      devMode: gameState.devMode,
      devFeedback: ''
    });
    setCurrentBatch(1);
    setLevelIndexInBatch(0);
    setGamePhase('playing');
  };

  // Toggle leaderboard view
  const toggleLeaderboard = () => {
    if (gamePhase === 'leaderboard') {
      setGamePhase(gameState.gameOver ? 'game-over' : 'playing');
    } else {
      setGamePhase('leaderboard');
    }
  };

  useEffect(() => {
    if (gameState.currentLevel > MAX_LEVEL) {
      setGameState(prev => ({ ...prev, isPissmaster: true }));
      setFeedback({
        message: "🏆 CONGRATULATIONS! You've achieved the legendary PISSMASTER title! 🏆",
        visible: true,
        isSuccess: true
      });
    }
  }, [gameState.currentLevel]);


  // Render different screens based on game phase
  if (gamePhase === 'name-entry') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <PlayerNameForm onSubmit={handleNameSubmit} />
      </motion.div>
    );
  }

  if (gamePhase === 'leaderboard') {
    return (
      <Leaderboard 
        scores={highscores}
        onPlayAgain={toggleLeaderboard}
        isGameOver={gameState.gameOver}
      />
    );
  }

  if (gamePhase === 'game-over') {
    return (
      <Leaderboard 
        scores={highscores}
        currentScore={gameState.score}
        currentPlayerName={gameState.playerName}
        onPlayAgain={startNewGame}
        onSaveScore={!scoreSaved ? saveScore : undefined}
        isGameOver={true}
        isPissmaster={gameState.isPissmaster}
      />
    );
  }

  // Error state — batch fetch failed after retries
  if (gamePhase === 'playing' && batchError && !batchLevels) {
    return (
      <div className="pp-card p-4 md:p-5 text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <div className="text-sm font-semibold mb-3" style={{ color: 'var(--pp-text-dim)' }}>
          Failed to load levels from the server.
        </div>
        <button
          className="pp-btn-primary px-4 py-2 text-sm"
          onClick={() => refetchBatch()}
        >
          Retry
        </button>
      </div>
    );
  }

  // Loading skeleton while batch is being fetched
  if (gamePhase === 'playing' && (batchLoading || !batchLevels)) {
    return (
      <div className="pp-card p-4 md:p-5 animate-pulse">
        <div className="h-6 rounded mb-4" style={{ background: 'var(--pp-surface-2)' }} />
        <div className="flex gap-3 justify-center mb-4">
          {[0,1,2,3,4].map(i => (
            <div key={i} className="rounded-lg" style={{ width: 70, height: 180, background: 'var(--pp-surface-2)' }} />
          ))}
        </div>
        <div className="h-10 rounded" style={{ background: 'var(--pp-surface-2)' }} />
      </div>
    );
  }

  // Main game screen (playing phase)
  return (
    <motion.div
      ref={gameContainerRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="relative"
    >
      {/* ── BATCH INTRO OVERLAY ─────────────────────────────────────────── */}
      {showBatchIntro && nextBatchNumber !== null && (
        <BatchIntroScreen
          batchNumber={nextBatchNumber}
          onDone={handleBatchIntroDone}
        />
      )}

      {/* ── PANTS INCIDENT OVERLAY ─────────────────────────────────────── */}
      {pantsIncident && (
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.7 }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          <div
            className="rounded-2xl px-8 py-6 text-center"
            style={{
              background: 'var(--pp-surface)',
              border: '2px solid var(--pp-yellow)',
              boxShadow: '0 0 40px rgba(245,200,66,0.35)',
            }}
          >
            <div className="text-5xl mb-2">💧👖</div>
            <div className="text-2xl font-black uppercase tracking-wider mb-1" style={{ color: 'var(--pp-yellow)' }}>
              Pants Incident!
            </div>
            <div className="text-sm font-semibold mb-1" style={{ color: 'var(--pp-text-dim)' }}>
              Two hold-it-ins in a row — bladder betrayal.
            </div>
            <div className="text-xs" style={{ color: 'var(--pp-text-muted)' }}>
              −25 points · streak reset
            </div>
          </div>
        </motion.div>
      )}

      <div className="pp-card p-4 md:p-5 mb-4">
        {/* ── Stats row ── */}
        <div className="flex items-center justify-between mb-3">
          <LevelIndicator
            currentLevel={gameState.currentLevel}
            score={gameState.score}
            onInfoClick={() => setShowInstructions(true)}
          />

          <div className="flex items-center gap-2">
            {/* Timer */}
            {timeLeft !== null && (
              <motion.div
                animate={timeLeft <= 3 ? { scale: [1, 1.1, 1] } : {}}
                transition={{ repeat: Infinity, duration: 0.5 }}
                className={`text-base font-black pp-timer ${timeLeft <= 3 ? 'danger' : timeLeft <= 8 ? 'warn' : ''}`}
              >
                ⏱ {timeLeft}s
              </motion.div>
            )}
            {/* Audio controls */}
            <button
              onClick={toggleBgMusic}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors"
              style={{ background: 'var(--pp-surface-2)', border: '1px solid var(--pp-border-md)', color: 'var(--pp-text-dim)' }}
              title={isMusicPlaying ? 'Mute music' : 'Play music'}
            >
              {isMusicPlaying ? '🔊' : '🔇'}
            </button>
            <button
              onClick={toggleLeaderboard}
              className="px-2 h-8 rounded-lg flex items-center gap-1 text-xs font-bold transition-colors"
              style={{ background: 'var(--pp-surface-2)', border: '1px solid var(--pp-border-md)', color: 'var(--pp-text-dim)' }}
            >
              🏅
            </button>
          </div>
        </div>

        {/* Lives */}
        <div className="mb-3">
          <LivesIndicator lives={gameState.lives} maxLives={MAX_LIVES} />
        </div>

        {showInstructions && (
          <InstructionsPanel onClose={() => setShowInstructions(false)} />
        )}

        {/* ── Banners ── */}
        {levelData.forcedHoldLevel && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="pp-banner-warn text-xs font-bold px-3 py-2 mb-3 text-center"
          >
            🤐 Every urinal is compromised — can you spot why?
          </motion.div>
        )}
        {levelData.patternEnforced && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="pp-banner-info text-xs font-bold px-3 py-2 mb-3 text-center"
          >
            📐 Pattern Enforcer active — follow the checkerboard!
          </motion.div>
        )}

        {/* Prompt */}
        <p
          className="text-center text-sm font-semibold mb-3"
          style={{ color: 'var(--pp-text-dim)' }}
        >
          Choose the best urinal based on etiquette
        </p>

        {/* ── Urinal bank ── */}
        <div
          className="pp-urinal-bank mb-4"
          style={{
            backgroundImage: 'url(/assets/bg_bathroom.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(15,18,35,0.55)',
              borderRadius: 'inherit',
              pointerEvents: 'none',
            }}
          />
          <div className="flex flex-nowrap justify-start gap-2 md:gap-3 overflow-x-auto pb-1" style={{ position: 'relative', zIndex: 1 }}>
            {Array.from({ length: levelData.urinalCount }).map((_, index) => {
              const isJanitor    = levelData.janitorPositions.includes(index);
              const isPhoneGuy   = levelData.phoneGuyPositions.includes(index);
              const isChatterbox = levelData.chatterboxPositions.includes(index);
              const isCone       = levelData.cautionConePositions.includes(index);
              const isMirrorGuy  = levelData.mirrorGuyPositions.includes(index);
              const isAnyNewChar = isJanitor || isPhoneGuy || isChatterbox || isCone || isMirrorGuy;
              const charsAtSlot  = allCharacters.filter(c => c.pos === index);
              const isKid        = levelData.kidPositions.includes(index);
              const isAnyCharHere = isAnyNewChar || levelData.pervPositions.includes(index) || isKid;
              const isOccupied   = levelData.occupiedPositions.includes(index) || levelData.bossPosition === index || isAnyCharHere;

              return (
                <div
                  key={index}
                  className="flex flex-col items-center flex-shrink-0"
                  style={{ minWidth: '70px' }}
                  onMouseEnter={() => {
                    setHoverPosition(index);
                  }}
                  onMouseLeave={() => setHoverPosition(null)}
                >
                  {/* Character slot */}
                  <div
                    className="relative w-full flex items-end justify-center"
                    style={{ height: '130px', minWidth: '70px' }}
                  >
                    {charsAtSlot.map(char => {
                      const reaction = groupReactions.find(r => r.pos === index && r.type === char.type);
                      return (
                        <CharacterDisplay
                          key={char.type}
                          type={char.type}
                          position={index}
                          totalUrinals={levelData.urinalCount}
                          playerHoverPos={hoverPosition}
                          playerSelectedPos={gameState.selectedUrinal}
                          didFail={lastFailedPos !== null}
                          forcedQuip={reaction?.quip ?? null}
                          reactionDelay={reaction?.delay ?? 0}
                        />
                      );
                    })}
                  </div>

                  {/* Urinal tile */}
                  <Urinal
                    index={index}
                    isOccupied={isOccupied}
                    isSelected={gameState.selectedUrinal === index}
                    totalUrinals={levelData.urinalCount}
                    onClick={handleUrinalClick}
                    isBoss={levelData.bossPosition === index}
                    isUnclean={levelData.uncleanPositions.includes(index)}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Feedback */}
        <FeedbackBox
          message={feedback.message}
          visible={feedback.visible}
          isSuccess={feedback.isSuccess}
        />

        {/* Hold It In button */}
        <div className="mb-3">
          <motion.button
            whileHover={!gameState.levelComplete ? { scale: 1.02 } : {}}
            whileTap={!gameState.levelComplete ? { scale: 0.97 } : {}}
            onClick={handleHoldItIn}
            disabled={gameState.levelComplete}
            className="pp-btn-primary pp-btn-hold w-full"
          >
            {gameState.waitingForTurn ? '🤐 Holding it in…' : '🤐 Hold It In'}
          </motion.button>
        </div>

        {/* Developer Mode UI */}
        {gameState.devMode && (
          <div
            className="mb-3 p-3 rounded-lg text-xs"
            style={{ background: 'rgba(224,82,82,0.10)', border: '1px solid rgba(224,82,82,0.40)', color: '#F09090' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="font-bold">DEV MODE</span>
              <span>Level {gameState.currentLevel} · {gameState.lives === Infinity ? '∞' : gameState.lives} lives</span>
            </div>
            <div className="flex gap-2">
              <button
                className="px-2 py-1 rounded text-xs font-bold"
                style={{ background: 'rgba(255,255,255,0.10)' }}
                onClick={goToNextLevel}
              >
                Skip Level
              </button>
              <button
                className="px-2 py-1 rounded text-xs font-bold"
                style={{ background: 'rgba(255,255,255,0.10)' }}
                onClick={() => {
                  const newLevel = parseInt(prompt("Jump to level:", gameState.currentLevel.toString()) || "1");
                  if (newLevel > 0 && newLevel <= MAX_LEVEL) {
                    const newBatch = Math.ceil(newLevel / 5);
                    const newIndex = (newLevel - 1) % 5;
                    setGameState(prev => ({ ...prev, currentLevel: newLevel }));
                    setCurrentBatch(newBatch);
                    setLevelIndexInBatch(newIndex);
                  }
                }}
              >
                Jump to Level
              </button>
            </div>
          </div>
        )}

        {/* Level-complete illustration */}
        {gameState.levelComplete && !gameState.gameOver && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, type: 'spring', stiffness: 200 }}
            className="flex flex-col items-center mb-3"
          >
            <img
              src="/assets/batch_complete.png"
              alt="Level Complete"
              className="w-24 h-24 object-contain rounded-xl"
              style={{ filter: 'drop-shadow(0 4px 16px rgba(91,124,247,0.40))' }}
            />
          </motion.div>
        )}

        <ActionButtons
          onReset={resetLevel}
          onNextLevel={goToNextLevel}
          showNextLevel={gameState.levelComplete}
          showRestart={gameState.lives <= 0}
        />
      </div>
    </motion.div>
  );
};

export default UrinalGame;