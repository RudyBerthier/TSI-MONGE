import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Car, Search, MapPin, Calendar, Clock, Users, Euro, CheckCircle, ArrowDownUp } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
})

// Helper pour recentrer la carte
function MapUpdater({ bounds, center, zoom }) {
  const map = useMap()
  
  // Convertir en string pour éviter que la réf change à chaque rendu
  const boundsStr = JSON.stringify(bounds)
  const centerStr = JSON.stringify(center)

  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [20, 20] })
    } else if (center) {
      map.setView(center, zoom || 13)
    }
  }, [map, boundsStr, centerStr, zoom]) // On écoute la version texte
  
  return null
}

function LocationAutocomplete({ value, onChange, placeholder, iconColor = 'text-gray-400' }) {
  const [query, setQuery] = useState(value || '')
  const [results, setResults] = useState([])
  const [recentSearches, setRecentSearches] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef(null)

  useEffect(() => {
    setQuery(value || '')
  }, [value])

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    
    // Charger l'historique
    try {
      const saved = localStorage.getItem('carpool_recent_locations')
      if (saved) setRecentSearches(JSON.parse(saved))
    } catch (e) {}
    
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([])
      return
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        // We add 'Lycée Monge' custom handling if they type 'monge'
        if (query.toLowerCase().includes('monge')) {
          setResults([{ label: 'Lycée Monge, Chambéry', city: 'Chambéry', lat: 45.5646, lng: 5.9178 }])
          return
        }

        // Bounding box de la France métropolitaine + Bias sur Chambéry
        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lat=45.5646&lon=5.9178&bbox=-5.14,41.33,9.56,51.09&limit=6&lang=fr`)
        const data = await res.json()
        const formatted = data.features.map(f => {
          const props = f.properties
          let name = props.name || props.street || props.city
          if (props.housenumber && props.street) {
            name = `${props.housenumber} ${props.street}`
          }
          const city = props.city || props.state || ''
          const label = city && name !== city ? `${name}, ${city}` : name
          return {
            label,
            city,
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0]
          }
        })

        // Filtrer les doublons exacts (même label)
        const uniqueResults = formatted.filter((v, i, a) => a.findIndex(t => (t.label === v.label)) === i)

        setResults(uniqueResults)
      } catch (err) {
        console.error(err)
      }
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [query])

  const handleSelect = (res) => {
    setQuery(res.label)
    onChange(res)
    setIsOpen(false)
    
    // Sauvegarder dans l'historique
    try {
      const saved = localStorage.getItem('carpool_recent_locations')
      let prev = []
      if (saved) prev = JSON.parse(saved)
      
      // Remove if exists
      const filtered = prev.filter(item => item.label !== res.label)
      // Add to front
      const next = [res, ...filtered].slice(0, 5)
      setRecentSearches(next)
      localStorage.setItem('carpool_recent_locations', JSON.stringify(next))
    } catch (e) {}
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault() // Empêche la soumission du formulaire
      if (results.length > 0) {
        handleSelect(results[0])
      }
    }
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 ${iconColor}`} size={18} />
      <input
        type="text"
        required
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          onChange(e.target.value)
          setIsOpen(true)
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          try {
            const saved = localStorage.getItem('carpool_recent_locations')
            if (saved) setRecentSearches(JSON.parse(saved))
          } catch (e) {}
          setIsOpen(true)
        }}
        placeholder={placeholder}
        className="tsi-input pl-10 w-full"
        autoComplete="off"
      />

      {isOpen && (results.length > 0 || (query.length < 2 && recentSearches.length > 0)) && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden">
          
          {query.length < 2 && recentSearches.length > 0 && (
            <div className="px-3 py-2 bg-gray-50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-700">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Recherches récentes</span>
            </div>
          )}
          
          {(query.length < 2 ? recentSearches : results).map((res, i) => (
            <div
              key={i}
              onClick={() => handleSelect(res)}
              className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer text-sm font-medium transition-colors flex items-center gap-2"
            >
              {query.length < 2 ? (
                <Clock size={14} className="text-indigo-400" />
              ) : (
                <Search size={14} className="text-gray-400" />
              )}
              {res.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function InlineDatePicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef(null)
  
  const [viewDate, setViewDate] = useState(new Date(value || new Date()))

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const selectedDate = new Date(value)
  const displayLabel = value === new Date().toISOString().split('T')[0] 
    ? "Aujourd'hui" 
    : selectedDate.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  
  let startingDay = firstDay.getDay()
  startingDay = startingDay === 0 ? 6 : startingDay - 1
  
  const daysInMonth = lastDay.getDate()
  
  const calendarGrid = Array(startingDay).fill(null)
  for (let i = 1; i <= daysInMonth; i++) {
    calendarGrid.push(new Date(year, month, i))
  }

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1))
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1))
  
  const todayStr = new Date().toISOString().split('T')[0]

  return (
    <div className="relative" ref={wrapperRef}>
      <button 
        type="button" 
        onClick={() => setIsOpen(!isOpen)}
        className="tsi-input w-full flex items-center justify-between bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 hover:border-indigo-500 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-indigo-500" />
          <span className="font-semibold text-sm capitalize">{displayLabel}</span>
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg p-4 w-72 left-0 sm:left-auto">
          <div className="flex items-center justify-between mb-4">
            <button type="button" onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
               &larr;
            </button>
            <span className="font-bold text-sm capitalize">
              {viewDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </span>
            <button type="button" onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
               &rarr;
            </button>
          </div>
          
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'].map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-gray-400 uppercase">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarGrid.map((d, i) => {
              if (!d) return <div key={i} />
              
              const y = d.getFullYear()
              const m = (d.getMonth() + 1).toString().padStart(2, '0')
              const day = d.getDate().toString().padStart(2, '0')
              const dateStr = `${y}-${m}-${day}`
              
              const isSelected = value === dateStr
              const isToday = dateStr === todayStr
              const isPast = dateStr < todayStr

              return (
                <button
                  key={i}
                  type="button"
                  disabled={isPast}
                  onClick={() => {
                    onChange(dateStr)
                    setIsOpen(false)
                  }}
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all mx-auto
                    ${isPast ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/30'}
                    ${isSelected ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30 hover:bg-indigo-600' : ''}
                    ${!isSelected && isToday ? 'text-indigo-500 font-bold border border-indigo-200 dark:border-indigo-800' : ''}
                    ${!isSelected && !isPast && !isToday ? 'text-gray-700 dark:text-gray-300' : ''}
                  `}
                >
                  {d.getDate()}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function InlineTimePicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef(null)
  
  const [hour, minute] = value ? value.split(':') : ['08', '00']

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const hours = Array.from({length: 24}).map((_, i) => i.toString().padStart(2, '0'))
  const minutes = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']

  const handleHourClick = (h) => onChange(`${h}:${minute}`)
  const handleMinuteClick = (m) => onChange(`${hour}:${m}`)

  // Scroll automatique au bon endroit à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const hEl = document.getElementById(`hour-${hour}`)
        const mEl = document.getElementById(`minute-${minute}`)
        if (hEl) hEl.scrollIntoView({ block: 'center' })
        if (mEl) mEl.scrollIntoView({ block: 'center' })
      }, 10)
    }
  }, [isOpen, hour, minute])

  return (
    <div className="relative" ref={wrapperRef}>
      <button 
        type="button" 
        onClick={() => setIsOpen(!isOpen)}
        className="tsi-input w-full flex items-center justify-between bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 hover:border-indigo-500 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-indigo-500" />
          <span className="font-semibold text-sm">{value}</span>
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg p-3 w-64 right-0 sm:right-auto sm:left-0">
          <div className="flex gap-2 h-48">
            <div className="flex-1 overflow-y-auto scroll-smooth border-r border-gray-100 dark:border-slate-700 pr-1" style={{ scrollbarWidth: 'none' }}>
              <div className="text-[10px] font-bold text-gray-400 uppercase text-center sticky top-0 bg-white dark:bg-slate-800 py-1 z-10">Heure</div>
              {hours.map((h) => (
                <button
                  key={h}
                  id={`hour-${h}`}
                  type="button"
                  onClick={() => handleHourClick(h)}
                  className={`w-full py-2 text-center rounded-lg text-sm font-medium transition-colors mb-1 ${h === hour ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30' : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300'}`}
                >
                  {h}
                </button>
              ))}
            </div>
            
            <div className="flex-1 overflow-y-auto scroll-smooth pl-1" style={{ scrollbarWidth: 'none' }}>
              <div className="text-[10px] font-bold text-gray-400 uppercase text-center sticky top-0 bg-white dark:bg-slate-800 py-1 z-10">Minute</div>
              {minutes.map((m) => (
                <button
                  key={m}
                  id={`minute-${m}`}
                  type="button"
                  onClick={() => handleMinuteClick(m)}
                  className={`w-full py-2 text-center rounded-lg text-sm font-medium transition-colors mb-1 ${m === minute ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30' : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300'}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => setIsOpen(false)}
            className="w-full mt-3 py-2 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300 font-bold text-sm rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/30 transition-colors"
          >
            Valider
          </button>
        </div>
      )}
    </div>
  )
}

export function CarpoolOffer() {
  const navigate = useNavigate()
  const { getToken } = useAuth()

  const now = new Date()
  const todayDate = now.toISOString().split('T')[0]
  now.setHours(now.getHours() + 1)
  now.setMinutes(0)
  const defaultTime = now.toTimeString().slice(0, 5)

  const [formData, setFormData] = useState({
    origin: '',
    originLat: null,
    originLng: null,
    destination: '',
    destLat: null,
    destLng: null,
    date: todayDate,
    time: defaultTime,
    seatsOffered: 3,
    price: 0,
    description: ''
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [route, setRoute] = useState(null)

  useEffect(() => {
    const fetchRoute = async () => {
      if (formData.originLat && formData.originLng && formData.destLat && formData.destLng) {
        try {
          const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${formData.originLng},${formData.originLat};${formData.destLng},${formData.destLat}?overview=full&geometries=geojson`)
          const data = await res.json()
          if (data.routes && data.routes.length > 0) {
            const r = data.routes[0]
            const coords = r.geometry.coordinates.map(c => [c[1], c[0]])
            setRoute({
              coordinates: coords,
              distance: r.distance,
              duration: r.duration
            })
          }
        } catch (e) {
          console.error("OSRM Preview Error:", e)
        }
      } else {
        setRoute(null)
      }
    }

    fetchRoute()
  }, [formData.originLat, formData.originLng, formData.destLat, formData.destLng])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const departureTime = new Date(`${formData.date}T${formData.time}`).toISOString()

    try {
      const res = await fetch('/api/carpool', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          ...formData,
          departureTime
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la création')

      navigate(`/covoiturage/${data.id}`)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: '90px' }}>
      {/* Header */}
      <div className="sticky top-0 z-30" style={{ background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/covoiturage" className="transition-colors p-1" style={{ color: 'var(--accent)' }}>
              <ArrowLeft size={22} />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-500">
                <Car size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Proposer un trajet</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-600 p-4 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          {/* Itinéraire */}
          <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>Itinéraire</h2>

            <div className="relative space-y-4">
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>Lieu de départ</label>
                <LocationAutocomplete
                  value={formData.origin}
                  placeholder="Ex: Gare de Chambéry"
                  iconColor="text-indigo-500"
                  onChange={(res) => {
                    if (typeof res === 'object') {
                      setFormData(prev => ({ ...prev, origin: res.label, originLat: res.lat, originLng: res.lng }))
                    } else {
                      setFormData(prev => ({ ...prev, origin: res }))
                    }
                  }}
                />
              </div>

              <div className="relative">
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700 -z-10"></div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>Où allez-vous ?</label>
                <LocationAutocomplete
                  value={formData.destination}
                  placeholder="Ex: Lycée Monge, Chambéry"
                  iconColor="text-indigo-500"
                  onChange={(res) => {
                    if (typeof res === 'object') {
                      setFormData(prev => ({ ...prev, destination: res.label, destLat: res.lat, destLng: res.lng }))
                    } else {
                      setFormData(prev => ({ ...prev, destination: res }))
                    }
                  }}
                />
              </div>

              {/* Bouton Inverser parfaitement centré au milieu de la div relative parent (gap géré par le parent sans asymétrie) */}
              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    origin: prev.destination,
                    originLat: prev.destLat,
                    originLng: prev.destLng,
                    destination: prev.origin,
                    destLat: prev.originLat,
                    destLng: prev.originLng
                  }))
                }}
                className="absolute right-4 top-[calc(50%+4px)] -translate-y-1/2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-2.5 rounded-full shadow hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors z-20"
                title="Inverser le départ et l'arrivée"
              >
                <ArrowDownUp size={16} className="text-indigo-500" />
              </button>
            </div>
          </div>

          {/* Live Map Preview */}
          {(formData.originLat || formData.destLat) && (
            <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--border)', height: '200px' }}>
              <MapContainer
                preferCanvas={true}
                center={
                  formData.originLat ? [formData.originLat, formData.originLng]
                    : formData.destLat ? [formData.destLat, formData.destLng]
                      : [45.5646, 5.9178]
                }
                zoom={13}
                style={{ height: '100%', width: '100%', zIndex: 0 }}
                zoomControl={false}
              >
                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                {formData.originLat && <Marker position={[formData.originLat, formData.originLng]} />}
                {formData.destLat && <Marker position={[formData.destLat, formData.destLng]} />}
                {route && <Polyline positions={route.coordinates} color="#6366f1" weight={4} opacity={0.8} />}

                <MapUpdater
                  bounds={route ? [[formData.originLat, formData.originLng], [formData.destLat, formData.destLng]] : null}
                  center={formData.originLat ? [formData.originLat, formData.originLng] : formData.destLat ? [formData.destLat, formData.destLng] : null}
                />
              </MapContainer>
            </div>
          )}

          {/* Route Stats Preview */}
          {route && (
            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl grid grid-cols-3 gap-2 text-center divide-x divide-indigo-200 dark:divide-indigo-800">
              <div>
                <p className="text-[10px] font-bold uppercase text-indigo-500 mb-1">Distance</p>
                <p className="font-bold text-sm text-indigo-700 dark:text-indigo-300">{(route.distance / 1000).toFixed(1)} km</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-indigo-500 mb-1">Temps</p>
                <p className="font-bold text-sm text-indigo-700 dark:text-indigo-300">{Math.round(route.duration / 60)} min</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-green-600 mb-1">CO2 Éco</p>
                <p className="font-bold text-sm text-green-700 dark:text-green-400">{((route.distance / 1000) * 0.193).toFixed(1)} kg</p>
              </div>
            </div>
          )}

          {/* Date & Heure */}
          <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>Départ</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>Date</label>
                <InlineDatePicker 
                  value={formData.date} 
                  onChange={(val) => setFormData(prev => ({ ...prev, date: val }))} 
                />
              </div>

              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>Heure</label>
                <InlineTimePicker 
                  value={formData.time} 
                  onChange={(val) => setFormData(prev => ({ ...prev, time: val }))} 
                />
              </div>
            </div>
          </div>

          {/* Détails (Places & Prix) */}
          <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>Détails</h2>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>Places proposées</label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input type="number" min="1" max="8" name="seatsOffered" required value={formData.seatsOffered} onChange={handleChange} className="tsi-input pl-10 w-full" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>Prix (en €)</label>
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input type="number" min="0" step="1" name="price" required value={formData.price} onChange={handleChange} placeholder="0 pour gratuit" className="tsi-input pl-10 w-full" />
                </div>
                <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Mettez 0 si le trajet est gratuit.</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>Description (optionnel)</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Ex: Je passe par l'autoroute, petit sac uniquement..."
                className="tsi-input w-full"
                rows={3}
                style={{ resize: 'none' }}
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="tsi-btn-primary w-full py-4 text-base justify-center flex items-center gap-2">
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <><CheckCircle size={20} /> Publier mon trajet</>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
