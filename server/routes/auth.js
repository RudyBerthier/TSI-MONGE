const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const { OAuth2Client } = require('google-auth-library');
const { sendVerificationEmail, generateVerificationCode, DEV_MODE } = require('../services/email');
const supabase = require('../config/supabase');
const { logActivity } = require('../utils/logger');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ─── Session helpers ──────────────────────────────────────────────────────────

function parseUserAgent(ua) {
  if (!ua) return { device: 'Appareil inconnu', browser: 'Navigateur inconnu', os: '' }
  let device = 'Ordinateur', os = '', browser = 'Navigateur inconnu'
  if (/iPhone/i.test(ua)) { device = 'iPhone'; os = 'iOS' }
  else if (/iPad/i.test(ua)) { device = 'iPad'; os = 'iPadOS' }
  else if (/Android/i.test(ua) && /Mobile/i.test(ua)) { device = 'Android'; os = 'Android' }
  else if (/Android/i.test(ua)) { device = 'Tablette'; os = 'Android' }
  else if (/Windows/i.test(ua)) os = 'Windows'
  else if (/Macintosh|Mac OS/i.test(ua)) os = 'macOS'
  else if (/Linux/i.test(ua)) os = 'Linux'
  if (/Edg\//i.test(ua)) browser = 'Edge'
  else if (/Firefox\//i.test(ua)) browser = 'Firefox'
  else if (/OPR\/|Opera/i.test(ua)) browser = 'Opera'
  else if (/Chrome\//i.test(ua)) browser = 'Chrome'
  else if (/Safari\//i.test(ua)) browser = 'Safari'
  return { device, browser, os }
}

function maskIp(ip) {
  if (!ip) return null
  const clean = ip.replace('::ffff:', '')
  if (clean === '::1' || clean === '127.0.0.1') return 'Localhost'
  const parts = clean.split('.')
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.xxx.xxx`
  return clean.slice(0, 10) + '...'
}

async function recordSession(userId, req) {
  try {
    const ua = req.headers['user-agent'] || ''
    const rawIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || ''
    const { device, browser, os } = parseUserAgent(ua)
    const maskedIp = maskIp(rawIp)

    const newSession = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      device, browser, os,
      ip: maskedIp,
      timestamp: new Date().toISOString(),
    }
    const { data: row } = await supabase.from('users').select('recent_sessions').eq('id', userId).single()
    const prev = Array.isArray(row?.recent_sessions) ? row.recent_sessions : []

    // Check if a session with the same device, browser, os AND ip already exists
    // If so, we just update its timestamp instead of creating a duplicate
    const filteredSessions = prev.filter(s =>
      !(s.device === device && s.browser === browser && s.os === os && s.ip === maskedIp)
    )

    await supabase.from('users').update({ recent_sessions: [newSession, ...filteredSessions].slice(0, 10) }).eq('id', userId)
  } catch (_) { /* non-bloquant */ }
}

const router = express.Router();

// Configuration multer pour les avatars
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'avatars');
    // Créer le dossier s'il n'existe pas
    fs.mkdir(uploadDir, { recursive: true }).then(() => cb(null, uploadDir));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.user.id}-${Date.now()}${ext}`);
  }
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé. Utilisez JPG, PNG, GIF ou WebP.'));
    }
  }
});

// Clé secrète pour JWT (en production, utiliser une variable d'environnement)
const JWT_SECRET = process.env.JWT_SECRET || 'tsi1-secret-key-2025';
const JWT_EXPIRES_IN = '30d';

// Rate limiting simple pour resend (en mémoire)
const resendLimits = new Map();

// Helper: map a Supabase user row (snake_case) to camelCase for responses
function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    password: row.password,
    role: row.role,
    emailVerified: row.email_verified,
    googleId: row.google_id,
    googleAvatar: row.google_avatar,
    avatar: row.avatar,
    twoFactorEnabled: row.two_factor_enabled,
    createdAt: row.created_at
  };
}

// Nettoyer les codes expirés
async function cleanExpiredCodes() {
  await supabase
    .from('verification_codes')
    .delete()
    .lt('expires_at', new Date().toISOString());
}

// Validation email
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Middleware pour vérifier le token JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Token d\'accès requis' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token invalide ou expiré' });
    }
    req.user = user;
    next();
  });
};

