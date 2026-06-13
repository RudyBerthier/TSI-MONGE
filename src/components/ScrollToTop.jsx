import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Remonter en haut"
      className="fixed z-40 p-2.5 rounded-full shadow-lg transition-all duration-300 hover:scale-110 active:scale-95"
      style={{
        bottom: 'calc(8.5rem + env(safe-area-inset-bottom))',
        right: '1.125rem',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        color: 'var(--text)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      }}
    >
      <ArrowUp size={16} />
    </button>
  );
}
