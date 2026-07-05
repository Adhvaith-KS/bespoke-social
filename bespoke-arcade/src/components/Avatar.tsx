'use client';

import { useState } from 'react';
import styles from './Avatar.module.css';

interface AvatarProps {
  name: string;
  photo?: string;
  /** Pixel size of the circle. */
  size?: number;
}

/**
 * Gold coin avatar — shows the person's photo when it exists in
 * /public/profiles/, otherwise their initial on the gold coin.
 */
export default function Avatar({ name, photo, size = 40 }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  const dimension = { width: size, height: size, fontSize: size * 0.42 };

  if (photo && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt={name}
        className={styles.avatar}
        style={dimension}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span className={styles.avatar} style={dimension} aria-label={name}>
      {initials}
    </span>
  );
}
