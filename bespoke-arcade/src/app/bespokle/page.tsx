import type { Metadata } from 'next';
import BespokleGame from './BespokleGame';

export const metadata: Metadata = {
  title: 'Bespokle · Bespoke Social',
  description: 'Daily word ladder puzzle. Transform a start word into POKE, one letter at a time. Solve it and watch BES slide in for the BESPOKE reveal.',
};

export default function BespoklePage() {
  return <BespokleGame />;
}
