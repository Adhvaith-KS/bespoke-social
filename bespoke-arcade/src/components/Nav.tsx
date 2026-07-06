'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Nav.module.css';
import { MascotFace } from './Mascot';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { href: '/', label: 'Today', icon: '🏠' },
  { href: '/wordle', label: 'Bespoke Wordle', icon: '🔤' },
  { href: '/trivia', label: 'Trivia', icon: '🧠' },
  { href: '/bereal', label: 'BE(spoke)REAL', icon: '📸' },
  { href: '/ttal', label: '2 Truths 1 Lie', icon: '🎭' },
  { href: '/bespokle', label: 'Bespokle', icon: '🪜' },
  { href: '/story', label: 'Story', icon: '📖' },
  { href: '/cards', label: 'Cards', icon: '🃏' },
  { href: '/digest', label: 'Weekly culture digest', icon: '📰' },
  { href: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
  { href: '/me', label: 'My profile', icon: '👤' },
];

/**
 * Left sidebar rail — brand block, stacked nav with stamped active state,
 * and the mission sticky-note. Collapses to a grid on small screens.
 */
export default function Nav() {
  const pathname = usePathname();

  // The login page stands alone — no rail
  if (pathname === '/login') return null;

  return (
    <aside className={styles.rail} id="main-nav">
      <Link href="/" className={styles.brand}>
        <span className={styles.brandMark}>
          <MascotFace size={30} />
        </span>
        <span className={styles.brandTitle}>Bespoke Social</span>
      </Link>

      <nav className={styles.navList}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navItem} ${
              pathname === item.href ? styles.navItemActive : ''
            }`}
            id={`nav-${item.label.toLowerCase()}`}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className={styles.railNote}>
        <strong>Play daily, earn bespoke social points.</strong>
        <span>Baabbage is watching the leaderboard.</span>
      </div>

      {process.env.NEXT_PUBLIC_SUPABASE_URL && (
        <form action="/auth/signout" method="post">
          <button type="submit" className={styles.signOut} id="nav-signout">
            Sign out
          </button>
        </form>
      )}
    </aside>
  );
}
