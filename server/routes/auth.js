const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs').promises;

const router = express.Router();

// Clé secrète pour JWT (en production, utiliser une variable d'environnement)
const JWT_SECRET = process.env.JWT_SECRET || 'tsi1-secret-key-2025';
const JWT_EXPIRES_IN = '24h';

// Fonction helper pour lire les utilisateurs
async function readUsers() {
  try {
    const data = await fs.readFile(path.join(__dirname, '..', 'data', 'users.json'), 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Erreur lecture users:', error);
    return [];
  }
}

// Fonction helper pour écrire les utilisateurs
async function writeUsers(users) {
  await fs.writeFile(
    path.join(__dirname, '..', 'data', 'users.json'),
    JSON.stringify(users, null, 2)
  );
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

// POST /api/auth/login - Connexion
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Nom d\'utilisateur et mot de passe requis' 
      });
    }
    
    const users = await readUsers();
    const user = users.find(u => u.username === username);
    
    if (!user) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }
    
    // Vérifier le mot de passe
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }
    
    // Générer le token JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
    
  } catch (error) {
    console.error('Erreur connexion:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/auth/logout - Déconnexion (côté client principalement)
router.post('/logout', (req, res) => {
  // En JWT, la déconnexion se fait côté client en supprimant le token
  // Ici on peut logger l'événement si nécessaire
  res.json({ success: true, message: 'Déconnexion réussie' });
});

// GET /api/auth/verify - Vérifier la validité du token
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    valid: true,
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role
    }
  });
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
    
    const users = await readUsers();
    const userIndex = users.findIndex(u => u.id === req.user.id);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    const user = users[userIndex];
    
    // Vérifier le mot de passe actuel
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
    }
    
    // Hasher le nouveau mot de passe
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Mettre à jour le mot de passe
    users[userIndex].password = hashedNewPassword;
    await writeUsers(users);
    
    res.json({ success: true, message: 'Mot de passe mis à jour' });
    
  } catch (error) {
    console.error('Erreur changement mot de passe:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/auth/users - Récupérer la liste des utilisateurs (admin uniquement)
router.get('/users', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé - Admin requis' });
    }
    
    const users = await readUsers();
    // Ne pas renvoyer les mots de passe
    const safeUsers = users.map(user => ({
      id: user.id,
      username: user.username,
      role: user.role
    }));
    
    res.json(safeUsers);
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
    
    const validRoles = ['admin', 'user'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        error: 'Rôle invalide. Utiliser: admin ou user' 
      });
    }
    
    const users = await readUsers();
    
    // Vérifier si l'utilisateur existe déjà
    if (users.find(u => u.username === username)) {
      return res.status(400).json({ 
        error: 'Un utilisateur avec ce nom existe déjà' 
      });
    }
    
    // Hasher le mot de passe
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Créer le nouvel utilisateur
    const newUser = {
      id: username, // Utiliser le nom d'utilisateur comme ID
      username,
      password: hashedPassword,
      role
    };
    
    users.push(newUser);
    await writeUsers(users);
    
    res.json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role
      },
      message: 'Utilisateur ajouté avec succès'
    });
    
  } catch (error) {
    console.error('Erreur ajout utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/auth/users/:id - Modifier un utilisateur (admin uniquement)
router.put('/users/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé - Admin requis' });
    }
    
    const userId = req.params.id;
    const { username, role, password } = req.body;
    
    const users = await readUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    const user = users[userIndex];
    
    // Mise à jour des champs
    if (username && username !== user.username) {
      // Vérifier si le nouveau nom d'utilisateur existe déjà
      if (users.find(u => u.username === username && u.id !== userId)) {
        return res.status(400).json({ 
          error: 'Un utilisateur avec ce nom existe déjà' 
        });
      }
      user.username = username;
    }
    
    if (role && role !== user.role) {
      const validRoles = ['admin', 'user'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ 
          error: 'Rôle invalide. Utiliser: admin ou user' 
        });
      }
      user.role = role;
    }
    
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ 
          error: 'Le mot de passe doit faire au moins 6 caractères' 
        });
      }
      const saltRounds = 10;
      user.password = await bcrypt.hash(password, saltRounds);
    }
    
    users[userIndex] = user;
    await writeUsers(users);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
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
    
    const users = await readUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    const deletedUser = users[userIndex];
    users.splice(userIndex, 1);
    await writeUsers(users);
    
    res.json({
      success: true,
      message: `Utilisateur "${deletedUser.username}" supprimé avec succès`
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

module.exports = { router, authenticateToken };