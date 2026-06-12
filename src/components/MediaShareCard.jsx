import { Link } from 'react-router-dom'
import { Film } from 'lucide-react'

const PREFIX = 'media-share:'

export function parseMediaShare(content) {
  if (!content?.startsWith(PREFIX)) return null
  try {
    return JSON.parse(content.slice(PREFIX.length))
  } catch {
    return null
  }
}

export function serializeMediaShare(media) {
  return PREFIX + JSON.stringify({
    tmdb_id: media.tmdb_id || media.id,
    type: media.type || media.media_type || 'movie',
    title: media.title || media.name || 'Titre inconnu',
    poster_url: media.poster_url || null,
    year: media.release_date ? media.release_date.split('-')[0] : media.release_year || ''
  })
}

export function MediaShareCard({ data, isOwn }) {
  return (
    <Link to={`/media?id=${data.tmdb_id}&type=${data.type}`} className={`flex items-center gap-3 p-2 rounded-lg border max-w-sm ${isOwn ? 'bg-white/10 border-white/20' : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'} hover:opacity-80 transition-opacity no-underline`}>
      {data.poster_url && data.poster_url !== 'null' ? (
        <img src={data.poster_url} className="w-12 h-16 object-cover rounded shadow-sm" alt={data.title} />
      ) : (
        <div className="w-12 h-16 bg-gray-700 rounded flex items-center justify-center text-gray-500 shadow-sm"><Film size={20} /></div>
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold truncate ${isOwn ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{data.title}</p>
        <div className={`flex items-center gap-2 mt-1 text-xs ${isOwn ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>
          <span className="uppercase text-[10px] px-1.5 py-0.5 rounded border border-current">{data.type === 'movie' ? 'Film' : 'Série'}</span>
          {data.year && <span>{data.year}</span>}
        </div>
        <p className={`text-[10px] mt-1 font-semibold ${isOwn ? 'text-white/50' : 'text-indigo-500 dark:text-indigo-400'}`}>▶ Cliquez pour ouvrir</p>
      </div>
    </Link>
  )
}
