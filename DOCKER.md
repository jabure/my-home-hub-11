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

1. Lege Bild-Dateien (`.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.avif`) in den Ordner `./gallery-images` neben der `docker-compose.yml`.
2. Die Bilder erscheinen automatisch in der Galerie (kurz neu laden reicht).
3. Standard-Reihenfolge: alphabetisch nach Dateiname, z. B. `01-hochzeit.jpg`, `02-familie.jpg`.
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
- Nach **5 falschen Versuchen** wird die Eingabe für **60 Sekunden** gesperrt (pro IP-Adresse), um Durchprobieren zu erschweren.

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
| `gallery-images/` | Ordner am Host, in den Fotos für die Galerie gelegt werden (optional mit `captions.json`) |
