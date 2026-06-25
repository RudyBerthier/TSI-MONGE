const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const JWT_SECRET = process.env.JWT_SECRET || 'tsi1-secret-key-2025';

// Import routes
const settingsRouter = require('./routes/settings');
const { router: authRouter } = require('./routes/auth');
const linksRouter = require('./routes/links');
const placesRouter = require('./routes/places');
const sondagesRouter = require('./routes/sondages');
const colloscopeRouter = require('./routes/colloscope');
const eventsRouter = require('./routes/events');
const pronoteRouter = require('./routes/pronote');
const kholleRequestsRouter = require('./routes/kholle-requests');
const cantineRouter = require('./routes/cantine');
const kholleursRouter = require('./routes/kholleurs');
const forumRouter = require('./routes/forum');
const chatUploadRouter = require('./routes/chat-upload');
const { router: pushRouter } = require('./routes/push');
const voiceUploadRouter = require('./routes/voice-upload');
const mathsRouter = require('./routes/maths');
const usersRouter = require('./routes/users');
const notesRouter = require('./routes/notes');
const spotifyRouter = require('./routes/spotify');
const playlistsRouter = require('./routes/playlists');
const adminLogsRouter = require('./routes/admin-logs');
const bugReportsRouter = require('./routes/bug-reports');
const gamesRouter = require('./routes/games');
const carpoolRouter = require('./routes/carpool');
const mediaRouter = require('./routes/media');
const kanbanRouter = require('./routes/kanban');
const searchRouter = require('./routes/search');
const clickerRouter = require('./routes/clicker');
const clickerUploadRouter = require('./routes/clicker-upload');
const mediaStatsRouter = require('./routes/media_stats');
const mediaListsRouter = require('./routes/media_lists');
const transitRouter = require('./routes/transit');

// Import socket handler
const setupSocket = require('./socket');

// Background tasks
const { fetchAndParseFuelPrices } = require('./scripts/fetch_fuel_prices');
// Fetch fuel prices at startup then every 24 hours
setTimeout(fetchAndParseFuelPrices, 5000); // 5 seconds after startup
setInterval(fetchAndParseFuelPrices, 24 * 60 * 60 * 1000);


const app = express();
app.set('trust proxy', 1); // Indispensable pour que express-rate-limit marche derrière Nginx (X-Forwarded-For)
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Allowed origins for CORS
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://tsi-monge.fr',
  'https://www.tsi-monge.fr'
];

// Setup Socket.io
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  },
  // Important pour les proxies (Nginx/Cloudflare)
  allowEIO3: true,
  transports: ['websocket', 'polling']
});

// Initialize socket handlers
setupSocket(io);

// Make io accessible from routes via req.app.get('io')
app.set('io', io);

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Avatars: public (used in <img> across all pages)
app.use('/uploads/avatars', express.static(path.join(__dirname, 'uploads', 'avatars')));

// Posts media: public (so everyone can see images/videos from posts)
app.use('/uploads/posts', express.static(path.join(__dirname, 'uploads', 'posts')));

// Chat and voice uploads: require valid JWT (via Authorization header or ?token= query param)
function jwtProtected(req, res, next) {
  const token = req.query.token || req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).send('Non autorisé');
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(403).send('Token invalide');
  }
}

// Same as jwtProtected but also decodes the token and attaches req.user - used for API routes
function jwtWithUser(req, res, next) {
  const token = req.query.token || req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Non autorisé' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Attach the decoded user payload
    next();
  } catch {
    return res.status(403).json({ error: 'Token invalide' });
  }
}
app.use('/uploads/chat', jwtProtected, express.static(path.join(__dirname, 'uploads', 'chat')));
app.use('/uploads/voice', jwtProtected, express.static(path.join(__dirname, 'uploads', 'voice')));
app.use('/uploads/stories', express.static(path.join(__dirname, 'uploads', 'stories'))); // Public like posts
app.use('/uploads/cantine', express.static(path.join(__dirname, 'uploads', 'cantine'))); // Menu images
app.use('/uploads/clicker', express.static(path.join(__dirname, 'uploads', 'clicker'))); // Clicker custom cookies

