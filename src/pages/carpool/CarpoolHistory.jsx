import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Car, MapPin, CheckCircle, XCircle, Info, Wind, TrendingUp, Star, Music, MessageCircle, VolumeX, Clock, X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

function getDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0
  const R = 6371 // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c * 1.3 // Multiply by 1.3 to approximate driving distance
}

export function CarpoolHistory() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [driverRides, setDriverRides] = useState([])
  const [passengerRides, setPassengerRides] = useState([])
  const [reviewedMap, setReviewedMap] = useState({}) // { 'rideId_revieweeId': true }
  
  // Review Modal State
  const [reviewModal, setReviewModal] = useState(null) // { rideId, revieweeId, revieweeName }
  const [selectedTags, setSelectedTags] = useState([])
  const [selectedRating, setSelectedRating] = useState(0)
  const [submittingReview, setSubmittingReview] = useState(false)

  useEffect(() => {
    fetch('/api/carpool/history', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}` // fallback if useAuth doesn't expose getToken directly, though here it usually does. Assuming cookie/localStorage is used by fetch.
      }
    })
      .then(res => res.json())
      .then(data => {
        setDriverRides(data.driverRides || [])
        setPassengerRides(data.passengerRides || [])
        
        const rMap = {}
        if (data.userReviews) {
          data.userReviews.forEach(r => {
            rMap[`${r.ride_id}_${r.reviewee_id}`] = true
          })
        }
        setReviewedMap(rMap)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Calculate statistics
  let totalKm = 0
  let totalSavedCO2 = 0 // kg
  let totalRides = 0

  const allParticipatedRides = [
    ...driverRides.filter(r => r.status === 'completed'),
    ...passengerRides.filter(r => r.status === 'completed' && r.myPassengerStatus === 'accepted')
  ]

  allParticipatedRides.forEach(ride => {
    const km = getDistanceKm(ride.origin_lat, ride.origin_lng, ride.dest_lat, ride.dest_lng)
    totalKm += km
    totalRides += 1
  })

  // Approx 193g CO2 saved per km per passenger (simplification: if you participate, it's shared)
  totalSavedCO2 = (totalKm * 0.193)

  const renderRideCard = (ride, type) => {
    const isCompleted = ride.status === 'completed'
    const isCancelled = ride.status === 'cancelled'
    
    let statusColor = 'bg-gray-100 text-gray-600'
    let statusIcon = <Info size={16} />
    let statusText = 'En attente'

    if (isCompleted) {
      statusColor = 'bg-green-100 text-green-700'
      statusIcon = <CheckCircle size={16} />
      statusText = 'Terminé'
    } else if (isCancelled) {
      statusColor = 'bg-red-100 text-red-700'
      statusIcon = <XCircle size={16} />
      statusText = 'Annulé'
    } else if (ride.status === 'active' || ride.status === 'in_progress') {
      statusColor = 'bg-indigo-100 text-indigo-700'
      statusIcon = <Car size={16} />
      statusText = ride.status === 'in_progress' ? 'En cours' : 'À venir'
    }

    if (type === 'passenger' && ride.myPassengerStatus === 'rejected') {
      statusColor = 'bg-red-100 text-red-700'
      statusIcon = <XCircle size={16} />
      statusText = 'Refusé'
    }

    // Identify who to review
    let reviewee = null
    if (isCompleted) {
      if (type === 'passenger' && ride.myPassengerStatus === 'accepted') {
        reviewee = ride.driver
      } else if (type === 'driver') {
        // Find accepted passengers
        const acceptedPass = ride.passengers?.filter(p => p.status === 'accepted') || []
        // Simplification: driver reviews the group or the first passenger for this MVP, 
        // ideally they review each passenger. We'll pick the first passenger if there is one.
        if (acceptedPass.length > 0) {
          reviewee = acceptedPass[0].user
        }
      }
    }

    return (
      <div key={ride.id} className="relative">
      <Link 
        to={`/covoiturage/${ride.id}`} 
        className={`block p-4 rounded-xl border transition-all hover:shadow-md ${isCompleted ? 'opacity-80' : ''}`}
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex justify-between items-start mb-3">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${statusColor}`}>
            {statusIcon} {statusText}
          </div>
          <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            {new Date(ride.departure_time).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
          </div>
        </div>

        <div className="flex flex-col gap-2 relative pl-3">
          <div className="absolute left-[3px] top-2 bottom-2 w-0.5 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
          
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-sm outline outline-2 outline-white dark:outline-gray-800"></div>
            <p className="text-sm font-bold truncate" style={{ color: 'var(--text)' }}>{ride.origin}</p>
          </div>
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-sm outline outline-2 outline-white dark:outline-gray-800"></div>
            <p className="text-sm font-bold truncate" style={{ color: 'var(--text)' }}>{ride.destination}</p>
          </div>
        </div>

        <div className="mt-4 pt-3 flex justify-between items-center border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
              {ride.driver?.avatar || ride.driver?.google_avatar ? (
                <img src={ride.driver.avatar || ride.driver.google_avatar} alt="Driver" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] font-bold text-gray-500">{ride.driver?.username?.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              {type === 'driver' ? 'Vous (Conducteur)' : ride.driver?.username}
            </span>
          </div>
          <div className="text-sm font-bold text-indigo-600">
            {ride.price > 0 ? `${ride.price} €` : 'Gratuit'}
          </div>
        </div>
      </Link>
      
      {isCompleted && reviewee && !reviewedMap[`${ride.id}_${reviewee.id}`] && (
        <button 
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setReviewModal({ rideId: ride.id, revieweeId: reviewee.id, revieweeName: reviewee.username })
            setSelectedTags([])
            setSelectedRating(0)
          }}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 translate-y-1/2 bg-yellow-400 text-yellow-900 text-xs font-bold px-4 py-1.5 rounded-full hover:bg-yellow-500 transition shadow-sm border border-yellow-500 flex items-center gap-1 z-20"
        >
          <Star size={14} fill="currentColor" /> Évaluer l'ambiance
        </button>
      )}
      {isCompleted && reviewee && reviewedMap[`${ride.id}_${reviewee.id}`] && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 translate-y-1/2 bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 text-[10px] font-bold px-4 py-1 rounded-full border border-gray-200 dark:border-gray-700 z-20 flex items-center gap-1">
          Avis envoyé <CheckCircle size={12} />
        </div>
      )}
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: '90px' }}>
      <div className="sticky top-0 z-30" style={{ background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/covoiturage" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition" style={{ color: 'var(--text)' }}>
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Mon Historique</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        
        {/* Stats Section */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500 flex items-center justify-center mb-2">
              <Car size={20} />
            </div>
            <p className="text-2xl font-black" style={{ color: 'var(--text)' }}>{totalRides}</p>
            <p className="text-[10px] uppercase font-bold text-gray-500 mt-1">Trajets</p>
          </div>
          
          <div className="p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-500 flex items-center justify-center mb-2">
              <TrendingUp size={20} />
            </div>
            <p className="text-2xl font-black" style={{ color: 'var(--text)' }}>{Math.round(totalKm)}</p>
            <p className="text-[10px] uppercase font-bold text-gray-500 mt-1">Km Parcourus</p>
          </div>

          <div className="p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 text-green-500 flex items-center justify-center mb-2">
              <Wind size={20} />
            </div>
            <p className="text-2xl font-black" style={{ color: 'var(--text)' }}>{totalSavedCO2.toFixed(1)}</p>
            <p className="text-[10px] uppercase font-bold text-gray-500 mt-1">Kg CO2 Économisés</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center p-10 text-gray-500 animate-pulse">Chargement de l'historique...</div>
        ) : (
          <>
            <div>
              <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text)' }}>Trajets proposés (Conducteur)</h2>
              {driverRides.length === 0 ? (
                <p className="text-sm text-gray-500 italic p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">Aucun trajet proposé.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {driverRides.map(r => renderRideCard(r, 'driver'))}
                </div>
              )}
            </div>

            <div className="pt-4">
              <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text)' }}>Trajets rejoints (Passager)</h2>
              {passengerRides.length === 0 ? (
                <p className="text-sm text-gray-500 italic p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">Aucun trajet rejoint.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {passengerRides.map(r => renderRideCard(r, 'passenger'))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setReviewModal(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setReviewModal(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white bg-gray-100 dark:bg-slate-700 rounded-full p-1 z-10">
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold mb-1 text-center" style={{ color: 'var(--text)' }}>Évaluer {reviewModal.revieweeName}</h2>
            <p className="text-sm text-center mb-4" style={{ color: 'var(--text-muted)' }}>Comment s'est passé ce trajet ?</p>
            
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setSelectedRating(star)}
                  className={`p-2 transition-transform hover:scale-110 ${selectedRating >= star ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                >
                  <Star size={32} fill="currentColor" />
                </button>
              ))}
            </div>

            <p className="text-sm font-bold mb-3" style={{ color: 'var(--text)' }}>Tags d'ambiance (Optionnel)</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { id: 'music', label: 'DJ Officiel', icon: <Music size={24} />, color: 'text-pink-500 bg-pink-100 border-pink-200' },
                { id: 'talkative', label: 'Grand bavard', icon: <MessageCircle size={24} />, color: 'text-blue-500 bg-blue-100 border-blue-200' },
                { id: 'quiet', label: 'Trajet silencieux', icon: <VolumeX size={24} />, color: 'text-indigo-500 bg-indigo-100 border-indigo-200' },
                { id: 'punctual', label: 'Ponctualité suisse', icon: <Clock size={24} />, color: 'text-green-500 bg-green-100 border-green-200' }
              ].map(tag => {
                const isSelected = selectedTags.includes(tag.id)
                return (
                  <button
                    key={tag.id}
                    onClick={() => {
                      if (isSelected) setSelectedTags(selectedTags.filter(t => t !== tag.id))
                      else setSelectedTags([...selectedTags, tag.id])
                    }}
                    className={`p-4 rounded-2xl flex flex-col items-center gap-2 transition-all border-2 ${isSelected ? tag.color + ' ring-2 ring-offset-2 ring-indigo-500' : 'bg-gray-50 border-gray-100 dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-100'} cursor-pointer`}
                  >
                    <div className={isSelected ? '' : 'text-gray-400'}>{tag.icon}</div>
                    <span className={`text-xs font-bold text-center ${isSelected ? '' : 'text-gray-500'}`}>{tag.label}</span>
                  </button>
                )
              })}
            </div>

            <button 
              disabled={submittingReview || selectedRating === 0}
              onClick={async () => {
                setSubmittingReview(true)
                try {
                  const res = await fetch('/api/carpool/reviews', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                      rideId: reviewModal.rideId,
                      revieweeId: reviewModal.revieweeId,
                      tags: selectedTags,
                      rating: selectedRating
                    })
                  })
                  if (!res.ok) throw new Error('Erreur')
                  setReviewedMap(prev => ({ ...prev, [`${reviewModal.rideId}_${reviewModal.revieweeId}`]: true }))
                  alert('Avis envoyé avec succès !')
                  setReviewModal(null)
                } catch (e) {
                  alert('Erreur lors de l\'envoi de l\'avis')
                } finally {
                  setSubmittingReview(false)
                }
              }}
              className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {submittingReview ? 'Envoi...' : 'Laisser un avis'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
