# Docker-Anleitung für Familienmomente Landingpage

## Voraussetzungen

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/) (optional, aber empfohlen)

## Quickstart

### Mit Docker Compose (empfohlen)

```bash
docker compose up --build -d
# App ist dann unter http://localhost:3000 erreichbar
```

### Nur Docker

```bash
docker build -t familienmomente .
docker run -d -p 3000:3000 \
  -e GALLERY_DIR=/data/gallery \
  -e GALLERY_PIN=1234 \
  -v ./gallery-images:/data/gallery \
  --name familienmomente familienmomente
```

## Bilder zur Galerie hinzufügen

Die Galerie liest ihre Bilder direkt aus einem Ordner am Server – es ist **kein Rebuild und kein Redeploy nötig**:

1. Lege Bild-Dateien (`.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.avif`) **oder Videos** (`.mp4`, `.webm`, `.mov`) in den Ordner `./gallery-images` neben der `docker-compose.yml`.
2. Bilder und Videos erscheinen automatisch in der Galerie (kurz neu laden reicht). Videos werden in der Diashow mit eigenem Ton abgespielt – die Hintergrundmusik pausiert währenddessen automatisch und läuft danach weiter. Nach dem Videoende springt die Diashow zum nächsten Element.
3. Standard-Reihenfolge: **chronologisch nach Aufnahmedatum** (aus den EXIF-Daten der Kamera; Videos und Bilder ohne EXIF nach Datei-Änderungsdatum). Eine eigene Reihenfolge lässt sich weiterhin über `captions.json` erzwingen (siehe unten).
4. Titel werden automatisch aus dem Dateinamen erzeugt: `01-brautpaar-abendlicht.jpg` → **„Brautpaar Abendlicht"**.

### Eigene Reihenfolge & Titel (optional)

Lege eine Datei `captions.json` in denselben Ordner (`./gallery-images/captions.json`):

```json
{
  "order": ["hochzeit.jpg", "familie.jpg", "ringtausch.jpg"],
  "captions": {
    "hochzeit.jpg": "Unser großer Tag",
    "familie.jpg": "Zusammen"
  }
}
```

- `order`: erzwingt eine bestimmte Reihenfolge (alles Übrige wird danach alphabetisch angehängt)
- `captions`: überschreibt den automatisch erzeugten Titel für einzelne Dateien

Beide Felder sind optional – du kannst auch nur eines von beiden angeben.

## Galerie-PIN & Bruteforce-Schutz

