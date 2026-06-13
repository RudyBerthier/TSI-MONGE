import React, { useState, useEffect } from 'react';
import { Bus, Settings, ArrowRight, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';

export function TransportWidget() {
  const { getToken, userSettings } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const favorites = userSettings?.tsi_transit_favorites || [];

  useEffect(() => {
    if (favorites.length === 0) {
      setLoading(false);
      return;
    }

    const fetchFavs = async () => {
      try {
        const stopIds = [...new Set(favorites.map(f => f.stopId))].join(',');
        const res = await fetch(`/api/transit/chambery?stops=${stopIds}`, {
          headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (res.ok) {
          const d = await res.json();
          setData(d);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchFavs();
    const interval = setInterval(fetchFavs, 60000);
    return () => clearInterval(interval);
  }, [favorites, getToken]);

  if (favorites.length === 0) {
    return (
      <div className="rounded-3xl p-5 border transition-all hover:shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-800/80 border-gray-100 dark:border-slate-700/50">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-green-500/10 text-green-600 dark:text-green-400 rounded-xl">
            <Bus size={18} />
          </div>
          <h3 className="font-bold text-sm" style={{ color: 'var(--text)' }}>Synchro Bus</h3>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">Ajoute tes arrêts en favoris pour les voir ici en un clin d'œil.</p>
        <Link to="/transport" className="inline-flex items-center gap-2 text-xs font-bold text-white transition-all bg-green-500 hover:bg-green-600 shadow-md shadow-green-500/30 px-4 py-2 rounded-xl">
          Configurer <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  let displayArrivals = [];
  if (data && data.arrivals) {
    displayArrivals = data.arrivals.filter(a => 
      favorites.some(f => f.stopId === a.stop_id && f.routeId === a.route_id && f.headsign === a.headsign)
    );
  }

  const grouped = {};
  favorites.forEach(f => {
    const key = `${f.stopId}|${f.routeId}|${f.headsign}`;
    grouped[key] = {
      favorite: f,
      times: displayArrivals.filter(a => a.stop_id === f.stopId && a.route_id === f.routeId && a.headsign === f.headsign).map(a => ({ min: a.delay_minutes, route: a }))
    };
  });

  return (
    <div className="rounded-3xl p-5 border transition-all hover:shadow-lg bg-white dark:bg-slate-800/90 border-gray-100 dark:border-slate-700/50 backdrop-blur-md">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-green-400 to-green-600 text-white rounded-xl shadow-lg shadow-green-500/30">
            <Clock size={16} strokeWidth={2.5} />
          </div>
          <h3 className="font-extrabold text-sm tracking-tight" style={{ color: 'var(--text)' }}>Horaires en direct</h3>
        </div>
        <Link to="/transport" className="text-gray-400 hover:text-green-500 transition-colors p-2 bg-gray-50 dark:bg-slate-700/50 rounded-full hover:bg-green-50 dark:hover:bg-green-500/20">
          <Settings size={14} />
        </Link>
      </div>

      {loading ? (
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse shrink-0 w-[90px] h-[100px] bg-gray-100 dark:bg-slate-700/50 rounded-2xl"></div>
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide snap-x">
          {Object.values(grouped).map((group, idx) => {
            const firstRoute = group.times[0]?.route;
            const nextMin = group.times[0]?.min;
            const isImminent = nextMin <= 5;
            const routeShort = firstRoute?.route_short_name || group.favorite.routeId.replace('0', '');
            
            return (
              <div key={idx} className="flex flex-col items-center shrink-0 bg-gray-50 dark:bg-slate-900 rounded-2xl p-3 w-[96px] border border-gray-100 dark:border-slate-700 snap-center relative overflow-hidden group">
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider truncate w-full text-center mb-2" title={group.favorite.headsign}>
                  {group.favorite.headsign.substring(0, 12)}
                </span>
                
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg shadow-md mb-3 transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `#${firstRoute?.route_color || 'ccc'}`, color: `#${firstRoute?.route_text_color || 'fff'}` }}
                >
                  {routeShort}
                </div>

                <div className="w-full relative">
                  {group.times.length > 0 ? (
                    <div className={`px-2 py-1.5 rounded-lg text-xs font-bold w-full text-center flex items-center justify-center gap-1 shadow-sm ${isImminent ? 'bg-red-500 text-white shadow-red-500/20' : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-600'}`}>
                      {nextMin <= 0 ? <><Clock size={12} className="animate-pulse" /> Là</> : `${nextMin} min`}
                    </div>
                  ) : (
                    <div className="px-2 py-1.5 rounded-lg text-xs font-medium w-full text-center bg-gray-100 dark:bg-slate-800 text-gray-400 border border-transparent">
                      Aucun
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
