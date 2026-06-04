import React from 'react'

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '')

export function UserAvatar({ user, size = 28, border = false }) {
    const [imgError, setImgError] = React.useState(false)
    const baseResource = user?.avatar || user?.google_avatar || user?.googleAvatar || null
    let src = null;

    if (!imgError && baseResource) {
        if (baseResource.startsWith('http')) {
            if (baseResource.includes('googleusercontent')) {
                src = `${API_BASE}/api/users/proxy-avatar?url=${encodeURIComponent(baseResource)}`
            } else {
                src = baseResource
            }
        } else {
            src = `${API_BASE}${baseResource}`
        }
    }

    const borderStyle = border
        ? { border: '2px solid var(--border)' }
        : {}

    if (src) {
        return (
            <img
                src={src}
                alt={`Avatar de ${user?.username}`}
                referrerPolicy="no-referrer"
                loading="lazy"
                onError={() => setImgError(true)}
                style={{ width: size, height: size, minWidth: size, minHeight: size, flexShrink: 0, borderRadius: '50%', objectFit: 'cover', ...borderStyle }}
            />
        )
    }

    return (
        <div
            style={{
                width: size,
                height: size,
                borderRadius: '50%',
                background: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: size * 0.4,
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                flexShrink: 0,
                ...borderStyle,
            }}
        >
            {user?.username?.[0]?.toUpperCase() || 'U'}
        </div>
    )
}
