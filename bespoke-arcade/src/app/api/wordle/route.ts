import { NextRequest, NextResponse } from 'next/server';
import { evaluateGuess, type LetterStatus } from '@/lib/wordle-dictionary';

/**
 * Today's word — in production this comes from the DB (wordle_days table).
 * For now, we use a seeded word so the game is playable immediately.
 */
function getTodaysWord(): string {
  // Rotate through a small set based on date for demo purposes
  const words = ['model', 'train', 'agent', 'token', 'batch', 'epoch', 'layer'];
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  );
  return words[dayOfYear % words.length];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { guess } = body;

    if (!guess || typeof guess !== 'string' || guess.length !== 5) {
      return NextResponse.json(
        { error: 'Guess must be exactly 5 letters' },
        { status: 400 }
      );
    }

    const normalizedGuess = guess.toLowerCase().trim();

    // Any five letters count as a guess — a dictionary gate kept
    // rejecting perfectly common words and it wasn't worth the friction
    if (!/^[a-z]{5}$/.test(normalizedGuess)) {
      return NextResponse.json(
        { error: 'Letters only, five of them', valid: false },
        { status: 400 }
      );
    }

    const answer = getTodaysWord();
    const result: LetterStatus[] = evaluateGuess(normalizedGuess, answer);
    const solved = normalizedGuess === answer;

    return NextResponse.json({
      valid: true,
      result,
      solved,
      // Only reveal the answer if the game is over (solved or 6th guess)
      ...(solved ? { answer, blurb: getBlurb(answer) } : {}),
    });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}

/**
 * GET: Check if user has already played today + get game metadata
 */
export async function GET() {
  return NextResponse.json({
    date: new Date().toISOString().split('T')[0],
    wordLength: 5,
    maxGuesses: 6,
    // Never send the answer to the client
    hasBlurb: true,
  });
}

function getBlurb(word: string): string {
  const blurbs: Record<string, string> = {
    model: "The foundation of everything we build. At Bespoke, we do not just use models, we make them bespoke.",
    train: "Whether it's a neural network or a new hire, everything needs training. Ours just costs more in GPU hours.",
    agent: "The autonomous worker of the AI age. Our admin agent runs this very app. It's agents all the way down.",
    token: "The atomic unit of language modeling. Every word you're reading was once a token in someone's context window.",
    batch: "Process them in bulk, ship them fast. Batch size too large? OOM. Too small? Your A100s are napping.",
    epoch: "One full pass through the data. Like a company all-hands, but the model actually learns something each time.",
    layer: "Stack them deep, watch the magic happen. Transformer layers are the building blocks of modern AI.",
  };
  return blurbs[word] || "A word close to our hearts at Bespoke Labs.";
}
