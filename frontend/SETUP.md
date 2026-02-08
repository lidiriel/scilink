# Frontend Setup

## Prerequisites

- Node.js >= 18 (installed via [nvm](https://github.com/nvm-sh/nvm))
- Python >= 3.10

## Installation

```bash
# Install Node.js with nvm (if not already installed)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.nvm/nvm.sh
nvm install 22

# Make node/npm available system-wide (optional, avoids sourcing nvm each time)
ln -sf ~/.nvm/versions/node/v22.*/bin/node ~/.local/bin/node
ln -sf ~/.nvm/versions/node/v22.*/bin/npm ~/.local/bin/npm
ln -sf ~/.nvm/versions/node/v22.*/bin/npx ~/.local/bin/npx

# Install npm dependencies
cd frontend
npm install

# Create Python venv and install Flask
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
```

## Development

Vite dev server with hot module replacement:

```bash
npm run dev
```

The app is available at http://localhost:5173.

## Production

Build the React app and serve it with Flask:

```bash
npm run build
./venv/bin/python server.py
```

The app is available at http://localhost:5001.

## Docker

The Dockerfile supports two targets: `dev` and `prod`.

### Dev (Vite dev server with HMR)

```bash
# Standalone
docker build --target dev -t frontend-dev ./frontend
docker run -p 5173:5173 -v ./frontend:/app -v /app/node_modules frontend-dev

# Or via docker compose (from project root)
docker compose up frontend-dev
```

The app is available at http://localhost:5173. Source files are mounted into the container so changes trigger hot reload.

### Prod (Flask serving the built app)

```bash
docker build --target prod -t frontend ./frontend
docker run -p 5001:5001 frontend
```

The app is available at http://localhost:5001.
