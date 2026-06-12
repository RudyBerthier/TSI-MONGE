import React, { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Trash2, Star, ThumbsUp, ThumbsDown } from 'lucide-react'
import { Link } from 'react-router-dom'

export function MyReviews() {
  const { getToken, user } = useAuth()
  const [reviews, setReviews] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchMyReviews = async () => {
      try {
        const res = await fetch('/api/media/my-reviews', {
          headers: { 'Authorization': `Bearer ${getToken()}` }
        })
        if (res.ok) {
          setReviews(await res.json())
        }
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchMyReviews()
  }, [getToken])

  const deleteReview = async (id) => {
    try {
      const res = await fetch(`/api/media/review/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      })
      if (res.ok) {
        setReviews(prev => prev.filter(r => r.id !== id))
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleReact = async (reviewId, type) => {
    try {
      const res = await fetch(`/api/media/review/${reviewId}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ reaction: type })
      });
      if (res.ok) {
        setReviews(prev => prev.map(r => {
          if (r.id !== reviewId) return r;
          const userReactionIdx = r.reactions?.findIndex(re => re.user_id === user.id);
          let newReactions = r.reactions ? [...r.reactions] : [];
          if (type === null) {
            if (userReactionIdx >= 0) newReactions.splice(userReactionIdx, 1);
          } else {
            if (userReactionIdx >= 0) newReactions[userReactionIdx].reaction_type = type;
            else newReactions.push({ user_id: user.id, reaction_type: type });
          }
          return { ...r, reactions: newReactions };
        }));
      }
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="min-h-screen bg-[#141414] text-white font-sans overflow-x-hidden pb-20">
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-50 bg-[#141414] border-b border-gray-800 pt-4 pb-4 px-4 sm:px-8 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link to="/media" className="text-white hover:text-gray-300 transition-colors p-2 rounded-full bg-black/50">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-2xl font-bold">Mes Critiques</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-[#181818] rounded-xl border border-gray-800"></div>
            <div className="h-32 bg-[#181818] rounded-xl border border-gray-800"></div>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">Tu n'as publié aucune critique pour l'instant.</p>
            <Link to="/media" className="text-red-500 hover:underline mt-2 inline-block">Retourner sur MongeFlix</Link>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {reviews.map(review => {
              const upvotes = review.reactions?.filter(r => r.reaction_type === 'up').length || 0;
              const downvotes = review.reactions?.filter(r => r.reaction_type === 'down').length || 0;
              const myReaction = review.reactions?.find(r => r.user_id === user?.id)?.reaction_type;

              return (
                <div key={review.id} className="bg-[#181818] p-6 rounded-xl flex gap-6 border border-gray-800 shadow-xl relative">
                  <button
                    onClick={() => deleteReview(review.id)}
                    className="absolute top-4 right-4 p-2 text-gray-500 hover:text-red-500 hover:bg-black/20 rounded-full transition-all"
                  >
                    <Trash2 size={20} />
                  </button>

                  <img src={review.media.poster_url} className="w-24 h-36 object-cover rounded-md shadow-lg hidden sm:block" alt="poster" />

                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <h2 className="text-2xl font-bold">{review.media.title}</h2>
                      <div className="flex text-yellow-400">
                        {[1, 2, 3, 4, 5].map(s => <Star key={s} size={14} fill={s <= review.rating ? 'currentColor' : 'transparent'} />)}
                      </div>
                    </div>

                    <div className="text-gray-500 text-sm mb-4">
                      Publiée le {new Date(review.created_at).toLocaleDateString('fr-FR')}
                    </div>

                    <p className="text-gray-300 italic mb-6">"{review.review_text}"</p>

                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleReact(review.id, myReaction === 'up' ? null : 'up')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors text-sm font-medium ${myReaction === 'up' ? 'bg-green-500/20 text-green-500' : 'bg-black/40 text-gray-400 hover:bg-black/60'}`}
                      >
                        <ThumbsUp size={16} fill={myReaction === 'up' ? 'currentColor' : 'transparent'} />
                        {upvotes}
                      </button>
                      <button
                        onClick={() => handleReact(review.id, myReaction === 'down' ? null : 'down')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors text-sm font-medium ${myReaction === 'down' ? 'bg-red-500/20 text-red-500' : 'bg-black/40 text-gray-400 hover:bg-black/60'}`}
                      >
                        <ThumbsDown size={16} fill={myReaction === 'down' ? 'currentColor' : 'transparent'} />
                        {downvotes}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
