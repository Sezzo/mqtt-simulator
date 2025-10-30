# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**MQTT Simulator** is a NestJS-based HTTP API and MQTT service that simulates IoT devices for testing, development, and home automation integration testing. It provides:

- REST API for device management (CRUD operations)
- MQTT publish/subscribe for device state and command handling
- Device type system with extensible capabilities
- Configurable device templates for common scenarios
- Telemetry (periodic state updates with optional drift/noise simulation)
- Home Assistant Discovery integration
- Import/Export functionality for device configurations

The project uses TypeScript, NestJS, SQLite (TypeORM), and the MQTT.js client.

## Key Architecture Concepts

### 1. Device Kind System (`src/devices/kinds/`)

Devices are built around the **DeviceKind** interface, which defines behavior for a specific device type (e.g., "light", "switch", "sensor.temp").

**Core interface** (`device-kind.ts`):
- `id`: Unique type identifier
- `capabilities()`: Returns default capabilities for this type
- `defaultState()`: Generates initial device state
- `validate()`: Validates incoming commands
- `reduce()`: Pure function that transforms state based on command
- `tick()`: Optional telemetry hook for periodic updates (drift/noise simulation)

**Registry** (`registry.ts`): Central lookup for all available device kinds.

**Example kinds**:
- `light.kind.ts`: Supports brightness, color temperature, RGB with mode switching
- `switch.kind.ts`: Simple on/off state
- `sensor.temp.kind.ts`: Temperature with configurable drift and noise
- `cover.kind.ts`: Motorized cover with speed control
- `fan.kind.ts`: Multi-speed fan

### 2. Device Templates (`config/device-templates.yaml`)

YAML-based configuration of pre-configured device variants. Each template:
- Maps to a device kind
- Provides default capabilities
- Allows users to quickly instantiate common device variants (e.g., "light.rgbct" for RGB + color temperature light)

Templates are loaded and cached at runtime; file changes are detected via modification time.

### 3. Database Layer

**Entities**:
- `Device`: Main device record (type, name, slug, capabilities, telemetry interval)
- `DeviceState`: Stores the current state data for each device (stored as JSON)

Slug is unique per type; devices are identified by UUID.

### 4. MQTT Integration (`src/mqtt/`)

**MqttService**:
- Manages single MQTT client connection
- Publishes to device state, status, discovery topics
- Subscribes to command wildcards: `{namespace}/+/+/set`
- Handles reconnection, will messages

**Topic patterns** (`topics.ts`):
- `{ns}/{type}/state`: Device state (retained)
- `{ns}/{type}/{id}/set`: Commands from MQTT (wildcard subscribed)
- `{ns}/service/status`: Service online/offline
- `{ns}/service/birth`: Device birth events (non-retained)
- Discovery topics for Home Assistant integration

### 5. Device Management (`src/devices/`)

**DevicesService**:
- Device lifecycle (create, update, delete, export/import)
- Command routing from MQTT
- Telemetry interval management (per-device timers)
- Discovery payload generation
- Slug auto-generation with collision detection

**DevicesController**: REST API endpoints with Swagger documentation.

### 6. Common Utilities

- **RequestIdMiddleware** (`src/common/request-id.middleware.ts`): Injects request ID header for tracing
- **LoggingInterceptor** (`src/common/logging.interceptor.ts`): Logs HTTP requests/responses
- **slug.util.ts**: Converts names to URL-safe slugs with collision handling

## Common Development Commands

### Build & Run
```bash
npm run build              # Compile TypeScript to dist/
npm run start              # Run production build
npm run start:dev          # Run with file watching (development)
npm run start:debug        # Run with debugger and watch
```

### Testing
```bash
npm run test               # Run unit tests (*.spec.ts in src/)
npm run test:watch         # Run tests in watch mode
npm run test:cov           # Run with coverage report
npm run test:debug         # Debug tests with Node inspector
npm run test:e2e           # Run e2e tests (test/*.e2e-spec.ts)
```

### Code Quality
```bash
npm run lint               # Lint and fix TypeScript files
npm run format             # Format code with Prettier
```

### Key Configuration (`.env`)
```env
PORT=4444                  # HTTP server port
MQTT_URL=mqtt://...        # MQTT broker URL
MQTT_USERNAME/PASSWORD     # MQTT auth (optional)
MQTT_NAMESPACE=sim         # Topic namespace prefix
MQTT_QOS=1                 # MQTT QoS level (0|1|2)
MQTT_RETAINED=true         # Retain published messages
DISCOVERY_ENABLED=true     # Enable Home Assistant discovery
DB_TYPE=sqlite
DB_DATABASE=./data/dev.db  # SQLite file path
DB_SYNCHRONIZE=true        # Auto-sync schema on startup
```

### Device Templates Path
```env
DEVICE_TEMPLATES_PATH=config/device-templates.yaml
```

## Testing Patterns

**Unit tests** (`*.spec.ts`):
- Colocated with source files
- Use Jest + NestJS testing utilities
- Mock repositories and services as needed

**E2E tests** (`test/*.e2e-spec.ts`):
- Test full application stack
- Use supertest for HTTP requests
- Typically mock or connect to real MQTT broker

**Running single tests**:
```bash
npm run test -- devices.service.spec
npm run test:watch -- light.kind
```

## Adding a New Device Kind

1. Create `src/devices/kinds/mynew.kind.ts` with DeviceKind implementation:
   - Define state interface
   - Implement validate, reduce, tick (optional)

2. Export from `kinds/registry.ts` and add to REGISTRY

3. (Optional) Add templates to `config/device-templates.yaml`

4. Write tests in `mynew.kind.spec.ts`

**Key considerations**:
- Validate commands early in `validate()`
- `reduce()` must be pure (no side effects)
- Use `tick()` for sensor drift/noise or cover position updates
- Capabilities control which fields are active in a device instance

## Database

Uses **TypeORM with SQLite**. Schema auto-syncs on startup (configurable).

**Key queries** in DevicesService:
- Find by type, slug, or telemetry interval
- State updates are atomic per device
- Unique constraint on (type, slug) pair

## Extending the API

All REST endpoints are in `DevicesController` and documented with Swagger (`/docs`). The API uses:
- DTOs (Data Transfer Objects) for request validation
- API key security via `x-api-key` header
- Standard HTTP status codes (201 Created, 400 Bad Request, 404 Not Found, etc.)

## Environment & Development Notes

- **TypeScript target**: ES2023, strict null checks enabled
- **Module format**: ESM (nodenext)
- **Decorator support**: Enabled (required for NestJS)
- Jest is configured for `.spec.ts` unit tests; E2E tests use separate Jest config
- The database is created/synced automatically if `DB_SYNCHRONIZE=true`
