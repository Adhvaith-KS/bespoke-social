import type { Metadata } from 'next';
import WordleGame from './WordleGame';

export const metadata: Metadata = {
  title: 'Bespoke Wordle · Bespoke Social',
  description: 'Daily 5-letter word from ML and company vocabulary. Guess in 6 tries, share your result with AI commentary.',
};

export default function WordlePage() {
  return <WordleGame />;
}