- PIN wird über `GALLERY_PIN` in `docker-compose.yml` gesetzt (Standard `1234` – **bitte ändern**).
- Nach korrekter Eingabe wird ein Cookie gesetzt (`gallery_access`, 30 Tage gültig).
- Ohne gültigen Zugriff liefert der Server auch bei direktem Bildaufruf `401 Unauthorized`.
- Nach **5 falschen Versuchen** wird die Eingabe für **60 Sekunden** gesperrt (pro IP-Adresse).
- Wiederholt sich das (3 Sperren in Folge), wird die IP für **24 Stunden** komplett gesperrt.
- Optional: Benachrichtigung bei jeder Sperre über [ntfy.sh](https://ntfy.sh) — eigenes Topic anlegen und als `NTFY_URL` in der `docker-compose.yml` eintragen (auskommentiert, einfach aktivieren).

## Hintergrundmusik (optional)

Lege eine oder **mehrere** Audiodateien (`.mp3`, `.ogg`, `.m4a` oder `.wav`) in denselben Ordner wie die Bilder. Sobald die Galerie entsperrt ist, laufen sie leise im Hintergrund – bei mehreren Titeln als Playlist in alphabetischer Reihenfolge (steuerbar über den Dateinamen, z. B. `01-canon-in-d.mp3`, `02-perfect.mp3`), nach dem letzten Titel beginnt sie von vorn.

In der Musik-Leiste oben rechts gibt es: den **aktuellen Titelnamen** (aus dem Dateinamen abgeleitet), einen **Lautstärkeregler**, **Stummschalten**, **Nächster Titel** und eine aufklappbare **Titelübersicht** zum direkten Anwählen. Falls keine Audiodatei vorhanden ist, wird die Leiste einfach nicht angezeigt.

**Wichtig:** Ihr müsst selbst eine Musikdatei bereitstellen, für die ihr die Rechte habt (eigene Aufnahme oder lizenzfreie Musik) – es wird keine Musik automatisch generiert oder mitgeliefert.

## Wetter-Standort anpassen

Standardmäßig zeigt das Wetter-Widget Wels, Oberösterreich. Zum Ändern in `docker-compose.yml`:

```yaml
environment:
  - WEATHER_LAT=48.2082
  - WEATHER_LON=16.3738
  - WEATHER_LOCATION_NAME=Wien
```

## Health-Check

Die App bietet einen einfachen Health-Check-Endpunkt unter `/api/health` (Antwort: `{"status":"ok"}`).
Docker Compose prüft diesen automatisch alle 30 Sekunden (`docker compose ps` zeigt den Status an).
Praktisch auch für externes Monitoring, z. B. Uptime Kuma.

## Favicon & Link-Vorschau

Favicons (Browser-Tab, Homescreen-Icon) und ein Vorschaubild für geteilte Links (z. B. in WhatsApp) sind bereits enthalten – dafür ist nichts weiter zu tun.

## Konfiguration

Der Port kann in der `docker-compose.yml` angepasst werden:

```yaml
ports:
  - "8080:3000"  # Host:Container
```

## Wichtige Hinweise

- Die App wird mit dem **Nitro `node-server` Preset** gebaut (für reine Node.js-Umgebungen)
- SSR (Server-Side Rendering) ist aktiviert
- Bilder werden zur Laufzeit aus dem gemounteten Ordner `gallery-images` gelesen, nicht ins Image eingebaut
- Hero-Bilder sind als WebP eingebettet (deutlich kleiner als die ursprünglichen JPGs, schnellere Ladezeit)

## Dateien

| Datei | Zweck |
|-------|-------|
| `Dockerfile` | Multi-Stage Build (Bun Builder → Node Runner) inkl. Healthcheck |
| `docker-compose.yml` | Docker Compose Konfiguration inkl. Galerie-Ordner, PIN, Wetter-Standort, Healthcheck |
| `.dockerignore` | Ausschluss unnötiger Dateien vom Build |
| `gallery-images/` | Ordner am Host, in den Fotos für die Galerie gelegt werden (optional mit `captions.json` und einer Musikdatei) |



## Gästefotos (eigenes Album)

In der Bilder-Übersicht (Raster-Symbol) gibt es einen Abschnitt „Gästefotos" mit einem Upload-Button. Jeder mit der normalen Galerie-PIN kann dort eigene Fotos/Videos hochladen (max. 20 Dateien, je max. 50 MB).

- Gästefotos landen in einem **eigenen Unterordner** (`gallery-images/gaeste/`) und laufen **nicht** automatisch in der Haupt-Diashow mit — sie erscheinen ausschließlich im eigenen Abschnitt der Übersicht.
- So bleibt die kuratierte Haupt-Diashow unangetastet, während trotzdem alle Gästefotos gesammelt werden.
- Die hochgeladenen Dateien sind ganz normale Dateien im Ordner — ihr könnt sie jederzeit manuell sichten, sortieren oder ins Hauptalbum verschieben.

## Bilderrahmen-Modus (für TV/Tablet)

Unter `/rahmen` gibt es einen zweiten, PIN-freien Zugang speziell für ein Tablet oder Smart-TV im Wohnzimmer:

1. `FRAME_TOKEN` in der `docker-compose.yml` auf einen eigenen, geheimen Code setzen (mind. 8 Zeichen).
2. Auf dem Gerät `http://eure-adresse/rahmen` öffnen, Code einmalig eingeben.
3. Das Gerät merkt sich den Zugang **1 Jahr lang** und zeigt danach direkt die Diashow im Vollbild — ganz ohne "Verlassen"-Button, dafür mit stummgeschalteter Musik als Standard (lässt sich am Gerät selbst wieder anschalten).

Der Rahmen-Modus nutzt denselben Fehlversuch-Schutz (Sperre/Bann) wie die normale PIN.

## "Verheiratet seit"-Zähler

Auf der Startseite erscheint automatisch ein kleiner Zähler, sobald `WEDDING_DATE` gesetzt ist (Format `JJJJ-MM-TT` in der `docker-compose.yml`). Ohne gesetztes Datum wird nichts angezeigt.
