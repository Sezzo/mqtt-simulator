import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject, combineLatest } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { Device, ListDevicesResponse } from '../models/device.model';
import { ApiService } from './api.service';
import { WebsocketService } from './websocket.service';

@Injectable({
  providedIn: 'root',
})
export class DeviceStateService {
  private devicesSubject = new BehaviorSubject<Device[]>([]);
  public devices$ = this.devicesSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  private errorSubject = new Subject<string>();
  public error$ = this.errorSubject.asObservable();

  private currentPageSubject = new BehaviorSubject<number>(1);
  private currentLimitSubject = new BehaviorSubject<number>(50);
  private totalDevicesSubject = new BehaviorSubject<number>(0);
  public pagination$ = combineLatest([
    this.currentPageSubject.asObservable(),
    this.currentLimitSubject.asObservable(),
    this.totalDevicesSubject.asObservable(),
  ]).pipe(
    map(([page, limit, total]: [number, number, number]) => ({
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    }))
  );

  constructor(private api: ApiService, private ws: WebsocketService) {
    this.setupWebSocketListeners();
  }

  /**
   * Load devices from API
   */
  loadDevices(type?: string, slug?: string, page: number = 1, limit: number = 50) {
    this.loadingSubject.next(true);
    this.api.listDevices(type, slug, page, limit).subscribe({
      next: (response: ListDevicesResponse) => {
        this.devicesSubject.next(response.data);
        this.currentPageSubject.next(response.pagination.page);
        this.currentLimitSubject.next(response.pagination.limit);
        this.totalDevicesSubject.next(response.pagination.total);
        this.loadingSubject.next(false);
      },
      error: (error) => {
        this.errorSubject.next(`Failed to load devices: ${error.message}`);
        this.loadingSubject.next(false);
      },
    });
  }

  /**
   * Get current devices list
   */
  getDevices(): Device[] {
    return this.devicesSubject.value;
  }

  /**
   * Get device by ID
   */
  getDevice(id: string): Device | undefined {
    return this.devicesSubject.value.find((d) => d.id === id);
  }

  /**
   * Get observable of specific device
   */
  getDeviceObservable(id: string): Observable<Device | undefined> {
    return this.devices$.pipe(map((devices) => devices.find((d) => d.id === id)));
  }

  /**
   * Add device to local state
   */
  addDevice(device: Device) {
    const current = this.devicesSubject.value;
    this.devicesSubject.next([...current, device]);
    this.totalDevicesSubject.next(this.totalDevicesSubject.value + 1);
  }

  /**
   * Update device in local state
   */
  updateDeviceLocal(device: Device) {
    const current = this.devicesSubject.value;
    const index = current.findIndex((d) => d.id === device.id);
    if (index !== -1) {
      const updated = [...current];
      updated[index] = device;
      this.devicesSubject.next(updated);
    }
  }

  /**
   * Update device state in local state
   */
  updateDeviceState(id: string, state: any) {
    const current = this.devicesSubject.value;
    const device = current.find((d) => d.id === id);
    if (device && device.state) {
      device.state.data = state;
      this.updateDeviceLocal(device);
    }
  }

  /**
   * Remove device from local state
   */
  removeDevice(id: string) {
    const current = this.devicesSubject.value;
    this.devicesSubject.next(current.filter((d) => d.id !== id));
    this.totalDevicesSubject.next(this.totalDevicesSubject.value - 1);
  }

  /**
   * Setup WebSocket listeners for real-time updates
   */
  private setupWebSocketListeners() {
    // Listen for new devices
    this.ws.deviceCreated$.subscribe((device) => {
      if (device) {
        this.addDevice(device);
      }
    });

    // Listen for device updates
    this.ws.deviceUpdated$.subscribe((device) => {
      if (device) {
        this.updateDeviceLocal(device);
      }
    });

    // Listen for device deletions
    this.ws.deviceDeleted$.subscribe((data) => {
      if (data) {
        this.removeDevice(data.id);
      }
    });

    // Listen for state changes
    this.ws.deviceStateChanged$.subscribe((data) => {
      if (data) {
        this.updateDeviceState(data.id, data.state);
      }
    });
  }

  /**
   * Clear error
   */
  clearError() {
    this.errorSubject.next('');
  }
}
