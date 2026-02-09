# ---- Base: install npm dependencies ----
FROM node:22-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- Dev: Vite dev server with HMR ----
FROM base AS dev
COPY . .
EXPOSE 5173
CMD ["npx", "vite", "--host"]

# ---- Build: compile the React app ----
FROM base AS build
COPY . .
RUN npm run build

# ---- API: Flask backend for dev ----
FROM python:3.13-alpine AS api
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
EXPOSE 5001
CMD ["python", "server.py"]

# ---- Prod: serve static files with Flask ----
FROM python:3.13-alpine AS prod
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY server.py .
COPY --from=build /app/dist ./dist
EXPOSE 5001
CMD ["python", "server.py"]
