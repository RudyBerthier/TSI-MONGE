#!/usr/bin/env python3
"""
Script pour recuperer l'emploi du temps depuis Pronote via authentification par token.

PREMIERE UTILISATION:
    1. Lancez: python3 -m pronotepy.create_login
    2. Suivez les instructions (scan QR code depuis Pronote mobile)
    3. Copiez le fichier credentials.json genere dans server/data/

USAGE QUOTIDIEN:
    python fetch_pronote.py

Le script utilise les tokens sauvegardes (pas besoin d'ENT a chaque fois).
"""

import json
import os
from datetime import datetime, timedelta
from pathlib import Path

try:
    import pronotepy
except ImportError:
    print("Erreur: pronotepy n'est pas installe.")
    print("Installez-le avec: pip install pronotepy")
    exit(1)

# === CONFIGURATION ===
# Chemin du fichier credentials (genere par pronotepy.create_login)
CREDENTIALS_FILE = Path(__file__).parent.parent / "data" / "pronote_credentials.json"

# Nombre de semaines a recuperer (semaine courante + X semaines suivantes)
WEEKS_TO_FETCH = 12

# Chemin du fichier de sortie JSON
OUTPUT_FILE = Path(__file__).parent.parent / "data" / "pronote_timetable.json"

# === FIN CONFIGURATION ===

JOUR_NAMES = {
    0: "Lundi",
    1: "Mardi",
    2: "Mercredi",
    3: "Jeudi",
    4: "Vendredi",
    5: "Samedi",
    6: "Dimanche"
}

def map_matiere(subject_name: str) -> str:
    """Mappe le nom de la matiere Pronote vers un nom court."""
    if not subject_name:
        return "Autre"
    s = subject_name.upper()
    # EPS doit etre avant Physique car "ED.PHYSIQUE" contient "PHYSI"
    if "EPS" in s or "SPORT" in s or "ED.PHYSIQUE" in s or "EDUCATION PHYSIQUE" in s:
        return "EPS"
    if "MATH" in s:
        return "Maths"
    if "PHYSI" in s or "CHIMIE" in s:
        return "Physique"
    if "SCIENCES IND" in s or "S.I." in s or "SII" in s or "SCIENCES DE L'ING" in s or "SC. INDUS" in s or "SCIENCES ING" in s:
        return "SI"
    if "ANGLAIS" in s or "LV1" in s:
        return "Anglais"
    if "FRANCAIS" in s or "LETTRES" in s:
        return "Francais"
    if "INFO" in s:
        return "Info"
    if "COLLE" in s:
        return "Colle"
    if "ETUDE" in s:
        return "Etude"
    if "TIPE" in s or "TX.INIT.PERSO" in s or "TRAVAUX D'INITIATIVE" in s:
        return "TIPE"
    return subject_name

def format_heure(dt: datetime) -> str:
    """Formate une datetime en heure lisible (ex: 8h, 10h30)."""
    if dt.minute == 0:
        return f"{dt.hour}h"
    return f"{dt.hour}h{dt.minute:02d}"

def adjust_course_times(start: datetime, end: datetime):
    """
    Ajuste les horaires Pronote vers les horaires reels.
    Pronote affiche 8h10 mais le cours commence vraiment a 8h.
    Recre matin: 9h50-10h, donc le cours suivant reprend a 10h.
    Durees reelles: 55 min (cours 1h) ou 1h50 (cours 2h).

    Retourne (start_hour, end_hour) en format decimal.
    """
    # Calculer la duree Pronote en minutes
    duration_minutes = (end - start).total_seconds() / 60

    pronote_hour = start.hour
    pronote_minute = start.minute
    pronote_start = pronote_hour + pronote_minute / 60

    # Determiner l'heure de debut reelle
    # Matin avant recre (8h-9h50): soustraire 10 min
    # Matin apres recre (10h+): snap a 10h si proche
    # Apres-midi: soustraire 5-10 min selon le cas

    if pronote_start < 10:
        # Avant la recre: soustraire 10 min
        real_start_minutes = pronote_hour * 60 + pronote_minute - 10
    elif pronote_start < 10.5:
        # Juste apres la recre (10h-10h30 Pronote): snap a 10h
        real_start_minutes = 600  # 10h00
    elif pronote_start < 12:
        # Fin de matinee: soustraire 10 min
        real_start_minutes = pronote_hour * 60 + pronote_minute - 10
    else:
        # Apres-midi: garder l'heure Pronote (reprise a 13h, 13h30 ou 13h55 selon le jour)
        real_start_minutes = pronote_hour * 60 + pronote_minute

    if real_start_minutes < 0:
        real_start_minutes = 0

    real_start_hour = real_start_minutes / 60

    # Duree reelle: 55 min pour 1h Pronote (~55-60 min), 1h50 pour 2h Pronote (~110-120 min)
    if duration_minutes <= 65:  # Cours de 1h
        real_duration = 55
    elif duration_minutes <= 130:  # Cours de 2h
        real_duration = 110  # 1h50
    else:  # Cours plus long (rare)
        real_duration = duration_minutes - 15  # Approximation

    real_end_hour = real_start_hour + (real_duration / 60)

    return real_start_hour, real_end_hour

def get_week_start(date: datetime) -> str:
    """Retourne la date du lundi de la semaine au format YYYY-MM-DD."""
    monday = date - timedelta(days=date.weekday())
    return monday.strftime("%Y-%m-%d")

