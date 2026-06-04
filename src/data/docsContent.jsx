import React from 'react';

// ─── Custom Premium SVG Icons ──────────────────────────────────────────────────
const IconIntro = (<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 19.5V4.5C4 3.837 4.537 3.3 5.2 3.3H15L19 7.3V19.5H4Z" fill="url(#grad-intro)" fillOpacity="0.15" stroke="url(#grad-intro)" strokeWidth="1.5" /><path d="M15 3.3V7.3H19" stroke="url(#grad-intro)" strokeWidth="1.5" strokeLinejoin="round" /><path d="M8 10H14M8 14H12" stroke="url(#grad-intro)" strokeWidth="1.5" strokeLinecap="round" /><defs><linearGradient id="grad-intro" x1="4" y1="3" x2="19" y2="20"><stop stopColor="#60a5fa"/><stop offset="1" stopColor="#c084fc"/></linearGradient></defs></svg>);
const IconApi = (<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="18" cy="18" r="3" fill="url(#grad-api)" fillOpacity="0.15" stroke="url(#grad-api)" strokeWidth="1.5" /><circle cx="6" cy="6" r="3" fill="url(#grad-api)" fillOpacity="0.15" stroke="url(#grad-api)" strokeWidth="1.5" /><circle cx="6" cy="18" r="3" fill="url(#grad-api)" fillOpacity="0.15" stroke="url(#grad-api)" strokeWidth="1.5" /><path d="M6 9V15M9 18H15M8.1 8.1L15.9 15.9" stroke="url(#grad-api)" strokeWidth="1.5" strokeLinecap="round" /><defs><linearGradient id="grad-api" x1="3" y1="3" x2="21" y2="21"><stop stopColor="#22d3ee"/><stop offset="1" stopColor="#3b82f6"/></linearGradient></defs></svg>);
const IconFeatures = (<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2L14.645 9.355L22 12L14.645 14.645L12 22L9.355 14.645L2 12L9.355 9.355L12 2Z" fill="url(#grad-feat)" fillOpacity="0.15" stroke="url(#grad-feat)" strokeWidth="1.5" strokeLinejoin="round" /><path d="M19.5 4.5L20.5 7.5L23.5 8.5L20.5 9.5L19.5 12.5L18.5 9.5L15.5 8.5L18.5 7.5L19.5 4.5Z" fill="url(#grad-feat)" stroke="url(#grad-feat)" strokeWidth="1" strokeLinejoin="round" /><defs><linearGradient id="grad-feat" x1="2" y1="2" x2="22" y2="22"><stop stopColor="#f472b6"/><stop offset="1" stopColor="#fb923c"/></linearGradient></defs></svg>);
const IconStart = (<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4.5 16.5L3 21L7.5 19.5" stroke="url(#grad-start)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M10.5 9L15 13.5" stroke="url(#grad-start)" strokeWidth="1.5" strokeLinecap="round" /><path d="M14.5 16.5C14.5 16.5 19 14.5 20.5 9.5C21.4 6.5 21 3 21 3C21 3 17.5 2.6 14.5 3.5C9.5 5 7.5 9.5 7.5 9.5L4.5 12L5.5 18.5L12 19.5L14.5 16.5Z" fill="url(#grad-start)" fillOpacity="0.15" stroke="url(#grad-start)" strokeWidth="1.5" strokeLinejoin="round" /><defs><linearGradient id="grad-start" x1="3" y1="3" x2="21" y2="21"><stop stopColor="#facc15"/><stop offset="1" stopColor="#f97316"/></linearGradient></defs></svg>);
const IconArchitecture = (<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2L22 7L12 12L2 7L12 2Z" fill="url(#grad-arch)" fillOpacity="0.2" stroke="url(#grad-arch)" strokeWidth="1.5" strokeLinejoin="round" /><path d="M2 12L12 17L22 12" stroke="url(#grad-arch)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 17L12 22L22 17" stroke="url(#grad-arch)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><defs><linearGradient id="grad-arch" x1="2" y1="2" x2="22" y2="22"><stop stopColor="#818cf8"/><stop offset="1" stopColor="#3b82f6"/></linearGradient></defs></svg>);
const IconSchool = (<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 4L2 9L12 14L22 9L12 4Z" fill="url(#grad-school)" fillOpacity="0.15" stroke="url(#grad-school)" strokeWidth="1.5" strokeLinejoin="round" /><path d="M19 10.5V17L12 20L5 17V10.5" stroke="url(#grad-school)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><defs><linearGradient id="grad-school" x1="2" y1="4" x2="22" y2="20"><stop stopColor="#6366f1"/><stop offset="1" stopColor="#8b5cf6"/></linearGradient></defs></svg>);
const IconLife = (<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M18 8C18 10.2091 16.2091 12 14 12H10C7.79086 12 6 10.2091 6 8C6 5.79086 7.79086 4 10 4H14C16.2091 4 18 5.79086 18 8Z" fill="url(#grad-life)" fillOpacity="0.15" stroke="url(#grad-life)" strokeWidth="1.5"/><path d="M18 6.5C19.6569 6.5 21 7.84315 21 9.5C21 11.1569 19.6569 12.5 18 12.5" stroke="url(#grad-life)" strokeWidth="1.5" strokeLinecap="round" /><defs><linearGradient id="grad-life" x1="6" y1="4" x2="21" y2="12"><stop stopColor="#fbbf24"/><stop offset="1" stopColor="#ea580c"/></linearGradient></defs></svg>);
const IconSocial = (<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" fill="url(#grad-soc)" fillOpacity="0.1" stroke="url(#grad-soc)" strokeWidth="1.5" /><path d="M3.6 9H20.4M3.6 15H20.4" stroke="url(#grad-soc)" strokeWidth="1.5" strokeLinecap="round" /><path d="M12 3C14.5 6 15.5 8.5 15.5 12C15.5 15.5 14.5 18 12 21C9.5 18 8.5 15.5 8.5 12C8.5 8.5 9.5 6 12 3Z" stroke="url(#grad-soc)" strokeWidth="1.5" strokeLinejoin="round" /><defs><linearGradient id="grad-soc" x1="3" y1="3" x2="21" y2="21"><stop stopColor="#a78bfa"/><stop offset="1" stopColor="#d946ef"/></linearGradient></defs></svg>);
const IconSettings = (<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" fill="url(#grad-set)" fillOpacity="0.15" stroke="url(#grad-set)" strokeWidth="1.5"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="url(#grad-set)" strokeWidth="1.5"/><defs><linearGradient id="grad-set" x1="2" y1="2" x2="22" y2="22"><stop stopColor="#9ca3af"/><stop offset="1" stopColor="#4b5563"/></linearGradient></defs></svg>);

// Items icons mappings
const iStart = IconStart;
const iArch = IconArchitecture;
const iPronote = IconSchool;
const iCollo = IconSchool;
const iMaths = IconSchool;
const iNotes = IconApi;
const iCantine = IconLife;
const iEvents = IconLife;
const iPlaces = IconLife;
const iAuth = IconFeatures;
const iForum = IconSocial;
const iChat = IconSocial;
const iGames = IconSocial;
const iSpotify = IconSocial;
const iLogs = IconSettings;
const iPush = IconSettings;
const iBugs = IconSettings;

// ─── Sections ────────────────────────────────────────────────────────────────
export const DOC_SECTIONS = [
  {
    id: 'intro',
    label: 'Introduction',
    icon: IconIntro,
    items: [
      { id: 'getting-started', label: 'Pour Commencer', icon: iStart },
      { id: 'architecture', label: 'Architecture', icon: iArch },
    ]
  },
  {
    id: 'school',
    label: 'Pédagogie',
    icon: IconSchool,
    items: [
      { id: 'api-pronote', label: 'Pronote', icon: iPronote },
      { id: 'api-colloscope', label: 'Colloscope & Khôlles', icon: iCollo },
      { id: 'api-maths', label: 'Mathématiques', icon: iMaths },
      { id: 'api-notes', label: 'Notes partagées', icon: iNotes },
    ]
  },
  {
    id: 'student-life',
    label: 'Vie Étudiante',
    icon: IconLife,
    items: [
      { id: 'api-cantine', label: 'Cantine', icon: iCantine },
      { id: 'api-events', label: 'Évènements & Sondages', icon: iEvents },
      { id: 'api-places', label: 'Lieux & Liens', icon: iPlaces },
    ]
  },
  {
    id: 'social',
    label: 'Social & Jeux',
    icon: IconSocial,
    items: [
      { id: 'api-auth', label: 'Authentification & Users', icon: iAuth },
      { id: 'api-forum', label: 'Forum', icon: iForum },
      { id: 'feat-chat', label: 'Chat & Médias', icon: iChat },
      { id: 'api-spotify', label: 'Musique (Spotify)', icon: iSpotify },
      { id: 'feat-games', label: 'Jeux & WebSockets', icon: iGames },
    ]
  },
  {
    id: 'admin',
    label: 'Administration',
    icon: IconSettings,
    items: [
      { id: 'api-admin', label: 'Configuration & Logs', icon: iLogs },
      { id: 'api-push', label: 'Notifications Push', icon: iPush },
      { id: 'api-bugs', label: 'Rapports de Bug', icon: iBugs },
    ]
  }
];

// ─── Contenu ─────────────────────────────────────────────────────────────────
export const DOC_CONTENT = {
  // === INTRO ===
  'getting-started': {
    markdown: `
# Bienvenue sur la Documentation TSI Monge

La documentation exhaustive recensant l'intégralité du backend (Routes, Controllers, WebSockets).

## Installation Rapide
\`\`\`bash
git clone https://github.com/votre-repo/tsi-monge.git
cd tsi-monge
npm install
npm run dev
\`\`\`
`
  },
  'architecture': {
    markdown: `
# Architecture du projet

- \`server/\` - Code back-end développé avec Node.js, Express, et Socket.io.
- \`src/\` - Code front-end structuré en grandes thématiques avec React
- \`public/\` - assets
`
  },

  // === PÉDAGOGIE ===
  'api-pronote': {
    markdown: `# API Pronote\n\nModule de scraping hautement optimisé (Puppeteer) avec cache redis.`,
    endpoints: [
      { 
        method: 'POST', 
        path: '/api/pronote/auth', 
        summary: 'Authentification Pronote', 
        description: 'Authentifie et stocke un cookie de session temporaire.',
        body: [{name: 'username', type: 'string', required: true}, {name: 'password', type: 'string', required: true}],
        example: `fetch('/api/pronote/auth', {\n  method: 'POST',\n  body: JSON.stringify({username: 'r.bertaud', password: '***'})\n})`,
        responses: { '200': { label: 'Session créée', example: { success: true, message: 'Connecté' } } }
      },
      { 
        method: 'GET', 
        path: '/api/pronote/timetable', 
        summary: 'Emploi du temps de la semaine',
        description: 'Retourne la liste des cours de la semaine',
        query: [{ name: 'date', type: 'string', required: false, description: 'Format YYYY-MM-DD' }],
        example: `fetch('/api/pronote/timetable?date=2026-03-30')`,
        responses: { '200': { label: 'Succès', example: { courses: [{ subject: 'Maths', room: 'B204', start: '8:00', end: '10:00' }] } } }
      },
      { 
        method: 'GET', 
        path: '/api/pronote/homeworks', 
        summary: 'Devoirs à faire',
        description: 'Devoirs non complétés assignés aux cours futurs.',
        example: `fetch('/api/pronote/homeworks')`,
        responses: { '200': { label: 'Liste de devoirs', example: { homeworks: [{ subject: 'Physique', description: 'Exo page 42' }] } } }
      },
      { 
        method: 'GET', 
        path: '/api/pronote/grades', 
        summary: 'Relevé de notes',
        description: 'Renvoie toutes les notes publiées du semestre actif',
        responses: { '200': { label: 'Succès', example: { grades: [{ subject: 'Informatique', score: '18/20', average: '12.5/20' }] } } }
      },
      { 
        method: 'GET', 
        path: '/api/pronote/absences', 
        summary: 'Absences et retards',
        description: 'Historique des absences et de leurs justifications.',
        responses: { '200': { label: 'Succès', example: { absences: [{ date: '2026-03-01', justified: true }] } } } 
      }
    ]
  },
  'api-colloscope': {
    markdown: `# API Colloscope\n\nGestion algorithmique du système de créneaux de colles (Khôlles).`,
    endpoints: [
      { 
        method: 'GET', 
        path: '/api/colloscope/schedule', 
        summary: 'Récupère le planning exhaustif',
        description: 'Le tableau des khôlles de toutes les classes',
        example: `fetch('/api/colloscope/schedule')`,
        responses: { '200': { label: 'Généré avec succès', example: { schedule: [{ date: '2026-04-02', subject: 'Maths', group: 'G1', teacher: 'M. Dubois' }] } } }
      },
      { 
        method: 'POST', 
        path: '/api/colloscope/swap', 
        summary: 'Demande d\'échange de créneau entre deux étudiants', 
        auth: true,
        body: [{ name: 'colleId', type: 'string', required: true }, { name: 'targetUserId', type: 'string', required: true }],
        example: `fetch('/api/colloscope/swap', { method: 'POST', body: JSON.stringify({ colleId: '12', targetUserId: '45' }) })`,
        responses: { '201': { label: 'Demande envoyée' } }
      },
      { 
        method: 'GET', 
        path: '/api/kholle-requests', 
        summary: 'Liste des requêtes anti-spam pour les Khôlles',
        description: 'Retourne toutes les requêtes en attente d\'échange.',
        responses: { '200': { label: 'Liste renvoyée' } }
      },
      { 
        method: 'POST', 
        path: '/api/kholle-requests/approve', 
        summary: 'Approbation prof', 
        admin: true,
        body: [{ name: 'requestId', type: 'string', required: true }],
        responses: { '200': { label: 'Validé' } }
      },
    ]
  },
  'api-maths': {
    markdown: `# API Mathématiques\n\nCours et système de scraping de contenu mathématiques (exercices, PDF).`,
    endpoints: [
      { 
        method: 'GET', 
        path: '/api/maths/chapters', 
        summary: 'Liste les chapitres de cours',
        description: 'Récupère tous les cours scrapés depuis la source Professeur',
        responses: { '200': { label: 'Succès', example: { chapters: [{ id: 1, title: 'Espaces Vectoriels', pdfUrl: '/docs/maths/chap1.pdf' }] } } }
      },
      { 
        method: 'GET', 
        path: '/api/maths/exercises', 
        summary: 'Exercices générés ou scrapés',
        query: [{ name: 'chapterId', type: 'string', required: false }],
        responses: { '200': { label: 'Succès' } }
      },
      { 
        method: 'POST', 
        path: '/api/maths/progress', 
        summary: 'Marquer un exercice comme terminé', 
        auth: true,
        body: [{ name: 'exerciseId', type: 'string', required: true }, { name: 'status', type: 'string', required: true }],
        responses: { '200': { label: 'Mise à jour ok' } }
      }
    ]
  },
  'api-notes': {
    markdown: `# API Notes partagées\n\nSystème de cloud interne (Documents, Markdown) collaboratif.`,
    endpoints: [
      { 
        method: 'GET', 
        path: '/api/notes', 
        summary: 'Liste tous les documents de l\'utilisateur', 
        auth: true,
        responses: { '200': { label: 'Succès', example: [{ id: 'xx', title: 'Cours Thermo', updatedAt: '2026-03-29' }] } }
      },
      { 
        method: 'POST', 
        path: '/api/notes', 
        summary: 'Créer un nouveau document markdown', 
        auth: true,
        body: [{ name: 'title', type: 'string', required: true }, { name: 'content', type: 'string', required: true }],
        responses: { '201': { label: 'Créé', example: { id: 'uuid', title: '...' } } }
      },
      { 
        method: 'PUT', 
        path: '/api/notes/:id', 
        summary: 'Mettre à jour un document', 
        auth: true,
        params: [{ name: 'id', type: 'string', required: true, description: 'Document UUID' }],
        body: [{ name: 'title', type: 'string', required: false }, { name: 'content', type: 'string', required: true }],
        responses: { '200': { label: 'Mis à jour' } }
      },
      { 
        method: 'DELETE', 
        path: '/api/notes/:id', 
        summary: 'Supprimer un document', 
        auth: true,
        params: [{ name: 'id', type: 'string', required: true }],
        responses: { '200': { label: 'Supprimé' } }
      },
      { 
        method: 'POST', 
        path: '/api/notes/:id/share', 
        summary: 'Rendre public ou partager à un élève', 
        auth: true,
        params: [{ name: 'id', type: 'string', required: true }],
        body: [{ name: 'public', type: 'boolean', required: true }],
        responses: { '200': { label: 'Succès' } }
      }
    ]
  },

  // === VIE ÉTUDIANTE ===
  'api-cantine': {
    markdown: `# API Cantine\n\nExtraction OCR des menus.`,
    endpoints: [
      { 
        method: 'GET', 
        path: '/api/cantine/menu', 
        summary: 'Menu de la semaine formatté',
        description: 'Réponse générée via Tesseract OCR depuis le PDF du RU',
        example: `fetch('/api/cantine/menu')`,
        responses: { '200': { label: 'Succès', example: { Lundi: { midi: [{ category: 'Plats', title: 'Poisson' }] } } } }
      },
      { 
        method: 'GET', 
        path: '/api/cantine/avis', 
        summary: 'Flux avis',
        description: 'Les évaluations des élèves sur le repas du jour',
        responses: { '200': { label: 'Flux JSON', example: [{ note: 5, pseudo: 'rudy' }] } }
      },
      { 
        method: 'POST', 
        path: '/api/cantine/avis', 
        summary: 'Poster un avis', 
        auth: true,
        body: [{ name: 'note', type: 'number', required: true }, { name: 'commentaire', type: 'string', required: false }],
        responses: { '201': { label: 'Créé' } }
      },
      { 
        method: 'POST', 
        path: '/api/cantine/menu-upload', 
        summary: 'Force OCR trigger', 
        admin: true,
        description: 'Endpoint requérant un multipart/form-data contenant le PDF',
        responses: { '200': { label: 'Upload complet et processing OCR en cours...' } }
      }
    ]
  },
  'api-events': {
    markdown: `# API Évènements et Sondages\n\nAgenda des soirées et votes du BDE.`,
    endpoints: [
      { 
        method: 'GET', 
        path: '/api/events', 
        summary: 'Liste des évènements à venir',
        responses: { '200': { label: 'Succès', example: [{ id: 1, title: 'Soirée BDE', date: '2026-04-10', description: 'Grosse soirée' }] } }
      },
      { 
        method: 'POST', 
        path: '/api/events', 
        summary: 'Créer un event BDE', 
        admin: true,
        body: [{ name: 'title', type: 'string' }, { name: 'date', type: 'string' }],
        responses: { '201': { label: 'Créé' } }
      },
      { 
        method: 'GET', 
        path: '/api/sondages', 
        summary: 'Liste des sondages ouverts',
        responses: { '200': { label: 'Succès', example: [{ id: 1, question: 'Pizza ou Tacos ?', options: [{ id: 'a', text: 'Pizza' }, { id: 'b', text: 'Tacos' }] }] } }
      },
      { 
        method: 'POST', 
        path: '/api/sondages/vote', 
        summary: 'Voter à un sondage', 
        auth: true,
        body: [{ name: 'sondageId', type: 'string' }, { name: 'optionId', type: 'string' }],
        responses: { '200': { label: 'Vote pris en compte' } }
      }
    ]
  },
  'api-places': {
    markdown: `# Lieux et Liens utiles\n\nEndpoints statiques pour la Map ou le Dashboard.`,
    endpoints: [
      { 
        method: 'GET', 
        path: '/api/places', 
        summary: 'Lieux référencés (bars, révisions)',
        responses: { '200': { label: 'Succès', example: [{ name: 'Barberousse', type: 'bar', coordinates: [45.188, 5.724] }] } }
      },
      { 
        method: 'GET', 
        path: '/api/links', 
        summary: 'Liens utiles TSI',
        responses: { '200': { label: 'Succès', example: [{ name: 'Site Moodle', url: 'https://moodle...' }] } }
      }
    ]
  },

  // === SOCIAL ===
  'api-auth': {
    markdown: `# API Auth & Users`,
    endpoints: [
      { 
        method: 'POST', 
        path: '/api/auth/login', 
        summary: 'Login JWT',
        description: 'Retourne un token Bearer valide pour toutes les requêtes auth: true.',
        body: [{ name: 'username', type: 'string', required: true }, { name: 'password', type: 'string', required: true }],
        example: `curl -X POST https://api/auth/login -d '{"username": "admin", "password": "x"}'`,
        responses: { '200': { label: 'Succès', example: { success: true, token: 'ey...', user: { username: 'admin' } } } }
      },
      { 
        method: 'POST', 
        path: '/api/auth/register', 
        summary: 'Inscription',
        body: [{ name: 'username', type: 'string' }, { name: 'password', type: 'string' }, { name: 'email', type: 'string' }],
        responses: { '201': { label: 'Compte créé' } }
      },
      { 
        method: 'POST', 
        path: '/api/auth/google', 
        summary: 'OAuth Google',
        body: [{ name: 'credential', type: 'string', description: 'Le token d identité Google' }],
        responses: { '200': { label: 'Connexion effectuée' } }
      },
      { 
        method: 'POST', 
        path: '/api/auth/forgot-password', 
        summary: 'Mot de passe oublié',
        body: [{ name: 'email', type: 'string' }],
        responses: { '200': { label: 'Email envoyé si correspondant.' } }
      },
      { 
        method: 'GET', 
        path: '/api/users', 
        summary: 'Annuaire global',
        query: [{ name: 'search', type: 'string', required: false }],
        responses: { '200': { label: 'Liste des élèves', example: [{ id: '1', username: 'Alex' }] } }
      },
      { 
        method: 'GET', 
        path: '/api/users/explore', 
        summary: 'Matchs amis algorithme Swipe',
        responses: { '200': { label: 'Flux d explorateur JSON' } }
      }
    ]
  },
  'api-forum': {
    markdown: `# Le Forum`,
    endpoints: [
      { 
        method: 'GET', 
        path: '/api/forum/categories', 
        summary: 'Catégories du forum',
        responses: { '200': { label: 'Succès', example: [{ id: 'general', name: 'Général', icon: '💬' }] } }
      },
      { 
        method: 'GET', 
        path: '/api/forum/posts', 
        summary: 'Feed complet',
        query: [{ name: 'category', type: 'string', required: false }, { name: 'page', type: 'number', required: false }],
        responses: { '200': { label: 'Paginé', example: { posts: [{ id: 'abc', title: 'Aide exo 4', author: 'rudy' }], totalPages: 5 } } }
      },
      { 
        method: 'POST', 
        path: '/api/forum/posts', 
        summary: 'Nouveau Thread', 
        auth: true,
        body: [{ name: 'title', type: 'string' }, { name: 'content', type: 'string' }, { name: 'categoryId', type: 'string' }],
        responses: { '201': { label: 'Créé' } }
      },
      { 
        method: 'POST', 
        path: '/api/forum/:postId/reply', 
        summary: 'Répondre', 
        auth: true,
        params: [{ name: 'postId', type: 'string', required: true }],
        body: [{ name: 'content', type: 'string', required: true }],
        responses: { '200': { label: 'Message ajouté' } }
      },
      { 
        method: 'POST', 
        path: '/api/forum/:postId/like', 
        summary: 'Liker un thread', 
        auth: true,
        params: [{ name: 'postId', type: 'string', required: true }],
        responses: { '200': { label: 'Like mis à jour' } }
      }
    ]
  },
  'feat-chat': {
    markdown: `# Chat et Upload\n\nMessagerie WebSocket et stockage media S3/Local.`,
    endpoints: [
      { 
        method: 'POST', 
        path: '/api/chat/upload', 
        summary: 'Upload de fichier / image chat', 
        auth: true,
        description: 'Requête multipart form contenant le blob image. Retourne l\'URL CDN.',
        responses: { '200': { label: 'Upload Success', example: { url: '/uploads/chat/img_123.jpg' } } }
      },
      { 
        method: 'POST', 
        path: '/api/voice/upload', 
        summary: 'Upload buffers audio WebRTC', 
        auth: true,
        description: 'Upload de notes vocales encodées',
        responses: { '200': { label: 'Succès', example: { url: '/uploads/voice/audio_123.ogg' } } }
      },
      { 
        method: 'WS', 
        path: 'join_chat', 
        summary: 'Abonnement room socket',
        description: 'Emit() via Socket.io pour rejoindre le salon. Vous commencerez à recevoir les receive_message.',
        example: `socket.emit('join_chat', { roomId: 'general_room' })`
      },
      { 
        method: 'WS', 
        path: 'send_message', 
        summary: 'Transmission temps réel',
        description: 'Emit() via Socket.io pour envoyer un message aux autres clients.',
        example: `socket.emit('send_message', { roomId: 'general_room', text: 'Hello' })`
      }
    ]
  },
  'api-spotify': {
    markdown: `# Module Musical Spotify\n\nIntégration d'écoute.`,
    endpoints: [
      { 
        method: 'GET', 
        path: '/api/spotify/search', 
        summary: 'Recherche de tracks Spotify',
        query: [{ name: 'q', type: 'string', required: true }],
        responses: { '200': { label: 'Résultats musicaux', example: { items: [{ name: 'Daft Punk', uri: 'spotify:track:xxx' }] } } }
      },
      { 
        method: 'GET', 
        path: '/api/spotify/lyrics', 
        summary: 'Extraction lyrics Jiosaavn',
        query: [{ name: 'trackId', type: 'string', required: true }],
        responses: { '200': { label: 'Lyrics text', example: { lyrics: '[00:01.00] Around the world...' } } }
      }
    ]
  },
  'feat-games': {
    markdown: `# Module E-Sport / Jeux`,
    endpoints: [
      { 
        method: 'GET', 
        path: '/api/games/leaderboard', 
        summary: 'Classement ELO Echecs/etc',
        responses: { '200': { label: 'Top joueurs', example: [{ username: 'rudy', elo: 1800 }] } }
      },
      { 
        method: 'POST', 
        path: '/api/games/matchmake', 
        summary: 'Rechercher une partie', 
        auth: true,
        body: [{ name: 'gameType', type: 'string', required: true, description: '"chess" ou autre' }],
        responses: { '200': { label: 'Recherche initiée (WebSocket relai)' } }
      },
      { 
        method: 'WS', 
        path: 'game_move', 
        summary: 'Action jeu webSocket', 
        auth: true,
        description: 'Transmet le mouvement Echecs {from: "e2", to: "e4"}',
        example: `socket.emit('game_move', { roomId: 'room_123', move: { from: 'e2', to: 'e4' } })`
      }
    ]
  },

  // === ADMIN ===
  'api-admin': {
    markdown: `# API Administration et Logs\n\nMonitoring global du serveur NodeJS.`,
    endpoints: [
      { 
        method: 'GET', 
        path: '/api/admin/logs', 
        summary: 'Stream des logs système pm2', 
        admin: true,
        responses: { '200': { label: 'Fichier log texte' } }
      },
      { 
        method: 'GET', 
        path: '/api/settings', 
        summary: 'Récupère la configuration globale JSON',
        responses: { '200': { label: 'Settings', example: { allowRegistration: true, maintenanceMode: false } } }
      },
      { 
        method: 'PUT', 
        path: '/api/settings', 
        summary: 'Met à jour les flags dynamiques', 
        admin: true,
        body: [{ name: 'settings', type: 'object', required: true }],
        responses: { '200': { label: 'Mis à jour' } }
      }
    ]
  },
  'api-push': {
    markdown: `# Serveur Push\n\nWeb Push VAPID PWA Notifications.`,
    endpoints: [
      { 
        method: 'POST', 
        path: '/api/push/subscribe', 
        summary: 'Souscrire son client Chrome/Safari', 
        auth: true,
        body: [{ name: 'subscription', type: 'object', required: true }],
        responses: { '200': { label: 'Enregistré en BDD' } }
      },
      { 
        method: 'POST', 
        path: '/api/push/send', 
        summary: 'Diffuser un broadcast global', 
        admin: true,
        body: [{ name: 'title', type: 'string', required: true }, { name: 'body', type: 'string', required: true }],
        responses: { '200': { label: 'Broadcast Envoyé' } }
      }
    ]
  },
  'api-bugs': {
    markdown: `# Bug Reports et Tickets`,
    endpoints: [
      { 
        method: 'POST', 
        path: '/api/bug-reports', 
        summary: 'Déclarer un bug ou erreur 500 silencieuse',
        body: [{ name: 'title', type: 'string', required: true }, { name: 'description', type: 'string', required: true }],
        responses: { '201': { label: 'Ticket créé' } }
      },
      { 
        method: 'GET', 
        path: '/api/bug-reports', 
        summary: 'Lister les tickets P1 P2 P3', 
        admin: true,
        responses: { '200': { label: 'Liste', example: [{ id: 'xx', status: 'open', title: 'Le chat crash' }] } }
      },
      { 
        method: 'PATCH', 
        path: '/api/bug-reports/:id', 
        summary: 'Clore ou tagger', 
        admin: true,
        params: [{ name: 'id', type: 'string', required: true }],
        body: [{ name: 'status', type: 'string', required: true }],
        responses: { '200': { label: 'Ticket archivé' } }
      }
    ]
  }
};
