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

# Container starten
docker run -d -p 3000:3000 --name familienmomente familienmomente
```

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

## Dateien

| Datei | Zweck |
|-------|-------|
| `Dockerfile` | Multi-Stage Build (Bun Builder → Node Runner) |
| `docker-compose.yml` | Docker Compose Konfiguration |
| `.dockerignore` | Ausschluss unnötiger Dateien vom Build |