// ─── Route registry ────────────────────────────────────────────────────────
// Ajouter / supprimer une entrée ici suffit : la page /status se met à jour
// automatiquement côté client sans aucune modification frontend.
//
// Champs :
//   key          identifiant unique (string)
//   name         libellé affiché
//   group        catégorie d'affichage
//   icon         nom d'icône Lucide (Server | Shield | Calendar | MessageSquare |
//                                    Users | Zap | Wifi | BookOpen | Bell | Music)
//   description  phrase courte
//   testPath     endpoint GET pingé pour vérifier la dispo
//   requiresAuth true → envoie le token Bearer (un 401 compte comme UP)
// ───────────────────────────────────────────────────────────────────────────
const ROUTES_REGISTRY = [
  // Serveur
  { key: 'health', name: 'Health Check', group: 'Serveur', icon: 'Server', description: 'État général du serveur', testPath: '/api/health', requiresAuth: false },
  { key: 'settings', name: 'Paramètres', group: 'Serveur', icon: 'Server', description: 'Configuration globale', testPath: '/api/settings', requiresAuth: false },

  // Authentification
  { key: 'auth', name: 'Auth / Session', group: 'Authentification', icon: 'Shield', description: 'Vérification des tokens JWT', testPath: '/api/auth/verify', requiresAuth: true },
  { key: 'push', name: 'Push Notifications', group: 'Authentification', icon: 'Bell', description: 'Clé VAPID pour les notifs', testPath: '/api/push/vapid-public-key', requiresAuth: false },

  // Académique
  { key: 'pronote', name: 'Pronote Status', group: 'Académique', icon: 'Calendar', description: 'Connexion à Pronote', testPath: '/api/pronote/status', requiresAuth: false },
  { key: 'timetable', name: 'Emploi du Temps', group: 'Académique', icon: 'Calendar', description: 'EDT hebdomadaire', testPath: '/api/pronote/timetable', requiresAuth: false },
  { key: 'colloscope', name: 'Colloscope', group: 'Académique', icon: 'Calendar', description: 'Planning des colles', testPath: '/api/colloscope', requiresAuth: false },
  { key: 'events', name: 'Événements', group: 'Académique', icon: 'Calendar', description: 'DS, DM, concours', testPath: '/api/events', requiresAuth: false },
  { key: 'kholles', name: 'Demandes de Kholle', group: 'Académique', icon: 'Calendar', description: 'Système de kholles', testPath: '/api/kholle-requests', requiresAuth: false },
  { key: 'maths', name: 'Ressources Maths', group: 'Académique', icon: 'BookOpen', description: 'Docs et ressources maths', testPath: '/api/maths', requiresAuth: false },

  // Communauté
  { key: 'forum', name: 'Forum', group: 'Communauté', icon: 'MessageSquare', description: 'Topics de discussion', testPath: '/api/forum/topics', requiresAuth: false },
  { key: 'sondages', name: 'Sondages', group: 'Communauté', icon: 'MessageSquare', description: 'Votes et sondages', testPath: '/api/sondages', requiresAuth: false },
  { key: 'places', name: 'Plan de classe', group: 'Communauté', icon: 'MessageSquare', description: 'Placement des étudiants', testPath: '/api/places/TSI1', requiresAuth: false },
  { key: 'links', name: 'Liens', group: 'Communauté', icon: 'MessageSquare', description: 'Ressources partagées', testPath: '/api/links', requiresAuth: false },

  // Utilisateurs & Social
  { key: 'users', name: 'Utilisateurs', group: 'Utilisateurs & Social', icon: 'Users', description: 'Profils et recherche', testPath: '/api/users/explore', requiresAuth: true },
  { key: 'notes', name: 'Notes', group: 'Utilisateurs & Social', icon: 'Users', description: 'Carnet de notes perso', testPath: '/api/notes', requiresAuth: true },

  // Services
  { key: 'cantine', name: 'Cantine', group: 'Services', icon: 'Zap', description: 'Menus et avis', testPath: '/api/cantine/avis', requiresAuth: false },
  { key: 'spotify', name: 'Spotify / JioSaavn', group: 'Services', icon: 'Music', description: 'Recherche musicale', testPath: '/api/spotify/search?q=test', requiresAuth: false },
];

