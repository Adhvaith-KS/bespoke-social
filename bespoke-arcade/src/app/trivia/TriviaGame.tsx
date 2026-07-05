'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import styles from './trivia.module.css';
import SlackButton from '@/components/SlackButton';
import Avatar from '@/components/Avatar';
import { ME, PEOPLE } from '@/lib/demo-people';

interface TriviaQuestion {
  index: number;
  question: string;
  options: string[];
  timeLimit: number;
}

interface AnswerResult {
  correct: boolean;
  correctIndex: number;
  sourceQuote: string;
  points: number;
  speedBonus: number;
  answeredIn?: number;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export default function TriviaGame() {
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [answers, setAnswers] = useState<AnswerResult[]>([]);
  const [timeLeft, setTimeLeft] = useState(20);
  const [gameOver, setGameOver] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  // Fetch questions
  useEffect(() => {
    fetch('/api/trivia')
      .then((res) => res.json())
      .then((data) => {
        setQuestions(data.questions);
        setLoading(false);
        startTimeRef.current = Date.now();
      });
  }, []);

  const showMsg = useCallback((msg: string, duration = 1500) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), duration);
  }, []);

  const handleAnswer = useCallback(
    async (answerIndex: number) => {
      if (result || !questions[currentQ]) return;

      if (timerRef.current) clearInterval(timerRef.current);

      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      setSelectedAnswer(answerIndex);

      try {
        const res = await fetch('/api/trivia', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questionIndex: currentQ,
            answerIndex,
            answeredInSeconds: elapsed,
          }),
        });

        const data: AnswerResult = { ...(await res.json()), answeredIn: elapsed };
        setResult(data);
        setAnswers((prev) => [...prev, data]);

        if (data.correct) {
          if (data.speedBonus > 0) {
            showMsg(`✓ Correct! +${data.speedBonus} speed bonus!`);
          } else {
            showMsg('✓ Correct!');
          }
        } else if (answerIndex === -1) {
          showMsg("⏱ Time's up!");
        } else {
          showMsg('✗ Not quite!');
        }
      } catch {
        showMsg('Connection error');
      }
    },
    [currentQ, questions, result, showMsg]
  );

  const nextQuestion = useCallback(() => {
    if (currentQ + 1 >= questions.length) {
      setGameOver(true);
    } else {
      setCurrentQ((prev) => prev + 1);
      setSelectedAnswer(null);
      setResult(null);
      setTimeLeft(20);
      startTimeRef.current = Date.now();
    }
  }, [currentQ, questions.length]);

  // Timer: the clock is reset by the handlers that advance questions;
  // this effect only runs the countdown interval
  useEffect(() => {
    if (loading || gameOver || result) return;

    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const remaining = Math.max(0, 20 - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timerRef.current!);
        // Auto-submit wrong answer on timeout
        handleAnswer(-1);
      }
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentQ, loading, gameOver, result, handleAnswer]);

  // Keyboard shortcuts (1-4 for answers, Enter for next)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) return;

      if (!result) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= 4) {
          e.preventDefault();
          handleAnswer(num - 1);
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        nextQuestion();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [result, handleAnswer, nextQuestion]);

  if (loading) {
    return (
      <div className="container">
        <div className={styles.trivia}>
          <div className={styles.header}>
            <h1 className={styles.title}>
              <span className={styles.titleGradient}>Company Trivia</span>
            </h1>
            <p className={styles.subtitle}>Loading today&apos;s questions...</p>
          </div>
        </div>
      </div>
    );
  }

  const totalPoints = answers.reduce((sum, a) => sum + a.points, 0);
  const totalCorrect = answers.filter((a) => a.correct).length;
  const totalSpeedBonus = answers.reduce((sum, a) => sum + a.speedBonus, 0);
  const question = questions[currentQ];
  const timerPercent = (timeLeft / 20) * 100;
  const timerClass =
    timeLeft > 10
      ? styles.timerSafe
      : timeLeft > 5
      ? styles.timerWarning
      : styles.timerDanger;

  return (
    <div className="container">
      <div className={styles.trivia}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>
            <span className={styles.titleGradient}>Company Trivia</span>
          </h1>
          <p className={styles.subtitle}>
            4 questions • 20 seconds each
          </p>
          <p className={styles.bonusRule}>
            Speed bonus on correct answers: +3 under 5s · +2 under 10s · +1 under 15s
          </p>
        </div>

        {/* Message */}
        {message && (
          <div className={styles.message}>{message}</div>
        )}

        {/* Progress dots */}
        <div className={styles.progress}>
          {questions.map((_, i) => (
            <div
              key={i}
              className={`${styles.progressDot} ${
                i < answers.length
                  ? answers[i].correct
                    ? styles.progressCorrect
                    : styles.progressWrong
                  : i === currentQ && !gameOver
                  ? styles.progressCurrent
                  : ''
              }`}
            />
          ))}
        </div>

        {!gameOver && question && (
          <>
            {/* Timer */}
            {!result && (
              <>
                <div className={styles.timerBar}>
                  <div
                    className={`${styles.timerFill} ${timerClass}`}
                    style={{ width: `${timerPercent}%` }}
                  />
                </div>
                <div className={styles.timerLabel}>
                  {Math.ceil(timeLeft)}s
                </div>
              </>
            )}

            {/* Question */}
            <div className={styles.questionCard} key={currentQ}>
              <div className={styles.questionNumber}>
                Question {currentQ + 1} of {questions.length}
              </div>
              <h2 className={styles.questionText}>{question.question}</h2>

              <div className={styles.options}>
                {question.options.map((option, i) => {
                  let optionClass = styles.option;
                  if (result) {
                    optionClass += ` ${styles.optionDisabled}`;
                    if (i === result.correctIndex) {
                      optionClass += ` ${styles.optionCorrect}`;
                    } else if (i === selectedAnswer && !result.correct) {
                      optionClass += ` ${styles.optionWrong}`;
                    }
                  }

                  return (
                    <button
                      key={i}
                      className={optionClass}
                      onClick={() => handleAnswer(i)}
                      disabled={!!result}
                      id={`option-${i}`}
                    >
                      <span className={styles.optionLetter}>
                        {OPTION_LETTERS[i]}
                      </span>
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reveal */}
            {result && (
              <>
                <div className={styles.reveal}>
                  <div className={styles.revealLabel}>💡 The full story</div>
                  <p className={styles.revealQuote}>
                    {result.sourceQuote}
                  </p>
                  <div className={styles.revealPoints}>
                    <span className={styles.revealPointsValue}>
                      +{result.points} pts
                    </span>
                    {result.answeredIn !== undefined && (
                      <span style={{ color: 'var(--text-muted)' }}>
                        answered in {result.answeredIn.toFixed(1)}s
                      </span>
                    )}
                    {result.speedBonus > 0 && (
                      <span style={{ color: 'var(--accent-amber-light)' }}>
                        ⚡ +{result.speedBonus} speed
                      </span>
                    )}
                  </div>
                  <button
                    className={styles.disputeBtn}
                    onClick={() => showMsg('Dispute flagged for agent review')}
                  >
                    🚩 Dispute this question
                  </button>
                </div>

                <button
                  className={`btn btn-primary ${styles.nextBtn}`}
                  onClick={nextQuestion}
                  id="trivia-next"
                >
                  {currentQ + 1 < questions.length
                    ? 'Next Question →'
                    : 'See Results'}
                </button>
              </>
            )}
          </>
        )}

        {/* Results */}
        {gameOver && (
          <div className={styles.results} id="trivia-results">
            <h2 className={styles.resultsTitle}>
              {totalCorrect === questions.length
                ? '🎉 Perfect Score!'
                : totalCorrect >= 2
                ? '👏 Well Done!'
                : '📚 Keep Learning!'}
            </h2>
            <div className={styles.resultsScore}>{totalPoints}</div>
            <div className={styles.resultsLabel}>Total Points</div>

            <div className={styles.resultsGrid}>
              <div className={styles.resultsStat}>
                <div className={styles.resultsStatValue}>
                  {totalCorrect}/{questions.length}
                </div>
                <div className={styles.resultsStatLabel}>Correct</div>
              </div>
              <div className={styles.resultsStat}>
                <div className={styles.resultsStatValue}>
                  +{totalSpeedBonus}
                </div>
                <div className={styles.resultsStatLabel}>Speed Bonus</div>
              </div>
              <div className={styles.resultsStat}>
                <div className={styles.resultsStatValue}>
                  {totalPoints > 0
                    ? `${Math.round((totalPoints / 32) * 100)}%`
                    : '0%'}
                </div>
                <div className={styles.resultsStatLabel}>Of Max Score</div>
              </div>
            </div>

            <div className={styles.resultsActions}>
              <button
                className="btn btn-primary btn-lg"
                onClick={() => {
                  const text = `${ME.name} · Bespoke Trivia ${totalCorrect}/${questions.length} correct, ${totalPoints} pts (⚡ +${totalSpeedBonus} speed)`;
                  navigator.clipboard.writeText(text);
                  showMsg('Copied to clipboard!');
                }}
                id="trivia-copy"
              >
                📋 Copy Result
              </button>
              <SlackButton id="trivia-share" />
            </div>

            {/* Today's trivia board */}
            <div className={styles.todayBoard} id="trivia-today-board">
              <div className={styles.todayBoardTitle}>Today&apos;s trivia board</div>
              {[
                { person: ME, pts: totalPoints, detail: `${totalCorrect}/${questions.length} correct` },
                { person: PEOPLE[1], pts: 24, detail: '4/4 correct' },
                { person: PEOPLE[2], pts: 14, detail: '3/4 correct' },
              ]
                .sort((a, b) => b.pts - a.pts)
                .map((row, i) => (
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
                    <span className={styles.todayDetail}>{row.detail}</span>
                    <span className={styles.todayScore}>{row.pts} pts</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