// POST /api/auth/login - Connexion (par email ou username)
router.post('/login', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const identifier = email || username;

    if (!identifier || !password) {
      return res.status(400).json({
        error: 'Email/nom d\'utilisateur et mot de passe requis'
      });
    }

    // Chercher par email ou username
    const { data: row, error: findError } = await supabase
      .from('users')
      .select('*')
      .or(`email.eq.${identifier},username.eq.${identifier}`)
      .single();

    if (findError || !row) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    const user = mapUser(row);

    // Vérifier que l'utilisateur a un mot de passe (pas un compte Google-only)
    if (!user.password) {
      return res.status(401).json({ error: 'Ce compte utilise Google pour la connexion. Utilisez le bouton "Se connecter avec Google".' });
    }

    // Vérifier le mot de passe
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    // Vérifier si la 2FA est activée
    if (user.twoFactorEnabled) {
      // Générer un code de vérification pour la connexion
      const code = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Supprimer les anciens codes de login pour cet utilisateur
      await supabase
        .from('verification_codes')
        .delete()
        .eq('email', user.email)
        .eq('type', 'login');

      // Sauvegarder le nouveau code de connexion
      await supabase
        .from('verification_codes')
        .insert({
          email: user.email,
          code,
          type: 'login',
          expires_at: expiresAt.toISOString(),
          attempts: 0
        });

      // Envoyer l'email avec le code
      await sendVerificationEmail(user.email, code, user.username, 'connexion');

      return res.json({
        success: true,
        requires2FA: true,
        email: user.email,
        message: DEV_MODE
          ? 'Code de vérification affiché dans la console serveur (mode dev)'
          : 'Code de vérification envoyé par email'
      });
    }

    // Pas de 2FA - connexion directe
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    recordSession(user.id, req);
    logActivity({ actorId: user.id, actorUsername: user.username, action: 'auth.login', req });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar || null,
        googleAvatar: user.googleAvatar || null,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled || false,
        hasPassword: !!user.password,
        createdAt: user.createdAt || null
      }
    });

  } catch (error) {
    console.error('Erreur connexion:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/auth/google - Connexion/Inscription via Google
router.post('/google', async (req, res) => {
  try {
    const { credential, access_token } = req.body;

    if (!credential && !access_token) {
      return res.status(400).json({ error: 'Token Google requis' });
    }

    let googleId, email, name, picture;

    if (credential) {
      // Vérifier l'ID token Google
      let ticket;
      try {
        ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
      } catch (err) {
        console.error('Erreur vérification token Google:', err);
        return res.status(401).json({ error: 'Token Google invalide' });
      }
      const payload = ticket.getPayload();
      googleId = payload.sub;
      email = payload.email;
      name = payload.name;
      picture = payload.picture;
    } else {
      // Vérifier l'access token via l'API Google userinfo
      try {
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${access_token}` }
        });
        if (!response.ok) throw new Error('Token invalide');
        const data = await response.json();
        googleId = data.sub;
        email = data.email;
        name = data.name;
        picture = data.picture;
      } catch (err) {
        console.error('Erreur vérification access token Google:', err);
        return res.status(401).json({ error: 'Token Google invalide' });
      }
    }

    if (!email) {
      return res.status(400).json({ error: 'Email non disponible depuis Google' });
    }

    // 1. User avec ce googleId existe déjà → login direct
    let user = null;
    let accountLinked = false;

    const { data: byGoogleId } = await supabase
      .from('users')
      .select('*')
      .eq('google_id', googleId)
      .single();

    if (byGoogleId) {
      user = mapUser(byGoogleId);
      // Mettre à jour le googleAvatar à chaque connexion
      if (picture && user.googleAvatar !== picture) {
        await supabase
          .from('users')
          .update({ google_avatar: picture })
          .eq('id', user.id);
        user.googleAvatar = picture;
      }
    }

    if (!user) {
      // 2. User avec cet email existe → lier le compte Google
      const { data: byEmail } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (byEmail) {
        user = mapUser(byEmail);
        accountLinked = true;
        const updateFields = { google_id: googleId };
        if (picture) {
          updateFields.google_avatar = picture;
        }
        await supabase
          .from('users')
          .update(updateFields)
          .eq('id', user.id);
        user.googleId = googleId;
        if (picture) user.googleAvatar = picture;
      } else {
        // 3. Créer un nouveau compte
        let baseUsername = name
          ? name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9_-]/g, '')
          : email.split('@')[0];

        baseUsername = baseUsername.slice(0, 20);
        if (baseUsername.length < 3) {
          baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20);
        }

        // Assurer l'unicité du username
        let finalUsername = baseUsername;
        let counter = 1;
        while (true) {
          const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('username', finalUsername)
            .single();
          if (!existing) break;
          const suffix = `-${counter}`;
          finalUsername = baseUsername.slice(0, 20 - suffix.length) + suffix;
          counter++;
        }

        const newId = Date.now().toString();
        const newUserRow = {
          id: newId,
          username: finalUsername,
          email,
          password: null,
          role: 'user',
          email_verified: true,
          google_id: googleId,
          google_avatar: picture || null,
          avatar: null,
          two_factor_enabled: false,
          created_at: new Date().toISOString()
        };

        await supabase.from('users').insert(newUserRow);
        user = mapUser(newUserRow);
      }
    }

    // Si 2FA activé, envoyer un code comme pour le login classique
    if (user.twoFactorEnabled) {
      const code = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await supabase
        .from('verification_codes')
        .delete()
        .eq('email', user.email)
        .eq('type', 'login');

      await supabase
        .from('verification_codes')
        .insert({
          email: user.email,
          code,
          type: 'login',
          expires_at: expiresAt.toISOString(),
          attempts: 0
        });

      await sendVerificationEmail(user.email, code, user.username, 'connexion');

      return res.json({
        success: true,
        requires2FA: true,
        email: user.email,
        message: DEV_MODE
          ? 'Code de vérification affiché dans la console serveur (mode dev)'
          : 'Code de vérification envoyé par email'
      });
    }

    // Générer le JWT
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    recordSession(user.id, req);

    res.json({
      success: true,
      accountLinked,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar || null,
        googleAvatar: user.googleAvatar || null,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled || false,
        hasPassword: !!user.password,
        createdAt: user.createdAt || null
      }
    });

  } catch (error) {
    console.error('Erreur connexion Google:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/auth/verify-login - Vérifier le code 2FA pour la connexion
router.post('/verify-login', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email et code requis' });
    }

    // Nettoyer les codes expirés
    await cleanExpiredCodes();

    const { data: codeEntry, error: codeError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('email', email)
      .eq('type', 'login')
      .single();

    if (codeError || !codeEntry) {
      return res.status(400).json({
        error: 'Code expiré ou inexistant. Veuillez vous reconnecter.'
      });
    }

    // Vérifier le nombre de tentatives
    if (codeEntry.attempts >= 3) {
      await supabase
        .from('verification_codes')
        .delete()
        .eq('id', codeEntry.id);
      return res.status(400).json({
        error: 'Trop de tentatives. Veuillez vous reconnecter.'
      });
    }

    // Vérifier le code
    if (codeEntry.code !== code) {
      await supabase
        .from('verification_codes')
        .update({ attempts: codeEntry.attempts + 1 })
        .eq('id', codeEntry.id);
      return res.status(400).json({
        error: `Code incorrect. ${3 - (codeEntry.attempts + 1)} tentative(s) restante(s).`
      });
    }

    // Code valide - récupérer l'utilisateur
    const { data: row } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (!row) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const user = mapUser(row);

    // Supprimer le code utilisé
    await supabase
      .from('verification_codes')
      .delete()
      .eq('email', email)
      .eq('type', 'login');

    // Générer le token JWT
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    recordSession(user.id, req);

    res.json({
      success: true,
      message: 'Connexion réussie',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar || null,
        googleAvatar: user.googleAvatar || null,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled || false,
        hasPassword: !!user.password,
        createdAt: user.createdAt || null
      }
    });

  } catch (error) {
    console.error('Erreur vérification login 2FA:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/auth/logout - Déconnexion (côté client principalement)
router.post('/logout', authenticateToken, (req, res) => {
  logActivity({ actorId: req.user.id, actorUsername: req.user.username, action: 'auth.logout', req });
  res.json({ success: true, message: 'Déconnexion réussie' });
});

// POST /api/auth/register - Inscription avec vérification email
router.post('/register', async (req, res) => {
  try {
    const { email, username, password } = req.body;

    // Validation
    if (!email || !username || !password) {
      return res.status(400).json({
        error: 'Email, nom d\'utilisateur et mot de passe requis'
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Format d\'email invalide' });
    }

    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({
        error: 'Le nom d\'utilisateur doit faire entre 3 et 20 caractères'
      });
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return res.status(400).json({
        error: 'Le nom d\'utilisateur ne peut contenir que des lettres, chiffres, tirets et underscores'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'Le mot de passe doit faire au moins 8 caractères'
      });
    }

    // Vérifier si l'email ou le username existe déjà
    const { data: existingEmail } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingEmail) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }

    const { data: existingUsername } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUsername) {
      return res.status(400).json({ error: 'Ce nom d\'utilisateur est déjà pris' });
    }

    // Nettoyer les codes expirés et vérifier si un code existe déjà
    await cleanExpiredCodes();

    const { data: existingCode } = await supabase
      .from('verification_codes')
      .select('id')
      .eq('email', email)
      .single();

    if (existingCode) {
      return res.status(400).json({
        error: 'Un code de vérification a déjà été envoyé. Vérifiez votre email ou attendez 15 minutes.'
      });
    }

    // Hasher le mot de passe
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Générer le code de vérification
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Sauvegarder le code de vérification
    await supabase
      .from('verification_codes')
      .insert({
        email,
        code,
        type: 'registration',
        expires_at: expiresAt.toISOString(),
        attempts: 0
      });

    // Sauvegarder les données d'inscription temporairement
    await supabase
      .from('verification_codes')
      .insert({
        email,
        code: JSON.stringify({ username, password: hashedPassword }),
        type: 'registration_data',
        expires_at: expiresAt.toISOString(),
        attempts: 0
      });

    // Envoyer l'email
    const emailResult = await sendVerificationEmail(email, code, username);

    if (!emailResult.success && !DEV_MODE) {
      // Supprimer les codes si l'email n'a pas pu être envoyé
      await supabase
        .from('verification_codes')
        .delete()
        .eq('email', email);
      return res.status(500).json({ error: 'Erreur lors de l\'envoi de l\'email' });
    }

    res.json({
      success: true,
      message: DEV_MODE
        ? 'Code de vérification affiché dans la console serveur (mode dev)'
        : 'Code de vérification envoyé par email',
      email
    });

  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/auth/verify-email - Vérifier le code email
router.post('/verify-email', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email et code requis' });
    }

    // Nettoyer les codes expirés
    await cleanExpiredCodes();

    const { data: codeEntry, error: codeError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('email', email)
      .eq('type', 'registration')
      .single();

    if (codeError || !codeEntry) {
      return res.status(400).json({
        error: 'Code expiré ou inexistant. Veuillez vous réinscrire.'
      });
    }

    // Vérifier le nombre de tentatives
    if (codeEntry.attempts >= 3) {
      // Supprimer tous les codes pour cet email
      await supabase
        .from('verification_codes')
        .delete()
        .eq('email', email);
      return res.status(400).json({
        error: 'Trop de tentatives. Veuillez vous réinscrire.'
      });
    }

    // Vérifier le code
    if (codeEntry.code !== code) {
      await supabase
        .from('verification_codes')
        .update({ attempts: codeEntry.attempts + 1 })
        .eq('id', codeEntry.id);
      return res.status(400).json({
        error: `Code incorrect. ${3 - (codeEntry.attempts + 1)} tentative(s) restante(s).`
      });
    }

    // Code valide - récupérer les données d'inscription
    const { data: regDataEntry } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('email', email)
      .eq('type', 'registration_data')
      .single();

    if (!regDataEntry) {
      return res.status(400).json({
        error: 'Données d\'inscription introuvables. Veuillez vous réinscrire.'
      });
    }

    const regData = JSON.parse(regDataEntry.code);

    // Vérifier à nouveau que l'email/username n'existe pas (race condition)
    const { data: existingEmail } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingEmail) {
      await supabase
        .from('verification_codes')
        .delete()
        .eq('email', email);
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }

    const newId = Date.now().toString();
    const now = new Date().toISOString();

    const newUserRow = {
      id: newId,
      username: regData.username,
      email,
      password: regData.password,
      role: 'user',
      email_verified: true,
      google_id: null,
      google_avatar: null,
      avatar: null,
      two_factor_enabled: false,
      created_at: now
    };

    await supabase.from('users').insert(newUserRow);

    // Supprimer les codes utilisés
    await supabase
      .from('verification_codes')
      .delete()
      .eq('email', email);

    const newUser = mapUser(newUserRow);

    // Générer le token JWT
    const token = jwt.sign(
      {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    logActivity({ actorId: newUser.id, actorUsername: newUser.username, action: 'auth.register', req });

    res.json({
      success: true,
      message: 'Compte créé avec succès',
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        avatar: null,
        role: newUser.role,
        hasPassword: !!newUser.password,
        createdAt: newUser.createdAt
      }
    });

  } catch (error) {
    console.error('Erreur vérification email:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/auth/resend-code - Renvoyer le code de vérification
router.post('/resend-code', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email requis' });
    }

    // Rate limiting (1 par 60 secondes)
    const now = Date.now();
    const lastResend = resendLimits.get(email) || 0;
    if (now - lastResend < 60000) {
      const waitTime = Math.ceil((60000 - (now - lastResend)) / 1000);
      return res.status(429).json({
        error: `Veuillez attendre ${waitTime} secondes avant de renvoyer un code`
      });
    }

    // Nettoyer les codes expirés
    await cleanExpiredCodes();

    // Vérifier qu'un code existe pour cet email (registration or login)
    const { data: codeEntry, error: codeError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('email', email)
      .in('type', ['registration', 'login'])
      .single();

    if (codeError || !codeEntry) {
      return res.status(400).json({
        error: 'Aucune inscription en attente pour cet email'
      });
    }

    // Générer un nouveau code
    const newCode = generateVerificationCode();
    await supabase
      .from('verification_codes')
      .update({
        code: newCode,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        attempts: 0
      })
      .eq('id', codeEntry.id);

    // Récupérer le username pour l'email
    let username = email;
    if (codeEntry.type === 'registration') {
      const { data: regDataEntry } = await supabase
        .from('verification_codes')
        .select('code')
        .eq('email', email)
        .eq('type', 'registration_data')
        .single();
      if (regDataEntry) {
        try {
          const regData = JSON.parse(regDataEntry.code);
          username = regData.username;
        } catch (e) { /* ignore parse errors */ }
      }
    }

    // Envoyer l'email
    await sendVerificationEmail(email, newCode, username);

    // Mettre à jour le rate limit
    resendLimits.set(email, now);

    res.json({
      success: true,
      message: DEV_MODE
        ? 'Nouveau code affiché dans la console serveur (mode dev)'
        : 'Nouveau code envoyé par email'
    });

  } catch (error) {
    console.error('Erreur renvoi code:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/auth/forgot-password - Demander un code de réinitialisation
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email requis' });
    }

    const { data: row } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (!row) {
      // Ne pas révéler si l'email existe ou non
      return res.json({
        success: true,
        message: 'Si un compte existe avec cet email, un code a été envoyé.'
      });
    }

    const user = mapUser(row);

    // Rate limiting
    const now = Date.now();
    const lastResend = resendLimits.get(`reset-${email}`) || 0;
    if (now - lastResend < 60000) {
      const waitTime = Math.ceil((60000 - (now - lastResend)) / 1000);
      return res.status(429).json({
        error: `Veuillez attendre ${waitTime} secondes avant de renvoyer un code`
      });
    }

    // Générer un code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await cleanExpiredCodes();

    // Supprimer les anciens codes de reset pour cet email
    await supabase
      .from('verification_codes')
      .delete()
      .eq('email', email)
      .eq('type', 'reset');

    await supabase
      .from('verification_codes')
      .insert({
        email,
        code,
        type: 'reset',
        expires_at: expiresAt.toISOString(),
        attempts: 0
      });

    // Envoyer l'email
    await sendVerificationEmail(email, code, user.username, 'reset');

    resendLimits.set(`reset-${email}`, now);

    res.json({
      success: true,
      message: DEV_MODE
        ? 'Code affiché dans la console serveur (mode dev)'
        : 'Si un compte existe avec cet email, un code a été envoyé.'
    });

  } catch (error) {
    console.error('Erreur forgot-password:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/auth/reset-password - Réinitialiser le mot de passe avec le code
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, code et nouveau mot de passe requis' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Le mot de passe doit faire au moins 8 caractères' });
    }

    await cleanExpiredCodes();

    const { data: codeEntry, error: codeError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('email', email)
      .eq('type', 'reset')
      .single();

    if (codeError || !codeEntry) {
      return res.status(400).json({
        error: 'Code expiré ou inexistant. Veuillez recommencer.'
      });
    }

    if (codeEntry.attempts >= 3) {
      await supabase
        .from('verification_codes')
        .delete()
        .eq('id', codeEntry.id);
      return res.status(400).json({
        error: 'Trop de tentatives. Veuillez recommencer.'
      });
    }

    if (codeEntry.code !== code) {
      await supabase
        .from('verification_codes')
        .update({ attempts: codeEntry.attempts + 1 })
        .eq('id', codeEntry.id);
      return res.status(400).json({
        error: `Code incorrect. ${3 - (codeEntry.attempts + 1)} tentative(s) restante(s).`
      });
    }

    // Code valide — mettre à jour le mot de passe
    const { data: row } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (!row) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const user = mapUser(row);

    if (user.googleId && !user.password) {
      return res.status(400).json({ error: 'Ce compte utilise Google pour la connexion. Utilisez le bouton "Se connecter avec Google".' });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('id', user.id);

    // Supprimer le code utilisé
    await supabase
      .from('verification_codes')
      .delete()
      .eq('email', email)
      .eq('type', 'reset');

    res.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès'
    });

  } catch (error) {
    console.error('Erreur reset-password:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/auth/verify - Vérifier la validité du token
router.get('/verify', authenticateToken, async (req, res) => {
  try {
    // Récupérer les données complètes de l'utilisateur (notamment l'avatar)
    const { data: row } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    const user = row ? mapUser(row) : null;

    res.json({
      valid: true,
      user: {
        id: req.user.id,
        username: user?.username || req.user.username,
        email: user?.email || req.user.email,
        avatar: user?.avatar || null,
        googleAvatar: user?.googleAvatar || null,
        role: user?.role || req.user.role,
        hasPassword: !!user?.password,
        createdAt: user?.createdAt || null
      }
    });
  } catch (error) {
    // En cas d'erreur, retourner les infos du token
    res.json({
      valid: true,
      user: {
        id: req.user.id,
        username: req.user.username,
        role: req.user.role
      }
    });
  }
});

// POST /api/auth/change-password - Changer le mot de passe
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Mot de passe actuel et nouveau mot de passe requis'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'Le nouveau mot de passe doit faire au moins 6 caractères'
      });
    }

    const { data: row } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (!row) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const user = mapUser(row);

    // Vérifier que l'utilisateur a un mot de passe (pas Google-only)
    if (!user.password) {
      return res.status(400).json({ error: 'Votre compte utilise Google. Vous ne pouvez pas changer de mot de passe.' });
    }

    // Vérifier le mot de passe actuel
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
    }

    // Hasher le nouveau mot de passe
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Mettre à jour le mot de passe
    await supabase
      .from('users')
      .update({ password: hashedNewPassword })
      .eq('id', user.id);

    logActivity({ actorId: req.user.id, actorUsername: req.user.username, action: 'auth.password_change', req });
    res.json({ success: true, message: 'Mot de passe mis à jour' });

  } catch (error) {
    console.error('Erreur changement mot de passe:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/auth/2fa/enable - Activer la double authentification (directement)
router.post('/2fa/enable', authenticateToken, async (req, res) => {
  try {
    const { data: row } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (!row) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const user = mapUser(row);

    if (!user.email) {
      return res.status(400).json({ error: 'Un email est requis pour activer la 2FA' });
    }

    if (user.twoFactorEnabled) {
      return res.status(400).json({ error: 'La 2FA est déjà activée' });
    }

    // Activer directement la 2FA
    await supabase
      .from('users')
      .update({ two_factor_enabled: true })
      .eq('id', user.id);

    logActivity({ actorId: req.user.id, actorUsername: req.user.username, action: 'auth.2fa_enable', req });
    res.json({
      success: true,
      message: 'Double authentification activée'
    });

  } catch (error) {
    console.error('Erreur activation 2FA:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/auth/2fa/disable - Désactiver la double authentification
router.post('/2fa/disable', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;

    const { data: row } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (!row) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const user = mapUser(row);

    // Vérifier le mot de passe (sauf pour les comptes Google-only)
    if (user.password) {
      if (!password) {
        return res.status(400).json({ error: 'Mot de passe requis pour désactiver la 2FA' });
      }
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Mot de passe incorrect' });
      }
    }

    // Désactiver la 2FA
    await supabase
      .from('users')
      .update({ two_factor_enabled: false })
      .eq('id', user.id);

    logActivity({ actorId: req.user.id, actorUsername: req.user.username, action: 'auth.2fa_disable', req });
    res.json({
      success: true,
      message: 'Double authentification désactivée'
    });

  } catch (error) {
    console.error('Erreur désactivation 2FA:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/auth/2fa/status - Vérifier le statut de la 2FA
router.get('/2fa/status', authenticateToken, async (req, res) => {
  try {
    const { data: row } = await supabase
      .from('users')
      .select('two_factor_enabled')
      .eq('id', req.user.id)
      .single();

    if (!row) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({
      enabled: row.two_factor_enabled || false
    });

  } catch (error) {
    console.error('Erreur statut 2FA:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/auth/profile - Obtenir le profil de l'utilisateur connecté
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const { data: row } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (!row) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const user = mapUser(row);

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar || null,
      googleAvatar: user.googleAvatar || null,
      role: user.role,
      hasPassword: !!user.password,
      createdAt: user.createdAt
    });
  } catch (error) {
    console.error('Erreur récupération profil:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/auth/profile - Modifier le profil de l'utilisateur
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { username } = req.body;

    const { data: row } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (!row) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const user = mapUser(row);

    // Mise à jour du username
    if (username && username !== user.username) {
      if (username.length < 3 || username.length > 20) {
        return res.status(400).json({
          error: 'Le nom d\'utilisateur doit faire entre 3 et 20 caractères'
        });
      }

      if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        return res.status(400).json({
          error: 'Le nom d\'utilisateur ne peut contenir que des lettres, chiffres, tirets et underscores'
        });
      }

      // Vérifier si le nouveau nom d'utilisateur existe déjà
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .neq('id', req.user.id)
        .single();

      if (existingUser) {
        return res.status(400).json({
          error: 'Ce nom d\'utilisateur est déjà pris'
        });
      }

      await supabase
        .from('users')
        .update({ username })
        .eq('id', req.user.id);

      user.username = username;
    }

    // Générer un nouveau token avec les nouvelles infos
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      message: 'Profil mis à jour',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar || null,
        googleAvatar: user.googleAvatar || null,
        role: user.role,
        hasPassword: !!user.password,
        createdAt: user.createdAt || null
      }
    });
  } catch (error) {
    console.error('Erreur modification profil:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/auth/avatar - Upload d'avatar
router.post('/avatar', authenticateToken, avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier envoyé' });
    }

    const { data: row } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (!row) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const user = mapUser(row);

    // Supprimer l'ancien avatar s'il existe
    if (user.avatar) {
      const oldAvatarPath = path.join(__dirname, '..', user.avatar.replace(/^\//, ''));
      try {
        await fs.unlink(oldAvatarPath);
      } catch (err) {
        // Ignorer si le fichier n'existe pas
      }
    }

    // Sauvegarder le nouveau chemin d'avatar
    const avatarPath = `/uploads/avatars/${req.file.filename}`;
    await supabase
      .from('users')
      .update({ avatar: avatarPath })
      .eq('id', req.user.id);

    res.json({
      success: true,
      message: 'Avatar mis à jour',
      avatar: avatarPath
    });
  } catch (error) {
    console.error('Erreur upload avatar:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/auth/avatar - Supprimer l'avatar
router.delete('/avatar', authenticateToken, async (req, res) => {
  try {
    const { data: row } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (!row) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const user = mapUser(row);

    // Supprimer le fichier avatar s'il existe
    if (user.avatar) {
      const avatarPath = path.join(__dirname, '..', user.avatar.replace(/^\//, ''));
      try {
        await fs.unlink(avatarPath);
      } catch (err) {
        // Ignorer si le fichier n'existe pas
      }
    }

    await supabase
      .from('users')
      .update({ avatar: null })
      .eq('id', req.user.id);

    res.json({
      success: true,
      message: 'Avatar supprimé'
    });
  } catch (error) {
    console.error('Erreur suppression avatar:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/auth/user-settings - Obtenir les préférences globales du compte
router.get('/user-settings', authenticateToken, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('user_settings')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;
    res.json(user.user_settings || {});
  } catch (error) {
    console.error('Erreur GET user-settings:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/auth/user-settings - Mettre à jour les préférences (patch object)
router.put('/user-settings', authenticateToken, async (req, res) => {
  try {
    const patch = req.body;
    if (!patch || typeof patch !== 'object') {
      return res.status(400).json({ error: 'Body doit être un objet JSON valide' });
    }

    // Récupérer les settings actuels pour faire un merge propre (Supabase jsonb_set ou update via merge JS)
    const { data: user, error: fetchErr } = await supabase
      .from('users')
      .select('user_settings')
      .eq('id', req.user.id)
      .single();

    if (fetchErr) throw fetchErr;

    const currentSettings = user.user_settings || {};
    const newSettings = { ...currentSettings, ...patch };

    const { error: updateErr } = await supabase
      .from('users')
      .update({ user_settings: newSettings })
      .eq('id', req.user.id);

    if (updateErr) throw updateErr;

    res.json(newSettings);
  } catch (error) {
    console.error('Erreur PUT user-settings:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/auth/users - Récupérer la liste des utilisateurs
router.get('/users', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      // Admin peut voir tous les utilisateurs avec plus d'infos
      const { data: rows, error } = await supabase
        .from('users')
        .select('id, username, role, avatar, email, is_verified');

      if (error) throw error;

      const safeUsers = (rows || []).map(u => ({
        id: u.id,
        username: u.username,
        role: u.role,
        avatar: u.avatar || null,
        email: u.email || null,
        is_verified: u.is_verified || false
      }));
      res.json(safeUsers);
    } else {
      // Tous les utilisateurs authentifiés peuvent voir la liste basique (pour les DMs)
      const { data: rows, error } = await supabase
        .from('users')
        .select('id, username, avatar');

      if (error) throw error;

      const safeUsers = (rows || []).map(u => ({
        id: u.id,
        username: u.username,
        avatar: u.avatar || null
      }));
      res.json(safeUsers);
    }
  } catch (error) {
    console.error('Erreur récupération utilisateurs:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/auth/users - Ajouter un nouvel utilisateur (admin uniquement)
router.post('/users', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé - Admin requis' });
    }

    const { username, password, role } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({
        error: 'Nom d\'utilisateur, mot de passe et rôle requis'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Le mot de passe doit faire au moins 6 caractères'
      });
    }

    const validRoles = ['admin', 'user', 'professeur'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        error: 'Rôle invalide. Utiliser: admin ou user'
      });
    }

    // Vérifier si l'utilisateur existe déjà
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (existing) {
      return res.status(400).json({
        error: 'Un utilisateur avec ce nom existe déjà'
      });
    }

    // Hasher le mot de passe
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Créer le nouvel utilisateur
    const newUserRow = {
      id: username, // Utiliser le nom d'utilisateur comme ID
      username,
      password: hashedPassword,
      role,
      email: null,
      email_verified: false,
      google_id: null,
      google_avatar: null,
      avatar: null,
      two_factor_enabled: false,
      created_at: new Date().toISOString()
    };

    await supabase.from('users').insert(newUserRow);

    logActivity({
      actorId: req.user.id,
      actorUsername: req.user.username,
      action: 'admin.user.create',
      targetType: 'user',
      targetId: newUserRow.id,
      targetLabel: username,
      req
    });

    res.json({
      success: true,
      user: {
        id: newUserRow.id,
        username: newUserRow.username,
        role: newUserRow.role
      },
      message: 'Utilisateur ajouté avec succès'
    });

  } catch (error) {
    console.error('Erreur ajout utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/auth/users/:id - Modifier un utilisateur (admin ou professeur pour son propre compte)
router.put('/users/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;

    // Admin peut modifier tout le monde, professeur peut modifier seulement son propre compte
    if (req.user.role !== 'admin' && req.user.role !== 'professeur') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    // Si c'est un professeur, il ne peut modifier que son propre compte
    if (req.user.role === 'professeur' && userId !== req.user.id) {
      return res.status(403).json({ error: 'Vous ne pouvez modifier que votre propre compte' });
    }

    const { username, role, password, is_verified } = req.body;

    const { data: row } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (!row) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const user = mapUser(row);
    const updateFields = {};

    // Mise à jour des champs
    if (username && username !== user.username) {
      // Les professeurs ne peuvent pas changer leur nom d'utilisateur
      if (req.user.role === 'professeur') {
        return res.status(403).json({
          error: 'Les professeurs ne peuvent pas modifier leur nom d\'utilisateur'
        });
      }

      // Vérifier si le nouveau nom d'utilisateur existe déjà
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .neq('id', userId)
        .single();

      if (existingUser) {
        return res.status(400).json({
          error: 'Un utilisateur avec ce nom existe déjà'
        });
      }
      updateFields.username = username;
    }

    if (role && role !== user.role) {
      const validRoles = ['admin', 'user', 'professeur'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          error: 'Rôle invalide. Utiliser: admin, user ou professeur'
        });
      }

      // Les professeurs ne peuvent pas changer leur rôle
      if (req.user.role === 'professeur') {
        return res.status(403).json({
          error: 'Les professeurs ne peuvent pas modifier leur rôle'
        });
      }

      updateFields.role = role;
    }

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({
          error: 'Le mot de passe doit faire au moins 6 caractères'
        });
      }
      const saltRounds = 10;
      updateFields.password = await bcrypt.hash(password, saltRounds);
    }

    // Seul un admin peut modifier le badge vérifié
    if (typeof is_verified === 'boolean' && req.user.role === 'admin') {
      updateFields.is_verified = is_verified;
    }

    if (Object.keys(updateFields).length > 0) {
      await supabase
        .from('users')
        .update(updateFields)
        .eq('id', userId);

      if (req.user.role === 'admin' && userId !== req.user.id) {
        logActivity({
          actorId: req.user.id,
          actorUsername: req.user.username,
          action: 'admin.user.update',
          targetType: 'user',
          targetId: userId,
          targetLabel: updateFields.username || user.username,
          req
        });
      }
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: updateFields.username || user.username,
        role: updateFields.role || user.role
      },
      message: 'Utilisateur modifié avec succès'
    });

  } catch (error) {
    console.error('Erreur modification utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/auth/users/:id - Supprimer un utilisateur (admin uniquement)
router.delete('/users/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé - Admin requis' });
    }

    const userId = req.params.id;

    // Empêcher la suppression de son propre compte
    if (userId === req.user.id) {
      return res.status(400).json({
        error: 'Vous ne pouvez pas supprimer votre propre compte'
      });
    }

    const { data: row } = await supabase
      .from('users')
      .select('id, username')
      .eq('id', userId)
      .single();

    if (!row) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    logActivity({
      actorId: req.user.id,
      actorUsername: req.user.username,
      action: 'admin.user.delete',
      targetType: 'user',
      targetId: userId,
      targetLabel: row.username,
      req
    });

    res.json({
      success: true,
      message: `Utilisateur "${row.username}" supprimé avec succès`
    });

  } catch (error) {
    console.error('Erreur suppression utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Fonction utilitaire pour créer un hash de mot de passe (pour l'admin)
router.post('/create-password-hash', async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Mot de passe requis' });
    }

    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);

    res.json({ hash });
  } catch (error) {
    console.error('Erreur création hash:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/auth/sessions - Connexions récentes
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('recent_sessions')
      .eq('id', req.user.id)
      .single();
    if (error) throw error;
    res.json(data?.recent_sessions || []);
  } catch (error) {
    console.error('Erreur sessions:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/auth/maths-favorites
router.get('/maths-favorites', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('maths_favorites')
      .eq('id', req.user.id)
      .single();
    if (error) throw error;
    res.json(data?.maths_favorites || []);
  } catch (error) {
    console.error('Erreur favoris:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/auth/maths-favorites
router.put('/maths-favorites', authenticateToken, async (req, res) => {
  try {
    const { favorites } = req.body;
    if (!Array.isArray(favorites)) return res.status(400).json({ error: 'Données invalides' });
    const { error } = await supabase
      .from('users')
      .update({ maths_favorites: favorites })
      .eq('id', req.user.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (error) {
    console.error('Erreur sauvegarde favoris:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/auth/stats - Stats du compte utilisateur
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const [{ count: groupCount }, { count: dmCount }, { count: customGroupCount }] = await Promise.all([
      supabase.from('chat_messages').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('private_messages').select('*', { count: 'exact', head: true }).eq('sender_id', userId),
      supabase.from('group_messages').select('*', { count: 'exact', head: true }).eq('sender_id', userId),
    ]);

    res.json({
      messagesGroupe: groupCount || 0,
      messagesDm: dmCount || 0,
      messagesGroupePerso: customGroupCount || 0,
      total: (groupCount || 0) + (dmCount || 0) + (customGroupCount || 0),
    });
  } catch (error) {
    console.error('Erreur stats:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/groups/:groupId/avatar — upload group avatar (admin only)
const groupAvatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'avatars');
    fs.mkdir(uploadDir, { recursive: true }).then(() => cb(null, uploadDir));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `group-${req.params.groupId}-${Date.now()}${ext}`);
  }
});
const groupAvatarUpload = multer({
  storage: groupAvatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  }
});

router.post('/groups/:groupId/avatar', authenticateToken, groupAvatarUpload.single('avatar'), async (req, res) => {
  try {
    const { groupId } = req.params;
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier' });

    const { data: group, error: gErr } = await supabase
      .from('groups')
      .select('creator_id, members, avatar')
      .eq('id', groupId)
      .single();
    if (gErr || !group) return res.status(404).json({ error: 'Groupe non trouvé' });
    if (group.creator_id !== req.user.id) return res.status(403).json({ error: 'Admin uniquement' });

    // Delete old avatar file if any
    if (group.avatar) {
      const oldPath = path.join(__dirname, '..', group.avatar.replace(/^\//, ''));
      fs.unlink(oldPath).catch(() => { });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await supabase.from('groups').update({ avatar: avatarUrl }).eq('id', groupId);

    const io = req.app.get('io');
    if (io) {
      // Broadcast avatar update to all group members
      io.emit('group:updated', { groupId, avatar: avatarUrl });

      // Insert + broadcast system message
      const { data: adminUser } = await supabase.from('users').select('username').eq('id', req.user.id).single();
      const sysMsg = {
        id: Date.now().toString() + '_sys',
        group_id: groupId,
        sender_id: null,
        sender_username: null,
        sender_avatar: null,
        content: `${adminUser?.username || 'Admin'} a changé la photo du groupe`,
        timestamp: new Date().toISOString(),
        reply_to: null,
        attachment: null,
        reactions: [],
        edit_history: [],
        is_edited: false,
        is_system: true,
      };
      await supabase.from('group_messages').insert(sysMsg);
      const frontendMsg = {
        ...sysMsg, senderId: null, senderUsername: null, senderAvatar: null,
        replyTo: null, editHistory: [], isEdited: false, isSystem: true
      };
      io.emit('group:new-message', { groupId, message: frontendMsg });
    }

    res.json({ avatar: avatarUrl });
  } catch (err) {
    console.error('Erreur avatar groupe:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/auth/dm-settings — muted + blocked lists
router.get('/dm-settings', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('muted_conversations, blocked_users')
      .eq('id', req.user.id)
      .single();
    if (error) throw error;
    res.json({
      muted: data?.muted_conversations || [],
      blocked: data?.blocked_users || [],
    });
  } catch (err) {
    console.error('Erreur dm-settings:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/auth/mute/:userId — toggle mute for a DM contact
router.post('/mute/:userId', authenticateToken, async (req, res) => {
  try {
    const targetId = req.params.userId;
    const { data: row } = await supabase
      .from('users')
      .select('muted_conversations')
      .eq('id', req.user.id)
      .single();
    const prev = Array.isArray(row?.muted_conversations) ? row.muted_conversations : [];
    const isMuted = prev.includes(targetId);
    const updated = isMuted ? prev.filter(id => id !== targetId) : [...prev, targetId];
    await supabase.from('users').update({ muted_conversations: updated }).eq('id', req.user.id);
    res.json({ muted: !isMuted });
  } catch (err) {
    console.error('Erreur mute:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/auth/block/:userId — toggle block for a user
router.post('/block/:userId', authenticateToken, async (req, res) => {
  try {
    const targetId = req.params.userId;
    const { data: row } = await supabase
      .from('users')
      .select('blocked_users')
      .eq('id', req.user.id)
      .single();
    const prev = Array.isArray(row?.blocked_users) ? row.blocked_users : [];
    const isBlocked = prev.includes(targetId);
    const updated = isBlocked ? prev.filter(id => id !== targetId) : [...prev, targetId];
    await supabase.from('users').update({ blocked_users: updated }).eq('id', req.user.id);
    res.json({ blocked: !isBlocked });
  } catch (err) {
    console.error('Erreur block:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = { router, authenticateToken };