// ─── Rate Limiters ────────────────────────────────────────────────────────────

// Global limiter: 600 req / 1 min per IP – baseline protection (social feed makes many parallel calls)
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes, réessayez dans une minute.' }
});

// Auth limiter: 20 req / 15 min – empêche le brute-force sur /login
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' }
});

// Scraping limiter: 10 req / 2 min – Pronote & Maths scraping sont coûteux
const scrapingLimiter = rateLimit({
  windowMs: 2 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes vers le scraper. Attendez 2 minutes.' }
});

// Kholle/Spotify/Playlists limiter: 200 req / 1 min – endpoints slightly costly but frequently polled
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes. Attendez une minute.' }
});

// Apply specific limiters only — no global limiter (too broad, disrupts normal polling)
// Routes
app.use('/api/settings', settingsRouter);
// Auth: limiter strict uniquement sur les endpoints sensibles (login, register, reset password)
// /verify et /logout sont laissés libres (couverts uniquement par le globalLimiter)
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/google', authLimiter);
app.use('/api/auth/resend-verification', authLimiter);
app.use('/api/auth', authRouter);
app.use('/api/links', linksRouter);
app.use('/api/places', placesRouter);
app.use('/api/sondages', sondagesRouter);
app.use('/api/colloscope', colloscopeRouter);
app.use('/api/events', eventsRouter);
app.use('/api/pronote', apiLimiter, pronoteRouter);         // Pronote data
app.use('/api/kholle-requests', apiLimiter, kholleRequestsRouter); // anti-spam kholles
app.use('/api/cantine', cantineRouter);
app.use('/api/kholleurs', kholleursRouter);
app.use('/api/forum', forumRouter);
app.use('/api/chat/upload', chatUploadRouter);
app.use('/api/voice/upload', voiceUploadRouter);
app.use('/api/push', pushRouter);
app.use('/api/maths', apiLimiter, mathsRouter);             // Maths data
app.use('/api/users', usersRouter);
app.use('/api/notes', notesRouter);
app.use('/api/spotify', apiLimiter, spotifyRouter);              // JioSaavn + Spotify calls
app.use('/api/playlists', playlistsRouter);                      // Gestion des playlists
app.use('/api/admin/logs', adminLogsRouter);
app.use('/api/bug-reports', bugReportsRouter);
app.use('/api/games', jwtWithUser, gamesRouter);
app.use('/api/carpool', apiLimiter, carpoolRouter);
app.use('/api/media/lists', apiLimiter, mediaListsRouter);
app.use('/api/media', apiLimiter, mediaStatsRouter);
app.use('/api/media', apiLimiter, mediaRouter);
app.use('/api/kanban', jwtWithUser, kanbanRouter);
app.use('/api/search', jwtWithUser, searchRouter);
app.use('/api/clicker', jwtWithUser, clickerRouter);
app.use('/api/clicker/upload', jwtWithUser, clickerUploadRouter);
app.use('/api/transit', transitRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'TSI 1 API is running',
    timestamp: new Date().toISOString()
  });
});

// Status routes registry — utilisé par la page /status côté client
app.get('/api/status/routes', (req, res) => {
  res.json(ROUTES_REGISTRY);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Serve the production build (Vite dist folder)
// This is critical so that index.css, JS chunks, and HTML are routed properly
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// Catch-all route to serve the React application
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

server.listen(PORT, () => {
  console.log(`🚀 TSI 1 API running on http://localhost:${PORT}`);
  console.log(`📁 Uploads served at http://localhost:${PORT}/uploads`);
  console.log(`💬 Chat WebSocket ready`);
});
