const https = require('https');
const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');
const csv = require('csv-parser');

const STATIC_GTFS_URL = "https://mwe.mecatran.com/utw/ws/gtfsfeed/static/chambery?apiKey=223f2f102c1242570d3f0231326a271940774f72&type=gtfs_urbain";
const TEMP_DIR = path.join(__dirname, '../temp_gtfs_download');
const CACHE_FILE = path.join(__dirname, '../data/chambery_gtfs_cache.json');

async function downloadAndExtract() {
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
  console.log("Downloading GTFS Static zip...");
  const response = await fetch(STATIC_GTFS_URL);
  if (!response.ok) throw new Error(`Failed to download: ${response.status}`);
  
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const zipPath = path.join(TEMP_DIR, 'gtfs.zip');
  fs.writeFileSync(zipPath, buffer);

  console.log("Extracting GTFS Static zip...");
  return new Promise((resolve, reject) => {
    fs.createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: TEMP_DIR }))
      .on('close', resolve)
      .on('error', reject);
  });
}

function parseCSV(filename) {
  return new Promise((resolve, reject) => {
    const results = [];
    const filepath = path.join(TEMP_DIR, filename);
    if (!fs.existsSync(filepath)) {
      console.warn(`File not found: ${filename}`);
      return resolve([]);
    }
    fs.createReadStream(filepath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

async function buildCache() {
  console.log("Parsing CSVs...");
  const rawStops = await parseCSV('stops.txt');
  const rawRoutes = await parseCSV('routes.txt');
  const rawTrips = await parseCSV('trips.txt');

  const routes = {};
  rawRoutes.forEach(r => {
    routes[r.route_id] = {
      short_name: r.route_short_name,
      long_name: r.route_long_name,
      color: r.route_color,
      text_color: r.route_text_color
    };
  });

  const trips = {};
  rawTrips.forEach(t => {
    trips[t.trip_id] = {
      route_id: t.route_id,
      headsign: t.trip_headsign,
      direction_id: t.direction_id,
      shape_id: t.shape_id
    };
  });

  console.log("Parsing shapes.txt...");
  const rawShapes = await parseCSV('shapes.txt');
  const shapesData = {};
  rawShapes.forEach(s => {
    if (!shapesData[s.shape_id]) shapesData[s.shape_id] = [];
    shapesData[s.shape_id].push({
      lat: parseFloat(s.shape_pt_lat),
      lon: parseFloat(s.shape_pt_lon),
      seq: parseInt(s.shape_pt_sequence)
    });
  });

  // Sort by sequence to ensure correct line drawing
  const shapes = {};
  for (const [id, points] of Object.entries(shapesData)) {
    points.sort((a, b) => a.seq - b.seq);
    shapes[id] = points.map(p => [p.lat, p.lon]);
  }

  const stops = {};
  rawStops.forEach(s => {
    stops[s.stop_id] = {
      name: s.stop_name,
      lat: parseFloat(s.stop_lat),
      lon: parseFloat(s.stop_lon)
    };
  });

  console.log("Parsing stop_times.txt (this may take a few seconds)...");
  const rawStopTimes = await parseCSV('stop_times.txt');
  
  const tripStopSequences = {};
  rawStopTimes.forEach(st => {
    if (!tripStopSequences[st.trip_id]) tripStopSequences[st.trip_id] = [];
    tripStopSequences[st.trip_id].push({ stop_id: st.stop_id, seq: parseInt(st.stop_sequence) });
  });

  const routePatterns = {};
  for (const tripId in trips) {
    const routeId = trips[tripId].route_id;
    const headsign = trips[tripId].headsign;
    const seq = tripStopSequences[tripId] || [];
    seq.sort((a, b) => a.seq - b.seq);
    const stopList = seq.map(s => s.stop_id);
    
    if (stopList.length === 0) continue;

    if (!routePatterns[routeId]) routePatterns[routeId] = [];
    const patternStr = stopList.join('|');
    
    const existing = routePatterns[routeId].find(p => p.str === patternStr);
    if (!existing) {
      routePatterns[routeId].push({
        stops: stopList,
        str: patternStr,
        headsigns: [headsign]
      });
    } else {
      if (!existing.headsigns.includes(headsign)) existing.headsigns.push(headsign);
    }
  }

  const cache = {
    updated_at: new Date().toISOString(),
    routes,
    trips,
    stops,
    routePatterns,
    shapes
  };

  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));
  console.log(`Cache written to ${CACHE_FILE} with ${Object.keys(stops).length} stops, ${Object.keys(routes).length} routes, ${Object.keys(trips).length} trips, and ${Object.keys(shapes).length} shapes.`);
  
  // Cleanup
  fs.rmSync(TEMP_DIR, { recursive: true, force: true });
}

async function run() {
  try {
    await downloadAndExtract();
    await buildCache();
  } catch (err) {
    console.error("Error generating GTFS cache:", err);
    process.exit(1);
  }
}

if (require.main === module) {
  run();
}

module.exports = { run };
