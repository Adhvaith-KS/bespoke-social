'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './bereal.module.css';
import Avatar from '@/components/Avatar';
import { ME, PEOPLE } from '@/lib/demo-people';

interface FeedPost {
  id: string;
  userName: string;
  photo?: string;
  imageUrl: string;
  caption: string | null;
  postedAt: string;
  likes: number;
  likedByMe: boolean;
}

interface FeedData {
  live: boolean;
  date: string;
  prompt: string;
  posts: FeedPost[];
}

// Demo posts use real images from /public/bereal/ (bereal1 is reserved
// for the digest's best-of-week feature)
const DEMO_POSTS: FeedPost[] = [
  {
    id: 'demo-tarun',
    userName: PEOPLE[1].name,
    photo: PEOPLE[1].photo,
    imageUrl: '/bereal/bereal2.png',
    caption: 'Walked two extra blocks for this angle and I regret nothing',
    postedAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    likes: 4,
    likedByMe: false,
  },
  {
    id: 'demo-shrey',
    userName: PEOPLE[2].name,
    photo: PEOPLE[2].photo,
    imageUrl: '/bereal/bereal3.png',
    caption: 'The weekend said golden hour and I said say less',
    postedAt: new Date(Date.now() - 6 * 3600000).toISOString(),
    likes: 7,
    likedByMe: false,
  },
];

/** Downscale to max 1280px JPEG so uploads stay small. */
function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const maxDim = 1280;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image'));
    };
    img.src = url;
  });
}

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
}

export default function BeRealFeed() {
  const [data, setData] = useState<FeedData | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>(DEMO_POSTS);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [posting, setPosting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/bereal')
      .then((res) => res.json())
      .then((incoming: FeedData) => {
        setData(incoming);
        if (incoming.live && incoming.posts.length > 0) {
          setPosts(incoming.posts.map((p) => ({ ...p, likes: p.likes ?? 0, likedByMe: false })));
        }
      })
      .catch(() =>
        setData({ live: false, date: '', prompt: 'Could not load today. Refresh to retry.', posts: [] })
      );
  }, []);

  const showMsg = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  };

  const onFilePicked = async (file: File | undefined) => {
    if (!file) return;
    try {
      setPreview(await resizeImage(file));
    } catch {
      showMsg('Could not read that image. Try another file.');
    }
  };

  const submitPost = async () => {
    if (!preview || posting) return;
    setPosting(true);
    try {
      const res = await fetch('/api/bereal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl: preview, caption: caption.trim() }),
      });
      const result = await res.json();
      if (!res.ok) {
        showMsg(result.error || 'Upload failed. Try again.');
        return;
      }
      const newPost: FeedPost = {
        id: result.post?.id ?? `local-${Date.now()}`,
        userName: ME.name,
        photo: ME.photo,
        imageUrl: preview,
        caption: caption.trim() || null,
        postedAt: new Date().toISOString(),
        likes: 0,
        likedByMe: false,
      };
      setPosts((prev) => [newPost, ...prev]);
      setPreview(null);
      setCaption('');
      showMsg('Posted! You just earned bespoke social points.');
    } catch {
      showMsg('Connection error. Try again.');
    } finally {
      setPosting(false);
    }
  };

  const toggleLike = (id: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              likedByMe: !p.likedByMe,
              likes: p.likes + (p.likedByMe ? -1 : 1),
            }
          : p
      )
    );
  };

  const alreadyPosted = posts.some((p) => p.userName === ME.name);

  return (
    <div className="container">
      <div className={styles.bereal}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            <span className={styles.titleGradient}>
              BE<span className={styles.titleSpoke}>(spoke)</span>REAL
            </span>
          </h1>
          <p className={styles.subtitle}>
            One prompt a day • Post any time before midnight • Award Ceremony
            every night
          </p>
        </div>

        {message && <div className={styles.message}>{message}</div>}

        {/* Today's prompt */}
        <div className={styles.promptCard} id="bereal-prompt">
          <div className={styles.promptLabel}>📸 Today&apos;s challenge</div>
          <p className={styles.promptText}>
            {data ? data.prompt : 'Loading today…'}
          </p>
          <p className={styles.promptFoot}>
            The most-liked photo of the day earns bonus bespoke social points
            at the Award Ceremony
          </p>
        </div>

        {/* Upload */}
        {!alreadyPosted && (
          <div className={styles.uploadZone}>
            {preview ? (
              <div className={styles.previewWrap}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Your photo preview" className={styles.previewImg} />
                <input
                  className={styles.captionInput}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a caption"
                  maxLength={140}
                  id="bereal-caption"
                />
                <div className={styles.previewActions}>
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={submitPost}
                    disabled={posting}
                    id="bereal-post-btn"
                  >
                    {posting ? 'Posting…' : '🚀 Post it'}
                  </button>
                  <button
                    className="btn btn-secondary btn-lg"
                    onClick={() => {
                      setPreview(null);
                      setCaption('');
                    }}
                    disabled={posting}
                  >
                    Retake
                  </button>
                </div>
              </div>
            ) : (
              <button
                className={styles.uploadBtn}
                onClick={() => fileRef.current?.click()}
                id="bereal-upload-btn"
              >
                <span className={styles.uploadIcon}>📷</span>
                <span>Capture or upload your BE(spoke)REAL</span>
                <span className={styles.uploadHint}>
                  Posting earns bespoke social points
                </span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => onFilePicked(e.target.files?.[0])}
            />
          </div>
        )}

        {/* Feed */}
        <div className={styles.feedHeader}>
          <h2 className={styles.feedTitle}>Today&apos;s feed</h2>
          <span className={styles.feedCount}>
            {posts.length} posted · likes are anonymous
          </span>
        </div>

        {posts.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🌵</div>
            <p>Nobody has posted yet. Go first and set the bar.</p>
          </div>
        ) : (
          <div className={styles.feed} id="bereal-feed">
            {posts.map((post) => (
              <div key={post.id} className={styles.postCard}>
                <div className={styles.postImageWrap}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.imageUrl}
                    alt={`Photo by ${post.userName}`}
                    className={styles.postImage}
                  />
                </div>
                <div className={styles.postBody}>
                  <div className={styles.postMeta}>
                    <Avatar name={post.userName} photo={post.photo} size={28} />
                    <span className={styles.postName}>{post.userName}</span>
                    <span className={styles.postTime}>{timeAgo(post.postedAt)}</span>
                  </div>
                  {post.caption && (
                    <p className={styles.postCaption}>{post.caption}</p>
                  )}
                  <button
                    className={`${styles.likeBtn} ${
                      post.likedByMe ? styles.likeBtnActive : ''
                    }`}
                    onClick={() => toggleLike(post.id)}
                    aria-label={`Like ${post.userName}'s photo`}
                  >
                    {post.likedByMe ? '❤️' : '🤍'} {post.likes}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