def setup_credentials():
    """Guide l'utilisateur pour configurer les credentials."""
    print("=" * 60)
    print("CONFIGURATION INITIALE REQUISE")
    print("=" * 60)
    print()
    print("Pour configurer l'acces Pronote, suivez ces etapes:")
    print()
    print("1. Ouvrez l'app Pronote sur votre telephone")
    print("2. Allez dans Menu > Generer un QR code")
    print("3. Choisissez un code PIN (4 chiffres)")
    print("4. Dans un terminal, lancez:")
    print()
    print(f"   cd {Path(__file__).parent}")
    print("   python3 -m pronotepy.create_login")
    print()
    print("5. Scannez le QR code affiche avec l'app Pronote")
    print("   OU copiez le contenu du QR code dans le terminal")
    print()
    print(f"6. Le fichier sera cree dans: {CREDENTIALS_FILE}")
    print()
    print("7. Relancez ce script")
    print()

def main():
    # Verifier si les credentials existent
    if not CREDENTIALS_FILE.exists():
        setup_credentials()
        exit(1)

    print("Chargement des credentials...")

    try:
        credentials = json.loads(CREDENTIALS_FILE.read_text())
    except Exception as e:
        print(f"Erreur de lecture des credentials: {e}")
        setup_credentials()
        exit(1)

    print("Connexion a Pronote via token...")

    try:
        client = pronotepy.Client.token_login(**credentials)
    except Exception as e:
        print(f"Erreur de connexion: {e}")
        print()
        print("Les credentials sont peut-etre expires.")
        print("Supprimez le fichier et recommencez la configuration:")
        print(f"  rm {CREDENTIALS_FILE}")
        exit(1)

    if not client.logged_in:
        print("Echec de la connexion.")
        exit(1)

    # IMPORTANT: Sauvegarder les nouveaux credentials (le token change a chaque connexion)
    new_credentials = client.export_credentials()
    CREDENTIALS_FILE.write_text(json.dumps(new_credentials, indent=2))
    print("Credentials mis a jour.")

    print(f"Connecte en tant que: {client.info.name}")
    print(f"Etablissement: {client.info.establishment}")
    print()

    all_courses = []
    today = datetime.now()

    for week_offset in range(WEEKS_TO_FETCH):
        week_date = today + timedelta(weeks=week_offset)
        week_start = get_week_start(week_date)

        print(f"Recuperation de la semaine du {week_start}...")

        try:
            # Calculer le lundi et dimanche de la semaine (pour inclure samedi)
            monday = datetime.strptime(week_start, "%Y-%m-%d")
            sunday = monday + timedelta(days=6)
            lessons = client.lessons(monday, sunday)

            for lesson in lessons:
                # Jour de la semaine (0=lundi, ..., 5=samedi)
                day_idx = lesson.start.weekday()
                if day_idx > 5:  # Ignorer dimanche
                    continue

                # Verifier si c'est une sortie pedagogique (via le status)
                is_sortie = bool(lesson.status and "SORTIE" in lesson.status.upper())

                is_cancelled = bool(lesson.canceled) and not is_sortie

                # Ignorer les creneaux de colle (on a deja nos kholles personnalisees)
                subject = lesson.subject.name if lesson.subject else ""
                if "COLLE" in subject.upper():
                    continue

                # Ajuster les horaires (Pronote affiche 8h10 mais le cours est a 8h)
                real_start, real_end = adjust_course_times(lesson.start, lesson.end)

                # Formater l'heure d'affichage avec les heures reelles
                def format_decimal_hour(h):
                    # Arrondir aux 5 minutes les plus proches
                    total_minutes = round(h * 60)
                    # Arrondir aux 5 minutes
                    total_minutes = round(total_minutes / 5) * 5
                    hours = total_minutes // 60
                    minutes = total_minutes % 60
                    if minutes == 0:
                        return f"{hours}h"
                    return f"{hours}h{minutes:02d}"

                course = {
                    "weekStart": week_start,
                    "title": lesson.subject.name if lesson.subject else "Cours",
                    "matiere": map_matiere(lesson.subject.name if lesson.subject else ""),
                    "prof": lesson.teacher_name or "",
                    "salle": lesson.classroom or "",
                    "jour": JOUR_NAMES.get(day_idx, ""),
                    "heure": f"{format_decimal_hour(real_start)} - {format_decimal_hour(real_end)}",
                    "start": real_start,
                    "end": real_end,
                    "status": lesson.status or "",
                    "isSortie": is_sortie,
                    "isCancelled": is_cancelled,
                }
                all_courses.append(course)

        except Exception as e:
            print(f"  Erreur pour cette semaine: {e}")

    # Trier par semaine puis par jour puis par heure
    jour_order = {"Lundi": 0, "Mardi": 1, "Mercredi": 2, "Jeudi": 3, "Vendredi": 4}
    all_courses.sort(key=lambda c: (c["weekStart"], jour_order.get(c["jour"], 5), c["start"]))

    # Sauvegarder en JSON
    output_data = {
        "lastUpdated": datetime.now().isoformat(),
        "courses": all_courses
    }

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    print()
    print(f"Termine! {len(all_courses)} cours recuperes.")
    print(f"Fichier sauvegarde: {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
