'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import styles from './bespokle.module.css';
import { getChangedIndex } from '@/lib/ladder-solver';
import SlackButton from '@/components/SlackButton';
import { ME } from '@/lib/demo-people';

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫'],
];

const CONFETTI_COLORS = [
  '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#f43f5e',
  '#a78bfa', '#22d3ee', '#fbbf24', '#34d399', '#fb7185',
];

interface PuzzleData {
  startWord: string;
  target: string;
  par: number;
  oneLiner: string;
}

export default function BespokleGame() {
  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null);
  const [path, setPath] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [solved, setSolved] = useState(false);
  const [showReveal, setShowReveal] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [shakeRow, setShakeRow] = useState(false);
  const [loading, setLoading] = useState(true);
  const confettiRef = useRef<HTMLDivElement>(null);

  // Fetch today's puzzle
  useEffect(() => {
    fetch('/api/bespokle')
      .then((res) => res.json())
      .then((data) => {
        setPuzzle({
          startWord: data.startWord,
          target: data.target,
          par: data.par,
          oneLiner: data.oneLiner,
        });
        setPath([data.startWord]);
        setLoading(false);
      });
  }, []);

  const showMsg = useCallback((msg: string, duration = 1500) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), duration);
  }, []);

  const spawnConfetti = useCallback(() => {
    if (!confettiRef.current) return;
    const container = confettiRef.current;
    container.innerHTML = '';
    
    for (let i = 0; i < 100; i++) {
      const piece = document.createElement('div');
      piece.className = styles.confettiPiece;
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.backgroundColor = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      piece.style.animationDuration = `${1.5 + Math.random() * 2}s`;
      piece.style.animationDelay = `${Math.random() * 0.8}s`;
      piece.style.width = `${6 + Math.random() * 8}px`;
      piece.style.height = `${6 + Math.random() * 8}px`;
      piece.style.transform = `rotate(${Math.random() * 360}deg)`;
      container.appendChild(piece);
    }
  }, []);

  const submitStep = useCallback(async () => {
    if (!puzzle || currentInput.length !== 4) {
      showMsg('Enter a 4-letter word');
      setShakeRow(true);
      setTimeout(() => setShakeRow(false), 400);
      return;
    }

    const previousWord = path[path.length - 1];

    try {
      const res = await fetch('/api/bespokle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          previousWord,
          nextWord: currentInput,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.valid) {
        showMsg(data.error || 'Invalid step');
        setShakeRow(true);
        setTimeout(() => setShakeRow(false), 400);
        return;
      }

      const newPath = [...path, currentInput.toLowerCase()];
      setPath(newPath);
      setCurrentInput('');

      if (data.solved) {
        setSolved(true);
        // Short delay before the reveal
        setTimeout(() => {
          setShowReveal(true);
          setTimeout(() => spawnConfetti(), 800);
        }, 600);
      }
    } catch {
      showMsg('Connection error');
    }
  }, [currentInput, path, puzzle, showMsg, spawnConfetti]);

  const handleKey = useCallback(
    (key: string) => {
      if (solved) return;

      if (key === 'ENTER') {
        submitStep();
      } else if (key === '⌫' || key === 'BACKSPACE') {
        setCurrentInput((prev) => prev.slice(0, -1));
      } else if (/^[A-Z]$/i.test(key) && currentInput.length < 4) {
        setCurrentInput((prev) => prev + key.toLowerCase());
      }
    },
    [currentInput, solved, submitStep]
  );

  // Physical keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toUpperCase();
      if (key === 'ENTER' || key === 'BACKSPACE' || /^[A-Z]$/.test(key)) {
        e.preventDefault();
        handleKey(key);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleKey]);

  if (loading || !puzzle) {
    return (
      <div className="container">
        <div className={styles.bespokle}>
          <div className={styles.header}>
            <h1 className={styles.title}>
              <span className={styles.titleGradient}>Bespokle</span>
            </h1>
            <p className={styles.subtitle}>Loading today&apos;s puzzle...</p>
          </div>
        </div>
      </div>
    );
  }

  const steps = path.length - 1;
  const stepsOverPar = Math.max(0, steps - puzzle.par);

  // Spoiler-free grid: one row per step, only the changed letter highlighted
  const buildShareGrid = () => {
    const grid = path
      .slice(1)
      .map((word, i) => {
        const changed = getChangedIndex(path[i], word);
        return '⬛'.repeat(changed) + '🟦' + '⬛'.repeat(3 - changed);
      })
      .join('\n');
    return `${ME.name} · Bespokle ${steps} steps (fastest route: ${puzzle.par})\n\n${grid}\n\n🅱🅴🆂 ➡️ POKE`;
  };

  return (
    <div className="container">
      <div className={styles.bespokle}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>
            <span className={styles.titleGradient}>Bespokle</span>
          </h1>
          <p className={styles.subtitle}>
            Transform {puzzle.startWord.toUpperCase()} into POKE, one letter at a time
          </p>
          <p className={styles.oneLiner}>{puzzle.oneLiner}</p>
        </div>

        {/* Info */}
        <div className={styles.infoBar}>
          <div className={styles.infoPill}>
            <span className={styles.infoPillLabel}>Fastest route</span>
            <span className={styles.infoPillValue}>{puzzle.par} steps</span>
          </div>
          <div className={styles.infoPill}>
            <span className={styles.infoPillLabel}>Steps</span>
            <span className={styles.infoPillValue}>{steps}</span>
          </div>
          <div className={styles.infoPill}>
            <span className={styles.infoPillLabel}>Target</span>
            <span className={styles.infoPillValue}>POKE</span>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={styles.message} id="bespokle-message">
            {message}
          </div>
        )}

        {/* Ladder */}
        <div className={styles.ladder} id="bespokle-ladder">
          {path.map((word, rowIdx) => {
            const prevWord = rowIdx > 0 ? path[rowIdx - 1] : null;
            const changedIdx = prevWord ? getChangedIndex(prevWord, word) : -1;
            const isPoke = word === 'poke';
            const isStart = rowIdx === 0;

            return (
              <div key={`${rowIdx}-${word}`}>
                {rowIdx > 0 && <div className={styles.connector} />}
                <div className={styles.ladderRow}>
                  {word.split('').map((letter, colIdx) => (
                    <div
                      key={colIdx}
                      className={`${styles.ladderTile} ${
                        isStart ? styles.tileStart : ''
                      } ${isPoke ? styles.tilePoke : ''} ${
                        !isStart && !isPoke ? styles.tileDone : ''
                      } ${changedIdx === colIdx ? styles.tileChanged : ''}`}
                    >
                      {letter.toUpperCase()}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Current input row */}
          {!solved && (
            <>
              <div className={styles.connector} />
              <div
                className={`${styles.inputRow} ${shakeRow ? styles.rowShake : ''}`}
              >
                {Array.from({ length: 4 }, (_, i) => (
                  <div
                    key={i}
                    className={`${styles.inputTile} ${
                      i === currentInput.length ? styles.inputTileActive : ''
                    }`}
                  >
                    {(currentInput[i] || '').toUpperCase()}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Target hint (only show if not yet reached) */}
          {!solved && path[path.length - 1] !== 'poke' && (
            <>
              <div className={styles.connector} />
              <div className={styles.targetRow}>
                {'POKE'.split('').map((letter, i) => (
                  <div key={i} className={styles.targetTile}>
                    {letter}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Keyboard */}
        {!solved && (
          <div className={styles.keyboard} id="bespokle-keyboard">
            {KEYBOARD_ROWS.map((row, rowIdx) => (
              <div key={rowIdx} className={styles.keyRow}>
                {row.map((key) => {
                  const isWide = key === 'ENTER' || key === '⌫';
                  return (
                    <button
                      key={key}
                      className={`${styles.key} ${isWide ? styles.keyWide : ''}`}
                      onClick={() => handleKey(key)}
                    >
                      {key}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== THE BESPOKE REVEAL ===== */}
      {showReveal && (
        <div className={styles.revealOverlay} id="bespoke-reveal">
          <div className={styles.revealGlow} />
          <div className={styles.revealWord}>
            <div className={styles.revealPrefix}>
              {'BES'.split('').map((letter, i) => (
                <div
                  key={`bes-${i}`}
                  className={`${styles.revealLetter} ${styles.revealLetterBes}`}
                >
                  {letter}
                </div>
              ))}
            </div>
            <div className={styles.revealSuffix}>
              {'POKE'.split('').map((letter, i) => (
                <div
                  key={`poke-${i}`}
                  className={`${styles.revealLetter} ${styles.revealLetterPoke}`}
                >
                  {letter}
                </div>
              ))}
            </div>
          </div>
          <p className={styles.revealSubtext}>
            You made it bespoke.
          </p>
          <div className={styles.revealStats}>
            <div className={styles.revealStat}>
              <span className={styles.revealStatValue}>{steps}</span>
              <span className={styles.revealStatLabel}>Steps</span>
            </div>
            <div className={styles.revealStat}>
              <span className={styles.revealStatValue}>{puzzle.par}</span>
              <span className={styles.revealStatLabel}>Fastest route</span>
            </div>
            <div className={styles.revealStat}>
              <span className={styles.revealStatValue}>
                {stepsOverPar === 0 ? '✓' : `+${stepsOverPar}`}
              </span>
              <span className={styles.revealStatLabel}>Extra steps</span>
            </div>
          </div>
          <div className={styles.revealActions}>
            <button
              className="btn btn-primary btn-lg"
              onClick={() => {
                navigator.clipboard.writeText(buildShareGrid());
                showMsg('Copied to clipboard!');
              }}
              id="bespokle-copy"
            >
              📋 Copy Result
            </button>
            <SlackButton id="bespokle-share-slack" />
            <button
              className="btn btn-secondary btn-lg"
              onClick={() => setShowReveal(false)}
              id="bespokle-close"
            >
              Close
            </button>
          </div>
          <div ref={confettiRef} className={styles.confetti} />
        </div>
      )}
    </div>
  );
}
