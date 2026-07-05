'use client';

import { useEffect, useState } from 'react';
import styles from './cards.module.css';
import Avatar from '@/components/Avatar';
import { PEOPLE } from '@/lib/demo-people';

interface CardView {
  id: string;
  subjectName: string;
  initials: string;
  role: string;
  flavorText: string | null;
  metOn: string | null;
  confirmed: boolean;
}

interface Colleague {
  id: string;
  name: string;
}

interface CardsData {
  live: boolean;
  cards: CardView[];
  colleagues: Colleague[];
  collectedSubjectIds: string[];
}

function formatMetOn(iso: string | null): string {
  if (!iso) return '';
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export default function CardCollection() {
  const [data, setData] = useState<CardsData | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [subjectId, setSubjectId] = useState('');
  const [lines, setLines] = useState('');
  const [minting, setMinting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/cards')
      .then((res) => res.json())
      .then((incoming: CardsData) => {
        if (incoming.live) {
          setData(incoming);
          return;
        }
        // Demo cast: you have had coffee with Tarun, Shrey is still a silhouette
        setData({
          live: false,
          cards: [
            {
              id: 'demo-tarun-card',
              subjectName: PEOPLE[1].name,
              initials: PEOPLE[1].initials,
              role: PEOPLE[1].role,
              flavorText:
                'Explains his entire home network diagram unprompted and somehow makes it riveting',
              metOn: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
              confirmed: true,
            },
          ],
          colleagues: [
            { id: PEOPLE[1].id, name: PEOPLE[1].name },
            { id: PEOPLE[2].id, name: PEOPLE[2].name },
          ],
          collectedSubjectIds: [PEOPLE[1].id],
        });
      })
      .catch(() =>
        setData({ live: false, cards: [], colleagues: [], collectedSubjectIds: [] })
      );
  }, []);

  const showMsg = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3500);
  };

  const mintCard = async () => {
    if (minting) return;
    if (!subjectId) {
      showMsg('Pick the colleague you met.');
      return;
    }
    setMinting(true);
    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId, lines }),
      });
      const result = await res.json();
      if (!res.ok) {
        showMsg(result.error || 'Could not mint the card.');
        return;
      }
      setData((prev) =>
        prev
          ? {
              ...prev,
              cards: [result.card, ...prev.cards],
              collectedSubjectIds: [...prev.collectedSubjectIds, subjectId],
            }
          : prev
      );
      setFormOpen(false);
      setSubjectId('');
      setLines('');
      showMsg(
        result.live
          ? `Card minted! +${result.pointsAwarded} pts. Flavor text incoming.`
          : 'Card minted in demo mode. Connect Supabase to save for real.'
      );
    } catch {
      showMsg('Connection error. Try again.');
    } finally {
      setMinting(false);
    }
  };

  const uncollected =
    data?.colleagues.filter((c) => !data.collectedSubjectIds.includes(c.id)) ??
    [];
  const totalColleagues = data?.colleagues.length ?? 0;

  return (
    <div className="container">
      <div className={styles.cardsPage}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            <span className={styles.titleGradient}>Coffee Chat Cards</span>
          </h1>
          <p className={styles.subtitle}>
            Get matched in #virtual-coffee by the donut bot, actually have the
            chat, then mint their card
          </p>
          <p className={styles.ruleLine}>
            House rule: working on the same team does not count. A card means
            you sat down and talked about life. Your collection shows on your
            profile.
          </p>
          {data && (
            <p className={styles.counter} id="cards-counter">
              🃏 {data.cards.length} of {totalColleagues} colleagues collected
            </p>
          )}
        </div>

        {message && <div className={styles.message}>{message}</div>}

        {/* Mint form */}
        <div className={styles.mintZone}>
          {formOpen ? (
            <div className={styles.mintForm} id="cards-mint-form">
              <div className={styles.mintTitle}>☕ I met someone</div>
              <p className={styles.mintRule}>
                Only mint if the donut bot matched you in #virtual-coffee and
                the chat actually happened
              </p>
              <select
                className={styles.mintSelect}
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
              >
                <option value="">Who did you meet?</option>
                {uncollected.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <textarea
                className={styles.mintInput}
                value={lines}
                onChange={(e) => setLines(e.target.value)}
                placeholder="1-2 lines about them. This becomes their card's flavor text"
                maxLength={400}
                rows={2}
              />
              <div className={styles.mintActions}>
                <button
                  className="btn btn-primary"
                  onClick={mintCard}
                  disabled={minting}
                  id="cards-mint-submit"
                >
                  {minting ? 'Minting…' : 'Mint card (+4 pts)'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setFormOpen(false)}
                  disabled={minting}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              className="btn btn-primary"
              onClick={() => setFormOpen(true)}
              id="cards-met-someone"
            >
              ☕ I met someone
            </button>
          )}
        </div>

        {/* Collection */}
        <div className={styles.grid} id="cards-grid">
          {(data?.cards ?? []).map((card) => (
            <div key={card.id} className={styles.card}>
              <Avatar
                name={card.subjectName}
                photo={PEOPLE.find((p) => p.name === card.subjectName)?.photo}
                size={56}
              />
              <div className={styles.cardName}>{card.subjectName}</div>
              <div className={styles.cardRole}>{card.role}</div>
              {card.flavorText && (
                <p className={styles.cardFlavor}>{card.flavorText}</p>
              )}
              <div className={styles.cardFooter}>
                <span>{formatMetOn(card.metOn)}</span>
                <span
                  className={
                    card.confirmed ? styles.confirmed : styles.pending
                  }
                >
                  {card.confirmed ? '✓ Confirmed' : '⏳ Pending'}
                </span>
              </div>
            </div>
          ))}

          {/* Silhouettes for the completionist itch */}
          {uncollected.map((c) => (
            <div key={c.id} className={styles.silhouette}>
              <div className={styles.silhouetteAvatar}>?</div>
              <div className={styles.silhouetteName}>{c.name}</div>
              <div className={styles.silhouetteHint}>
                Waiting on a donut match
              </div>
            </div>
          ))}
        </div>

        {data && !data.live && (
          <p className={styles.demoNote}>
            Demo collection. Connect Supabase to mint real cards.
          </p>
        )}
      </div>
    </div>
  );
}
