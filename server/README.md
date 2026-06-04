# Backend TSI Monge - Sauvegarde des Liens

## Démarrage rapide

Le serveur backend est déjà configuré et tourne normalement sur le port 3001.

### Pour démarrer le serveur :

```bash
cd server
npm start
```

Le serveur démarre automatiquement sur `http://localhost:3001`

## Routes API

### GET `/api/links` - Récupérer toutes les cartes
- **Accès** : Public
- **Authentification** : Non requise

### POST `/api/links` - Sauvegarder toutes les cartes
- **Accès** : Protégé
- **Authentification** : Requise
- **Header requis** : `x-admin-password: Pa$$word`

**Exemple de requête sécurisée :**
```bash
curl -X POST http://localhost:3001/api/links \
  -H "Content-Type: application/json" \
  -H "x-admin-password: Pa$$word" \
  -d '{"links": [...]}'
```

## Sécurité

🔒 **La route POST est protégée par authentification**

- Seules les modifications depuis le panel admin (avec mot de passe) sont autorisées
- Sans le header `x-admin-password` correct, les modifications sont rejetées (erreur 401)
- Le mot de passe par défaut est `Pa$$word` (identique au panel admin)

Pour changer le mot de passe, modifiez la constante `AUTH_PASSWORD` dans `server/routes/links.js`

## Stockage des données

Les données sont sauvegardées dans `server/data/links.json`

Ce fichier est créé automatiquement au premier démarrage avec les données par défaut.

## Notes

- Les modifications dans le panel admin sont automatiquement sauvegardées
- Les données persistent même après redémarrage du serveur
- Le fichier JSON peut être édité manuellement si nécessaire
