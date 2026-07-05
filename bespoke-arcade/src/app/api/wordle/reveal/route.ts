import { NextResponse } from 'next/server';

/**
 * POST: Reveal the answer (only called when the game is over — 6th failed guess)
 */
export async function POST() {
  const words = ['model', 'train', 'agent', 'token', 'batch', 'epoch', 'layer'];
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const answer = words[dayOfYear % words.length];

  const blurbs: Record<string, string> = {
    model: "The foundation of everything we build. At Bespoke, we do not just use models, we make them bespoke.",
    train: "Whether it's a neural network or a new hire, everything needs training. Ours just costs more in GPU hours.",
    agent: "The autonomous worker of the AI age. Our admin agent runs this very app. It's agents all the way down.",
    token: "The atomic unit of language modeling. Every word you're reading was once a token in someone's context window.",
    batch: "Process them in bulk, ship them fast. Batch size too large? OOM. Too small? Your A100s are napping.",
    epoch: "One full pass through the data. Like a company all-hands, but the model actually learns something each time.",
    layer: "Stack them deep, watch the magic happen. Transformer layers are the building blocks of modern AI.",
  };

  return NextResponse.json({
    answer,
    blurb: blurbs[answer] || "A word close to our hearts at Bespoke Labs.",
  });
}
