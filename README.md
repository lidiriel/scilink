
# The HTML has been split into Jinja2 templates.

interface/templates/
├── base.html                    # Main layout (head, body structure, scripts)
├── components/
│   └── sidebar.html             # Navigation sidebar
├── pages/
│   ├── workflows.html           # Workflow designer page
│   ├── experiments.html         # Experiments page (includes experiment modal)
│   ├── monitor.html             # Monitor page
│   ├── devices.html             # Devices page (includes device modal)
│   └── settings.html            # Settings page (includes platform modal)
└── modals/
    ├── bus.html                 # Bus modal (global)
    ├── device.html              # Device modal
    ├── experiment.html          # Experiment modal
    └── platform.html            # Platform modal

# The main layout is in base.html, which includes the sidebar and page-specific templates.
# Modals are included in their respective page templates or globally as needed.




# Example snippet from platform.html modal template:

┌─────────────────────────────────────────┐
│ ▼ Platform: Lab Server                  │
│   Host: 192.168.1.100                   │
│   ┌─────────────────────────────────┐   │
│   │ Bus: MODBUS-Main                │   │
│   │ /dev/ttyUSB0 | 9600 baud        │   │
│   │ 2 devices connected             │   │
│   └─────────────────────────────────┘   │
│   [+ Add Bus]                           │
├─────────────────────────────────────────┤
│ ▶ Platform: Test Bench                  │
└─────────────────────────────────────────┘



# The backend Flask routes are organized as follows:

interface/
├── workflow_db.py              # Simplified: 27 lines (was 695)
├── routes/
│   ├── __init__.py            # Blueprint registration
│   ├── helpers.py             # Shared helpers (PIECES_BASE_PATH, get_git_hash)
│   ├── core.py                # /, static files, /api/health
│   ├── workflows.py           # /api/workflow/*, /api/workflows/*
│   ├── pieces.py              # /api/pieces/*, /api/device-pieces/*, /api/connections
│   ├── settings.py            # /api/settings/*, /api/buses/*
│   ├── experiments.py         # /api/experiments/*
│   └── devices.py             # /api/devices/*
