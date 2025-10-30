# MQTT Simulator - Vollständiges IoT-Entwicklungssystem

Ein vollständiges IoT-Simulationssystem mit **Backend (NestJS)** und **Frontend (Angular)** für MQTT-basierte Smart-Home-Geräte. Perfekt für Tests, Entwicklung und Integration.

## 📋 Projektstruktur

```
mqtt-simulator/
├── mqtt-sim/              # NestJS Backend
│   ├── src/
│   │   ├── devices/       # Device Management
│   │   ├── mqtt/          # MQTT Integration
│   │   ├── common/        # Shared Utilities
│   │   └── main.ts        # Entry Point
│   ├── config/
│   │   └── device-templates.yaml  # Device Vorlagen
│   └── package.json
│
├── mqtt-web/              # Angular Frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/      # Services & Models
│   │   │   ├── features/  # Dashboard & Devices
│   │   │   └── shared/    # Reusable Components
│   │   └── main.ts
│   └── package.json
│
└── docker-compose.yaml    # Docker Setup
```

## 🚀 Quick Start

### 1. Backend starten

```bash
cd mqtt-sim
npm install
npm run start:dev
```

Backend läuft auf: **http://localhost:4444**
- API Docs: http://localhost:4444/docs
- WebSocket: ws://localhost:4444

### 2. Frontend starten

```bash
cd mqtt-web
npm install
npm run start
```

Frontend läuft auf: **http://localhost:4200**

### 3. MQTT Broker (optional mit Docker)

```bash
docker-compose up -d
```

Mosquitto läuft auf: **mqtt://localhost:1883**

## ✨ Features

### Backend Features
- ✅ REST API für Geräteverwaltung (CRUD)
- ✅ WebSocket Gateway für Echtzeit-Updates
- ✅ MQTT Client für Device Commands & Telemetry
- ✅ 5 Device-Typen: Light, Switch, Sensor, Cover, Fan
- ✅ Pagination & Filtering
- ✅ Import/Export Funktionalität
- ✅ Health Checks
- ✅ Swagger Documentation

### Frontend Features
- ✅ **Dashboard** mit Device-Übersicht
- ✅ **Device Management** (Create/Read/Update/Delete)
- ✅ **Live Control** für jedes Device-Typ
- ✅ **Echtzeit-Updates** via WebSocket
- ✅ **Import/Export** von Geräte-Konfigurationen
- ✅ **Material Design** UI
- ✅ **Responsive** für Desktop/Mobile
- ✅ **Typsicher** (TypeScript)

## 📱 Device-Typen

### Light (Licht)
- Power (On/Off)
- Brightness (0-255)
- Color Temperature (153-500 Mired)
- RGB Color
- Mode switching

### Switch (Schalter)
- Simple On/Off state

### Temperature Sensor
- Live temperature with drift simulation
- Configurable min/max/target
- Noise simulation
- Telemetry updates

### Cover (Motorisierter Vorhang)
- Open/Close/Stop commands
- Position tracking (0-100%)
- Speed configuration
- Invert option

### Fan (Ventilator)
- Multi-speed support (0-3+)
- Configurable max speed

## 🔌 API Endpoints

### Device Management
```
GET    /devices                    # List devices (paginated)
GET    /devices/types              # Available device types
GET    /devices/templates          # Device templates
POST   /devices                    # Create device
PATCH  /devices/:id                # Update device
DELETE /devices/:id                # Delete device
POST   /devices/:id/command        # Send command
PATCH  /devices/:id/telemetry      # Set telemetry interval
POST   /devices/:id/discovery      # Refresh discovery
```

### Import/Export
```
GET    /devices/export/json        # Export all devices
POST   /devices/import/json        # Import devices
```

### Health
```
GET    /health                     # Liveness check
GET    /ready                      # Readiness check
```

## 🌐 WebSocket Events

### Server → Client
```javascript
'device:created'       // { id, type, name, state, ... }
'device:updated'       // { id, type, name, ... }
'device:deleted'       // { id, type }
'device:state:changed' // { id, type, state }
```

