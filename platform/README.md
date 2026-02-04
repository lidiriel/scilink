# Microservices Architecture

A Python supervisor managing C++ microservices with NATS messaging.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Python Supervisor                     │
│  - Service lifecycle management (start/stop/restart)     │
│  - Health monitoring & auto-restart                      │
│  - NATS-based communication                              │
└─────────────────────┬───────────────────────────────────┘
                      │ NATS
                      ▼
┌─────────────────────────────────────────────────────────┐
│                   NATS Server                            │
│                 (localhost:4222)                         │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              Rust hardware Service                      │
│  - RS485 serial / USB / Modbus communication            │
│  - Custom protocol handler                               │
│  - Register read/write operations                        │
└─────────────────────────────────────────────────────────┘
```

## Prerequisites

- Docker (for NATS server)
- Python 3.8+

## Quick Start


## Project Structure

```
plateform/
├── supervisor/              # Supervisor
│   ├── supervisor.rs        # Main supervisor service
│   ├── supervisor_cli.py    # CLI tool for control
│   └── requirements.txt     # Python dependencies
└── README.md
```

## NATS Topics

### Supervisor Commands

| Topic | Description |
|-------|-------------|
| `supervisor.command.start` | Start a service (payload: service name) |
| `supervisor.command.stop` | Stop a service |
| `supervisor.command.restart` | Restart a service |
| `supervisor.command.status` | Get service status |
| `supervisor.command.list` | List all services |

### Supervisor Events

| Topic | Description |
|-------|-------------|
| `supervisor.event.started` | Service started |
| `supervisor.event.stopped` | Service stopped |
| `supervisor.event.max_restarts` | Service exceeded max restarts |

### Service Heartbeats

| Topic | Description |
|-------|-------------|
| `service.heartbeat.<name>` | Service health heartbeat |

### Hardware RS485 Commands

| Topic | Description |
|-------|-------------|
| `service.hardware_rs485.command.status` | Get service status |
| `service.hardware_rs485.command.info` | Get device info |
| `service.hardware_rs485.command.read` | Read register |
| `service.hardware_rs485.command.write` | Write register |
| `service.hardware_rs485.command.raw` | Send raw data |
| `service.hardware_rs485.command.configure` | Configure port |

## Using NATS client

package available from https://github.com/nats-io/natscli/releases/

# Subscribe to all messages
nats sub ">"

# Subscribe to supervisor heartbeats
nats sub "service.heartbeat.>"

# Send a request and wait for reply
nats request "service.hardware_rs485.command.status" ""

# Publish a message
nats pub "test.subject" "hello world"

# Server info
nats server info


## Using the CLI

Control services using the CLI tool:

```bash
cd supervisor
source venv/bin/activate

# List services
python supervisor_cli.py list

# Get status
python supervisor_cli.py status
python supervisor_cli.py status hardware_rs485

# Control services
python supervisor_cli.py start hardware_rs485
python supervisor_cli.py stop hardware_rs485
python supervisor_cli.py restart hardware_rs485
```

## RS485 Protocol

The custom protocol uses this frame format:

```
| STX (1) | ADDR (1) | CMD (1) | LEN (1) | DATA (0-255) | CRC (2) | ETX (1) |
```

- **STX**: Start byte (0x02)
- **ADDR**: Device address
- **CMD**: Command code
- **LEN**: Data length
- **DATA**: Payload data
- **CRC**: CRC-16 CCITT checksum
- **ETX**: End byte (0x03)

### Commands

| Code | Name | Description |
|------|------|-------------|
| 0x01 | GET_DEVICE_INFO | Get device information |
| 0x02 | GET_STATUS | Get device status |
| 0x20 | READ_DATA | Read register(s) |
| 0x21 | WRITE_DATA | Write register(s) |
| 0x30 | START | Start device |
| 0x31 | STOP | Stop device |
| 0x32 | RESET | Reset device |

## Configuration

### services.yaml

```yaml
services:
  - name: hardware_rs485
    command: ../services/hardware_rs485/build/hardware_rs485_service
    working_dir: ../services/hardware_rs485
    auto_restart: true
    max_restarts: 5
    restart_delay: 3.0
    environment:
      RS485_DEVICE: /dev/ttyUSB0
      RS485_BAUD: "9600"
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| NATS_URL | NATS server URL | nats://localhost:4222 |
| SERVICE_NAME | Service name | hardware_rs485 |
| RS485_DEVICE | Serial device path | /dev/ttyUSB0 |
| RS485_BAUD | Baud rate | 9600 |

## Troubleshooting

### NATS Connection Failed

Ensure NATS is running:
```bash
docker ps | grep nats
```

### RS485 Permission Denied

Add user to dialout group:
```bash
sudo usermod -a -G dialout $USER
# Log out and back in
```

### Service Won't Start

Check the supervisor log:
```bash
cat supervisor/supervisor.log
```
