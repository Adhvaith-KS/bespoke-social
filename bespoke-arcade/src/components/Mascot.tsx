/**
 * The mascot — a robotic goat who lives inside Bespoke Social and the
 * company Slack. His job is making sure everyone is having fun.
 *
 * Name is a working title (user is still deciding). Change it here and
 * it changes everywhere: intro card, commentary bylines, digest, worker
 * persona references.
 */

export const MASCOT = {
  name: 'Baabbage',
  title: 'Culture Overlord',
  titleNote: 'title under review',
};

interface MascotFaceProps {
  size?: number;
}

/** Robotic goat head, paper-and-ink style. */
export function MascotFace({ size = 120 }: MascotFaceProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label={`${MASCOT.name} the robotic goat`}
    >
      {/* Horns */}
      <path
        d="M30 34 Q 14 22 18 6 Q 34 12 40 28 Z"
        fill="#e24a3b"
        stroke="#181713"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M90 34 Q 106 22 102 6 Q 86 12 80 28 Z"
        fill="#e24a3b"
        stroke="#181713"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Antenna */}
      <line x1="60" y1="22" x2="60" y2="10" stroke="#181713" strokeWidth="2.5" />
      <circle cx="60" cy="8" r="4" fill="#e0a12b" stroke="#181713" strokeWidth="2" />
      {/* Ears */}
      <path
        d="M22 48 Q 6 52 8 64 Q 20 64 28 56 Z"
        fill="#e0a12b"
        stroke="#181713"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M98 48 Q 114 52 112 64 Q 100 64 92 56 Z"
        fill="#e0a12b"
        stroke="#181713"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Head plate */}
      <rect
        x="26"
        y="24"
        width="68"
        height="62"
        rx="14"
        fill="#fffdf8"
        stroke="#181713"
        strokeWidth="3"
      />
      {/* Faceplate seam */}
      <line x1="26" y1="62" x2="94" y2="62" stroke="#d8cdbb" strokeWidth="2" />
      {/* Eyes: teal LEDs */}
      <rect x="38" y="40" width="16" height="12" rx="3" fill="#009a9a" stroke="#181713" strokeWidth="2" />
      <rect x="66" y="40" width="16" height="12" rx="3" fill="#009a9a" stroke="#181713" strokeWidth="2" />
      <circle cx="46" cy="46" r="2.2" fill="#fffdf8" />
      <circle cx="74" cy="46" r="2.2" fill="#fffdf8" />
      {/* Cheek bolts */}
      <circle cx="33" cy="56" r="2.5" fill="#d8cdbb" stroke="#181713" strokeWidth="1.5" />
      <circle cx="87" cy="56" r="2.5" fill="#d8cdbb" stroke="#181713" strokeWidth="1.5" />
      {/* Muzzle */}
      <rect
        x="42"
        y="66"
        width="36"
        height="20"
        rx="8"
        fill="#f4ecd9"
        stroke="#181713"
        strokeWidth="2.5"
      />
      {/* Nostrils */}
      <circle cx="53" cy="74" r="2.4" fill="#181713" />
      <circle cx="67" cy="74" r="2.4" fill="#181713" />
      {/* Smile */}
      <path d="M52 80 Q 60 85 68 80" fill="none" stroke="#181713" strokeWidth="2" strokeLinecap="round" />
      {/* Wire goatee */}
      <path
        d="M54 86 Q 56 98 60 106 Q 64 98 66 86"
        fill="#315fba"
        stroke="#181713"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle cx="60" cy="108" r="3" fill="#e0a12b" stroke="#181713" strokeWidth="1.8" />
    </svg>
  );
}
