import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Car, Calendar, Users, Euro, MapPin, CheckCircle, XCircle, MessageCircle, Info, Clock, X, Send, Reply, Smile, CheckCheck, Heart, ThumbsUp, QrCode, Scan, Star, Music, VolumeX, Fuel, Calculator } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useSocket } from '../../contexts/SocketContext'
import { RestrictedAccess } from '../../components/RestrictedAccess'
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { QRCodeSVG } from 'qrcode.react'
import { Html5QrcodeScanner } from 'html5-qrcode'

// Fix leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
})

const SOCKET_URL = import.meta.env.VITE_API_URL || ''

const getAvatarUrl = (u) => {
  if (!u) return null;
  if (u.avatar && u.avatar.startsWith('http')) return u.avatar;
  if (u.google_avatar && u.google_avatar.startsWith('http')) return u.google_avatar;
  if (u.avatar) return `${SOCKET_URL}${u.avatar}`;
  return null;
}

export function CarpoolDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, getToken } = useAuth()
  
  const [ride, setRide] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [optPlusUn, setOptPlusUn] = useState(false)
  const [optPlusUnName, setOptPlusUnName] = useState('')
  const [optValise, setOptValise] = useState(false)
  const [optChien, setOptChien] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [error, setError] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatSending, setChatSending] = useState(false)
  const [chatError, setChatError] = useState('')
  const [chatReplyTo, setChatReplyTo] = useState(null)
  const [hoveredMessage, setHoveredMessage] = useState(null)

  // Driver stats
  const [driverStats, setDriverStats] = useState({ totalRides: 0, reliability: 100 })
  
  // Detour request
  const [detourRequest, setDetourRequest] = useState(false)
  const [detourText, setDetourText] = useState('')

  const [route, setRoute] = useState(null)
  const { socket } = useSocket()
  
  const [driverLocation, setDriverLocation] = useState(null) // { lat, lng, speed, heading }
  const [watchId, setWatchId] = useState(null)
  const [wakeLock, setWakeLock] = useState(null)
  
  // QR Code Modals
  const [showMyQr, setShowMyQr] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  // Review Modal State
  const [reviewModal, setReviewModal] = useState(null) // { rideId, revieweeId, revieweeName }
  const [selectedTags, setSelectedTags] = useState([])
  const [selectedRating, setSelectedRating] = useState(0)
  const [submittingReview, setSubmittingReview] = useState(false)
  
  const isDriver = user?.id === ride?.driver_id
  const myRequest = ride?.passengers?.find(p => p.user_id === user?.id)
  const isAcceptedPassenger = myRequest?.status === 'accepted'
  const isChatAuthorized = isDriver || isAcceptedPassenger

  const acceptedPassengersCount = ride?.passengers?.filter(p => p.status === 'accepted').length || 0
  const finalPrice = ride?.price_type === 'divided' && ride?.price > 0 ? (ride.price / (acceptedPassengersCount + 1)) : (ride?.price || 0)
  const formattedPrice = finalPrice % 1 === 0 ? finalPrice : finalPrice.toFixed(2)

  const hoursBeforeDeparture = ride ? (new Date(ride.departure_time) - new Date()) / (1000 * 60 * 60) : 0
  const canModify = hoursBeforeDeparture >= 24

  useEffect(() => {
    if (optPlusUn && optPlusUnName.length >= 2 && !optPlusUnName.startsWith('@')) {
      const delayFn = setTimeout(() => {
        fetch(`/api/users/search?q=${encodeURIComponent(optPlusUnName)}`)
          .then(r => r.json())
          .then(data => {
            setSearchResults(data)
            setShowDropdown(true)
          })
          .catch(err => console.error(err))
      }, 300)
      return () => clearTimeout(delayFn)
    } else {
      setShowDropdown(false)
    }
  }, [optPlusUnName, optPlusUn])

  const fetchRide = async () => {
    try {
      const res = await fetch(`/api/carpool/${id}`)
      if (!res.ok) throw new Error('Trajet introuvable')
      const data = await res.json()
      setRide(data)
      
      // Fetch driver stats
      try {
        const statsRes = await fetch(`/api/carpool/driver-stats/${data.driver_id}`)
        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setDriverStats(statsData)
        }
      } catch (err) { console.error('Erreur stats conducteur', err) }

      // Fetch OSRM Route if coordinates exist
      if (data.origin_lat && data.origin_lng && data.dest_lat && data.dest_lng) {
        try {
          const osrmRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${data.origin_lng},${data.origin_lat};${data.dest_lng},${data.dest_lat}?overview=full&geometries=geojson`)
          const osrmData = await osrmRes.json()
          if (osrmData.routes && osrmData.routes.length > 0) {
            const r = osrmData.routes[0]
            // GeoJSON returns [lng, lat], Leaflet polyline needs [lat, lng]
            const coords = r.geometry.coordinates.map(c => [c[1], c[0]])
            setRoute({
              coordinates: coords,
              distance: r.distance, // in meters
              duration: r.duration // in seconds
            })
          }
        } catch (e) {
          console.error("OSRM Error:", e)
        }
      }
      
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRide()
  }, [id])

  // --- WebSockets & Live Tracking ---
  useEffect(() => {
    if (!socket || !id) return
    
    socket.emit('carpool:join', { rideId: id })

    const handleLocationUpdate = (data) => {
      if (data.driverId !== user.id) {
        setDriverLocation(data)
      }
    }

    const handleRideUpdate = () => {
      fetchRide()
    }

    socket.on('carpool:location_update', handleLocationUpdate)
    socket.on('carpool:update', handleRideUpdate)

    return () => {
      socket.emit('carpool:leave', { rideId: id })
      socket.off('carpool:location_update', handleLocationUpdate)
      socket.off('carpool:update', handleRideUpdate)
    }
  }, [socket, id, user])

  // Geolocation for driver
  useEffect(() => {
    if (isDriver && ride?.status === 'in_progress') {
      const requestWakeLock = async () => {
        try {
          if ('wakeLock' in navigator) {
            const wl = await navigator.wakeLock.request('screen')
            setWakeLock(wl)
          }
        } catch (err) {
          console.error('WakeLock error:', err)
        }
      }
      requestWakeLock()

      const wId = navigator.geolocation.watchPosition(
        (pos) => {
          const loc = {
            rideId: id,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            speed: pos.coords.speed,
            heading: pos.coords.heading,
            timestamp: pos.timestamp
          }
          setDriverLocation(loc)
          if (socket) socket.emit('carpool:location_update', loc)
        },
        (err) => console.error('GPS error:', err),
        { enableHighAccuracy: true, maximumAge: 0 }
      )
      setWatchId(wId)
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId)
      if (wakeLock) wakeLock.release().then(() => setWakeLock(null))
    }
  }, [isDriver, ride?.status, id, socket])

  // --- End Live Tracking ---

  useEffect(() => {
    let interval = null
    if (isChatAuthorized && ride?.status && ride.status !== 'cancelled') {
      const fetchMessages = async () => {
        try {
          const res = await fetch(`/api/carpool/${id}/messages`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
          })
          if (res.ok) {
            const data = await res.json()
            setChatMessages(data)
            
            // Mark as read if any unread
            const hasUnread = data.some(m => m.user_id !== user.id && !(m.read_by || []).includes(user.id))
            if (hasUnread) {
              fetch(`/api/carpool/${id}/messages/read`, { method: 'POST', headers: { 'Authorization': `Bearer ${getToken()}` } })
            }
          }
        } catch (e) {
          console.error('Chat error', e)
        }
      }
      fetchMessages()
      if (ride.status === 'active' || ride.status === 'in_progress') {
        interval = setInterval(fetchMessages, 3000) // Poll every 3 seconds only if active
      }
    }
    return () => clearInterval(interval)
  }, [isChatAuthorized, ride, id, user])

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!chatInput.trim()) return
    setChatSending(true)
    try {
      const res = await fetch(`/api/carpool/${id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ message: chatInput, reply_to: chatReplyTo?.id })
      })
      if (!res.ok) throw new Error('Erreur d\'envoi')
      const newMsg = await res.json()
      setChatMessages(prev => [...prev, newMsg])
      setChatInput('')
      setChatReplyTo(null)
    } catch (err) {
      setChatError(err.message)
    } finally {
      setChatSending(false)
    }
  }

  const handleReact = async (msgId, emoji) => {
    try {
      setHoveredMessage(null) // hide menu
      // Optimistic update
      setChatMessages(prev => prev.map(m => {
        if (m.id === msgId) {
          const reactions = { ...(m.reactions || {}) }
          if (!reactions[emoji]) reactions[emoji] = []
          if (reactions[emoji].includes(user.id)) {
            reactions[emoji] = reactions[emoji].filter(uid => uid !== user.id)
            if (reactions[emoji].length === 0) delete reactions[emoji]
          } else {
            reactions[emoji] = [...reactions[emoji], user.id]
          }
          return { ...m, reactions }
        }
        return m
      }))

      await fetch(`/api/carpool/${id}/messages/${msgId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ emoji })
      })
    } catch (err) {
      console.error(err)
    }
  }

  const handleRequest = async (e) => {
    e.preventDefault()
    setRequesting(true)
    setError('')
    try {
      const opts = []
      if (optPlusUn) opts.push(`🧍 +1 Personne (${optPlusUnName.trim() || 'Anonyme'})`)
      if (optValise) opts.push("🧳 Beaucoup de valises")
      if (optChien) opts.push("🐾 Animal de compagnie")
      
      let finalMessage = message.trim()
      
      if (detourRequest && detourText.trim() !== '') {
        finalMessage = `[DÉTOUR : ${detourText.trim()}]\n${finalMessage}`
      }
      
      if (opts.length > 0) {
        finalMessage = `[Options : ${opts.join(" | ")}]\n${finalMessage}`
      }

      const res = await fetch(`/api/carpool/${id}/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ message: finalMessage.trim() })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMessage('')
      fetchRide()
    } catch (err) {
      setError(err.message)
    } finally {
      setRequesting(false)
    }
  }

  useEffect(() => {
    let scanner = null;
    if (showScanner) {
      scanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      scanner.render(async (decodedText) => {
        try {
          const data = JSON.parse(decodedText);
          if (data.rideId !== id) {
            alert("Ce billet n'est pas pour ce trajet !");
            return;
          }
          
          scanner.pause(true);
          const res = await fetch(`/api/carpool/${id}/scan`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ userId: data.userId })
          });
          
          if (!res.ok) {
            const err = await res.json();
            alert(err.error || "Erreur de scan");
            scanner.resume();
            return;
          }
          
          const scanData = await res.json();
          alert("Embarquement validé avec succès !");
          setRide(prev => ({
            ...prev,
            passengers: prev.passengers.map(p => p.id === scanData.passenger.id ? scanData.passenger : p)
          }));
          
          setShowScanner(false);
          
        } catch (e) {
          console.error(e);
          alert("QR Code invalide");
        }
      }, (error) => {
        // Ignore scan errors, it throws them every frame it doesn't see a QR
      });
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(console.error);
      }
    }
  }, [showScanner, id]);

  const handleResponse = async (reqId, status) => {
    try {
      const res = await fetch(`/api/carpool/${id}/request/${reqId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status })
      })
      if (!res.ok) throw new Error('Erreur')
      const updated = await res.json()
      setRide(prev => ({
        ...prev,
        passengers: prev.passengers.map(p => p.id === reqId ? { ...p, ...updated } : p)
      }))
    } catch (error) {
      console.error(error)
      alert("Erreur lors de la réponse")
    }
  }

  const handleTogglePayment = async (userId) => {
    try {
      const res = await fetch(`/api/carpool/${id}/passenger/${userId}/payment`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (!res.ok) throw new Error('Erreur')
      const data = await res.json()
      
      // Update local state
      setRide(prev => ({
        ...prev,
        passengers: prev.passengers.map(p => p.user_id === userId ? { ...p, has_paid: data.has_paid } : p)
      }))
    } catch (error) {
      console.error(error)
      alert("Erreur lors de la mise à jour du paiement")
    }
  }

  const handleRemovePassenger = async (reqId) => {
    if (!confirm('Êtes-vous sûr de vouloir annuler cette réservation/demande ?')) return
    try {
      const res = await fetch(`/api/carpool/${id}/request/${reqId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      fetchRide()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleCancel = async () => {
    if (!confirm('Êtes-vous sûr de vouloir annuler ce trajet ? Les passagers seront prévenus.')) return
    try {
      const res = await fetch(`/api/carpool/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      })
      if (!res.ok) throw new Error('Erreur annulation')
      navigate('/covoiturage')
    } catch (err) {
      alert(err.message)
    }
  }

  const handleStartRide = async () => {
    if (!confirm('Voulez-vous démarrer le trajet ? Votre position sera partagée en direct.')) return
    try {
      const res = await fetch(`/api/carpool/${id}/start`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      })
      if (!res.ok) throw new Error('Erreur démarrage')
      fetchRide()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleFinishRide = async () => {
    if (!confirm('Confirmer la fin du trajet ?')) return
    try {
      const res = await fetch(`/api/carpool/${id}/finish`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      })
      if (!res.ok) throw new Error('Erreur fin')
      fetchRide()
    } catch (err) {
      alert(err.message)
    }
  }

  if (loading) return <div className="text-center p-10 text-gray-500">Chargement...</div>
  if (error && !ride) return <div className="text-center p-10 text-red-500">{error}</div>

  if (!user) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: '24px' }}>
        <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-30" style={{ background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/covoiturage" className="p-2 rounded-xl flex items-center justify-center transition-all w-fit" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Détails du trajet</h1>
            </div>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 py-12">
          <RestrictedAccess 
            title="Détails du trajet" 
            message="Connectez-vous pour voir les détails de ce trajet ou pour réserver une place." 
          />
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: '24px' }}>
      {/* Header */}
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-30" style={{ background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/covoiturage" className="p-2 rounded-xl flex items-center justify-center transition-all w-fit" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Détails du trajet</h1>
          </div>
          {isDriver && ride.status === 'active' && (
            <div className="flex items-center gap-4">
              {canModify && (
                <Link to={`/covoiturage/modifier/${id}`} className="text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:underline">
                  Modifier
                </Link>
              )}
              <button onClick={handleStartRide} className="bg-indigo-600 text-white text-sm font-bold px-4 py-2 rounded-full hover:bg-indigo-700 transition shadow-md">
                Démarrer le trajet
              </button>
              <button onClick={handleCancel} className="text-red-500 text-sm font-medium hover:underline">
                Annuler
              </button>
            </div>
          )}
          {isDriver && ride.status === 'in_progress' && (
            <button onClick={handleFinishRide} className="bg-green-600 text-white text-sm font-bold px-4 py-2 rounded-full hover:bg-green-700 transition shadow-md">
              Terminer le trajet
            </button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        
        {/* Ride Info Card */}
        <div className="rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
          {ride.status === 'cancelled' && (
            <div className="mb-4 bg-red-500/10 text-red-600 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
              <Info size={16} /> Ce trajet a été annulé par le conducteur.
            </div>
          )}
          {ride.status === 'in_progress' && (
            <div className="mb-4 bg-indigo-500/10 text-indigo-600 px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-between border border-indigo-200">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3 mr-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                </span>
                Trajet en cours...
              </div>
            </div>
          )}
          {ride.status === 'completed' && (
            <div className="mb-4 bg-green-500/10 text-green-600 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
              <CheckCircle size={16} /> Ce trajet est terminé.
            </div>
          )}

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full overflow-hidden border-2" style={{ borderColor: 'var(--accent)' }}>
                {getAvatarUrl(ride.driver) ? (
                  <img src={getAvatarUrl(ride.driver)} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-xl">
                    {ride.driver.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>{ride.driver.username}</h2>
                <p className="text-xs text-gray-500 font-medium mb-1 flex items-center gap-1">
                  <Car size={14} className="shrink-0" /> {driverStats.totalRides} trajet(s) • <Star size={14} className="text-yellow-500 shrink-0" /> {driverStats.reliability}% fiable
                </p>
                <p className="text-sm flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                  <Car size={14} /> Conducteur
                </p>
              </div>
            </div>
            <div className="bg-indigo-500/10 text-indigo-600 px-4 py-1.5 rounded-full font-bold flex flex-col items-end">
              <div className="flex items-center gap-1">
                {ride.price > 0 ? <>{formattedPrice} <Euro size={16}/></> : 'Gratuit'}
              </div>
              {ride.price_type === 'divided' && ride.price > 0 && (
                <span className="text-[10px] uppercase tracking-wider opacity-80 mt-0.5">({ride.price}€ divisé par {acceptedPassengersCount + 1})</span>
              )}
            </div>
          </div>

          {/* Route Info */}
          <div className="grid grid-cols-[auto_1fr] gap-x-4 mb-6">
            <div className="flex flex-col items-center mt-1.5">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-indigo-500 bg-white dark:bg-slate-900 z-10"></div>
              <div className="w-[2px] flex-1 bg-gray-200 dark:bg-gray-700 my-1"></div>
              <div className="w-3.5 h-3.5 rounded-full bg-indigo-500 z-10"></div>
            </div>
            
            <div className="flex flex-col justify-between py-0.5 min-h-[5rem]">
              <div className="mb-5">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-0.5">Départ</p>
                <p className="font-semibold text-lg leading-tight" style={{ color: 'var(--text)' }}>{ride.origin}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-0.5">Arrivée</p>
                <p className="font-semibold text-lg leading-tight" style={{ color: 'var(--text)' }}>{ride.destination}</p>
              </div>
            </div>
          </div>
          
          {/* MAP & GPS Stats */}
          {ride.origin_lat && ride.dest_lat && (
            <div className="mb-6 rounded-2xl overflow-hidden border relative" style={{ borderColor: 'var(--border)' }}>
              
              {/* Floating Live Navigation Dashboard (Waze Style) */}
              {ride.status === 'in_progress' && driverLocation && (
                <div className="absolute top-4 left-4 right-4 z-[400] flex justify-between items-start pointer-events-none">
                  <div className="bg-slate-900/90 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700/50 flex flex-col pointer-events-auto">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">Vitesse</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black">{Math.round((driverLocation.speed || 0) * 3.6)}</span>
                      <span className="text-sm font-bold text-slate-400">km/h</span>
                    </div>
                  </div>
                  
                  <div className="bg-indigo-600 text-white px-3 py-1.5 rounded-full shadow-lg font-bold text-xs flex items-center gap-2 animate-pulse pointer-events-auto">
                    <MapPin size={14} /> En direct
                  </div>
                </div>
              )}

              <div className={`relative z-0 transition-all duration-700 ${ride.status === 'in_progress' ? 'h-[60vh] min-h-[400px]' : 'h-48'}`}>
                <MapContainer 
                  preferCanvas={true}
                  bounds={
                    driverLocation && ride.status === 'in_progress'
                      ? [[driverLocation.lat, driverLocation.lng], [ride.dest_lat, ride.dest_lng]]
                      : [[ride.origin_lat, ride.origin_lng], [ride.dest_lat, ride.dest_lng]]
                  } 
                  style={{ height: '100%', width: '100%', zIndex: 0 }}
                  zoomControl={false}
                  ref={(map) => {
                    // Waze-like auto-pan: center strictly on driver with high zoom
                    if (map && driverLocation && ride.status === 'in_progress') {
                      map.setView([driverLocation.lat, driverLocation.lng], 16, { animate: true, duration: 1 })
                    }
                  }}
                >
                  {/* Switch to a darker/navigation tile layer when in progress for better Waze feel */}
                  {ride.status === 'in_progress' ? (
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png" />
                  ) : (
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                  )}
                  
                  {/* Origin Marker */}
                  {ride.status !== 'in_progress' && (
                    <Marker position={[ride.origin_lat, ride.origin_lng]} />
                  )}
                  <Marker position={[ride.dest_lat, ride.dest_lng]} />
                  
                  {/* Driver Live Marker */}
                  {ride.status === 'in_progress' && driverLocation && (
                    <Marker 
                      position={[driverLocation.lat, driverLocation.lng]} 
                      icon={L.divIcon({
                        className: 'bg-transparent',
                        html: `<div style="transform: rotate(${driverLocation.heading || 0}deg); background: var(--accent); width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1); border: 2px solid white;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg></div>`,
                        iconSize: [30, 30],
                        iconAnchor: [15, 15]
                      })}
                      zIndexOffset={1000}
                    />
                  )}

                  {route && (
                    <Polyline 
                      positions={route.coordinates} 
                      color={ride.status === 'in_progress' ? "#818cf8" : "#6366f1"} 
                      weight={ride.status === 'in_progress' ? 7 : 5} 
                      opacity={0.9} 
                    />
                  )}
                </MapContainer>
              </div>
              
              {route && (
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 grid grid-cols-3 gap-2 text-center divide-x divide-indigo-200 dark:divide-indigo-800">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-indigo-500 mb-1">Distance</p>
                    <p className="font-bold text-sm text-indigo-700 dark:text-indigo-300">{(route.distance / 1000).toFixed(1)} km</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-indigo-500 mb-1">Temps</p>
                    <p className="font-bold text-sm text-indigo-700 dark:text-indigo-300">{Math.round(route.duration / 60)} min</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-green-600 mb-1">CO2 Économisé</p>
                    <p className="font-bold text-sm text-green-700 dark:text-green-400">{((route.distance / 1000) * 0.193).toFixed(1)} kg</p>
                  </div>
                </div>
              )}

              {/* Navigation Actions */}
              <div className="bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 p-3 flex gap-2">
                <a 
                  href={`https://waze.com/ul?ll=${ride.dest_lat},${ride.dest_lng}&navigate=yes`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 py-2.5 rounded-lg text-sm font-bold transition-colors"
                >
                  <MapPin size={16} /> Ouvrir Waze
                </a>
                <a 
                  href={`https://www.google.com/maps/dir/?api=1&origin=${ride.origin_lat},${ride.origin_lng}&destination=${ride.dest_lat},${ride.dest_lng}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-600 dark:text-green-400 py-2.5 rounded-lg text-sm font-bold transition-colors"
                >
                  <MapPin size={16} /> Google Maps
                </a>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                <Calendar size={20} className="text-indigo-500" />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Date & Heure</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                  {new Date(ride.departure_time).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                <Users size={20} className="text-indigo-500" />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Places</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                  {ride.seats_available} / {ride.seats_offered}
                </p>
              </div>
            </div>
          </div>

          {ride.description && (
            <div className="mt-4 p-4 rounded-xl" style={{ background: 'var(--surface-2)' }}>
              <p className="text-sm italic" style={{ color: 'var(--text)' }}>"{ride.description}"</p>
            </div>
          )}

          {/* Frais du trajet (Price Details) */}
          {ride.price_details && (
            <div className="mt-4 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-900/10">
              <h3 className="text-xs font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1 mb-3">
                <Calculator size={14} /> Détails des frais estimés
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-500 mb-0.5">Essence ({ride.price_details.consumption}L/100)</p>
                  <p className="text-sm font-semibold flex items-center gap-1" style={{ color: 'var(--text)' }}>
                    <Fuel size={12} className="text-indigo-500"/> 
                    {((ride.price_details.totalCost - (ride.price_details.tolls || 0))).toFixed(2)} €
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-500 mb-0.5">Péages</p>
                  <p className="text-sm font-semibold flex items-center gap-1" style={{ color: 'var(--text)' }}>
                    <Euro size={12} className="text-indigo-500"/> 
                    {Number(ride.price_details.tolls || 0).toFixed(2)} €
                  </p>
                </div>
              </div>
              <div className="border-t border-indigo-100 dark:border-indigo-800 pt-2 flex justify-between items-end">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Coût total du trajet ({ride.price_details.distanceKm?.toFixed(0)}km)</span>
                <span className="text-sm font-bold text-indigo-700 dark:text-indigo-400">{Number(ride.price_details.totalCost).toFixed(2)} €</span>
              </div>
            </div>
          )}
        </div>

        {/* Passenger Action Section */}
        {!isDriver && ride.status !== 'cancelled' && (
          <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            {myRequest ? (
              <div>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3" style={{ background: myRequest.status === 'accepted' ? '#10b981' : myRequest.status === 'rejected' ? '#ef4444' : '#f59e0b', color: 'white' }}>
                  {myRequest.status === 'accepted' ? <CheckCircle /> : myRequest.status === 'rejected' ? <XCircle /> : <Clock />}
                </div>
                <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--text)' }}>
                  {myRequest.status === 'accepted' ? 'Réservation confirmée !' : myRequest.status === 'rejected' ? 'Demande refusée' : 'Demande en attente'}
                </h3>
                <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                  {myRequest.status === 'accepted' ? 'Le conducteur a accepté votre demande. Bon voyage !' : myRequest.status === 'rejected' ? 'Le conducteur a refusé votre demande.' : 'Le conducteur n\'a pas encore répondu.'}
                </p>
                {myRequest.status === 'accepted' && (
                  <div className="mb-4 flex justify-center gap-2">
                    {ride.price > 0 && (
                      <button 
                        onClick={() => handleTogglePayment(user.id)}
                        className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-colors ${myRequest.has_paid ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'}`}
                      >
                        <Euro size={16} />
                        {myRequest.has_paid ? 'Paiement effectué' : 'Marquer comme payé'}
                      </button>
                    )}
                    {ride.price > 0 && !myRequest.has_paid ? (
                      <button 
                        onClick={() => setShowPaymentModal(true)}
                        className="px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-colors bg-indigo-600 text-white hover:bg-indigo-700 shadow-md"
                      >
                        <Euro size={16} />
                        Payer {formattedPrice} €
                      </button>
                    ) : (
                      <button 
                        onClick={() => setShowMyQr(true)}
                        className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-colors ${myRequest.boarded ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'}`}
                      >
                        <QrCode size={16} />
                        {myRequest.boarded ? 'Embarqué' : 'Afficher mon billet'}
                      </button>
                    )}
                  </div>
                )}
                <button onClick={() => handleRemovePassenger(myRequest.id)} className="text-sm font-bold text-red-500 hover:text-red-600 transition-colors">
                  {myRequest.status === 'accepted' ? 'Annuler ma réservation' : 'Annuler ma demande'}
                </button>
              </div>
            ) : ride.seats_available > 0 ? (
              <form onSubmit={handleRequest}>
                {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
                
                <div className="flex flex-col gap-3 mb-4">
                  <div className="flex flex-wrap gap-2 justify-center">
                    <label className={`cursor-pointer px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${optPlusUn ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm shadow-indigo-500/30' : 'bg-transparent text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
                      <input type="checkbox" className="hidden" checked={optPlusUn} onChange={e => setOptPlusUn(e.target.checked)} />
                      🧍 +1 Personne
                    </label>
                    <label className={`cursor-pointer px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${optValise ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm shadow-indigo-500/30' : 'bg-transparent text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
                      <input type="checkbox" className="hidden" checked={optValise} onChange={e => setOptValise(e.target.checked)} />
                      🧳 Beaucoup de valises
                    </label>
                    <label className={`cursor-pointer px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${optChien ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm shadow-indigo-500/30' : 'bg-transparent text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
                      <input type="checkbox" className="hidden" checked={optChien} onChange={e => setOptChien(e.target.checked)} />
                      🐾 Animal de compagnie
                    </label>
                  </div>

                  {optPlusUn && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300 relative">
                      <input
                        type="text"
                        value={optPlusUnName}
                        onChange={(e) => setOptPlusUnName(e.target.value)}
                        onFocus={() => { if (searchResults.length > 0) setShowDropdown(true) }}
                        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                        placeholder="Prénom ou pseudo de la personne ajoutée"
                        className="tsi-input w-full text-sm"
                        required={optPlusUn}
                      />
                      {showDropdown && searchResults.length > 0 && (
                        <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden z-10 max-h-48 overflow-y-auto">
                          {searchResults.map(u => (
                            <div 
                              key={u.id}
                              className="px-3 py-2 flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer"
                              onClick={() => {
                                setOptPlusUnName(`@${u.username}`)
                                setShowDropdown(false)
                              }}
                            >
                              <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 bg-gray-200">
                                {getAvatarUrl(u) ? (
                                  <img src={getAvatarUrl(u)} alt="avatar" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-indigo-500 flex items-center justify-center text-white text-[10px] font-bold">
                                    {u.username.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{u.username}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <textarea 
                  value={message} 
                  onChange={e => setMessage(e.target.value)} 
                  placeholder="Un petit mot pour le conducteur ? (optionnel)" 
                  className="tsi-input w-full mb-4 text-sm" 
                  rows={2} 
                />

                <div className="mb-4 bg-gray-50 dark:bg-slate-800/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                  <label className="flex items-center gap-2 cursor-pointer mb-2">
                    <input 
                      type="checkbox" 
                      checked={detourRequest} 
                      onChange={(e) => setDetourRequest(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 bg-black/40 border-gray-700"
                    />
                    <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Demander un petit détour</span>
                  </label>
                  {detourRequest && (
                    <input 
                      type="text" 
                      value={detourText} 
                      onChange={(e) => setDetourText(e.target.value)} 
                      placeholder="Ex: Pouvez-vous passer par l'arrêt de bus Mairie ?" 
                      className="tsi-input w-full text-sm" 
                      required
                    />
                  )}
                </div>

                <button type="submit" disabled={requesting} className="tsi-btn-primary w-full justify-center py-3">
                  {requesting ? 'Envoi...' : 'Demander une place'}
                </button>
              </form>
            ) : (
              <p className="text-red-500 font-bold">Trajet complet</p>
            )}
          </div>
        )}

        {/* Driver Dashboard Section */}
        {isDriver && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg" style={{ color: 'var(--text)' }}>Demandes passagers ({ride.passengers?.length || 0})</h3>
              {ride.status === 'active' || ride.status === 'in_progress' ? (
                <button 
                  onClick={() => setShowScanner(true)}
                  className="bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-full hover:bg-indigo-700 transition shadow-md flex items-center gap-1"
                >
                  <Scan size={14} /> Scanner un billet
                </button>
              ) : null}
            </div>
            
            {ride.passengers?.length === 0 ? (
              <p className="text-center text-sm p-4" style={{ color: 'var(--text-muted)' }}>Aucune demande pour le moment.</p>
            ) : (
              ride.passengers?.map(p => (
                <div key={p.id} className="rounded-xl p-4 flex items-center justify-between" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                      {getAvatarUrl(p.user) ? (
                        <img src={getAvatarUrl(p.user)} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                          {p.user.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <Link to={`/social/user/${p.user.id}`} className="font-semibold text-sm hover:underline" style={{ color: 'var(--text)' }}>{p.user.username}</Link>
                      {p.message && (
                        <p className="text-xs mt-0.5 italic leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                          {p.message.split(/(@[a-zA-Z0-9_.-]+)/g).map((part, i) => {
                            if (part.startsWith('@')) {
                              const username = part.substring(1)
                              return <Link key={i} to={`/social/user/${username}`} className="text-indigo-500 hover:underline font-semibold" onClick={(e) => e.stopPropagation()}>{part}</Link>
                            }
                            return <span key={i}>{part}</span>
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {p.status === 'pending' ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => handleResponse(p.id, 'accepted')} className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition-colors" title="Accepter">
                        <CheckCircle size={16} />
                      </button>
                      <button onClick={() => handleResponse(p.id, 'rejected')} className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors" title="Refuser">
                        <XCircle size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 shrink-0">
                      {p.status === 'accepted' && ride.price > 0 && (
                        <button 
                          onClick={() => handleTogglePayment(p.user.id)}
                          className={`px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 transition-colors ${p.has_paid ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'}`}
                          title="Basculer statut paiement"
                        >
                          <Euro size={12} /> {p.has_paid ? 'Payé' : 'À régler'}
                        </button>
                      )}
                      <span className={`text-xs font-bold px-2 py-1 rounded-md ${p.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {p.status === 'accepted' ? 'Accepté' : 'Refusé'}
                      </span>
                      <button onClick={() => handleRemovePassenger(p.id)} className="w-7 h-7 rounded-full bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 transition-colors" title="Retirer">
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Chat Section */}
        {isChatAuthorized && ride.status !== 'cancelled' && (
          <div className="rounded-2xl flex flex-col overflow-hidden h-[500px]" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="p-4 border-b flex flex-col gap-1" style={{ borderColor: 'var(--border)' }}>
              <h3 className="font-bold text-lg" style={{ color: 'var(--text)' }}>Discussion du trajet</h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Visible uniquement par le conducteur et les passagers acceptés.</p>
              {ride.status === 'completed' && <p className="text-xs font-bold text-orange-500 mt-1">Le trajet est terminé, le chat est en lecture seule.</p>}
            </div>
            
            {/* Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4" style={{ background: 'var(--bg)' }}>
              {chatMessages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-sm italic" style={{ color: 'var(--text-muted)' }}>
                  Aucun message pour l'instant. Dites bonjour ! 👋
                </div>
              ) : (
                chatMessages.map(msg => {
                  const isMe = msg.user_id === user.id
                  const showMenu = hoveredMessage === msg.id
                  const repliedMsg = msg.reply_to ? chatMessages.find(m => m.id === msg.reply_to) : null

                  return (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col max-w-[85%] relative group ${isMe ? 'self-end items-end' : 'self-start items-start'}`}
                      onMouseEnter={() => setHoveredMessage(msg.id)}
                      onMouseLeave={() => setHoveredMessage(null)}
                    >
                      {!isMe && (
                        <span className="text-[10px] font-bold ml-1 mb-1" style={{ color: 'var(--text-muted)' }}>
                          {msg.user.username} {msg.user_id === ride.driver_id && '(Conducteur)'}
                        </span>
                      )}
                      
                      <div className="relative flex items-center gap-2">
                        {isMe && showMenu && (
                          <div className="flex bg-white dark:bg-gray-800 shadow-md rounded-full border border-gray-200 dark:border-gray-700 overflow-hidden text-gray-500">
                            <button onClick={() => setChatReplyTo(msg)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700" title="Répondre"><Reply size={14}/></button>
                            <div className="w-[1px] bg-gray-200 dark:bg-gray-700 my-1"></div>
                            <button onClick={() => handleReact(msg.id, 'heart')} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-red-500" title="Aimer"><Heart size={14} /></button>
                            <button onClick={() => handleReact(msg.id, 'thumbsup')} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-500" title="Valider"><ThumbsUp size={14} /></button>
                          </div>
                        )}
                        
                        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          {repliedMsg && (
                            <div className="mb-1 text-xs opacity-70 border-l-2 pl-2 border-indigo-400 cursor-pointer max-w-[200px] truncate" style={{ color: 'var(--text-muted)' }}>
                              <span className="font-bold">{repliedMsg.user?.username || 'Utilisateur'}</span>: {repliedMsg.message}
                            </div>
                          )}
                          <div 
                            className={`px-4 py-2 rounded-2xl text-[15px] leading-snug relative ${isMe ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm'}`}
                          >
                            {msg.message}
                            
                            {/* Reactions */}
                            {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                              <div className={`absolute -bottom-3 flex gap-1 ${isMe ? 'right-2' : 'left-2'}`}>
                                {Object.entries(msg.reactions).map(([emoji, users]) => (
                                  <button 
                                    key={emoji} 
                                    onClick={() => handleReact(msg.id, emoji)}
                                    className="text-[11px] bg-white dark:bg-gray-700 shadow-sm border border-gray-100 dark:border-gray-600 rounded-full px-1.5 py-0.5 z-10 flex items-center hover:scale-110 transition-transform"
                                  >
                                    {emoji === 'heart' || emoji === '❤️' ? <Heart size={12} className="text-red-500 fill-current" /> : emoji === 'thumbsup' || emoji === '👍' ? <ThumbsUp size={12} className="text-blue-500 fill-current" /> : emoji} {users.length > 1 && <span className="ml-1 opacity-70">{users.length}</span>}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {!isMe && showMenu && (
                          <div className="flex bg-white dark:bg-gray-800 shadow-md rounded-full border border-gray-200 dark:border-gray-700 overflow-hidden text-gray-500 z-10">
                            <button onClick={() => setChatReplyTo(msg)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700" title="Répondre"><Reply size={14}/></button>
                            <div className="w-[1px] bg-gray-200 dark:bg-gray-700 my-1"></div>
                            <button onClick={() => handleReact(msg.id, 'heart')} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-red-500" title="Aimer"><Heart size={14} /></button>
                            <button onClick={() => handleReact(msg.id, 'thumbsup')} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-500" title="Valider"><ThumbsUp size={14} /></button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 mt-1 mx-1">
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                        {isMe && (msg.read_by?.length > 0) && (
                          <div className="flex items-center" title={`Vu par ${msg.read_by.length} personne(s)`}>
                            <CheckCheck size={12} className="text-blue-500 ml-1" />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Input Area */}
            {ride.status !== 'completed' && (
              <form onSubmit={handleSendMessage} className="p-4 border-t flex flex-col gap-2 bg-gray-50 dark:bg-slate-800/50" style={{ borderColor: 'var(--border)' }}>
                {chatReplyTo && (
                  <div className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300">
                    <span className="truncate">En réponse à <span className="font-bold">{chatReplyTo.user?.username}</span>: "{chatReplyTo.message}"</span>
                    <button type="button" onClick={() => setChatReplyTo(null)} className="p-1 hover:text-indigo-900"><X size={14} /></button>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="Écrivez un message..."
                    className="tsi-input flex-1 text-sm bg-white dark:bg-slate-900"
                    disabled={chatSending}
                  />
                  <button type="submit" disabled={chatSending || !chatInput.trim()} className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition disabled:opacity-50 shrink-0 shadow-sm">
                    <Send size={16} className={chatSending ? 'animate-pulse' : ''} />
                  </button>
                </div>
                {chatError && <p className="text-xs text-red-500">{chatError}</p>}
              </form>
            )}
          </div>
        )}

        {/* Reviews Section */}
        {ride.status === 'completed' && isChatAuthorized && (
          <div className="rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
              <Star size={20} className="text-yellow-500 fill-yellow-500" />
              Évaluer les participants
            </h3>
            <div className="flex flex-col gap-3">
              {/* If passenger, show driver */}
              {!isDriver && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                      {getAvatarUrl(ride.driver) ? (
                        <img src={getAvatarUrl(ride.driver)} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-indigo-500 flex items-center justify-center text-white text-sm font-bold">
                          {ride.driver.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>{ride.driver.username}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Conducteur</p>
                    </div>
                  </div>
                  {(() => {
                    const myReview = ride.reviews?.find(r => r.reviewer_id === user.id && r.reviewee_id === ride.driver_id)
                    const theirReview = ride.reviews?.find(r => r.reviewer_id === ride.driver_id && r.reviewee_id === user.id)
                    
                    return (
                      <div className="flex flex-col items-end gap-3">
                        {/* Mon avis */}
                        {!myReview ? (
                          <button 
                            onClick={() => {
                              setReviewModal({ rideId: ride.id, revieweeId: ride.driver_id, revieweeName: ride.driver.username })
                              setSelectedTags([])
                              setSelectedRating(0)
                            }}
                            className="px-4 py-2 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 text-xs font-bold rounded-full transition-colors"
                          >
                            Laisser un avis
                          </button>
                        ) : (
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[9px] uppercase font-bold text-gray-400">Mon avis laissé</span>
                            <div className="flex items-center gap-0.5">
                              {[1,2,3,4,5].map(star => (
                                <Star key={star} size={12} className={star <= myReview.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                              ))}
                            </div>
                            {myReview.tags && myReview.tags.length > 0 && (
                              <div className="flex gap-1">
                                {myReview.tags.map(tag => {
                                  let label = ''
                                  if (tag === 'music') label = 'DJ'
                                  if (tag === 'talkative') label = 'Bavard'
                                  if (tag === 'quiet') label = 'Silencieux'
                                  if (tag === 'punctual') label = 'Ponctuel'
                                  return label ? <span key={tag} className="text-[9px] bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded shadow-sm border border-gray-100 dark:border-slate-600 font-bold text-gray-600 dark:text-gray-300">{label}</span> : null
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Son avis sur moi */}
                        {theirReview && (
                          <div className="flex flex-col items-end gap-1 pt-2 border-t border-gray-200 dark:border-slate-700 w-full">
                            <span className="text-[9px] uppercase font-bold text-indigo-400">Son avis reçu</span>
                            <div className="flex items-center gap-0.5">
                              {[1,2,3,4,5].map(star => (
                                <Star key={star} size={12} className={star <= theirReview.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                              ))}
                            </div>
                            {theirReview.tags && theirReview.tags.length > 0 && (
                              <div className="flex gap-1">
                                {theirReview.tags.map(tag => {
                                  let label = ''
                                  if (tag === 'music') label = 'DJ'
                                  if (tag === 'talkative') label = 'Bavard'
                                  if (tag === 'quiet') label = 'Silencieux'
                                  if (tag === 'punctual') label = 'Ponctuel'
                                  return label ? <span key={tag} className="text-[9px] bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded shadow-sm border border-gray-100 dark:border-slate-600 font-bold text-gray-600 dark:text-gray-300">{label}</span> : null
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* Show accepted passengers (except self) */}
              {ride.passengers?.filter(p => p.status === 'accepted' && p.user_id !== user.id).map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                      {getAvatarUrl(p.user) ? (
                        <img src={getAvatarUrl(p.user)} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-indigo-500 flex items-center justify-center text-white text-sm font-bold">
                          {p.user.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>{p.user.username}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Passager</p>
                    </div>
                  </div>
                  {(() => {
                    const myReview = ride.reviews?.find(r => r.reviewer_id === user.id && r.reviewee_id === p.user_id)
                    const theirReview = ride.reviews?.find(r => r.reviewer_id === p.user_id && r.reviewee_id === user.id)
                    
                    return (
                      <div className="flex flex-col items-end gap-3">
                        {/* Mon avis */}
                        {!myReview ? (
                          <button 
                            onClick={() => {
                              setReviewModal({ rideId: ride.id, revieweeId: p.user_id, revieweeName: p.user.username })
                              setSelectedTags([])
                              setSelectedRating(0)
                            }}
                            className="px-4 py-2 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 text-xs font-bold rounded-full transition-colors"
                          >
                            Laisser un avis
                          </button>
                        ) : (
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[9px] uppercase font-bold text-gray-400">Mon avis laissé</span>
                            <div className="flex items-center gap-0.5">
                              {[1,2,3,4,5].map(star => (
                                <Star key={star} size={12} className={star <= myReview.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                              ))}
                            </div>
                            {myReview.tags && myReview.tags.length > 0 && (
                              <div className="flex gap-1">
                                {myReview.tags.map(tag => {
                                  let label = ''
                                  if (tag === 'music') label = 'DJ'
                                  if (tag === 'talkative') label = 'Bavard'
                                  if (tag === 'quiet') label = 'Silencieux'
                                  if (tag === 'punctual') label = 'Ponctuel'
                                  return label ? <span key={tag} className="text-[9px] bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded shadow-sm border border-gray-100 dark:border-slate-600 font-bold text-gray-600 dark:text-gray-300">{label}</span> : null
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Son avis sur moi */}
                        {theirReview && (
                          <div className="flex flex-col items-end gap-1 pt-2 border-t border-gray-200 dark:border-slate-700 w-full">
                            <span className="text-[9px] uppercase font-bold text-indigo-400">Son avis reçu</span>
                            <div className="flex items-center gap-0.5">
                              {[1,2,3,4,5].map(star => (
                                <Star key={star} size={12} className={star <= theirReview.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                              ))}
                            </div>
                            {theirReview.tags && theirReview.tags.length > 0 && (
                              <div className="flex gap-1">
                                {theirReview.tags.map(tag => {
                                  let label = ''
                                  if (tag === 'music') label = 'DJ'
                                  if (tag === 'talkative') label = 'Bavard'
                                  if (tag === 'quiet') label = 'Silencieux'
                                  if (tag === 'punctual') label = 'Ponctuel'
                                  return label ? <span key={tag} className="text-[9px] bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded shadow-sm border border-gray-100 dark:border-slate-600 font-bold text-gray-600 dark:text-gray-300">{label}</span> : null
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* QR Code Modals */}
      {showMyQr && myRequest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowMyQr(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowMyQr(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white bg-gray-100 dark:bg-slate-700 rounded-full p-1">
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold mb-2 text-indigo-600 dark:text-indigo-400">Votre Billet</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Présentez ce QR Code au conducteur pour valider votre montée à bord.</p>
            
            <div className="bg-white p-4 rounded-2xl inline-block shadow-inner border border-gray-100 dark:border-gray-700">
              <QRCodeSVG 
                value={JSON.stringify({ rideId: id, userId: user.id })} 
                size={200}
                level="H"
                includeMargin={true}
              />
            </div>
            
            <div className="mt-6 flex items-center justify-center gap-2 text-green-600 font-bold bg-green-50 dark:bg-green-900/20 py-2 rounded-xl">
              <CheckCircle size={18} /> Réservation Confirmée
            </div>
          </div>
        </div>
      )}

      {showScanner && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowScanner(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full text-center shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowScanner(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white bg-gray-100 dark:bg-slate-700 rounded-full p-1 z-10">
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold mb-2 text-indigo-600 dark:text-indigo-400">Scanner un billet</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Pointez la caméra vers le téléphone du passager.</p>
            
            <div className="rounded-2xl overflow-hidden bg-black aspect-square flex items-center justify-center border-4 border-indigo-100 dark:border-slate-700">
              <div id="qr-reader" className="w-full h-full"></div>
            </div>
          </div>
        </div>
      )}

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
                      'Authorization': `Bearer ${getToken()}`
                    },
                    body: JSON.stringify({
                      rideId: reviewModal.rideId,
                      revieweeId: reviewModal.revieweeId,
                      tags: selectedTags,
                      rating: selectedRating
                    })
                  })
                  if (!res.ok) throw new Error('Erreur')
                  
                  // Immediately update UI with new review
                  setRide(prev => ({
                    ...prev,
                    reviews: [
                      ...(prev.reviews || []),
                      {
                        reviewer_id: user.id,
                        reviewee_id: reviewModal.revieweeId,
                        rating: selectedRating,
                        tags: selectedTags
                      }
                    ]
                  }))
                  
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
              {submittingReview ? 'Envoi...' : 'Valider mon avis'}
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
