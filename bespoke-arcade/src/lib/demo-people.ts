/**
 * The demo cast. Until the backend owns identity, every face in the app
 * is one of these three people. Photos live in /public/profiles/ as
 * adhvaith.png, tarun.png, shrey.png (Avatar falls back to initials if a
 * file is missing).
 */

export interface Person {
  id: string;
  name: string;
  initials: string;
  role: string;
  photo: string;
}

export const PEOPLE: Person[] = [
  {
    id: 'adhvaith',
    name: 'Adhvaith',
    initials: 'A',
    role: 'Bespoke Labs',
    photo: '/profiles/adhvaith.png',
  },
  {
    id: 'tarun',
    name: 'Tarun',
    initials: 'T',
    role: 'Bespoke Labs',
    photo: '/profiles/tarun.png',
  },
  {
    id: 'shrey',
    name: 'Shrey',
    initials: 'S',
    role: 'Bespoke Labs',
    photo: '/profiles/shrey.png',
  },
];

/** The signed-in player for demo purposes. */
export const ME = PEOPLE[0];

export function personById(id: string): Person | undefined {
  return PEOPLE.find((p) => p.id === id);
}

/** Deterministic pick that rotates daily — used for whose-turn features. */
export function personOfTheDay(offset = 0): Person {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return PEOPLE[(dayOfYear + offset) % PEOPLE.length];
}
