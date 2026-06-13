import React, { useState, useEffect } from 'react';
import { Bus, MapPin, Star, AlertCircle, Clock, Navigation, ArrowLeft, ArrowRight, Route, Footprints, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { AddressAutocomplete } from '../components/AddressAutocomplete';
import { TransitMap } from '../components/TransitMap';

export function TransportPage() {
  const { getToken, userSettings, updateUserSettings } = useAuth();
  const navigate = useNavigate();
  
  // States for Proches
  const [loadingProches, setLoadingProches] = useState(false);
  const [dataProches, setDataProches] = useState({ stops: {}, arrivals: [], shapes: {} });
  const [errorProches, setErrorProches] = useState('');
  const [locationProches, setLocationProches] = useState(null);
  const [selectedShapeId, setSelectedShapeId] = useState(null);

  const favorites = userSettings?.tsi_transit_favorites || [];

  // Auto fetch favorites
  useEffect(() => {
    if (favorites.length > 0 && !locationProches) {
      setLoadingProches(true);
      const stopIds = [...new Set(favorites.map(f => f.stopId))].join(',');
      fetch(`/api/transit/chambery?stops=${stopIds}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      })
      .then(res => res.json())
      .then(d => {
        setDataProches(d || { stops: {}, arrivals: [], shapes: {} });
        setLoadingProches(false);
      })
      .catch(() => {
        setLoadingProches(false);
      });
    }
  }, [favorites.length]);

  // --- Logic for Arrêts Proches ---
  const handleLocateProches = () => {
    setLoadingProches(true);
    setErrorProches('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocationProches({ lat: latitude, lng: longitude });
        fetchTransitData(latitude, longitude);
      },
      (err) => {
        setErrorProches('Impossible d\'obtenir la géolocalisation.');
        setLoadingProches(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const fetchTransitData = async (lat, lng) => {
    try {
      const res = await fetch(`/api/transit/chambery?lat=${lat}&lng=${lng}&radius=600`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (!res.ok) throw new Error("Erreur serveur");
      const d = await res.json();
      setDataProches(d || { stops: {}, arrivals: [], shapes: {} });
    } catch (err) {
      setErrorProches("Erreur de récupération des horaires.");
    } finally {
      setLoadingProches(false);
    }
  };

  const toggleFavorite = async (stopId, routeId, headsign) => {
    const isFav = favorites.some(f => f.stopId === stopId && f.routeId === routeId && f.headsign === headsign);
    let newFavs = [...favorites];
    if (isFav) {
      newFavs = newFavs.filter(f => !(f.stopId === stopId && f.routeId === routeId && f.headsign === headsign));
    } else {
      newFavs.push({ stopId, routeId, headsign, stopName: dataProches.stops[stopId]?.name });
    }
    if (updateUserSettings) await updateUserSettings({ tsi_transit_favorites: newFavs });
  };

  // Helper to calculate distance
  const getDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    const R = 6371e3;
    const phi1 = lat1 * Math.PI/180;
    const phi2 = lat2 * Math.PI/180;
    const dphi = (lat2-lat1) * Math.PI/180;
    const dlam = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(dphi/2) * Math.sin(dphi/2) + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlam/2) * Math.sin(dlam/2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
  };

  // Group arrivals
  const groupedProches = {};
  dataProches.arrivals?.forEach(a => {
    const groupKey = a.stop_name;
    if (!groupedProches[groupKey]) groupedProches[groupKey] = { name: a.stop_name, routes: {}, stopsIds: [] };
    if (!groupedProches[groupKey].stopsIds.includes(a.stop_id)) groupedProches[groupKey].stopsIds.push(a.stop_id);
    
    const rKey = `${a.route_id}|${a.headsign}`;
    if (!groupedProches[groupKey].routes[rKey]) {
      groupedProches[groupKey].routes[rKey] = {
        stopId: a.stop_id,
        shapeId: a.shape_id,
        route: a.route_short_name, color: a.route_color, textColor: a.route_text_color,
        headsign: a.headsign, routeId: a.route_id, times: []
      };
    }
    groupedProches[groupKey].routes[rKey].times.push(a.delay_minutes);
  });

  // Convert grouped object to array and sort by distance
  const sortedGroups = Object.entries(groupedProches).map(([groupKey, stopData]) => {
    // Find average or minimum distance to the user if location is known
    let dist = Infinity;
    if (locationProches && locationProches.lat) {
      stopData.stopsIds.forEach(id => {
        const s = dataProches.stops[id];
        if (s) {
          const d = getDistance(locationProches.lat, locationProches.lng, s.lat, s.lon);
          if (d < dist) dist = d;
        }
      });
    }
    return { groupKey, stopData, dist };
  }).sort((a, b) => a.dist - b.dist);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col min-h-screen pb-24">
      <button onClick={() => navigate(-1)} className="p-2 rounded-xl flex items-center justify-center transition-all w-fit mb-6 hover:bg-gray-200 dark:hover:bg-slate-700" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
        <ArrowLeft className="w-5 h-5" />
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-extrabold flex items-center gap-3 tracking-tight" style={{ color: 'var(--text)' }}>
          <div className="p-2.5 bg-green-500 text-white rounded-xl shadow-lg shadow-green-500/30">
            <Bus size={24} />
          </div>
          Transports Synchro Bus
        </h1>
      </div>

      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300">
            {locationProches && locationProches.lat ? "Arrêts à proximité" : "Arrêts de bus"}
          </h2>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Rechercher un arrêt..." 
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.length >= 2) {
                      setLoadingProches(true);
                      fetch(`/api/transit/search?q=${encodeURIComponent(val)}`, { headers: { 'Authorization': `Bearer ${getToken()}` } })
                        .then(res => res.json())
                        .then(d => { setDataProches(d || { stops: {}, arrivals: [], shapes: {} }); setLoadingProches(false); setLocationProches(null); })
                        .catch(() => setLoadingProches(false));
                    }
                  }}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all text-sm font-medium"
                />
              </div>
              <button onClick={handleLocateProches} disabled={loadingProches} className="tsi-btn-primary flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 shadow-sm rounded-xl shrink-0">
                {loadingProches ? <Clock className="animate-spin" size={18} /> : <MapPin size={18} />}
                <span className="font-bold text-sm hidden sm:inline">{loadingProches ? 'Recherche...' : 'Autour de moi'}</span>
              </button>
            </div>
          </div>

          {errorProches && <div className="p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-3"><AlertCircle size={20} /> <span className="font-medium">{errorProches}</span></div>}

          {sortedGroups.length > 0 && (
            <div id="map-container" className="mb-8">
              <TransitMap 
                location={locationProches} 
                selectedShapeId={selectedShapeId}
                stops={sortedGroups.reduce((acc, { stopData }) => {
                  const firstRoute = Object.values(stopData.routes)[0];
                  if (firstRoute && dataProches.stops[firstRoute.stopId]) {
                    acc[firstRoute.stopId] = dataProches.stops[firstRoute.stopId];
                  }
                  return acc;
                }, {})} 
                shapes={dataProches.shapes}
                onStopClick={(id) => {
                  const groupKey = dataProches.stops[id]?.name;
                  if (groupKey) {
                    const el = document.getElementById(`stop-${btoa(encodeURIComponent(groupKey))}`);
                    if (el) {
                      const y = el.getBoundingClientRect().top + window.scrollY - 100;
                      window.scrollTo({ top: y, behavior: 'smooth' });
                    }
                  }
                }} 
              />
            </div>
          )}

          {sortedGroups.length === 0 && !loadingProches && (
            <div className="text-center py-16 rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-700 text-gray-500 font-medium">
              {locationProches && locationProches.lat ? "Aucun arrêt proche trouvé." : "Aucun arrêt. Clique sur 'Autour de moi' pour trouver des arrêts ou utilise la barre de recherche !"}
            </div>
          )}

          {sortedGroups.map(({ groupKey, stopData, dist }) => (
            <div id={`stop-${btoa(encodeURIComponent(groupKey))}`} key={groupKey} className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm relative">
              {dist !== Infinity && <div className="absolute top-6 right-6 text-xs font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full">{Math.round(dist)} m</div>}
              <h3 className="text-xl font-extrabold mb-4 flex items-center gap-2 pr-20"><Navigation className="text-gray-400" size={20} /> {stopData.name}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.values(stopData.routes).map(route => {
                  const isFav = favorites.some(f => f.stopId === route.stopId && f.routeId === route.routeId && f.headsign === route.headsign);
                  return (
                    <div key={route.headsign} className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-900 border relative group">
                      <button onClick={() => toggleFavorite(route.stopId, route.routeId, route.headsign)} className={`absolute top-4 right-4 p-2 rounded-xl ${isFav ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/30' : 'text-gray-300 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/30'}`}>
                        <Star size={18} fill={isFav ? "currentColor" : "none"} />
                      </button>
                      <div className="flex items-center gap-3 mb-4 pr-10">
                        <span className="w-10 h-10 flex items-center justify-center rounded-lg font-bold" style={{ backgroundColor: `#${route.color}`, color: `#${route.textColor}` }}>{route.route}</span>
                        <div><div className="text-xs text-gray-500 uppercase font-bold">Direction</div><div className="font-bold text-sm" style={{ color: 'var(--text)' }}>{route.headsign}</div></div>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {route.times.slice(0, 3).map((min, idx) => (
                          <div key={idx} className={`px-3 py-1.5 rounded-lg text-sm font-bold ${idx===0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800/50' : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300'}`}>{min <= 0 ? 'À l\'arrêt' : `${min} min`}</div>
                        ))}
                      </div>
                      {route.shapeId && (
                        <button 
                          onClick={() => {
                            setSelectedShapeId(route.shapeId);
                            const el = document.getElementById('map-container');
                            if (el) {
                              const y = el.getBoundingClientRect().top + window.scrollY - 80;
                              window.scrollTo({ top: y, behavior: 'smooth' });
                            }
                          }}
                          className={`text-xs font-bold w-full text-center py-2 rounded-xl border border-gray-200 transition-all ${selectedShapeId === route.shapeId ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white text-gray-600 hover:bg-gray-100 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-700'}`}
                        >
                          <Route size={14} className="inline mr-1" /> {selectedShapeId === route.shapeId ? 'Trajet sélectionné' : 'Voir le trajet sur la carte'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
    </div>
  );
}
