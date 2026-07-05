import type { Metadata } from 'next';
import TriviaGame from './TriviaGame';

export const metadata: Metadata = {
  title: 'Company Trivia · Bespoke Social',
  description: 'Three daily questions from the company wiki. Speed bonus for fast answers, source quotes on reveal.',
};

export default function TriviaPage() {
  return <TriviaGame />;
}
