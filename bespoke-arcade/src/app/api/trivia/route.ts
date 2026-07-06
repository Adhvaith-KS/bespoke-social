import { NextRequest, NextResponse } from 'next/server';

/**
 * Today's trivia questions — in production from trivia_days table.
 * Demo mix: 2 company lore, 1 tech (with a real explanation on reveal),
 * 1 general. Four questions total. Not everything is about tech —
 * Bespoke is not just engineers.
 */
function getTodaysQuestions() {
  return [
    {
      q: 'What does the donut bot in #virtual-coffee actually do?',
      options: [
        'Pairs two teammates for a casual chat',
        'Orders donuts to the office',
        'Reviews pull requests',
        'Schedules standups',
      ],
      answer_index: 0,
      source_quote:
        'The donut bot matches two random teammates every cycle for a coffee chat about anything but work. Finish one and you can mint their card in Bespoke Social.',
    },
    {
      q: 'Bespoke Labs built an open source library for synthetic data curation. What is it called?',
      options: ['Curator', 'Forge', 'Alchemist', 'Distiller'],
      answer_index: 0,
      source_quote:
        'Curator is our open source Python library for synthetic data generation and post-training data curation. It powers OpenThoughts, the open reasoning dataset with over a hundred public models trained on it.',
    },
    {
      q: 'When people say a model hallucinated, what actually happened?',
      options: [
        'It stated something false with total confidence',
        'It refused to answer the question',
        'It ran out of memory mid-answer',
        'It repeated the prompt back',
      ],
      answer_index: 0,
      source_quote:
        'Models predict the most likely next words rather than checking facts, so they can produce confident answers that are simply wrong. That is a hallucination, and it is why grounding answers in real sources matters so much.',
    },
    {
      q: 'The word bespoke originally comes from which trade?',
      options: ['Tailoring', 'Carpentry', 'Printing', 'Shoemaking'],
      answer_index: 0,
      source_quote:
        'In old tailoring shops, cloth a customer had claimed was said to be bespoken for. Made-to-order suits became bespoke, and centuries later a certain company borrowed the word.',
    },
  ];
}

/**
 * GET: Get today's trivia questions (without answers)
 */
export async function GET() {
  const questions = getTodaysQuestions();

  return NextResponse.json({
    date: new Date().toISOString().split('T')[0],
    questions: questions.map((q, i) => ({
      index: i,
      question: q.q,
      options: q.options,
      timeLimit: 20,
    })),
    totalQuestions: questions.length,
  });
}

/**
 * POST: Submit an answer
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { questionIndex, answerIndex, answeredInSeconds } = body;

    const questions = getTodaysQuestions();

    if (questionIndex < 0 || questionIndex >= questions.length) {
      return NextResponse.json(
        { error: 'Invalid question index' },
        { status: 400 }
      );
    }

    const question = questions[questionIndex];
    const correct = answerIndex === question.answer_index;

    // Speed bonus: 3 points for < 5s, 2 for < 10s, 1 for < 15s, 0 for >= 15s
    let speedBonus = 0;
    if (correct && answeredInSeconds < 5) speedBonus = 3;
    else if (correct && answeredInSeconds < 10) speedBonus = 2;
    else if (correct && answeredInSeconds < 15) speedBonus = 1;

    const points = correct ? 5 + speedBonus : 0;

    return NextResponse.json({
      correct,
      correctIndex: question.answer_index,
      sourceQuote: question.source_quote,
      points,
      speedBonus,
    });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
