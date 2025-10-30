/**
 * Device Models - TypeScript interfaces for MQTT Simulator API
 */

export interface Device {
  id: string;
  type: string;
  name: string;
  slug: string;
  capabilities: Record<string, any>;
  templateId?: string;
  topicBase: string;
  retained: boolean;
  telemetryIntervalSec: number;
  createdAt?: string;
  updatedAt?: string;
  state?: DeviceState;
  topics?: DeviceTopics;
}

export interface DeviceState {
  deviceId: string;
  data: Record<string, any>;
}

export interface DeviceTopics {
  cmd: string;
  state: string;
  status: string;
  discovery: string;
}

export interface CreateDeviceRequest {
  type: string;
  name: string;
  slug?: string;
  templateId?: string;
  capabilities?: Record<string, any>;
}

export interface UpdateDeviceRequest {
  name?: string;
  capabilities?: Record<string, any>;
  templateId?: string;
}

export interface DeviceCommand {
  [key: string]: any;
}

export interface TelemetryUpdate {
  intervalSec: number;
}

export interface DeviceKind {
  id: string;
  title: string;
  displayName?: string;
  description?: string;
  capabilities: Record<string, any>;
}

export interface DeviceTemplate {
  id?: string;
  kind: string;
  title: string;
  displayName?: string;
  description?: string;
  capabilities: Record<string, any>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ListDevicesResponse extends PaginatedResponse<Device> {}

export interface ExportResponse {
  version: number;
  exportedAt: string;
  namespace: string;
  count: number;
  devices: Device[];
}

export interface ImportRequest {
  devices: Partial<Device>[];
  replaceAll?: boolean;
}

export interface ImportResponse {
  created: number;
  updated: number;
  unchanged: number;
  deleted: number;
  errors: number;
  details: any[];
}

// Device type constants
export const DEVICE_TYPES = {
  LIGHT: 'light',
  SWITCH: 'switch',
  SENSOR_TEMP: 'sensor.temp',
  COVER: 'cover',
  FAN: 'fan',
} as const;

export type DeviceType = typeof DEVICE_TYPES[keyof typeof DEVICE_TYPES];
