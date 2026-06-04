#!/bin/bash

# ==============================================================================
# SCRIPT DE DÉPLOIEMENT AUTOMATIQUE - TSI-MONGE
# Exécutez ce script avec la commande : sudo ./deploy.sh
# ==============================================================================

# Vérifier que le script est lancé en tant que root
if [ "$EUID" -ne 0 ]; then
  echo "⚠️ Ce script requiert des privilèges administrateur."
  echo "Relancez-le avec : sudo ./deploy.sh"
  exit 1
fi

echo "============= 🛑 1. ARRÊT DES SERVICES ============="
systemctl stop api
systemctl stop apache2
echo "Services arrêtés avec succès."

echo "============= 💾 2. SAUVEGARDE DE LA VERSION ACTUELLE ============="
cd /var/www/ || exit 1

# Trouver le numéro de sauvegarde le plus élevé existant
LATEST_NUM=$(ls -d TSI-MONGE-* 2>/dev/null | grep -Eo 'TSI-MONGE-[0-9]+' | grep -Eo '[0-9]+' | sort -n | tail -1)

if [ -z "$LATEST_NUM" ]; then
    NEXT_NUM=1
else
    NEXT_NUM=$((LATEST_NUM + 1))
fi

BACKUP_DIR="TSI-MONGE-$NEXT_NUM"

if [ -d "TSI-MONGE" ]; then
    echo "Sauvegarde du dossier existant dans /var/www/$BACKUP_DIR..."
    mv TSI-MONGE "$BACKUP_DIR"
else
    echo "Aucun dossier TSI-MONGE existant trouvé. Poursuite de l'installation."
fi

echo "============= 📥 3. CLONAGE DE LA NOUVELLE VERSION ============="
git clone --branch simple https://github.com/RudyBerthier/TSI-MONGE.git --single-branch
cd TSI-MONGE || exit 1

echo "============= 🔑 4. RESTAURATION DU FICHIER .env ============="
if [ -d "../$BACKUP_DIR" ] && [ -f "../$BACKUP_DIR/.env" ]; then
    echo "Fichier .env trouvé dans la sauvegarde. Restauration en cours..."
    cp "../$BACKUP_DIR/.env" .env
else
    echo "⚠️ ATTENTION: Aucun fichier .env trouvé dans la sauvegarde !"
    echo "Création d'un .env vide. Vous devrez le remplir manuellement."
    touch .env
fi

echo "============= 📁 4.5. RESTAURATION DES UPLOADS ============="
if [ -d "../$BACKUP_DIR/server/uploads" ]; then
    echo "Dossier uploads trouvé. Restauration en cours..."
    mkdir -p server/uploads
    cp -r "../$BACKUP_DIR/server/uploads/"* server/uploads/ 2>/dev/null || true
else
    echo "Aucun dossier uploads trouvé dans la sauvegarde."
fi

echo "============= 🔒 5. MISE A JOUR DES PERMISSIONS ============="
chmod 777 .env
chmod -R 777 server/data

# Création et permissions des dossiers d'uploads
mkdir -p server/uploads/posts
mkdir -p server/uploads/stories
chmod -R 777 server/uploads

echo "Permissions appliquées."

echo "============= 📦 6. INSTALLATION DES DÉPENDANCES ============="

# Le build frontend est fait localement car le VPS n'est pas assez puissant
# Le dossier 'dist/' doit être pushé sur GitHub avec le projet

echo "============= ⚙️ 6.5. INSTALLATION DU BACKEND ============="
cd server || exit 1
echo "Suppression du cache npm backend..."
rm -rf node_modules package-lock.json

echo "Lancement de npm install (backend)..."
npm install
cd ..

echo "============= 🚀 7. REDÉMARRAGE DES SERVICES ============="
systemctl start api
systemctl start apache2
echo "Services relancés avec succès."

echo ""
echo "✅ DÉPLOIEMENT TERMINÉ AVEC SUCCÈS ! L'application est en ligne."
echo "=============================================================================="
