const express = require('express');
const router = express.Router();
const GtfsRealtimeBindings = require('gtfs-realtime-bindings');
const fs = require('fs');
const path = require('path');

const REALTIME_GTFS_URL = "https://mwe.mecatran.com/utw/ws/gtfsfeed/realtime/chambery?apiKey=223f2f102c1242570d3f0231326a271940774f72";
const CACHE_FILE = path.join(__dirname, '../data/chambery_gtfs_cache.json');

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const phi1 = lat1 * Math.PI/180;
  const phi2 = lat2 * Math.PI/180;
  const dphi = (lat2-lat1) * Math.PI/180;
  const dlam = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(dphi/2) * Math.sin(dphi/2) +
          Math.cos(phi1) * Math.cos(phi2) *
          Math.sin(dlam/2) * Math.sin(dlam/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

let staticData = null;
function loadStaticData() {
  if (staticData) return staticData;
  if (!fs.existsSync(CACHE_FILE)) return null;
  staticData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  return staticData;
}

async function getRealtimeArrivals(targetStops, data) {
  const response = await fetch(REALTIME_GTFS_URL);
  if (!response.ok) throw new Error("Erreur flux temps réel");
  const buffer = await response.arrayBuffer();
  const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));
  
  const arrivals = [];
  const routeShapes = {}; // shape_id -> { color, points }
  const now = Math.floor(Date.now() / 1000);

  for (const entity of feed.entity) {
    if (entity.tripUpdate && entity.tripUpdate.stopTimeUpdate) {
      const tripId = entity.tripUpdate.trip.tripId;
      const tripInfo = data.trips[tripId];
      if (!tripInfo) continue;
      
      const routeInfo = data.routes[tripInfo.route_id];
      if (!routeInfo) continue;

      for (const update of entity.tripUpdate.stopTimeUpdate) {
        if (targetStops.includes(update.stopId)) {
          const timeObj = update.arrival?.time || update.departure?.time;
          if (!timeObj) continue;
          
          const timestamp = typeof timeObj === 'object' && timeObj.low ? timeObj.low : parseInt(timeObj, 10);
          if (isNaN(timestamp)) continue;

          if (timestamp >= now - 60) {
            arrivals.push({
              trip_id: tripId,
              stop_id: update.stopId,
              stop_name: data.stops[update.stopId]?.name || 'Arrêt inconnu',
              route_id: tripInfo.route_id,
              route_short_name: routeInfo.short_name,
              route_long_name: routeInfo.long_name,
              route_color: routeInfo.color,
              route_text_color: routeInfo.text_color,
              headsign: tripInfo.headsign,
              shape_id: tripInfo.shape_id,
              timestamp: timestamp,
              delay_minutes: Math.round((timestamp - now) / 60)
            });
            
            // Collect shape if exists and not already collected
            if (tripInfo.shape_id && data.shapes && data.shapes[tripInfo.shape_id] && !routeShapes[tripInfo.shape_id]) {
              routeShapes[tripInfo.shape_id] = {
                color: routeInfo.color,
                points: data.shapes[tripInfo.shape_id]
              };
            }
          }
        }
      }
    }
  }

  arrivals.sort((a, b) => a.timestamp - b.timestamp);
  return { arrivals, routeShapes };
}

router.get('/chambery', async (req, res) => {
  const data = loadStaticData();
  if (!data) return res.status(503).json({ error: "Données de transport en cours d'initialisation" });

  let targetStops = [];
  
  if (req.query.lat && req.query.lng) {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radius = parseFloat(req.query.radius) || 500;
    
    const stopsArr = Object.entries(data.stops).map(([id, s]) => ({ id, ...s }));
    const nearby = stopsArr.filter(s => getDistance(lat, lng, s.lat, s.lon) <= radius);
    targetStops = nearby.map(s => s.id);
  } else if (req.query.stops) {
    targetStops = req.query.stops.split(',');
  } else {
    return res.status(400).json({ error: "Paramètres lat/lng ou stops requis" });
  }

  if (targetStops.length === 0) {
    return res.json({ stops: {}, arrivals: [] });
  }

  try {
    const { arrivals, routeShapes } = await getRealtimeArrivals(targetStops, data);
    
    const stopsInfo = {};
    for (const sid of targetStops) {
      if (data.stops[sid]) stopsInfo[sid] = data.stops[sid];
    }

    res.json({ stops: stopsInfo, arrivals, shapes: routeShapes });
  } catch (err) {
    console.error("GTFS-RT error:", err);
    res.status(500).json({ error: "Impossible de récupérer les horaires en temps réel" });
  }
});

