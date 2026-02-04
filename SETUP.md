# SciLink - Setup Guide

## Quick Start (Docker)

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env if needed

# 2. Start all services
docker compose up -d
```

Visit `http://localhost:5000` in your browser.

## Prerequisites

- Docker and Docker Compose

For local development without Docker:
- Python 3.10+
- PostgreSQL 15+

## Docker Setup (Recommended)

### Services

| Service     | Image              | Port | Description         |
|-------------|--------------------|------|---------------------|
| `db`        | postgres:18-alpine | 5432 | PostgreSQL database |
| `interface` | custom (Flask)     | 5000 | Web application     |

### Environment Variables

Copy and edit the example file:

```bash
cp .env.example .env
```

| Variable      | Default        | Description         |
|---------------|----------------|---------------------|
| `DB_USER`     | `scilink_user` | PostgreSQL username |
| `DB_PASSWORD` | `scilink_pass` | PostgreSQL password |
| `DB_HOST`     | `localhost`    | Database host       |
| `DB_PORT`     | `5432`         | Database port       |
| `DB_NAME`     | `scilink_db`   | Database name       |
| `FLASK_ENV`   | `development`  | Flask environment   |
| `SECRET_KEY`  | (provided)     | Flask secret key    |

To generate a secure SECRET_KEY:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### Starting Services

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# View logs for a specific service
docker compose logs -f interface
```

### Database Initialization

On first start, PostgreSQL automatically runs SQL files from `docker-entrypoint-initdb.d/` in alphabetical order:

1. `01-schema.sql` - Creates tables, indexes, triggers
2. `02-seed.sql` - Inserts test/mock data

These scripts only run when the database volume is empty (first init).

### Resetting the Database

```bash
docker compose down
rm -rf database/data
docker compose up -d
```

### Injecting Seed Data (without reset)

```bash
docker compose exec db psql -U scilink_user -d scilink_db -f /docker-entrypoint-initdb.d/02-seed.sql
```

### Connecting to the Database

```bash
docker compose exec db psql -U scilink_user -d scilink_db
```

## Local Development (without Docker)

### 1. Install PostgreSQL

Ubuntu/Debian:
```bash
sudo apt update && sudo apt install postgresql postgresql-contrib
```

macOS:
```bash
brew install postgresql@15
brew services start postgresql@15
```

### 2. Create Database

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE scilink_db;
CREATE USER scilink_user WITH PASSWORD 'scilink_pass';
GRANT ALL PRIVILEGES ON DATABASE scilink_db TO scilink_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO scilink_user;
\q
```

### 3. Install Python Dependencies

```bash
cd interface
pip install -r requirements.txt
```

### 4. Configure Environment

```bash
cp .env.example .env
# Edit .env — set DB_HOST=localhost
```

### 5. Initialize Database

```bash
psql -U scilink_user -d scilink_db -f database/schema.sql

# Optionally load test data
psql -U scilink_user -d scilink_db -f database/seed.sql
```

### 6. Run the Application

```bash
cd interface
python workflow_db.py
```

Visit `http://localhost:5000`.

## Troubleshooting

### Database not initializing
The `docker-entrypoint-initdb.d` scripts only run on a fresh volume. If tables are missing:
```bash
docker compose down && rm -rf database/data && docker compose up -d
```

### Connection refused
- Check services are running: `docker compose ps`
- Check logs: `docker compose logs db`

### Port conflict
If port 5432 or 5000 is already in use, edit `docker-compose.yml` or `.env` to change the mapped ports.

## Backup and Restore

### Backup
```bash
docker compose exec db pg_dump -U scilink_user scilink_db > backup.sql
```

### Restore
```bash
cat backup.sql | docker compose exec -T db psql -U scilink_user -d scilink_db
```
