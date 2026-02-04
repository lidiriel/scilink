# SciLink

SciLink is a web platform for managing scientific instruments and building experiment workflows. It connects devices (sensors, actuators, controllers) into visual workflows that can be configured and executed.

## Architecture

- **Interface**: Flask (Python) with SQLAlchemy ORM
- **Database**: PostgreSQL with JSONB for flexible data storage
- **Frontend**: Vanilla JavaScript (ES6 modules), Jinja2 templates, CSS
- **Messaging**: NATS with JetStream for async communication
- **Platform**: Rust supervisor service for workflow execution

## Project Structure

```
scilink-src/
├── docker-compose.yml
├── .env / .env.example
├── database/
│   ├── schema.sql                # Tables, indexes, triggers
│   ├── seed.sql                  # Test/mock data
│   ├── init_db.py                # Standalone DB init script
│   └── data/                     # PostgreSQL data volume (git-ignored)
├── interface/
│   ├── workflow_db.py            # Flask app entry point
│   ├── models.py                 # SQLAlchemy models
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── routes/                   # Flask blueprints (API)
│   │   ├── core.py               # Health, static pages
│   │   ├── workflows.py          # Workflow CRUD + node updates
│   │   ├── pieces.py             # Block/device piece listing
│   │   ├── devices.py            # Device management
│   │   ├── settings.py           # Platforms, buses
│   │   ├── experiments.py        # Experiments
│   │   └── helpers.py            # Shared utilities
│   ├── static/
│   │   ├── css/
│   │   │   ├── base.css          # Global styles, variables
│   │   │   ├── sidebar.css       # Navigation sidebar
│   │   │   ├── panels.css        # Side panels (workflows, pieces)
│   │   │   ├── canvas.css        # Workflow canvas, nodes, edges
│   │   │   ├── modal.css         # Modal base styles
│   │   │   └── pages.css         # Page-specific styles (devices, settings)
│   │   └── js/
│   │       ├── app.js            # Main entry, workflow save, init
│   │       ├── state.js          # Shared application state
│   │       ├── navigation.js     # Page routing
│   │       ├── canvas.js         # SVG canvas, pan/zoom
│   │       ├── nodes.js          # Node rendering, drag-drop
│   │       ├── edges.js          # Edge rendering, connections
│   │       ├── node-inputs.js    # Node user inputs modal
│   │       ├── pieces.js         # Piece browser panel
│   │       ├── devices.js        # Device cards, install modal
│   │       ├── connections.js    # Connection type management
│   │       ├── buses.js          # Bus configuration
│   │       ├── settings.js       # Settings/platform page
│   │       ├── experiments.js    # Experiments page
│   │       ├── workflows-panel.js # Workflow list panel
│   │       ├── generic-panel.js  # Reusable collapsible panel
│   │       ├── tabbed-panel.js   # Tabbed panel component
│   │       ├── zoom.js           # Zoom controls
│   │       └── utils.js          # escapeHtml, helpers
│   └── templates/
│       ├── base.html             # Main layout (head, scripts, sidebar)
│       ├── components/
│       │   └── sidebar.html      # Navigation sidebar
│       ├── pages/
│       │   ├── workflows.html    # Workflow designer
│       │   ├── devices.html      # Device management
│       │   ├── settings.html     # Platforms & buses
│       │   ├── experiments.html  # Experiments
│       │   └── monitor.html      # Monitoring
│       └── modals/
│           ├── device.html       # Device install/edit
│           ├── platform.html     # Platform config
│           ├── bus.html          # Bus config
│           ├── experiment.html   # Experiment form
│           └── node-inputs.html  # Node settings
├── nats/
│   └── nats.conf                 # NATS server config (JetStream enabled)
├── platform/
│   ├── Dockerfile                # Rust multi-stage build
│   ├── Cargo.toml                # Rust dependencies (async-nats, tokio)
│   └── src/
│       └── main.rs               # Supervisor entry point
└── pieces/
    ├── default/
    │   ├── blocks/               # Workflow blocks
    │   │   ├── CronClock/        # Scheduled triggers
    │   │   ├── CustomPython/     # Custom scripts
    │   │   ├── Sleep/            # Delay block
    │   │   ├── Timer/            # Timer block
    │   │   └── ToString/         # Data conversion
    │   └── devices/              # Device drivers
    │       ├── Relay/            # Relay controller
    │       ├── PinchValve/       # Pinch valve (depends on Relay)
    │       ├── 4In1ComValve/     # 4-in-1 combination valve
    │       ├── Pump/             # Pump controller
    │       ├── TempSensor/       # Temperature sensor
    │       ├── SpectrometerOcean/ # Ocean spectrometer
    │       └── Filterwheel/      # Filter wheel
    └── utils/
        └── connections.json      # Connection type definitions
```

