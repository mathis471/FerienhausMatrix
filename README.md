# Ferienhaus Bewertung

Eine lokale Browser-App zur Bewertung und zum Vergleich von Ferienhäusern.

## Eigenschaften

- Kein Login
- Keine Cloud und keine Synchronisation
- Speicherung lokal im Browser via `localStorage`
- Tatsächliche Werte bleiben sichtbar
- Dynamische Bewertungsmatrix
- Kriterien nachträglich hinzufügen/löschen
- Frei einstellbare Gewichtungen
- Ampelsystem
- Automatische Punkte- und Gesamtbewertung
- Suche und Sortierung
- Detailansicht
- Vollständiges Backup als JSON
- Bewertungsmatrix separat exportieren/importieren
- Responsive, Liquid-Glass-inspiriertes Design

## Lokal testen

`index.html` kann grundsätzlich direkt geöffnet werden. Für eine lokale Entwicklung ist ein kleiner Webserver besser, z. B.:

```bash
python -m http.server 8000
```

Danach `http://localhost:8000` öffnen.

## GitHub Pages

1. Repository auf GitHub erstellen.
2. Alle Dateien dieses Projekts hochladen.
3. In GitHub: **Settings → Pages**
4. Bei **Build and deployment** `Deploy from a branch` wählen.
5. Branch `main` und Ordner `/ (root)` auswählen.
6. Speichern.

Nach dem Deployment ist die App über deine GitHub-Pages-Adresse erreichbar.

## Wichtig zur Datensicherheit

Die Daten liegen ausschließlich im Browser des jeweiligen Geräts. Löscht du die Browserdaten, können die lokalen Daten verloren gehen. Deshalb regelmäßig über **Export** eine JSON-Sicherung erstellen.

## Bewertungslogik

Für numerische Kriterien:
- 🟢 = 10 Punkte
- 🟡 = 7 Punkte
- 🔴 = 4 Punkte
- schlechter als rot = 0 Punkte

Bei Ja/Nein:
- Ja = 10
- Nein = 0

Die Punkte werden entsprechend der Gewichtung zu einer Gesamtbewertung von 0–10 verrechnet.

### Fahrtzeit

Die Eingabe erfolgt in **Minuten**, z. B. `165` für 2:45 h. In der Übersicht wird automatisch `2:45 h` angezeigt.
