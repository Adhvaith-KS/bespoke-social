'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './wordle.module.css';
import type { LetterStatus } from '@/lib/wordle-dictionary';
import SlackButton from '@/components/SlackButton';
import Avatar from '@/components/Avatar';
import { ME, PEOPLE } from '@/lib/demo-people';

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫'],
];

interface GuessResult {
  guess: string;
  result: LetterStatus[];
}

export default function WordleGame() {
  const [guesses, setGuesses] = useState<GuessResult[]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [solved, setSolved] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [shakeRow, setShakeRow] = useState(false);
  const [keyStates, setKeyStates] = useState<Record<string, LetterStatus>>({});
  const [answer, setAnswer] = useState<string | null>(null);
  const [blurb, setBlurb] = useState<string | null>(null);
  const [startTime] = useState(() => Date.now());
  const [duration, setDuration] = useState(0);

  const maxGuesses = 6;

  const showMessage = useCallback((msg: string, duration = 1500) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), duration);
  }, []);

  const updateKeyStates = useCallback(
    (guess: string, result: LetterStatus[]) => {
      setKeyStates((prev) => {
        const next = { ...prev };
        guess.split('').forEach((letter, i) => {
          const key = letter.toUpperCase();
          const status = result[i];
          // Priority: correct > present > absent (never downgrade)
          if (next[key] === 'correct') return;
          if (next[key] === 'present' && status === 'absent') return;
          next[key] = status;
        });
        return next;
      });
    },
    []
  );

  const submitGuess = useCallback(async () => {
    if (currentGuess.length !== 5) {
      showMessage('Not enough letters');
      setShakeRow(true);
      setTimeout(() => setShakeRow(false), 400);
      return;
    }

    try {
      const res = await fetch('/api/wordle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guess: currentGuess }),
      });

      const data = await res.json();

      if (!res.ok) {
        showMessage(data.error || 'Not a valid word');
        setShakeRow(true);
        setTimeout(() => setShakeRow(false), 400);
        return;
      }

      const newGuess: GuessResult = {
        guess: currentGuess.toUpperCase(),
        result: data.result,
      };

      const newGuesses = [...guesses, newGuess];
      setGuesses(newGuesses);
      setCurrentGuess('');
      updateKeyStates(currentGuess, data.result);

      if (data.solved) {
        setSolved(true);
        setGameOver(true);
        setDuration(Math.round((Date.now() - startTime) / 1000));
        setAnswer(data.answer);
        setBlurb(data.blurb);
        const messages = ['Genius!', 'Magnificent!', 'Impressive!', 'Splendid!', 'Great!', 'Phew!'];
        showMessage(messages[newGuesses.length - 1] || 'Nice!', 2500);
      } else if (newGuesses.length >= maxGuesses) {
        // Fetch the answer on failure
        setGameOver(true);
        setDuration(Math.round((Date.now() - startTime) / 1000));
        const metaRes = await fetch('/api/wordle/reveal', { method: 'POST' });
        if (metaRes.ok) {
          const meta = await metaRes.json();
          setAnswer(meta.answer);
          setBlurb(meta.blurb);
        }
        showMessage('Better luck tomorrow!', 3000);
      }
    } catch {
      showMessage('Connection error');
    }
  }, [currentGuess, guesses, showMessage, updateKeyStates, startTime]);

  const handleKey = useCallback(
    (key: string) => {
      if (gameOver) return;

      if (key === 'ENTER') {
        submitGuess();
      } else if (key === '⌫' || key === 'BACKSPACE') {
        setCurrentGuess((prev) => prev.slice(0, -1));
      } else if (/^[A-Z]$/i.test(key) && currentGuess.length < 5) {
        setCurrentGuess((prev) => prev + key.toUpperCase());
      }
    },
    [currentGuess, gameOver, submitGuess]
  );

  // Physical keyboard handler
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

  const getEmojiGrid = () => {
    return guesses
      .map((g) =>
        g.result
          .map((s) => (s === 'correct' ? '🟩' : s === 'present' ? '🟨' : '⬛'))
          .join('')
      )
      .join('\n');
  };

  const handleCopyResult = () => {
    const score = solved ? guesses.length : 'X';
    const text = `${ME.name} · Bespoke Wordle ${score}/${maxGuesses}\n\n${getEmojiGrid()}`;
    navigator.clipboard.writeText(text);
    showMessage('Copied to clipboard!');
  };

  // Today's standings — demo data until attempts persist server-side.
  // The player's own live result slots in for their row.
  const todaysBoard = [
    { person: ME, score: solved ? `${guesses.length}/6` : 'X/6', done: true },
    { person: PEOPLE[1], score: '4/6', done: true },
    { person: PEOPLE[2], score: '5/6', done: true },
  ].sort((a, b) => {
    const rank = (s: string) => (s.startsWith('X') ? 99 : parseInt(s));
    return rank(a.score) - rank(b.score);
  });

  // Render tile
  const renderTile = (
    rowIndex: number,
    colIndex: number,
    letter: string,
    status?: LetterStatus
  ) => {
    const isCurrentRow = rowIndex === guesses.length;
    const isFilled = letter !== '';
    const statusClass = status
      ? status === 'correct'
        ? styles.tileCorrect
        : status === 'present'
        ? styles.tilePresent
        : styles.tileAbsent
      : '';

    return (
      <div
        key={`${rowIndex}-${colIndex}`}
        className={`${styles.tile} ${isFilled ? styles.tileFilled : ''} ${statusClass} ${
          isCurrentRow && colIndex === currentGuess.length ? styles.tileActive : ''
        }`}
        style={status ? { animationDelay: `${colIndex * 100}ms` } : undefined}
      >
        {letter}
      </div>
    );
  };

  return (
    <div className="container">
      <div className={styles.wordlePage}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>
            <span className={styles.titleGradient}>Bespoke Wordle</span>
          </h1>
          <p className={styles.subtitle}>
            Guess the 5-letter word in 6 tries • ML &amp; company themed
          </p>
        </div>

        {/* Message */}
        {message && (
          <div className={styles.message} id="wordle-message">
            {message}
          </div>
        )}

        {/* Grid */}
        <div className={styles.grid} id="wordle-grid">
          {Array.from({ length: maxGuesses }, (_, rowIndex) => {
            const guess = guesses[rowIndex];
            const isCurrentRow = rowIndex === guesses.length && !gameOver;

            return (
              <div
                key={rowIndex}
                className={`${styles.row} ${
                  isCurrentRow && shakeRow ? styles.rowShake : ''
                }`}
              >
                {Array.from({ length: 5 }, (_, colIndex) => {
                  if (guess) {
                    return renderTile(
                      rowIndex,
                      colIndex,
                      guess.guess[colIndex],
                      guess.result[colIndex]
                    );
                  }
                  if (isCurrentRow) {
                    return renderTile(
                      rowIndex,
                      colIndex,
                      currentGuess[colIndex] || ''
                    );
                  }
                  return renderTile(rowIndex, colIndex, '');
                })}
              </div>
            );
          })}
        </div>

        {/* Result */}
        {gameOver && answer && (
          <div className={styles.result} id="wordle-result">
            <h2 className={styles.resultTitle}>
              {solved ? '🎉 You got it!' : '😔 Not this time'}
            </h2>
            <p className={styles.resultWord}>{answer}</p>
            {blurb && <p className={styles.resultBlurb}>{blurb}</p>}
            <div className={styles.resultStats}>
              <div className={styles.resultStat}>
                <span className={styles.resultStatValue}>
                  {solved ? guesses.length : '✗'}
                </span>
                <span className={styles.resultStatLabel}>Guesses</span>
              </div>
              <div className={styles.resultStat}>
                <span className={styles.resultStatValue}>{duration}s</span>
                <span className={styles.resultStatLabel}>Time</span>
              </div>
            </div>
            <div className={styles.resultGrid}>
              {getEmojiGrid().split('\n').map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
            <div className={styles.resultActions}>
              <button
                className="btn btn-primary btn-lg"
                onClick={handleCopyResult}
                id="wordle-copy"
              >
                📋 Copy Result
              </button>
              <SlackButton id="wordle-share-slack" />
            </div>

            {/* Today at the Arcade — who cracked it and how fast */}
            <div className={styles.todayBoard} id="wordle-today-board">
              <div className={styles.todayBoardTitle}>Today&apos;s Wordle board</div>
              {todaysBoard.map((row, i) => (
                <div
                  key={row.person.id}
                  className={`${styles.todayRow} ${
                    row.person.id === ME.id ? styles.todayRowMe : ''
                  }`}
                >
                  <span className={styles.todayRank}>{i + 1}</span>
                  <Avatar name={row.person.name} photo={row.person.photo} size={30} />
                  <span className={styles.todayName}>
                    {row.person.name}
                    {row.person.id === ME.id ? ' (you)' : ''}
                  </span>
                  <span className={styles.todayScore}>{row.score}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Keyboard */}
        {!gameOver && (
          <div className={styles.keyboard} id="wordle-keyboard">
            {KEYBOARD_ROWS.map((row, rowIdx) => (
              <div key={rowIdx} className={styles.keyRow}>
                {row.map((key) => {
                  const isWide = key === 'ENTER' || key === '⌫';
                  const keyState = keyStates[key];
                  const stateClass = keyState
                    ? keyState === 'correct'
                      ? styles.keyCorrect
                      : keyState === 'present'
                      ? styles.keyPresent
                      : styles.keyAbsent
                    : '';

                  return (
                    <button
                      key={key}
                      className={`${styles.key} ${isWide ? styles.keyWide : ''} ${stateClass}`}
                      onClick={() => handleKey(key)}
                      id={`key-${key.toLowerCase()}`}
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
    </div>
  );
}
