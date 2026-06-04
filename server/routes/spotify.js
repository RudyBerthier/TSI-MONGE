const express = require('express');
const router = express.Router();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const ytSearch = require('yt-search');
const youtubedl = require('youtube-dl-exec');

// ============================================================
// Cache for Spotify token
// ============================================================
let spotifyAccessToken = null;
let tokenExpirationTime = null;

async function getSpotifyToken() {
    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
        throw new Error('MISSING_CREDENTIALS');
    }
    if (spotifyAccessToken && tokenExpirationTime && Date.now() < tokenExpirationTime) {
        return spotifyAccessToken;
    }
    const authString = Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString('base64');
    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${authString}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
    });
    if (!response.ok) throw new Error(`Spotify Auth Error: ${response.status}`);
    const data = await response.json();
    spotifyAccessToken = data.access_token;
    tokenExpirationTime = Date.now() + (data.expires_in - 300) * 1000;
    return spotifyAccessToken;
}

// ============================================================
// In-memory audio URL cache (key = query string, TTL = 4h)
// YouTube signed URLs are valid ~6h, we cache 4h to be safe.
// ============================================================
const audioCache = new Map(); // { query -> { url, title, artist, image, expiresAt } }
const pendingFetches = new Map(); // { query -> Promise } — avoids duplicate in-flight requests

const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

async function fetchAudioUrl(query) {
    const cacheKey = query.toLowerCase().trim();

    // 1. Return from cache if fresh
    const cached = audioCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
        console.log(`🎵 Cache hit: ${cacheKey}`);
        return cached;
    }

    // 2. If already fetching, wait for that result (prevents parallel duplicate calls)
    if (pendingFetches.has(cacheKey)) {
        console.log(`⏳ Waiting for pending fetch: ${cacheKey}`);
        return pendingFetches.get(cacheKey);
    }

    // 3. Fetch from YouTube
    const fetchPromise = (async () => {
        try {
            console.log(`🔍 YouTube fetch: ${cacheKey}`);
            const searchResults = await ytSearch(query + ' audio');
            if (!searchResults?.videos?.length) return null;

            const video = searchResults.videos[0];
            const output = await youtubedl(video.url, {
                dumpJson: true,
                format: 'bestaudio',
                noCheckCertificates: true,
                noWarnings: true,
                preferFreeFormats: true
            });

            if (!output?.url) return null;

            const result = {
                audioUrl: output.url,
                title: video.title,
                artist: video.author.name,
                image: video.thumbnail,
                expiresAt: Date.now() + CACHE_TTL_MS
            };

            audioCache.set(cacheKey, result);
            return result;
        } catch (err) {
            console.error(`Erreur YouTube fetch pour "${cacheKey}":`, err.message);
            return null;
        } finally {
            pendingFetches.delete(cacheKey);
        }
    })();

    pendingFetches.set(cacheKey, fetchPromise);
    return fetchPromise;
}

