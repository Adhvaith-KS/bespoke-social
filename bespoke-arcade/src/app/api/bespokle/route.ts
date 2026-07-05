import { NextRequest, NextResponse } from 'next/server';
import { isValidStep, solveLadder, isValid4LetterWord } from '@/lib/ladder-solver';

/**
 * Today's puzzle — in production from bespokle_days table.
 * Seeded with verified puzzles that have confirmed paths to POKE.
 */
function getTodaysPuzzle() {
  const puzzles = [
    { start: 'cold', oneLiner: 'Today you start COLD. Warm it up one letter at a time.' },
    { start: 'fire', oneLiner: 'FIRE to POKE. Shorter than most standups.' },
    { start: 'bone', oneLiner: 'BONE to POKE. Deceptively close, famously annoying.' },
    { start: 'make', oneLiner: 'MAKE to POKE. Three vowels will tempt you, one is right.' },
    { start: 'lake', oneLiner: 'LAKE to POKE. Do not overthink the second letter.' },
    { start: 'core', oneLiner: 'CORE to POKE. One consonant stands between you and glory.' },
    { start: 'wine', oneLiner: 'WINE to POKE. Best solved before your first coffee, allegedly.' },
  ];
  
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const puzzle = puzzles[dayOfYear % puzzles.length];
  
  // Verify the path exists
  const solution = solveLadder(puzzle.start, 'poke');
  
  return {
    ...puzzle,
    par: solution.par,
    solutionPath: solution.path,
    found: solution.found,
  };
}

/**
 * GET: Get today's puzzle metadata (start word, par)
 */
export async function GET() {
  const puzzle = getTodaysPuzzle();
  
  return NextResponse.json({
    date: new Date().toISOString().split('T')[0],
    startWord: puzzle.start,
    target: 'poke',
    par: puzzle.par,
    oneLiner: puzzle.oneLiner,
    hasSolution: puzzle.found,
  });
}

/**
 * POST: Validate a step in the ladder
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { previousWord, nextWord } = body;

    if (!previousWord || !nextWord) {
      return NextResponse.json(
        { error: 'Both previousWord and nextWord are required' },
        { status: 400 }
      );
    }

    const prev = previousWord.toLowerCase().trim();
    const next = nextWord.toLowerCase().trim();

    if (next.length !== 4) {
      return NextResponse.json(
        { error: 'Word must be exactly 4 letters', valid: false },
        { status: 400 }
      );
    }

    if (!isValid4LetterWord(next)) {
      return NextResponse.json(
        { error: 'Not a valid word', valid: false },
        { status: 400 }
      );
    }

    if (!isValidStep(prev, next)) {
      // Check why it's invalid
      let reason = 'Must change exactly one letter';
      const diffCount = prev
        .split('')
        .filter((c: string, i: number) => c !== next[i]).length;
      if (diffCount === 0) reason = 'Same word. Change a letter';
      if (diffCount > 1) reason = `Changed ${diffCount} letters. Only 1 allowed`;
      
      return NextResponse.json(
        { error: reason, valid: false },
        { status: 400 }
      );
    }

    const solved = next === 'poke';
    const puzzle = getTodaysPuzzle();

    return NextResponse.json({
      valid: true,
      solved,
      ...(solved ? { par: puzzle.par } : {}),
    });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