## Database

### Tables

| Table               | Description                                 |
|---------------------|---------------------------------------------|
| `experiments`       | Experiment metadata                         |
| `workflows`         | Workflow definitions (supports hierarchy)   |
| `nodes`             | Workflow nodes (blocks, devices, composites)|
| `edges`             | Connections between nodes                   |
| `blocks_used`       | Tracks block/piece usage per workflow       |
| `devices_installed` | Installed device instances                  |
| `settings`          | Platforms, buses, and configuration         |

### Key Design Patterns

- **Composite primary keys**: Nodes use `(id, workflow_id)` as primary key
- **JSONB columns**: `nodes.data`, `devices_installed.data`, and `settings.data` store flexible structured data (user inputs, dependency matches, bus config)
- **Self-referential FK**: `devices_installed.depends_on_id` references another device
- **Cascade deletes**: Deleting a workflow removes its nodes, edges, and blocks_used

## Pieces

Each piece (block or device) is defined by a `metadata.json` file containing:

- `name`, `description`, `type`, `icon`
- `tags` — used for filtering and dependency matching
- `device_settings` — device-specific parameters with types and defaults
- `user_inputs` — per-node configurable fields shown in the workflow modal
- `dependency` — declares that a device depends on another (matched by tag)

### Device Dependencies

Devices can depend on other devices via `dependency` in metadata:

```json
"dependency": {
    "type": "device",
    "tag": "relay",
    "matches": { "user_inputs": ["coils_1"] }
}
```

The `matches.user_inputs` array lists parameters from this device's `device_settings` that map to the parent device's `user_inputs` by type. Mappings are stored in `devices_installed.data` as `dependency_matches`.

### Node User Inputs

Double-clicking a workflow node opens a settings modal. Fields are rendered based on `user_inputs` from the piece's metadata. Supported types: `boolean`, `enumeration`, `string`, `number`/`float`, `integer`. Values are stored per-node in `nodes.data.user_inputs`.

## API Endpoints

### Workflows
| Method   | Endpoint                                | Description      |
|----------|-----------------------------------------|------------------|
| `GET`    | `/api/workflows`                        | List workflows   |
| `GET`    | `/api/workflow/<id>`                    | Get workflow     |
| `POST`   | `/api/workflow`                         | Create workflow  |
| `PUT`    | `/api/workflow/<id>`                    | Update workflow  |
| `PUT`    | `/api/workflow/<wf_id>/nodes/<node_id>` | Update node data |
| `DELETE` | `/api/workflow/<id>`                    | Delete workflow  |

### Pieces
| Method | Endpoint                         | Description            |
|--------|----------------------------------|------------------------|
| `GET`  | `/api/piece-directories`         | List piece directories |
| `GET`  | `/api/pieces/<directory>`        | List block pieces      |
| `GET`  | `/api/device-pieces/<directory>` | List device pieces     |
| `GET`  | `/api/connections`               | Get connection types   |

### Devices
| Method   | Endpoint            | Description    |
|----------|---------------------|----------------|
| `GET`    | `/api/devices`      | List devices   |
| `POST`   | `/api/devices`      | Install device |
| `PUT`    | `/api/devices/<id>` | Update device  |
| `DELETE` | `/api/devices/<id>` | Delete device  |

### Settings
| Method   | Endpoint             | Description    |
|----------|----------------------|----------------|
| `GET`    | `/api/settings`      | List settings  |
| `POST`   | `/api/settings`      | Create setting |
| `PUT`    | `/api/settings/<id>` | Update setting |
| `DELETE` | `/api/settings/<id>` | Delete setting |

### Experiments
| Method   | Endpoint                | Description       |
|----------|-------------------------|-------------------|
| `GET`    | `/api/experiments`      | List experiments  |
| `POST`   | `/api/experiments`      | Create experiment |
| `PUT`    | `/api/experiments/<id>` | Update experiment |
| `DELETE` | `/api/experiments/<id>` | Delete experiment |

### Other
| Method | Endpoint      | Description  |
|--------|---------------|--------------|
| `GET`  | `/api/health` | Health check |

## Setup

See [SETUP.md](SETUP.md) for installation, Docker configuration, and database management.
