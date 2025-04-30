import React, { useState, useEffect, useMemo } from "react";
import styles from "./GlitchText.module.css";

interface GlitchTextProps {
  text: string;
  targetChar?: string; // Character to animate
  replacementChars?: string[]; // Array of characters to cycle through
  targetInstance?: number; // Which instance of the targetChar to animate (1-indexed, default 1)
  className?: string;
  minInterval?: number; // Minimum interval in ms (default 200)
  maxInterval?: number; // Maximum interval in ms (default 600)
}

// Helper function to find the Nth occurrence of a character
const findNthIndex = (str: string, char: string, n: number): number => {
  let index = -1;
  for (let i = 0; i < n; i++) {
    index = str.indexOf(char, index + 1);
    if (index === -1) break; // Not enough occurrences found
  }
  return index;
};

// Helper function to get a random character that's different from the current one
const getRandomChar = (chars: string[], currentChar: string | null): string => {
  if (chars.length === 1) return chars[0];

  let newChar;
  do {
    newChar = chars[Math.floor(Math.random() * chars.length)];
  } while (newChar === currentChar && chars.length > 1);

  return newChar;
};

// Helper function to get a random interval between min and max
const getRandomInterval = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const GlitchText: React.FC<GlitchTextProps> = ({
  text,
  targetChar,
  replacementChars,
  targetInstance = 1,
  className = "",
  minInterval = 100,
  maxInterval = 500,
}) => {
  // Determine if character animation should be attempted
  const shouldAnimateChars = useMemo(() => {
    // Logic simplified: Depends only on targetChar and replacementChars being valid
    return (
      typeof targetChar === "string" &&
      targetChar.length === 1 &&
      Array.isArray(replacementChars) &&
      replacementChars.length > 0
    );
  }, [targetChar, replacementChars]);

  // Find the index only if character animation is intended and possible
  const targetIndex = useMemo(() => {
    if (!shouldAnimateChars) return -1;
    // We know targetChar is a string here due to shouldAnimateChars check
    return findNthIndex(text, targetChar!, targetInstance);
  }, [text, targetChar, targetInstance, shouldAnimateChars]);

  // Initialize state only if animating characters
  const [animatedChar, setAnimatedChar] = useState<string | null>(() => {
    if (shouldAnimateChars && targetIndex !== -1) {
      // We know replacementChars is valid array here
      return getRandomChar(replacementChars!, null);
    }
    return null; // No animation or target not found
  });

  useEffect(() => {
    // Only set up interval if character animation is intended and the target was found
    if (!shouldAnimateChars || targetIndex === -1) {
      // Ensure animatedChar is null if not animating chars
      if (animatedChar !== null) setAnimatedChar(null);
      return; // No interval needed
    }

    // If shouldAnimateChars becomes true and state was null, initialize
    if (animatedChar === null) {
      setAnimatedChar(getRandomChar(replacementChars!, null));
    }

    // Variable for timeout
    let timeoutId: NodeJS.Timeout;

    // Function to schedule the next change
    const scheduleNextChange = () => {
      // Get a random interval
      const interval = getRandomInterval(minInterval, maxInterval);

      // Schedule the next character change
      timeoutId = setTimeout(() => {
        // Get a random character that's different from the current one
        const nextChar = getRandomChar(replacementChars!, animatedChar);
        setAnimatedChar(nextChar);

        // Schedule the next change
        scheduleNextChange();
      }, interval);
    };

    // Start the initial change cycle
    scheduleNextChange();

    // Cleanup timeout
    return () => clearTimeout(timeoutId);
  }, [
    shouldAnimateChars,
    targetIndex,
    replacementChars,
    animatedChar,
    minInterval,
    maxInterval,
  ]);

  // --- Rendering Logic --- //

  // Simplified condition: Render visual-only glitch if character animation isn't applicable/possible
  if (!shouldAnimateChars || (shouldAnimateChars && targetIndex === -1)) {
    // Render with visual glitch CSS but original text, using a div instead of span
    // Apply the data-text attribute which might be used by the CSS for the glitch effect
    return (
      <div className={`${styles.glitch} ${className}`} data-text={text}>
        {text}
      </div>
    );
  }

  // If character animation is active and target index found
  // This part remains largely the same, ensuring it still uses a div for the character animation layout
  const prefix = text.substring(0, targetIndex);
  const suffix = text.substring(targetIndex + 1);

  const charToDisplay =
    animatedChar ?? (targetIndex !== -1 ? text[targetIndex] : ""); // Handle potential null animatedChar

  const dataText = useMemo(() => {
    // Only construct glitchy data-text if target was found and we have a char to display
    if (targetIndex !== -1) {
      return `${prefix}${charToDisplay}${suffix}`;
    }
    return text; // Fallback to original text
  }, [prefix, charToDisplay, suffix, text, targetIndex]);

  return (
    <div className={`${styles.glitch} ${className}`} data-text={dataText}>
      {prefix}
      {targetIndex !== -1 ? (
        // Render the animated or original character
        <span className={styles.animatedChar}>{charToDisplay}</span>
      ) : null}
      {/* If targetIndex is -1, prefix covers the whole text, suffix is empty */}
      {suffix}
    </div>
  );
};

export default GlitchText;
