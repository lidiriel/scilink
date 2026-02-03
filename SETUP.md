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

## Project Structure

```
scilink-src/
├── docker-compose.yml          # Service orchestration
├── .env                        # Environment variables
├── database/
│   ├── schema.sql              # Database schema (tables, indexes, triggers)
│   ├── seed.sql                # Test/mock data
│   ├── init_db.py              # Standalone DB init script
│   └── data/                   # Persistent PostgreSQL data (git-ignored)
├── interface/
│   ├── Dockerfile              # Flask app container
│   ├── workflow_db.py          # App entry point (registers blueprints)
│   ├── models.py               # SQLAlchemy models
│   ├── requirements.txt        # Python dependencies
│   ├── routes/                 # Flask blueprints
│   │   ├── core.py             # Health, static pages
│   │   ├── workflows.py        # Workflow CRUD
│   │   ├── pieces.py           # Piece/block listing
│   │   ├── devices.py          # Device management
│   │   ├── settings.py         # Settings/buses
│   │   ├── experiments.py      # Experiments
│   │   └── helpers.py          # Shared utilities
│   ├── static/                 # JS, CSS, assets
│   └── templates/              # Jinja2 HTML templates
└── pieces/                     # Block/device definitions (metadata.json)
```

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

## Database Schema

### Tables

| Table               | Description                                    |
|---------------------|------------------------------------------------|
| `experiments`       | Experiment metadata                            |
| `workflows`         | Workflow definitions (supports hierarchy)       |
| `nodes`             | Workflow nodes (blocks, devices, composites)    |
| `edges`             | Connections between nodes                       |
| `blocks_used`       | Tracks block/piece usage in workflows           |
| `devices_installed` | Installed device instances                      |
| `settings`          | Platforms, buses, and other configuration        |

### Device Dependencies

Devices support a dependency relationship via `depends_on_id`:

```
Device A ──depends_on──> Device B <──depends_on── Device C
```

Multiple devices can depend on the same device. Deleting a parent device sets `depends_on_id` to NULL on its dependents.

## API Endpoints

### Workflows
| Method   | Endpoint               | Description        |
|----------|------------------------|--------------------|
| `GET`    | `/api/workflows`       | List all workflows |
| `GET`    | `/api/workflow/<id>`   | Get workflow       |
| `POST`   | `/api/workflow`        | Create workflow    |
| `PUT`    | `/api/workflow/<id>`   | Update workflow    |
| `DELETE` | `/api/workflow/<id>`   | Delete workflow    |

### Pieces
| Method | Endpoint                         | Description            |
|--------|----------------------------------|------------------------|
| `GET`  | `/api/piece-directories`         | List piece directories |
| `GET`  | `/api/pieces/<directory>`        | List block pieces      |
| `GET`  | `/api/device-pieces/<directory>` | List device pieces     |
| `GET`  | `/api/connections`               | Get connection types   |

### Devices
| Method   | Endpoint              | Description    |
|----------|-----------------------|----------------|
| `GET`    | `/api/devices`        | List devices   |
| `POST`   | `/api/devices`        | Install device |
| `PUT`    | `/api/devices/<id>`   | Update device  |
| `DELETE` | `/api/devices/<id>`   | Delete device  |

### Settings
| Method   | Endpoint              | Description      |
|----------|-----------------------|------------------|
| `GET`    | `/api/settings`       | List settings    |
| `POST`   | `/api/settings`       | Create setting   |
| `PUT`    | `/api/settings/<id>`  | Update setting   |
| `DELETE` | `/api/settings/<id>`  | Delete setting   |

### Experiments
| Method   | Endpoint                 | Description        |
|----------|--------------------------|--------------------|
| `GET`    | `/api/experiments`       | List experiments   |
| `POST`   | `/api/experiments`       | Create experiment  |
| `PUT`    | `/api/experiments/<id>`  | Update experiment  |
| `DELETE` | `/api/experiments/<id>`  | Delete experiment  |

### Other
| Method | Endpoint       | Description  |
|--------|----------------|--------------|
| `GET`  | `/api/health`  | Health check |

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
