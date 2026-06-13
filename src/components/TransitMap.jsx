import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Leaflet default icon fix is not needed since we use custom divIcons!

// Custom map updater component
function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom(), { animate: true });
    }
  }, [center, map]);
  return null;
}

export function TransitMap({ location, stops = {}, shapes = {}, selectedShapeId, onStopClick }) {
  // Default center to Chambéry if no location
  const center = location ? [location.lat, location.lng] : [45.564601, 5.917781];

  const getBearing = (p1, p2) => {
    if (!p1 || !p2) return 0;
    const [lat1, lon1] = p1;
    const [lat2, lon2] = p2;
    const toRad = Math.PI / 180;
    const toDeg = 180 / Math.PI;
    const dLon = (lon2 - lon1) * toRad;
    const y = Math.sin(dLon) * Math.cos(lat2 * toRad);
    const x = Math.cos(lat1 * toRad) * Math.sin(lat2 * toRad) - Math.sin(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.cos(dLon);
    return (Math.atan2(y, x) * toDeg + 360) % 360;
  };

  const userIcon = L.divIcon({
    className: 'bg-transparent border-none',
    html: `
      <div class="relative w-8 h-8 flex items-center justify-center">
        <div class="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-50"></div>
        <div class="relative w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-md"></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  const stopIcon = L.divIcon({
    className: 'bg-transparent border-none',
    html: `
      <div class="w-6 h-6 bg-white dark:bg-slate-800 border-2 border-green-500 rounded-full flex items-center justify-center shadow-md transform transition-transform hover:scale-110">
        <div class="w-2 h-2 bg-green-500 rounded-full"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });

  return (
    <div className="w-full h-64 sm:h-80 rounded-3xl overflow-hidden border border-gray-200 dark:border-slate-700 shadow-sm relative z-0">
      <MapContainer 
        center={center} 
        zoom={14} 
        scrollWheelZoom={true} 
        className="w-full h-full"
        zoomControl={false}
      >
        {/* Using CartoDB Positron for Light Mode (we can also detect dark mode, but Voyager/Positron looks good everywhere) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {location && (
          <Marker position={[location.lat, location.lng]} icon={userIcon}>
            <Popup className="rounded-xl">
              <div className="font-bold text-sm">Votre position</div>
            </Popup>
          </Marker>
        )}

        {/* Draw Polylines for bus routes */}
        {Object.entries(shapes || {}).map(([shapeId, shapeData]) => {
          const isSelected = selectedShapeId === shapeId;
          const isDimmed = selectedShapeId && !isSelected;

          const arrows = [];
          if (isSelected) {
            const points = shapeData.points;
            const step = Math.max(2, Math.floor(points.length / 12));
            for (let i = step; i < points.length - 1; i += step) {
              const bearing = getBearing(points[i], points[i + 1]);
              arrows.push({ pos: points[i], bearing });
            }
          }

          return (
            <React.Fragment key={shapeId}>
              <Polyline 
                positions={shapeData.points} 
                color={`#${shapeData.color}`} 
                weight={isSelected ? 6 : 4} 
                opacity={isDimmed ? 0.2 : (isSelected ? 1 : 0.8)}
                lineCap="round"
                lineJoin="round"
                className={isSelected ? 'animate-pulse' : ''}
              />
              {isSelected && arrows.map((arrow, idx) => {
                const arrowIcon = L.divIcon({
                  className: 'bg-transparent border-none',
                  html: `<div style="transform: rotate(${arrow.bearing}deg); width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0px 1px 2px rgba(0,0,0,0.5));">
                           <svg viewBox="0 0 24 24" fill="#${shapeData.color}" stroke="white" stroke-width="2" width="100%" height="100%">
                             <path d="M12 2L22 22L12 18L2 22L12 2Z" />
                           </svg>
                         </div>`,
                  iconSize: [16, 16],
                  iconAnchor: [8, 8]
                });
                return <Marker key={`arrow-${idx}`} position={arrow.pos} icon={arrowIcon} interactive={false} />;
              })}
            </React.Fragment>
          );
        })}

        {Object.entries(stops).map(([id, stop]) => (
          <Marker 
            key={id} 
            position={[stop.lat, stop.lon]} 
            icon={stopIcon}
            eventHandlers={{
              click: () => {
                if (onStopClick) onStopClick(id);
              },
            }}
          >
            <Popup className="rounded-xl shadow-lg border-0">
              <div className="font-bold text-gray-800 dark:text-gray-200">
                {stop.name}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* POIs pour se repérer */}
        {[
          { 
            name: "Lycée Monge", lat: 45.5651597, lon: 5.9337741, 
            svg: `<svg viewBox="0 0 64 64" width="36" height="36" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="gradSchool" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#818cf8" />
                        <stop offset="100%" stop-color="#4f46e5" />
                      </linearGradient>
                    </defs>
                    <path fill="url(#gradSchool)" d="M32 8L4 22l28 14 28-14L32 8z"/>
                    <path fill="#e0e7ff" d="M12 26v16l20 10 20-10V26L32 40 12 26z"/>
                    <path fill="#4f46e5" d="M32 46l-16-8v6l16 8 16-8v-6l-16 8z"/>
                  </svg>`
          },
          { 
            name: "Gare de Chambéry", lat: 45.5714, lon: 5.9194, 
            svg: `<svg viewBox="0 0 64 64" width="36" height="36" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="gradTrain" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#fb7185" />
                        <stop offset="100%" stop-color="#e11d48" />
                      </linearGradient>
                    </defs>
                    <path fill="url(#gradTrain)" d="M16 12C16 6 22 4 32 4s16 2 16 8v32c0 6-6 8-16 8s-16-2-16-8V12z"/>
                    <path fill="#ffe4e6" d="M22 14h20v14H22zM22 36h6v6h-6zM36 36h6v6h-6z"/>
                    <circle fill="#fff" cx="32" cy="46" r="4"/>
                    <path fill="#be123c" d="M18 52l-4 8h36l-4-8z"/>
                  </svg>`
          },
          { 
            name: "Fontaine des Éléphants", lat: 45.5663, lon: 5.9224, 
            svg: `<svg viewBox="0 0 64 64" width="36" height="36" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="gradEleph" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#34d399" />
                        <stop offset="100%" stop-color="#059669" />
                      </linearGradient>
                    </defs>
                    <path fill="url(#gradEleph)" d="M14 52h36v8H14zM20 46h24v6H20z"/>
                    <path fill="#a7f3d0" d="M26 16h12v30H26z"/>
                    <path fill="url(#gradEleph)" d="M22 10h20v6H22zM28 4h8v6h-8z"/>
                    <!-- Elephant trunks decoration -->
                    <path fill="#047857" d="M26 30c-4 0-8 4-8 8v6c0-2 2-4 4-4s4 2 4 4v-14zm12 0c4 0 8 4 8 8v6c0-2-2-4-4-4s-4 2-4 4v-14z"/>
                  </svg>`
          },
          { 
            name: "Château des Ducs", lat: 45.5647, lon: 5.9176, 
            svg: `<svg viewBox="0 0 64 64" width="36" height="36" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="gradCast" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#fbbf24" />
                        <stop offset="100%" stop-color="#d97706" />
                      </linearGradient>
                    </defs>
                    <path fill="url(#gradCast)" d="M8 24h12v32H8zM44 24h12v32H44z"/>
                    <path fill="#fef3c7" d="M20 32h24v24H20z"/>
                    <path fill="url(#gradCast)" d="M6 16h4v8H6zM10 20h4v4h-4zM14 16h4v8h-4zM42 16h4v8h-4zM46 20h4v4h-4zM50 16h4v8h-4z"/>
                    <path fill="#b45309" d="M28 44h8v12h-8z"/>
                    <path fill="#b45309" d="M4 20l10-12 10 12zM40 20l10-12 10 12z"/>
                  </svg>`
          }
        ].map((poi, idx) => (
          <Marker
            key={`poi-${idx}`}
            position={[poi.lat, poi.lon]}
            icon={L.divIcon({
              className: 'bg-transparent border-none',
              html: `
                <div class="relative flex items-center justify-center transition-transform hover:scale-110" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">
                  ${poi.svg}
                </div>
              `,
              iconSize: [36, 36],
              iconAnchor: [18, 18],
              popupAnchor: [0, -18],
            })}
          >
            <Popup className="rounded-xl shadow-lg border-0 font-bold text-center">
              {poi.name}
            </Popup>
          </Marker>
        ))}

        <MapUpdater center={center} />
      </MapContainer>
      
      {/* CSS fix for leaflet z-index to not overlap fixed headers */}
      <style>{`
        .leaflet-container {
          z-index: 10;
        }
        .leaflet-pane {
          z-index: 10;
        }
        .leaflet-top, .leaflet-bottom {
          z-index: 20;
        }
      `}</style>
    </div>
  );
}
