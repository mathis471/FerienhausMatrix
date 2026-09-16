# FerienhausMatrix

Eine lokale, installierbare PWA zur Bewertung und zum Vergleich von Ferienhäusern.

## Funktionen
- lokale Speicherung im Browser, kein Login und keine Cloud-Synchronisierung
- installierbare PWA für Desktop und Smartphone
- Offline-Cache über Service Worker
- echte Werte bleiben sichtbar und werden zusätzlich mit Punkten bewertet
- Verkehrslampen für gut / mittel / schlecht
- frei editierbare Kriterien, Gewichtungen und Schwellenwerte
- dynamische Kriterien mit Zahl, Zeit, Währung und Ja/Nein
- Suche, Sortierung, Ranking und Detailansicht
- vollständiges JSON-Backup und Matrix-Export/Import

## Wichtige Hinweise
Die App benötigt für Service Worker/PWA auf einem veröffentlichten Server HTTPS. GitHub Pages erfüllt das.

Fahrtzeit wird intern in Minuten eingegeben, z. B. `165` für `2:45 h`.

## GitHub Pages
1. Inhalt dieses Ordners in dein Repository hochladen.
2. `index.html` muss direkt im Repository-Root liegen.
3. GitHub: Settings → Pages.
4. Bei Source: **Deploy from a branch**.
5. Branch: `main`.
6. Folder: `/ (root)`.
7. Save.
8. Nach der Veröffentlichung die angezeigte Pages-Adresse öffnen.

## Installation
- Android/Chrome/Edge: Auf der Website erscheint bei unterstützten Browsern „App installieren“ bzw. das Installationssymbol.
- iPhone/iPad: Safari öffnen → Teilen → „Zum Home-Bildschirm“.
- Desktop: Chrome/Edge können die PWA über das Installationssymbol in der Adressleiste anbieten.

## Daten
Alle Ferienhausdaten liegen im Local Storage dieses Browsers. Vor dem Löschen von Browserdaten unbedingt ein Backup exportieren.


## Link zum Ferienhaus
Beim Anlegen oder Bearbeiten kann ein direkter Link zum Anbieter/Ferienhaus gespeichert werden. Er erscheint in der Karte und Detailansicht und wird im Backup gespeichert.

## PDF-Vergleich
Über **PDF erstellen** wird eine druckoptimierte A4-Querformat-Tabelle mit allen Ferienhäusern, Links, tatsächlichen Werten, Punkten und Gesamtwertung geöffnet. Im Druckdialog **„Als PDF speichern“** wählen. Auf Smartphones kann die PDF anschließend über die Teilen-Funktion, z. B. WhatsApp, verschickt werden.


## Karten-Fix (v5)
Die Karte ist jetzt als eigener Tab eingebaut und aktiviert sich unabhängig von der bisherigen Tab-Logik. Leaflet wird bei Bedarf nachgeladen. Häuser erscheinen, sobald für sie gültige Koordinaten gespeichert sind.


## Version 6 – Ort und Karte
Im Formular eines Ferienhauses gibt es jetzt ein eigenes Feld **📍 Ort** direkt unter dem Link.
Der Ort wird pro Ferienhaus gespeichert. Nach dem Speichern wird er automatisch über OpenStreetMap/Nominatim verortet. Alternativ können auf der Karte alle noch nicht verorteten Orte mit „Alle neuen Orte verorten“ verarbeitet werden.


## v7 – Ort wieder unter dem Ferienhausnamen
Der gespeicherte Ort wird in der Übersicht und in den Details direkt unter dem Ferienhausnamen mit einer Stecknadel angezeigt, z. B.:
Kustpark Texel
📍 Texel, Niederlande