### Client → Server
```javascript
'subscribe:type'       // { type: 'light' }
'subscribe:device'     // { deviceId: 'uuid' }
'unsubscribe:type'     // { type: 'light' }
'unsubscribe:device'   // { deviceId: 'uuid' }
```

## ⚙️ Konfiguration

### Backend (.env)
```env
PORT=4444
MQTT_URL=mqtt://localhost:1883
MQTT_USERNAME=admin
MQTT_PASSWORD=password
MQTT_NAMESPACE=sim
MQTT_QOS=1
MQTT_RETAINED=true
DISCOVERY_ENABLED=true
CORS_ORIGIN=http://localhost:4200
DB_TYPE=sqlite
DB_DATABASE=./data/dev.db
DB_SYNCHRONIZE=true
DEVICE_TEMPLATES_PATH=config/device-templates.yaml
```

### Frontend (src/app/core/services/api.service.ts)
```typescript
private apiUrl = 'http://localhost:4444';
// WebSocket auch auf 4444
```

## 🧪 Testing

### Backend Tests
```bash
cd mqtt-sim
npm run test              # Unit tests
npm run test:e2e          # E2E tests
npm run test:cov          # Coverage
```

### Frontend Tests (Angular CLI)
```bash
cd mqtt-web
ng test                   # Unit tests
ng e2e                    # E2E tests
```

## 📦 Deployment

### Docker Compose
```bash
docker-compose up -d
```

Services:
- **mqtt-sim** (Backend): http://localhost:4444
- **mqtt-web** (Frontend): http://localhost:3000
- **mosquitto** (MQTT Broker): localhost:1883

### Manual Production Build

**Backend:**
```bash
cd mqtt-sim
npm run build
npm run start
```

**Frontend:**
```bash
cd mqtt-web
ng build --configuration production
ng serve --prod
```

## 🔧 Development Commands

### Backend
```bash
npm run start:dev        # Development with hot reload
npm run start:debug      # Debug mode
npm run build            # Build for production
npm run lint             # Linting
npm run format           # Code formatting
```

### Frontend
```bash
ng serve                 # Development server
ng build                 # Production build
ng test                  # Unit tests
ng lint                  # Linting
```

## 🏗️ Architecture

### Backend (NestJS)
- **Modular Design**: DevicesModule, MqttModule
- **REST API**: DevicesController
- **WebSocket**: DevicesGateway
- **Services**: DevicesService, MqttService
- **Database**: TypeORM + SQLite
- **Device System**: Kind-based architecture

### Frontend (Angular)
- **Standalone Components**: Moderne Angular standalone pattern
- **Services**: ApiService, WebsocketService, DeviceStateService
- **Reactive**: RxJS Observables, BehaviorSubjects
- **UI Framework**: Angular Material
- **Routing**: Feature-based routing structure

## 🔐 Security Notes

- CORS konfiguriert für Frontend-Kommunikation
- API Key Header definiert (optional aktivierbar)
- WebSocket auf localhost standardmäßig
- Empfohlen: HTTPS/WSS für Produktions-Umgebung

## 📚 Zusätzliche Ressourcen

- **Backend Docs**: [CLAUDE.md](mqtt-sim/CLAUDE.md)
- **Angular Docs**: https://angular.io
- **NestJS Docs**: https://docs.nestjs.com
- **Material Design**: https://material.io

## 🤝 Erweiterung

### Neuen Device-Type hinzufügen:
1. Neue Datei in `mqtt-sim/src/devices/kinds/` erstellen
2. `DeviceKind` Interface implementieren
3. In `registry.ts` registrieren
4. Template in `device-templates.yaml` hinzufügen

### Neue Features im Frontend:
1. Component in `src/app/features/` erstellen
2. Route in `app.routes.ts` hinzufügen
3. Service in `src/app/core/services/` bei Bedarf

## 📝 License

MIT License - Frei verwendbar

## 👨‍💻 Author

Erstellt mit Claude Code für IoT-Entwicklung

---

**Version**: 1.0.0
**Last Updated**: Oktober 2025
