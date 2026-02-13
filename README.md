# SciLink

SciLink is a web platform for managing scientific instruments and building experiment workflows. It connects devices (sensors, actuators, controllers) into visual workflows that can be configured and executed.

## Architecture

- **Frontend + Backend**: A single `frontend/` directory serving both the React UI and the Flask (Python) API
- **Database**: PostgreSQL with JSONB for flexible data storage
- **Messaging**: NATS with JetStream for async communication
- **Platform**: Rust supervisor service for workflow execution

## Project Structure

```
scilink-src/
├── docker-compose.yml
├── .env / .env.example
├── frontend/
│   ├── server.py                # Flask app entry point
│   ├── config.py                # Flask configuration (dev/prod)
│   ├── models.py                # SQLAlchemy models
│   ├── requirements.txt         # Python dependencies
│   ├── Dockerfile
│   ├── routes/                  # Flask blueprints (API)
│   │   ├── core.py              # Health, static pages
│   │   ├── workflows.py         # Workflow CRUD + node updates
│   │   ├── pieces.py            # Block/device piece listing
│   │   ├── devices.py           # Device management
│   │   ├── settings.py          # Platforms, buses
│   │   ├── experiments.py       # Experiments + workflow creation
│   │   └── helpers.py           # Shared utilities
│   ├── package.json             # Node dependencies
│   ├── vite.config.js           # Vite bundler config
│   ├── tsconfig.json            # TypeScript config
│   ├── eslint.config.js         # ESLint with TypeScript rules
│   ├── index.html               # SPA entry point
│   └── src/                     # React application
│       ├── main.tsx             # React entry point
│       ├── App.tsx              # Router & layout
│       ├── behaviour/           # MobX stores
│       │   ├── workflows.tsx    # Workflow state & API
│       │   └── experiments.tsx  # Experiments state & API
│       ├── components/          # Reusable components
│       │   ├── FlowCanvas.tsx   # React Flow canvas
│       │   ├── AreaOverlay.tsx  # Sub-workflow selection overlay
│       │   ├── WorkflowNode.tsx # Custom workflow node
│       │   └── Sidebar*.tsx     # Sidebar panels (blocks, devices, workflows)
│       ├── pages/               # Route pages
│       │   ├── WorkflowsPage.tsx
│       │   ├── ExperimentsPage.tsx
│       │   ├── DevicesPage.tsx
│       │   └── SettingsPage.tsx
│       ├── modals/              # Modal dialogs
│       ├── utils/               # Helpers (device icons, etc.)
│       ├── css/                 # Global styles
│       └── i18n.tsx             # Internationalization setup
├── database/
│   ├── schema.sql               # Tables, indexes, triggers
│   ├── seed.sql                 # Test/mock data
│   ├── init_db.py               # Standalone DB init script
│   └── data/                    # PostgreSQL data volume (git-ignored)
├── nats/
│   └── nats.conf                # NATS server config (JetStream enabled)
├── platform/
│   ├── Dockerfile               # Rust multi-stage build
│   ├── Cargo.toml               # Rust dependencies (async-nats, tokio)
│   └── src/
│       └── main.rs              # Supervisor entry point
└── pieces/
    ├── default/
    │   ├── blocks/              # Workflow blocks
    │   │   ├── CronClock/       # Scheduled triggers
    │   │   ├── CustomPython/    # Custom scripts
    │   │   ├── Sleep/           # Delay block
    │   │   ├── Timer/           # Timer block
    │   │   └── ToString/        # Data conversion
    │   └── devices/             # Device drivers
    │       ├── Relay/           # Relay controller
    │       ├── PinchValve/      # Pinch valve (depends on Relay)
    │       ├── 4In1ComValve/    # 4-in-1 combination valve
    │       ├── Pump/            # Pump controller
    │       ├── TempSensor/      # Temperature sensor
    │       ├── SpectrometerOcean/ # Ocean spectrometer
    │       └── Filterwheel/     # Filter wheel
    └── utils/
        └── connections.json     # Connection type definitions
```

## Frontend Stack

- **React 19** + TypeScript + Vite
- **Mantine 8** for UI components (Tabs, Card, Modal, SegmentedControl, AppShell, etc.)
- **MobX** for state management (stores in `src/behaviour/`)
- **React Flow** for the workflow canvas
- **@dnd-kit/core** for drag-and-drop (device piece installation)
- **@tabler/icons-react** for all icons
- **react-i18next** for internationalization
- **SCSS** for component styles

## Database

### Tables

| Table               | Description                                 |
|---------------------|---------------------------------------------|
| `experiments`       | Experiment metadata                         |
| `workflows`         | Workflow definitions (supports hierarchy via `parent_id`)   |
| `nodes`             | Workflow nodes (blocks, devices, composites)|
| `edges`             | Connections between nodes                   |
| `blocks_used`       | Tracks block/piece usage per workflow       |
| `devices_installed` | Installed device instances                  |
| `settings`          | Platforms, buses, and configuration         |

### Key Design Patterns

- **Composite primary keys**: Nodes use `(id, workflow_id)` as primary key
- **JSONB columns**: `nodes.data`, `devices_installed.data`, and `settings.data` store flexible structured data (user inputs, dependency matches, bus config)
- **Self-referential FK**: `devices_installed.depends_on_id` references another device; `workflows.parent_id` references a parent workflow
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
| Method   | Endpoint                                  | Description                |
|----------|-------------------------------------------|----------------------------|
| `GET`    | `/api/experiments`                        | List experiments           |
| `POST`   | `/api/experiments`                        | Create experiment          |
| `PUT`    | `/api/experiments/<id>`                   | Update experiment          |
| `DELETE` | `/api/experiments/<id>`                   | Delete experiment          |
| `POST`   | `/api/experiments/<id>/workflows`         | Add workflow (accepts `parentId`) |

### Other
| Method | Endpoint      | Description  |
|--------|---------------|--------------|
| `GET`  | `/api/health` | Health check |

### Device Tag-to-Icon Mapping

Device icons in the UI are determined by the `tags` array from each piece's `metadata.json`. The mapping is defined in `frontend/src/utils/deviceIcons.ts` and used across device cards, the pieces panel, and the workflow sidebar.

| Tag             | Icon              | Example devices                    |
|-----------------|-------------------|------------------------------------|
| `sensors`       | IconTemperature   | TempSensor, SpectrometerOcean      |
| `actuator`      | IconEngine        | Pump, Filterwheel                  |
| `relays`        | IconBolt          | Relay                              |
| `fluidics`      | IconDroplet       | PinchValve, 4In1ComValve           |
| `camera`        | IconCamera        |                                    |
| `light`         | IconBulb          |                                    |
| `communication` | IconAntenna       |                                    |
| `gauge`         | IconGauge         |                                    |
| *(fallback)*    | IconCpu           | Any device without a matched tag   |

When a device has multiple tags (e.g. PinchValve has `["hardware", "actuator", "fluidics"]`), the most specific tag wins. The priority order is: `fluidics > camera > light > communication > gauge > sensors > actuator > relays`. The generic `hardware` tag is always ignored.

To add a new icon mapping, update `TAG_ICON_MAP` and `TAG_PRIORITY` in `frontend/src/utils/deviceIcons.ts`.

## Setup

See [SETUP.md](SETUP.md) for installation, Docker configuration, and database management.
