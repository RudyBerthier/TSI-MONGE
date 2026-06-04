/**
 * VerifiedBadge — checkmark Instagram-style pour les comptes vérifiés.
 * size: 'sm' (14px) | 'md' (16px, défaut) | 'lg' (20px)
 */
export function VerifiedBadge({ size = 'md', className = '' }) {
    const dim = size === 'sm' ? 14 : size === 'lg' ? 20 : 16

    return (
        <svg
            width={dim}
            height={dim}
            viewBox="0 0 24 24"
            fill="none"
            className={`shrink-0 ${className}`}
            aria-label="Compte vérifié"
        >
            <circle cx="12" cy="12" r="12" fill="#3B82F6" />
            <path
                d="M7 12.5l3.5 3.5 6.5-7"
                stroke="white"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}
