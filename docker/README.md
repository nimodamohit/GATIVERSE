# GATIVERSE - Docker Containerization Infrastructure

This directory contains containerization templates and Docker Compose definitions for running GATIVERSE services in isolated container environments.

## Microservice Containers

1. **Frontend (`Dockerfile.frontend`)**
   - Base image: Node.js (Alpine)
   - Serves the Next.js frontend application.
   - Exposes port `3000`.

2. **Backend (`Dockerfile.backend`)**
   - Base image: Node.js (Alpine)
   - Runs Express.js REST API and Socket.IO server.
   - Exposes port `5000`.

3. **ML Service (`Dockerfile.ml-service`)**
   - Base image: Python 3.11 (Slim)
   - Runs FastAPI server using Uvicorn.
   - Exposes port `8000`.

4. **MongoDB Container**
   - Base image: `mongo:latest`
   - Default port: `27017`

## Running with Docker Compose

```bash
docker-compose -f docker/docker-compose.yml up --build
```