// ============================================================
// Search endpoint — also TRIGGERS PRE-FETCH for all results
// ============================================================
router.get('/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: 'Missing query' });

    try {
        const token = await getSpotifyToken();

        const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track,playlist&limit=5`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) return res.status(response.status).json({ error: 'Spotify API error' });

        const data = await response.json();
        const results = [];

        if (data.tracks?.items) {
            for (const track of data.tracks.items.slice(0, 4)) {
                results.push({
                    id: track.id,
                    uri: `track/${track.id}`,
                    type: 'track',
                    name: track.name,
                    artist: track.artists.map(a => a.name).join(', '),
                    image: track.album.images[0]?.url || ''
                });
            }
        }

        if (data.playlists?.items) {
            for (const playlist of data.playlists.items.slice(0, 2)) {
                if (!playlist) continue;
                results.push({
                    id: playlist.id,
                    uri: `playlist/${playlist.id}`,
                    type: 'playlist',
                    name: playlist.name,
                    artist: playlist.owner.display_name || 'Spotify',
                    image: playlist.images[0]?.url || ''
                });
            }
        }

        // 🚀 PRE-FETCH audio URLs in background for the top tracks
        // This way when the user clicks a result, it's already cached.
        results.filter(r => r.type === 'track').forEach(track => {
            const prefetchQuery = `${track.name} ${track.artist}`;
            fetchAudioUrl(prefetchQuery).catch(() => {}); // fire and forget
        });

        res.json({ results });

    } catch (err) {
        if (err.message === 'MISSING_CREDENTIALS') {
            return res.status(403).json({ error: 'Spotify API keys missing in server configuration.' });
        }
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// YouTube audio URL endpoint (with cache)
// ============================================================
router.get('/jiosaavn-search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: 'Missing query' });

    try {
        const result = await fetchAudioUrl(query);

        if (!result || !result.audioUrl) {
            return res.status(404).json({ error: 'Aucune musique trouvée sur YouTube.' });
        }

        res.json({
            audioUrl: result.audioUrl,
            title: result.title,
            artist: result.artist,
            image: result.image
        });

    } catch (err) {
        console.error('Erreur YouTube Stream:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// Recommendations endpoint (Auto-Play Infini)
// ============================================================
router.get('/recommendations', async (req, res) => {
    const { artist, name } = req.query;
    if (!artist && !name) return res.status(400).json({ error: 'Missing artist or name' });

    try {
        const token = await getSpotifyToken();

        // Step 1: Find the track ID on Spotify
        const searchQuery = `${name || ''} ${artist || ''}`.trim();
        const searchRes = await fetch(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=1`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        let seedTrack = null;
        if (searchRes.ok) {
            const searchData = await searchRes.json();
            seedTrack = searchData.tracks?.items?.[0];
        }

        let recommendations = [];

        if (seedTrack) {
            // Step 2: Get recommendations from Spotify
            const recoRes = await fetch(
                `https://api.spotify.com/v1/recommendations?seed_tracks=${seedTrack.id}&limit=20`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (recoRes.ok) {
                const recoData = await recoRes.json();
                recommendations = (recoData.tracks || [])
                    .filter(t => t.id !== seedTrack.id)
                    .map(t => ({
                        id: t.id,
                        name: t.name,
                        artist: t.artists.map(a => a.name).join(', '),
                        image: t.album.images[0]?.url || ''
                    }));
            }
        } 
        
        if (recommendations.length === 0) {
            // Fallback: search for similar tracks by artist
            const queryForFallback = artist ? artist : name;
            const fallbackRes = await fetch(
                `https://api.spotify.com/v1/search?q=${encodeURIComponent(queryForFallback)}&type=track&limit=20`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (fallbackRes.ok) {
                const fallbackData = await fallbackRes.json();
                recommendations = (fallbackData.tracks?.items || []).map(t => ({
                    id: t.id,
                    name: t.name,
                    artist: t.artists.map(a => a.name).join(', '),
                    image: t.album.images[0]?.url || ''
                }));
            }
        }

        // Step 3: Pre-fetch audio URLs in background
        recommendations.forEach(track => {
            fetchAudioUrl(`${track.name} ${track.artist}`).catch(() => {});
        });

        res.json({ recommendations });
    } catch (err) {
        if (err.message === 'MISSING_CREDENTIALS') {
            return res.status(403).json({ error: 'Spotify API keys missing.' });
        }
        console.error('Reco error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// Liked Tracks (uses playlist system with special flag)
// ============================================================
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
let supabase2 = null;
if (supabaseUrl && supabaseKey) {
    supabase2 = createClient(supabaseUrl, supabaseKey);
}

function authMiddleware(req, res, next) {
    const auth = req.headers['authorization'];
    if (!auth) return res.status(401).json({ error: 'Non autorisé' });
    try {
        const token = auth.split(' ')[1];
        req.user = jwt.verify(token, process.env.JWT_SECRET || 'tsi1-secret-key-2025');
        next();
    } catch {
        return res.status(401).json({ error: 'Token invalide' });
    }
}

async function getOrCreateLikedPlaylist(userId) {
    if (!supabase2) throw new Error('Supabase non configuré');
    const { data: existing } = await supabase2
        .from('playlists')
        .select('id')
        .eq('user_id', userId)
        .eq('is_liked_playlist', true)
        .single();
    if (existing) return existing.id;

    const { data: created, error } = await supabase2
        .from('playlists')
        .insert({ user_id: userId, name: 'Titres Likés', is_liked_playlist: true, is_public: false })
        .select('id')
        .single();
    if (error) throw error;
    return created.id;
}

// GET /api/spotify/liked - Récupérer les titres likés
router.get('/liked', authMiddleware, async (req, res) => {
    if (!supabase2) return res.json({ tracks: [] });
    try {
        const playlistId = await getOrCreateLikedPlaylist(req.user.id);
        const { data, error } = await supabase2
            .from('playlist_tracks')
            .select('*')
            .eq('playlist_id', playlistId)
            .order('position', { ascending: true });
        if (error) throw error;
        res.json({ tracks: data || [], playlistId });
    } catch (err) {
        console.error('Liked tracks error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/spotify/like - Liker un titre
router.post('/like', authMiddleware, async (req, res) => {
    const { name, artist, image, audioUrl } = req.body;
    if (!audioUrl) return res.status(400).json({ error: 'audioUrl requis' });
    try {
        if (!supabase2) throw new Error('Supabase non configuré');
        const playlistId = await getOrCreateLikedPlaylist(req.user.id);
        
        // Vérifier si déjà présent
        const { data: existing } = await supabase2
            .from('playlist_tracks')
            .select('id')
            .eq('playlist_id', playlistId)
            .eq('audio_url', audioUrl)
            .maybeSingle();
        
        if (existing) return res.json({ success: true, message: 'Déjà liké' });

        const { error } = await supabase2.from('playlist_tracks').insert({
            playlist_id: playlistId,
            track_name: name || 'Titre inconnu',
            track_artist: artist || 'Artiste inconnu',
            track_image: image || '',
            audio_url: audioUrl
        });
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        console.error('Like error:', err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/spotify/like - Enlever un titre des likés
router.delete('/like', authMiddleware, async (req, res) => {
    const { audioUrl } = req.body;
    if (!audioUrl) return res.status(400).json({ error: 'audioUrl requis' });
    try {
        if (!supabase2) throw new Error('Supabase non configuré');
        const playlistId = await getOrCreateLikedPlaylist(req.user.id);
        const { error } = await supabase2
            .from('playlist_tracks')
            .delete()
            .eq('playlist_id', playlistId)
            .eq('audio_url', audioUrl);
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        console.error('Unlike error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// LOG PLAY - Historique pour le Wrapped
// ============================================================

router.get('/history', authMiddleware, async (req, res) => {
    if (!supabase2) return res.status(503).json({ error: 'Supabase non configuré' });
    try {
        const { data, error } = await supabase2
            .from('listening_history')
            .select('*')
            .eq('user_id', req.user.id)
            .order('played_at', { ascending: false }) // Get newest first
            .limit(50);
            
        if (error) throw error;

        // The tracks are returned newest first.
        // For localHistory, we want oldest first (newest at the end). So we reverse it!
        const reversedData = data.reverse();
        
        const mappedHistory = reversedData.map(track => ({
            id: track.audio_url, // For React key matching and local playback
            name: track.track_name,
            artist: track.track_artist,
            image: track.track_image,
            audioUrl: track.audio_url
        }));
        
        res.json({ history: mappedHistory });
    } catch (err) {
        console.error('Fetch history error:', err);
        res.status(500).json({ error: err.message });
    }
});
router.post('/log-play', authMiddleware, async (req, res) => {
    if (!supabase2) return res.status(503).json({ error: 'Supabase non configuré' });
    const { name, artist, image, audioUrl } = req.body;
    if (!name || !audioUrl) return res.status(400).json({ error: 'name et audioUrl requis' });
    try {
        const { error } = await supabase2.from('listening_history').insert({
            user_id: req.user.id,
            track_name: name,
            track_artist: artist || '',
            track_image: image || '',
            audio_url: audioUrl
        });
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        console.error('Log play error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// IMPORT PLAYLIST - Spotify Official Import
// ============================================================
router.post('/import-playlist', authMiddleware, async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL Spotify requise' });

    // Parse Playlist ID
    const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
    if (!match) return res.status(400).json({ error: 'Lien Spotify invalide' });
    const playlistId = match[1];

    try {
        const token = await getSpotifyToken();

        // 1. Fetch Playlist Metadata
        const plRes = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}?fields=name,images`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!plRes.ok) throw new Error('Impossible de lire la playlist Spotify');
        const plData = await plRes.json();

        // 2. Fetch All Tracks (up to 100 for now)
        const tracksRes = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50&fields=items(track(name,artists,album(images)))`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const tracksData = await tracksRes.json();
        const items = tracksData.items || [];

        if (items.length === 0) return res.status(400).json({ error: 'Playlist vide' });

        // 3. Create native playlist
        const { data: localPlaylist, error: pe } = await supabase2
            .from('playlists')
            .insert({ 
                user_id: req.user.id, 
                name: `${plData.name} (Import Spotify)`, 
                cover_image: plData.images?.[0]?.url || '',
                is_public: false 
            })
            .select('id')
            .single();
        if (pe) throw pe;

        // 4. Batch add tracks
        const tracksToInsert = items.map((item, index) => {
            const track = item.track;
            if (!track) return null;
            return {
                playlist_id: localPlaylist.id,
                track_name: track.name,
                track_artist: track.artists.map(a => a.name).join(', '),
                track_image: track.album.images[0]?.url || '',
                audio_url: `AUTO_RESOLVE:${track.name} - ${track.artists[0].name}`, // Marker for frontend resolution
                position: index
            };
        }).filter(Boolean);

        const { error: te } = await supabase2.from('playlist_tracks').insert(tracksToInsert);
        if (te) throw te;

        res.json({ success: true, playlistId: localPlaylist.id });

    } catch (err) {
        console.error('Import error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// BLEND - Mix Musical entre deux amis
// ============================================================
router.post('/blend', authMiddleware, async (req, res) => {
    const { friendId, friendName } = req.body;
    if (!friendId) return res.status(400).json({ error: 'friendId requis' });

    try {
        // 1. Get Liked Playlists for both
        const myLikedId = await getOrCreateLikedPlaylist(req.user.id);
        const friendLikedId = await getOrCreateLikedPlaylist(friendId);

        // 2. Fetch tracks for both
        const [myTracksRes, friendTracksRes] = await Promise.all([
            supabase2.from('playlist_tracks').select('*').eq('playlist_id', myLikedId).limit(50),
            supabase2.from('playlist_tracks').select('*').eq('playlist_id', friendLikedId).limit(50)
        ]);

        const myTracks = myTracksRes.data || [];
        const friendTracks = friendTracksRes.data || [];

        if (myTracks.length === 0 && friendTracks.length === 0) {
            return res.status(400).json({ error: 'Pas assez de données musicales pour créer un Blend.' });
        }

        // 3. Simple Blend Algorithm:
        // - Intersection first
        // - Then alternate between both until 30 songs
        const commonUrls = new Set(myTracks.map(t => t.audio_url));
        const intersection = friendTracks.filter(t => commonUrls.has(t.audio_url));
        
        const blended = [...intersection];
        const usedUrls = new Set(blended.map(t => t.audio_url));

        let i = 0, j = 0;
        while (blended.length < 30 && (i < myTracks.length || j < friendTracks.length)) {
            if (i < myTracks.length) {
                if (!usedUrls.has(myTracks[i].audio_url)) {
                    blended.push(myTracks[i]);
                    usedUrls.add(myTracks[i].audio_url);
                }
                i++;
            }
            if (blended.length < 30 && j < friendTracks.length) {
                if (!usedUrls.has(friendTracks[j].audio_url)) {
                    blended.push(friendTracks[j]);
                    usedUrls.add(friendTracks[j].audio_url);
                }
                j++;
            }
        }

        // 4. Create the Blend Playlist
        const { data: blendPlaylist, error: pe } = await supabase2
            .from('playlists')
            .insert({ 
                user_id: req.user.id, 
                name: `Blend: ${req.user.username || 'Moi'} & ${friendName || 'Ami'}`, 
                cover_image: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=500&auto=format&fit=crop',
                is_public: true 
            })
            .select('id')
            .single();
        if (pe) throw pe;

        // 5. Insert tracks
        const tracksToInsert = blended.map((t, idx) => ({
            playlist_id: blendPlaylist.id,
            track_name: t.track_name,
            track_artist: t.track_artist,
            track_image: t.track_image,
            audio_url: t.audio_url,
            position: idx
        }));

        await supabase2.from('playlist_tracks').insert(tracksToInsert);

        res.json({ success: true, playlistId: blendPlaylist.id });

    } catch (err) {
        console.error('Blend error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// WRAPPED - Statistiques d'écoute
// ============================================================
router.get('/wrapped', authMiddleware, async (req, res) => {
    if (!supabase2) return res.status(503).json({ error: 'Supabase non configuré' });

    try {
        const { data: history, error } = await supabase2
            .from('listening_history')
            .select('*')
            .eq('user_id', req.user.id)
            .order('played_at', { ascending: false });

        if (error) throw error;

        if (!history || history.length === 0) {
            return res.json({ totalPlays: 0, topTracks: [], topArtists: [] });
        }

        // Stats logic
        const trackCounts = {};
        const artistCounts = {};
        
        history.forEach(item => {
            const trackKey = `${item.track_name} - ${item.track_artist}`;
            trackCounts[trackKey] = (trackCounts[trackKey] || 0) + 1;
            
            const artists = item.track_artist.split(', ');
            artists.forEach(a => {
                artistCounts[a] = (artistCounts[a] || 0) + 1;
            });
        });

        const topTracks = Object.entries(trackCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        const topArtists = Object.entries(artistCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        res.json({
            totalPlays: history.length,
            topTracks,
            topArtists,
            history: history.slice(0, 20)
        });

    } catch (err) {
        console.error('Wrapped error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// Lyrics endpoint (via LRCLIB)
// ============================================================
const lyricsCache = new Map();

router.get('/lyrics', async (req, res) => {
    const { track, artist } = req.query;
    if (!track) return res.status(400).json({ error: 'Missing track' });

    const cacheKey = `${track}-${artist || ''}`.toLowerCase();
    
    // Auto-clean cache occasionally
    if (lyricsCache.size > 200) lyricsCache.clear();
    
    if (lyricsCache.has(cacheKey)) {
        return res.json(lyricsCache.get(cacheKey));
    }

    try {
        // Build search query exactly as lrclib implies
        const queryParams = new URLSearchParams();
        queryParams.append('track_name', track);
        if (artist) queryParams.append('artist_name', artist);
        
        let lrclibRes = await fetch(`https://lrclib.net/api/get?${queryParams.toString()}`);
        
        // If exact search fails, try broad search
        if (!lrclibRes.ok) {
            const broadQuery = `${track} ${artist || ''}`.trim();
            lrclibRes = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(broadQuery)}`);
        }
        
        if (!lrclibRes.ok) throw new Error('Lyrics not found');
        
        const data = await lrclibRes.json();
        
        let result = {};
        if (Array.isArray(data) && data.length > 0) {
            // broad search gives array
            result = {
                syncedLyrics: data[0].syncedLyrics,
                plainLyrics: data[0].plainLyrics
            };
        } else if (data.syncedLyrics || data.plainLyrics) {
            // exact search gives single object
            result = {
                syncedLyrics: data.syncedLyrics,
                plainLyrics: data.plainLyrics
            };
        } else {
            return res.json({ syncedLyrics: null, plainLyrics: null });
        }
        
        lyricsCache.set(cacheKey, result);
        res.json(result);

    } catch (err) {
        console.error('Lyrics error:', err.message);
        res.status(404).json({ error: 'Lyrics not found' });
    }
});

module.exports = router;

