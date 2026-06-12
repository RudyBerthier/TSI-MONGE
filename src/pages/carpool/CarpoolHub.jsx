import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { Calendar as CalendarIcon, Users, Euro, ArrowLeft, Car, Search, Plus, History } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { RestrictedAccess } from '../../components/RestrictedAccess'

// Fix for default Leaflet icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/leaflet/marker-shadow.png',
})

const SOCKET_URL = import.meta.env.VITE_API_URL || ''

const getAvatarUrl = (u) => {
  if (!u) return null;
  if (u.avatar && u.avatar.startsWith('http')) return u.avatar;
  if (u.google_avatar && u.google_avatar.startsWith('http')) return u.google_avatar;
  if (u.avatar) return `${SOCKET_URL}${u.avatar}`;
  return null;
}

export function CarpoolHub() {
  const [rides, setRides] = useState([])
  const [mapRides, setMapRides] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const { user } = useAuth()
  const location = useLocation()

  useEffect(() => {
    fetch('/api/carpool')
      .then(res => res.json())
      .then(data => {
        const pointCounts = {}
        const mapped = data.filter(r => r.origin_lat && r.origin_lng).map(r => {
          // Jitter algorithme : on décale très légèrement les points identiques
          const key = `${r.origin_lat.toFixed(4)},${r.origin_lng.toFixed(4)}`
          pointCounts[key] = (pointCounts[key] || 0) + 1
          const offset = (pointCounts[key] - 1) * 0.0003 // Environ 30m de décalage vers le nord/est
          return {
            ...r,
            lat: r.origin_lat + offset,
            lng: r.origin_lng + offset
          }
        })
        
        setRides(data)
        setMapRides(mapped)

        // Récupérer les tracés (polylines) en arrière-plan sans bloquer
        const fetchRoutes = async () => {
          const updated = [...mapped];
          for (let i = 0; i < updated.length; i++) {
            const r = updated[i];
            if (r.dest_lat && r.dest_lng) {
              try {
                const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${r.origin_lng},${r.origin_lat};${r.dest_lng},${r.dest_lat}?overview=simplified&geometries=geojson`);
                const routeData = await res.json();
                if (routeData.routes && routeData.routes.length > 0) {
                   const coords = routeData.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
                   // Attacher la polyline au point jittered
                   coords[0] = [r.lat, r.lng]; 
                   r.polyline = coords;
                }
              } catch (e) { console.error('OSRM fail', e) }
            }
          }
          setMapRides([...updated]);
        }
        
        fetchRoutes()
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filteredRides = rides.filter(ride => 
    ride.destination.toLowerCase().includes(searchQuery.toLowerCase()) || 
    ride.origin.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <RestrictedAccess 
          title="Accès restreint" 
          message="Connectez-vous pour proposer ou réserver un trajet en covoiturage." 
        />
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: '24px' }}>
      
      {/* Header */}
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-30" style={{ background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2 rounded-xl flex items-center justify-center transition-all w-fit" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-500">
                <Car size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Covoiturage</h1>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Trajets partagés TSI</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/covoiturage/historique" className="tsi-btn-ghost text-sm flex items-center gap-2 px-3">
              <History size={16} /> <span className="hidden sm:inline">Historique</span>
            </Link>
            <Link to="/covoiturage/proposer" className="tsi-btn-primary text-sm flex items-center gap-2 px-4">
              <Plus size={16} /> <span className="hidden sm:inline">Proposer un trajet</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        
        {/* Map View */}
        <div className="rounded-2xl overflow-hidden shadow-lg border relative z-0" style={{ borderColor: 'var(--border)', height: '300px' }}>
          <MapContainer center={[45.5646, 5.9178]} zoom={11} style={{ height: '100%', width: '100%', zIndex: 0 }}>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            {mapRides.map(ride => {
              const popupContent = (
                <Popup>
                  <div className="text-center font-sans">
                    <p className="font-bold text-sm m-0">{ride.origin} → {ride.destination}</p>
                    <p className="text-xs text-gray-500 m-0 mt-1">{new Date(ride.departure_time).toLocaleString('fr-FR')}</p>
                    <Link to={`/covoiturage/${ride.id}`} className="mt-2 block text-xs bg-indigo-500 py-1 px-2 rounded-md no-underline font-bold" style={{ color: '#ffffff' }}>Voir le trajet</Link>
                  </div>
                </Popup>
              );

              return (
                <div key={`group-${ride.id}`}>
                  {ride.polyline && (
                    <Polyline 
                      positions={ride.polyline} 
                      pathOptions={{ color: '#6366f1', weight: 4, opacity: 0.6 }} 
                    >
                      {popupContent}
                    </Polyline>
                  )}
                  <Marker position={[ride.lat, ride.lng]}>
                    {popupContent}
                  </Marker>
                </div>
              );
            })}
          </MapContainer>
        </div>

        {/* Filters/Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Rechercher une destination ou un départ..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="tsi-input pl-10 w-full" 
            />
          </div>
        </div>

        {/* List of Rides */}
        <h2 className="font-bold text-lg" style={{ color: 'var(--text)' }}>Trajets disponibles</h2>
        {loading ? (
          <p className="text-center text-gray-500 py-10 animate-pulse">Chargement des trajets...</p>
        ) : rides.length === 0 ? (
          <div className="text-center py-12 rounded-2xl" style={{ background: 'var(--surface)' }}>
            <Car size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-medium" style={{ color: 'var(--text)' }}>Aucun trajet disponible</p>
            <p className="text-sm mt-1 mb-4" style={{ color: 'var(--text-muted)' }}>Sois le premier à en proposer un !</p>
            <Link to="/covoiturage/proposer" className="tsi-btn-primary mx-auto inline-flex">Proposer un trajet</Link>
          </div>
        ) : filteredRides.length === 0 ? (
          <div className="text-center py-12 rounded-2xl" style={{ background: 'var(--surface)' }}>
            <Car size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-medium" style={{ color: 'var(--text)' }}>Aucun trajet ne correspond à "{searchQuery}"</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRides.map(ride => (
              <Link key={ride.id} to={`/covoiturage/${ride.id}`} className="block group">
                <div className="rounded-2xl p-5 border transition-all hover:shadow-md hover:-translate-y-1" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                  
                  {/* Driver & Price */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden border">
                        {getAvatarUrl(ride.driver) ? (
                          <img src={getAvatarUrl(ride.driver)} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                            {ride.driver.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{ride.driver.username}</p>
                        <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <CalendarIcon size={12} />
                          {new Date(ride.departure_time).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} à {new Date(ride.departure_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                    <div className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full text-sm font-bold flex flex-col items-end">
                      <div className="flex items-center gap-1">
                        {(() => {
                          if (ride.price === 0) return 'Gratuit';
                          const acceptedPassengersCount = ride.seats_offered - ride.seats_available;
                          const finalPrice = ride.price_type === 'divided' ? (ride.price / (acceptedPassengersCount + 1)) : ride.price;
                          const formattedPrice = finalPrice % 1 === 0 ? finalPrice : finalPrice.toFixed(2);
                          return <>{formattedPrice} <Euro size={14}/></>;
                        })()}
                      </div>
                      {ride.price_type === 'divided' && ride.price > 0 && (
                        <span className="text-[9px] uppercase tracking-wider opacity-80 mt-0.5 whitespace-nowrap">({ride.price}€ à diviser)</span>
                      )}
                    </div>
                  </div>

                  {/* Route */}
                  <div className="grid grid-cols-[auto_1fr] gap-x-3 mb-4 pl-1">
                    <div className="flex flex-col items-center mt-1">
                      <div className="w-2.5 h-2.5 rounded-full border-2 border-indigo-500 bg-white dark:bg-slate-900 z-10 shrink-0"></div>
                      <div className="w-[2px] flex-1 bg-gray-200 dark:bg-gray-700 my-1"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 z-10 shrink-0"></div>
                    </div>
                    
                    <div className="flex flex-col justify-between py-0 min-h-[3rem]">
                      <div className="mb-3">
                        <p className="font-medium text-sm leading-tight" style={{ color: 'var(--text)' }}>{ride.origin}</p>
                      </div>
                      <div>
                        <p className="font-medium text-sm leading-tight" style={{ color: 'var(--text)' }}>{ride.destination}</p>
                      </div>
                    </div>
                  </div>

                  {/* Footer Stats */}
                  <div className="flex justify-between items-center pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: ride.seats_available > 0 ? 'var(--text)' : '#ef4444' }}>
                      <Users size={14} />
                      {ride.seats_available} {ride.seats_available > 1 ? 'places restantes' : 'place restante'}
                    </div>
                    <span className="text-xs text-indigo-500 font-medium group-hover:underline">Voir détails →</span>
                  </div>

                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
