import { Link } from 'react-router-dom'

export function ContentRenderer({ content }) {
    if (!content) return null;

    // Split text by both mentions and hashtags
    const parts = content.split(/(@[A-Za-z0-9_.-]+|#[A-Za-z0-9_]+)/g);

    return (
        <>
            {parts.map((part, index) => {
                if (part.startsWith('@') && part.length > 1) {
                    const username = part.slice(1);
                    return (
                        <Link
                            key={index}
                            to={`/social/user/${username}`}
                            className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-medium hover:underline"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {part}
                        </Link>
                    )
                } else if (part.startsWith('#') && part.length > 1) {
                    const hashtag = part.slice(1);
                    return (
                        <Link
                            key={index}
                            to={`/social/explore?q=${encodeURIComponent(part)}`}
                            className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-medium hover:underline"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {part}
                        </Link>
                    )
                }
                return <span key={index}>{part}</span>
            })}
        </>
    )
}