router.get('/search', async (req, res) => {
  try {
    const data = loadStaticData();
    if (!data) return res.status(503).json({ error: "Données GTFS non prêtes" });

    const q = (req.query.q || '').toLowerCase().trim();
    if (!q || q.length < 2) return res.json({ stops: {}, arrivals: [], shapes: {} });

    const matchedStops = {};
    for (const [id, stop] of Object.entries(data.stops)) {
      if (stop.name.toLowerCase().includes(q)) {
        matchedStops[id] = stop;
      }
    }

    const stopIds = Object.keys(matchedStops).slice(0, 15);
    if (stopIds.length === 0) return res.json({ stops: {}, arrivals: [], shapes: {} });

    const { arrivals, routeShapes } = await getRealtimeArrivals(stopIds, data);
    res.json({ stops: matchedStops, arrivals, shapes: routeShapes });
  } catch (err) {
    console.error("GTFS-RT error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get('/itinerary', async (req, res) => {
  const data = loadStaticData();
  if (!data || !data.routePatterns) return res.status(503).json({ error: "Données de transport incomplètes" });

  const { fromLat, fromLng, toLat, toLng } = req.query;
  if (!fromLat || !fromLng || !toLat || !toLng) return res.status(400).json({ error: "Coordonnées manquantes" });

  const fLat = parseFloat(fromLat);
  const fLng = parseFloat(fromLng);
  const tLat = parseFloat(toLat);
  const tLng = parseFloat(toLng);

  const WALK_SPEED_M_PER_MIN = 80;

  const stopsArr = Object.entries(data.stops).map(([id, s]) => ({ id, ...s }));
  const startStops = stopsArr.map(s => ({ ...s, dist: getDistance(fLat, fLng, s.lat, s.lon) }))
                             .filter(s => s.dist <= 1000).sort((a,b) => a.dist - b.dist);
  const endStops = stopsArr.map(s => ({ ...s, dist: getDistance(tLat, tLng, s.lat, s.lon) }))
                           .filter(s => s.dist <= 1000).sort((a,b) => a.dist - b.dist);

  if (startStops.length === 0 || endStops.length === 0) {
    return res.json({ itineraries: [] });
  }

  const sIds = startStops.map(s => s.id);
  const eIds = endStops.map(s => s.id);

  let itineraries = [];

  // Direct routes
  for (const [routeId, patterns] of Object.entries(data.routePatterns)) {
    for (const pattern of patterns) {
      const stops = pattern.stops;
      let sIdx = stops.findIndex(id => sIds.includes(id));
      if (sIdx === -1) continue;
      
      let eIdx = -1;
      for (let j = stops.length - 1; j > sIdx; j--) {
        if (eIds.includes(stops[j])) { eIdx = j; break; }
      }
      
      if (eIdx !== -1) {
        const sStop = startStops.find(s => s.id === stops[sIdx]);
        const eStop = endStops.find(s => s.id === stops[eIdx]);
        const numStops = eIdx - sIdx;
        itineraries.push({
          type: 'direct',
          score: sStop.dist + eStop.dist + (numStops * 200),
          walkToStartDist: Math.round(sStop.dist),
          walkToStartMins: Math.round(sStop.dist / WALK_SPEED_M_PER_MIN) || 1,
          walkFromEndDist: Math.round(eStop.dist),
          walkFromEndMins: Math.round(eStop.dist / WALK_SPEED_M_PER_MIN) || 1,
          routeId,
          routeInfo: data.routes[routeId],
          headsigns: pattern.headsigns,
          startStop: sStop,
          endStop: eStop,
          numStops
        });
      }
    }
  }

  // 1 Transfer routes (if no direct route found)
  if (itineraries.length === 0) {
    for (const [r1Id, p1] of Object.entries(data.routePatterns)) {
      for (const pat1 of p1) {
        const stops1 = pat1.stops;
        let sIdx = stops1.findIndex(sid => sIds.includes(sid));
        if (sIdx === -1) continue;

        for (const [r2Id, p2] of Object.entries(data.routePatterns)) {
          if (r1Id === r2Id) continue;
          for (const pat2 of p2) {
            const stops2 = pat2.stops;
            let eIdx = -1;
            for(let j = stops2.length - 1; j >= 0; j--) {
              if (eIds.includes(stops2[j])) { eIdx = j; break; }
            }
            if (eIdx === -1) continue;

            let transferStopId = null;
            let bestTransferScore = Infinity;
            
            for (let i = sIdx + 1; i < stops1.length; i++) {
              const candidate = stops1[i];
              const candidateIdx2 = stops2.indexOf(candidate);
              if (candidateIdx2 !== -1 && candidateIdx2 < eIdx) {
                 const score = (i - sIdx) + (eIdx - candidateIdx2);
                 if (score < bestTransferScore) {
                    bestTransferScore = score;
                    transferStopId = candidate;
                 }
              }
            }
            
            if (transferStopId) {
              const sStop = startStops.find(s => s.id === stops1[sIdx]);
              const eStop = endStops.find(s => s.id === stops2[eIdx]);
              itineraries.push({
                type: 'transfer',
                score: sStop.dist + eStop.dist + (bestTransferScore * 200) + 1000,
                walkToStartDist: Math.round(sStop.dist),
                walkToStartMins: Math.round(sStop.dist / WALK_SPEED_M_PER_MIN) || 1,
                walkFromEndDist: Math.round(eStop.dist),
                walkFromEndMins: Math.round(eStop.dist / WALK_SPEED_M_PER_MIN) || 1,
                legs: [
                  {
                    routeId: r1Id,
                    routeInfo: data.routes[r1Id],
                    headsigns: pat1.headsigns,
                    startStop: sStop,
                    endStop: { id: transferStopId, ...data.stops[transferStopId] },
                    numStops: stops1.indexOf(transferStopId) - sIdx
                  },
                  {
                    routeId: r2Id,
                    routeInfo: data.routes[r2Id],
                    headsigns: pat2.headsigns,
                    startStop: { id: transferStopId, ...data.stops[transferStopId] },
                    endStop: eStop,
                    numStops: eIdx - stops2.indexOf(transferStopId)
                  }
                ]
              });
            }
          }
        }
      }
    }
  }

  // Deduplicate direct routes by routeId (keep best)
  const dedup = {};
  itineraries.forEach(iti => {
    const key = iti.type === 'direct' ? iti.routeId : `${iti.legs[0].routeId}-${iti.legs[1].routeId}`;
    if (!dedup[key] || dedup[key].score > iti.score) {
      dedup[key] = iti;
    }
  });

  const finalResults = Object.values(dedup).sort((a,b) => a.score - b.score).slice(0, 3);
  res.json({ itineraries: finalResults });
});

module.exports = router;
