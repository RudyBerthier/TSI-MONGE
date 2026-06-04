<div align="center">

# 🎓 TSI Monge - Portail Étudiant

[![React](https://img.shields.io/badge/React-19.1-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Backend-green?style=for-the-badge&logo=nodedotjs)](https://nodejs.org/)
[![Vite](https://img.shields.io/badge/Vite-7.1-purple?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-DB-4CAF50?style=for-the-badge&logo=supabase)](https://supabase.com/)

Une plateforme complète et moderne dédiée aux étudiants de la classe TSI 1.
Alliant outils académiques, organisation au quotidien et réseau social intégré pour une expérience étudiante optimale.

</div>

---

## ✨ Fonctionnalités Principales

### 📚 Outils Académiques
*   **Mathématiques & Annales** : Accès aux ressources, cours et annales.
*   **Notes & PDF** : Gestion des notes avec analyse de documents (lecture PDF, OCR via Tesseract).
*   **Forum** : Espace d'entraide et de discussion académique.

### 📅 Organisation & Vie Étudiante
*   **Emploi du Temps** : Synchronisation iCal en temps réel.
*   **Menu de la Cantine** : Consultable directement depuis l'application.
*   **Outils de Productivité** : Minuteur Pomodoro et Compte à Rebours (compétitions, examens).
*   **Météo** : Prévisions intégrées.

### 🌐 Réseau Social Intégré
*   **Flux d'actualité (Feed)** : Partage de posts, images et interactions.
*   **Reels & Explorer** : Découverte de contenu avec lecteur vidéo optimisé.
*   **Messagerie en direct** : Chat temps réel propulsé par Socket.io.
*   **Appels Audio/Vidéo** : Intégration WebRTC pour des appels fluides.
*   **Profils Personnalisés** : Suivi des utilisateurs et notifications Push.

### ⚙️ Technique & Sécurité
*   **Progressive Web App (PWA)** : Installable sur mobile/desktop avec mode hors-ligne.
*   **Authentification** : Connexion classique sécurisée (bcrypt) et Google OAuth.
*   **Panel Administrateur** : Interface de gestion complète des accès et des contenus.

---

## 🛠️ Stack Technique

L'application est divisée en deux parties : un frontend réactif et un backend performant.

### Frontend (`/src`)
*   **Cœur** : React 19, React Router 7
*   **Build & Bundling** : Vite
*   **Styling** : Tailwind CSS v4, Framer Motion (Animations fluides)
*   **Icônes & UI** : Lucide React, @dnd-kit (Drag & Drop)
*   **Fonctionnalités Avancées** : `react-player` (Vidéos), `react-image-crop` (Avatars)

### Backend (`/server`)
*   **Serveur** : Node.js, Express
*   **Base de données / Auth** : Supabase
*   **Temps réel** : Socket.io
*   **Utilitaires** : `multer` (Uploads), `node-ical` (Plannings), `pdf-parse` & `tesseract.js` (Traitement de documents)
*   **Emails & Push** : Resend, Web-Push

---

## 🚀 Installation & Démarrage

### Prérequis
*   [Node.js](https://nodejs.org/) (version 18 ou supérieure recommandée)
*   NPM ou Yarn

### 1. Cloner le projet
```bash
git clone <votre-url-de-repo>
cd TSI-MONGE
```

### 2. Configuration du Backend
Variables d'environnement nécessaires dans `/server/.env` : connexions Supabase, clés API Resend/Google, JWT secret, etc.
```bash
cd server
npm install
npm run dev
```
👉 *Le serveur backend démarre par défaut sur `http://localhost:3001`.*

### 3. Configuration du Frontend
À la racine du projet, créez un fichier `.env` si nécessaire (ex: `VITE_GOOGLE_CLIENT_ID`).
```bash
# Retour à la racine du projet
cd ..
npm install
npm run dev
```
👉 *L'application React démarre sur `http://localhost:5173`.*

---

## 📱 Progressive Web App (PWA)
L'application est conçue "Mobile First" et PWA. Elle peut être installée directement depuis le navigateur web sur votre smartphone pour une expérience native, incluant des notifications push et un mode hors-ligne.

---

<div align="center">
<i>Créé avec ❤️ pour la TSI 1 Monge</i>
</div>
