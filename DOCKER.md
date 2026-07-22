# Docker-Anleitung für Familienmomente Landingpage

## Voraussetzungen

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/) (optional, aber empfohlen)

## Quickstart

### Mit Docker Compose (empfohlen)

```bash
# Image bauen und Container starten
docker compose up --build -d

# App ist dann unter http://localhost:3000 erreichbar
```

### Nur Docker

```bash
# Image bauen
docker build -t familienmomente .

# Container starten (Ordner + PIN wie in docker-compose.yml)
docker run -d -p 3000:3000 \
  -e GALLERY_DIR=/data/gallery \
  -e GALLERY_PIN=1234 \
  -v ./gallery-images:/data/gallery \
  --name familienmomente familienmomente
```

## Bilder zur Galerie hinzufügen

Die Galerie liest ihre Bilder direkt aus einem Ordner am Server – es ist **kein Rebuild und kein Redeploy nötig**:

1. Lege Bild-Dateien (`.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.avif`) in den Ordner `./gallery-images` neben der `docker-compose.yml`.
2. Die Bilder erscheinen automatisch in der Galerie auf der Website (kurz neu laden reicht).
3. Die Reihenfolge richtet sich nach dem Dateinamen (alphabetisch). Mit einer Zahl am Anfang lässt sich die Reihenfolge steuern, z. B.:
   - `01-brautpaar-abendlicht.jpg`
   - `02-familienmoment.jpg`
   - `03-ringtausch.jpg`
4. Der Bildtitel wird automatisch aus dem Dateinamen erzeugt (Zahl am Anfang und Bindestriche/Unterstriche werden entfernt): `01-brautpaar-abendlicht.jpg` → **„Brautpaar Abendlicht"**.

## Galerie-PIN

Die Galerie ist mit einer PIN geschützt (Familienfotos, nicht öffentlich).

- PIN wird über die Umgebungsvariable `GALLERY_PIN` in `docker-compose.yml` gesetzt (Standard: `1234` – **bitte unbedingt ändern**).
- Nach korrekter Eingabe wird ein Cookie gesetzt (`gallery_access`, 30 Tage gültig), damit man die PIN nicht bei jedem Besuch neu eingeben muss.
- Ohne gültigen Zugriff liefert der Server auch bei direktem Bildaufruf `401 Unauthorized` – die Fotos sind also auch nicht per Direktlink oder Google Bilder-Suche erreichbar.

## Konfiguration

Der Port kann in der `docker-compose.yml` angepasst werden:

```yaml
ports:
  - "8080:3000"  # Host:Container
```

## Wichtige Hinweise

- Die App wird mit dem **Nitro `node-server` Preset** gebaut (für reine Node.js-Umgebungen)
- SSR (Server-Side Rendering) ist aktiviert – die Seite wird serverseitig vorgerendert
- Alle Routen werden korrekt von der Node.js-Server-Anwendung bedient
- Das Image basiert auf **Node.js 22 Alpine** für minimale Größe
- Bilder werden **nicht** ins Docker-Image eingebaut, sondern zur Laufzeit aus dem gemounteten Ordner `gallery-images` gelesen

## Dateien

| Datei | Zweck |
|-------|-------|
| `Dockerfile` | Multi-Stage Build (Bun Builder → Node Runner) |
| `docker-compose.yml` | Docker Compose Konfiguration inkl. Galerie-Ordner & PIN |
| `.dockerignore` | Ausschluss unnötiger Dateien vom Build |
| `gallery-images/` | Ordner am Host, in den Fotos für die Galerie gelegt werden |
