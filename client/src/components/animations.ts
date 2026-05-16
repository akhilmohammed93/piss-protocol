// Animation utilities for bathroom humor effects

import { CSSProperties } from 'react';

// Animation types
export type AnimationType = 'zipper' | 'flush' | 'fart' | 'splash' | 'unclean';

// Position for displaying animations
export interface AnimationPosition {
  x: number;
  y: number;
}

// Generate styling for animations based on position and type
export const getAnimationStyle = (
  type: AnimationType,
  position: AnimationPosition
): CSSProperties => {
  const baseStyle: CSSProperties = {
    position: 'absolute',
    top: `${position.y}px`,
    left: `${position.x}px`,
    transform: 'translate(-50%, -50%)',
    zIndex: 1000,
    pointerEvents: 'none',
  };

  // Different animations have different styles
  switch (type) {
    case 'zipper':
      return {
        ...baseStyle,
        width: '50px',
        height: '100px',
        background: 'rgba(255, 255, 255, 0.8)',
        borderRadius: '5px',
        boxShadow: '0 0 10px rgba(0,0,0,0.2)',
        animation: 'zipperAnimation 0.8s ease-in-out',
      };
    case 'flush':
      return {
        ...baseStyle,
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: 'rgba(173, 216, 230, 0.6)',
        animation: 'flushAnimation 1.5s ease-out',
      };
    case 'fart':
      return {
        ...baseStyle,
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        background: 'rgba(128, 128, 0, 0.3)',
        animation: 'fartAnimation 1.5s ease-out',
      };
    case 'splash':
      return {
        ...baseStyle,
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        background: 'rgba(173, 216, 230, 0.8)',
        animation: 'splashAnimation 0.5s ease-out',
      };
    case 'unclean':
      return {
        ...baseStyle,
        width: '70px',
        height: '70px',
        borderRadius: '50%',
        background: 'rgba(139, 69, 19, 0.4)',
        animation: 'uncleanAnimation 1s ease-in-out',
      };
    default:
      return baseStyle;
  }
};

// CSS keyframe animations to be injected into the document head
export const injectAnimationStyles = () => {
  if (document.getElementById('bathroom-animations')) return;

  const style = document.createElement('style');
  style.id = 'bathroom-animations';
  style.innerHTML = `
    @keyframes zipperAnimation {
      0% { height: 0; opacity: 0; }
      20% { height: 50px; opacity: 1; }
      80% { height: 50px; opacity: 1; }
      100% { height: 100px; opacity: 0; }
    }
    
    @keyframes flushAnimation {
      0% { transform: translate(-50%, -50%) scale(0.2); opacity: 0; }
      10% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
      30% { transform: translate(-50%, -50%) scale(1.5) rotate(180deg); opacity: 0.6; }
      100% { transform: translate(-50%, -50%) scale(2) rotate(360deg); opacity: 0; }
    }
    
    @keyframes fartAnimation {
      0% { transform: translate(-50%, -50%) scale(0.2); opacity: 0; }
      20% { transform: translate(-50%, -50%) scale(1); opacity: 0.7; }
      40% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.5; }
      100% { transform: translate(-50%, -50%) scale(1.8); opacity: 0; }
    }
    
    @keyframes splashAnimation {
      0% { transform: translate(-50%, -50%) scale(0.2); opacity: 0; }
      50% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
      100% { transform: translate(-50%, -50%) scale(1.2); opacity: 0; }
    }
    
    @keyframes uncleanAnimation {
      0% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
      25% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.8; }
      75% { transform: translate(-50%, -50%) scale(0.9); opacity: 0.8; }
      100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
    }
  `;
  
  document.head.appendChild(style);
};

// Animation components
export const AnimationComponent = ({ 
  type, 
  position, 
  visible 
}: { 
  type: AnimationType; 
  position: AnimationPosition;
  visible: boolean;
}) => {
  if (!visible) return null;
  
  // Ensure animation styles are injected
  injectAnimationStyles();
  
  // Create a temporary div element for the animation
  const animationElement = document.createElement('div');
  const style = getAnimationStyle(type, position);
  
  // Apply styles to the element
  Object.entries(style).forEach(([key, value]) => {
    // @ts-ignore
    animationElement.style[key] = value;
  });
  
  // Add content based on animation type
  switch (type) {
    case 'zipper':
      animationElement.innerHTML = '&#9660;'; // Triangle down symbol
      break;
    case 'flush':
      animationElement.innerHTML = '&#10227;'; // Circular arrow
      break;
    case 'fart':
      animationElement.innerHTML = '💨'; // Cloud symbol
      break;
    case 'splash':
      animationElement.innerHTML = '&#10042;'; // Asterisk/splash symbol
      break;
    case 'unclean':
      animationElement.innerHTML = '&#9673;'; // Circle symbol
      break;
  }
  
  // Add to DOM
  document.body.appendChild(animationElement);
  
  // Remove after animation completes
  setTimeout(() => {
    if (document.body.contains(animationElement)) {
      document.body.removeChild(animationElement);
    }
  }, 2000); // Slightly longer than animation duration
  
  return null;
};

// Helper to create animations at specific positions
export const createAnimation = (
  type: AnimationType, 
  position: AnimationPosition
) => {
  AnimationComponent({ type, position, visible: true });
};