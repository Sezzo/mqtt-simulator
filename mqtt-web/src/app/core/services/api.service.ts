import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Device,
  CreateDeviceRequest,
  UpdateDeviceRequest,
  DeviceCommand,
  TelemetryUpdate,
  ListDevicesResponse,
  DeviceKind,
  DeviceTemplate,
  ExportResponse,
  ImportRequest,
  ImportResponse,
} from '../models/device.model';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private apiUrl = 'http://localhost:4444';

  constructor(private http: HttpClient) {}

  // ============ Devices ============

  /**
   * List devices with optional filtering and pagination
   */
  listDevices(
    type?: string,
    slug?: string,
    page: number = 1,
    limit: number = 50
  ): Observable<ListDevicesResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (type) params = params.set('type', type);
    if (slug) params = params.set('slug', slug);

    return this.http.get<ListDevicesResponse>(`${this.apiUrl}/devices`, { params });
  }

  /**
   * Get a single device by ID
   */
  getDevice(id: string): Observable<Device> {
    // The API doesn't have a get by ID endpoint, so we'll fetch all and filter
    // Or we can implement this if needed
    return this.http.get<Device>(`${this.apiUrl}/devices/${id}`);
  }

  /**
   * Create a new device
   */
  createDevice(request: CreateDeviceRequest): Observable<Device> {
    return this.http.post<Device>(`${this.apiUrl}/devices`, request);
  }

  /**
   * Update a device
   */
  updateDevice(id: string, request: UpdateDeviceRequest): Observable<any> {
    return this.http.patch(`${this.apiUrl}/devices/${id}`, request);
  }

  /**
   * Delete a device
   */
  deleteDevice(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/devices/${id}`);
  }

  /**
   * Send a command to a device
   */
  sendCommand(id: string, command: DeviceCommand): Observable<any> {
    return this.http.post(`${this.apiUrl}/devices/${id}/command`, command);
  }

  /**
   * Update device telemetry interval
   */
  updateTelemetry(id: string, telemetry: TelemetryUpdate): Observable<any> {
    return this.http.patch(`${this.apiUrl}/devices/${id}/telemetry`, telemetry);
  }

  /**
   * Refresh device discovery
   */
  refreshDiscovery(id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/devices/${id}/discovery`, {});
  }

  // ============ Device Types & Templates ============

  /**
   * Get list of available device types/kinds
   */
  getDeviceTypes(): Observable<DeviceKind[]> {
    return this.http.get<DeviceKind[]>(`${this.apiUrl}/devices/types`);
  }

  /**
   * Get list of available device templates
   */
  getDeviceTemplates(): Observable<{ ids: string[]; templates: Record<string, DeviceTemplate> }> {
    return this.http.get<{ ids: string[]; templates: Record<string, DeviceTemplate> }>(
      `${this.apiUrl}/devices/templates`
    );
  }

  // ============ Export / Import ============

  /**
   * Export all devices
   */
  exportDevices(): Observable<ExportResponse> {
    return this.http.get<ExportResponse>(`${this.apiUrl}/devices/export/json`);
  }

  /**
   * Import devices
   */
  importDevices(request: ImportRequest): Observable<ImportResponse> {
    return this.http.post<ImportResponse>(`${this.apiUrl}/devices/import/json`, request);
  }

  // ============ Health ============

  /**
   * Check if backend is alive
   */
  checkHealth(): Observable<any> {
    return this.http.get(`${this.apiUrl}/health`);
  }

  /**
   * Check if backend is ready (DB + MQTT connected)
   */
  checkReadiness(): Observable<any> {
    return this.http.get(`${this.apiUrl}/ready`);
  }
}
