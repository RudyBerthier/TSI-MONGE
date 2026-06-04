# Forum TSI-1

Un forum complet pour l'entraide et les discussions de classe.

## ✨ Fonctionnalités

### 📝 Création de Sujets
- Créer des sujets de discussion
- Choisir une catégorie parmi : Maths, Physique, SI, Anglais, Info, Français, Général, Vie de classe
- Ajouter un titre et une description
- Attribution automatique d'un nom d'utilisateur (sauvegardé dans localStorage)

### 💬 Système de Réponses
- Répondre à n'importe quel sujet
- Voir toutes les réponses avec auteur et date
- Interface conversationnelle claire

### 🔍 Recherche et Filtres
- **Recherche textuelle** : rechercher dans les titres, contenus et auteurs
- **Filtre par catégorie** : afficher seulement une matière
- **Tri** :
  - Plus récents
  - Plus populaires (par likes)
  - Plus de réponses

### 👍 Système de Likes
- Liker les sujets pour montrer son appréciation
- Compteur de likes visible

### 📊 Statistiques
- Nombre total de sujets
- Nombre total de réponses
- Nombre de participants actifs

### 🎨 Interface
- **Badges colorés** par catégorie
- **Avatars** générés avec initiales
- **Responsive** : optimisé mobile et desktop
- **Dates relatives** : "Il y a 2h", "Il y a 3j"
- **Animations** : hover, active states

## 🎯 Catégories

Chaque catégorie a sa couleur distinctive :
- 🔵 **Maths** - Bleu
- 🟢 **Physique** - Émeraude
- 🟠 **SI** - Orange
- 🟣 **Anglais** - Violet
- 🔷 **Info** - Cyan
- 🩷 **Français** - Rose
- ⚪ **Général** - Gris
- 🟡 **Vie de classe** - Ambre

## 🚀 Utilisation

### Créer un sujet
1. Cliquer sur "Nouveau sujet"
2. Entrer votre nom (sera sauvegardé)
3. Choisir une catégorie
4. Ajouter un titre et votre message
5. Cliquer sur "Créer le sujet"

### Répondre
1. Cliquer sur un sujet dans la liste
2. Lire le sujet et les réponses existantes
3. Écrire votre réponse en bas
4. Cliquer sur "Envoyer la réponse"

### Rechercher
- Utiliser la barre de recherche en haut
- Sélectionner une catégorie dans le menu déroulant
- Trier par pertinence

## 📱 Mobile-Friendly

Le forum est entièrement optimisé pour mobile :
- Navigation tactile fluide
- Cartes adaptatives
- Boutons larges et accessibles
- Scroll infini optimisé

## 🔧 API Endpoints

### GET `/api/forum/topics`
Récupère tous les sujets

### GET `/api/forum/topics/:id`
Récupère un sujet spécifique avec ses réponses

### POST `/api/forum/topics`
Crée un nouveau sujet
```json
{
  "title": "Mon titre",
  "category": "maths",
  "content": "Mon message",
  "author": "Prénom"
}
```

### POST `/api/forum/topics/:id/replies`
Ajoute une réponse à un sujet
```json
{
  "content": "Ma réponse",
  "author": "Prénom"
}
```

### POST `/api/forum/topics/:id/like`
Like un sujet (incrémente le compteur)

### DELETE `/api/forum/topics/:id`
Supprime un sujet

### DELETE `/api/forum/topics/:topicId/replies/:replyId`
Supprime une réponse

## 💾 Stockage

Les données sont stockées dans `/server/data/forum.json` avec la structure :

```json
{
  "topics": [
    {
      "id": "unique-id",
      "title": "Titre du sujet",
      "category": "maths",
      "content": "Contenu du message",
      "author": "Prénom",
      "createdAt": "2026-02-05T10:30:00.000Z",
      "likes": 5,
      "replies": [
        {
          "id": "reply-id",
          "content": "Contenu de la réponse",
          "author": "Prénom",
          "createdAt": "2026-02-05T11:00:00.000Z"
        }
      ]
    }
  ]
}
```

## 🎨 Design System

### Couleurs des catégories
Chaque catégorie utilise un système cohérent :
- `bg` : Couleur de fond
- `text` : Couleur du texte
- `border` : Couleur de bordure
- `dot` : Couleur du point indicateur

### Composants
- **TopicCard** : Carte de sujet dans la liste
- **TopicDetail** : Vue détaillée d'un sujet
- **ReplyCard** : Carte de réponse
- **NewTopicModal** : Modal de création de sujet
- **SearchBar** : Barre de recherche avec filtres
- **StatsBar** : Barre de statistiques

## 🔮 Améliorations Futures

Idées pour enrichir le forum :
- [ ] Système de modération
- [ ] Épingler des sujets importants
- [ ] Marquer comme résolu
- [ ] Notifications de nouvelles réponses
- [ ] Mentions @utilisateur
- [ ] Upload d'images/fichiers
- [ ] Markdown dans les messages
- [ ] Tags personnalisés
- [ ] Mode sombre
- [ ] Export de discussions

## 🐛 Debugging

Si un problème survient :
1. Vérifier que le serveur est lancé
2. Vérifier `/server/data/forum.json` existe
3. Regarder la console navigateur (F12)
4. Vérifier les logs serveur

## 📝 Notes

- Les noms d'utilisateur sont stockés en **localStorage**
- Pas de système d'authentification (tous peuvent poster)
- Les données persistent dans le fichier JSON
- Pas de limite de caractères pour l'instant
