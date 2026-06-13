import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin } from 'lucide-react';

export function AddressAutocomplete({ placeholder, onSelect, defaultValue = "", showLocateMe = false, onLocateMe }) {
  const [query, setQuery] = useState(defaultValue);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query || query.length < 3) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.features || []);
        }
      } catch (err) {
        console.error("Erreur API adresse:", err);
      } finally {
        setLoading(false);
      }
    }, 300); // debounce 300ms

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (feature) => {
    setQuery(feature.properties.label);
    setIsOpen(false);
    onSelect({
      label: feature.properties.label,
      lat: feature.geometry.coordinates[1],
      lng: feature.geometry.coordinates[0]
    });
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative flex items-center">
        <Search className="absolute left-3 text-gray-400" size={18} />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 transition-all text-sm font-medium"
          style={{ color: 'var(--text)' }}
        />
        {loading && (
          <div className="absolute right-3">
            <div className="animate-spin h-4 w-4 border-2 border-green-500 border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>

      {isOpen && (results.length > 0 || showLocateMe) && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
          {showLocateMe && (
            <button
              onClick={() => {
                setIsOpen(false);
                setQuery("📍 Ma position");
                onLocateMe();
              }}
              className="w-full text-left px-4 py-3 hover:bg-green-50 dark:hover:bg-green-900/30 flex items-center gap-3 border-b border-gray-100 dark:border-slate-700 transition-colors"
            >
              <div className="p-1.5 bg-green-100 dark:bg-green-900/50 rounded-lg text-green-600 dark:text-green-400">
                <MapPin size={16} />
              </div>
              <span className="font-bold text-green-600 dark:text-green-400 text-sm">Utiliser ma position actuelle</span>
            </button>
          )}
          {results.map((f, idx) => (
            <button
              key={f.properties.id + idx}
              onClick={() => handleSelect(f)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 border-b border-gray-50 dark:border-slate-700/50 last:border-0 transition-colors flex flex-col"
            >
              <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{f.properties.name}</span>
              <span className="text-xs text-gray-500">{f.properties.context}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
