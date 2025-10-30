import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject, Observable } from 'rxjs';
import { Device } from '../models/device.model';

@Injectable({
  providedIn: 'root',
})
export class WebsocketService {
  private socket: Socket | null = null;
  private wsUrl = 'http://localhost:4444';

  private connectedSubject = new BehaviorSubject<boolean>(false);
  public connected$ = this.connectedSubject.asObservable();

  private deviceCreatedSubject = new BehaviorSubject<Device | null>(null);
  public deviceCreated$ = this.deviceCreatedSubject.asObservable();

  private deviceUpdatedSubject = new BehaviorSubject<Device | null>(null);
  public deviceUpdated$ = this.deviceUpdatedSubject.asObservable();

  private deviceDeletedSubject = new BehaviorSubject<{ id: string; type: string } | null>(null);
  public deviceDeleted$ = this.deviceDeletedSubject.asObservable();

  private deviceStateChangedSubject = new BehaviorSubject<{ id: string; type: string; state: any } | null>(null);
  public deviceStateChanged$ = this.deviceStateChangedSubject.asObservable();

  constructor() {
    this.setupSocket();
  }

  private setupSocket() {
    this.socket = io(this.wsUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected:', this.socket?.id);
      this.connectedSubject.next(true);
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      this.connectedSubject.next(false);
    });

    this.socket.on('device:created', (device: Device) => {
      console.log('Device created event:', device);
      this.deviceCreatedSubject.next(device);
    });

    this.socket.on('device:updated', (device: Device) => {
      console.log('Device updated event:', device);
      this.deviceUpdatedSubject.next(device);
    });

    this.socket.on('device:deleted', (data: { id: string; type: string }) => {
      console.log('Device deleted event:', data);
      this.deviceDeletedSubject.next(data);
    });

    this.socket.on('device:state:changed', (data: { id: string; type: string; state: any }) => {
      console.log('Device state changed event:', data);
      this.deviceStateChangedSubject.next(data);
    });

    this.socket.on('error', (error: any) => {
      console.error('WebSocket error:', error);
    });
  }

  /**
   * Subscribe to device type updates
   */
  subscribeToDeviceType(type: string) {
    if (!this.socket) return;
    this.socket.emit('subscribe:type', { type });
  }

  /**
   * Unsubscribe from device type updates
   */
  unsubscribeFromDeviceType(type: string) {
    if (!this.socket) return;
    this.socket.emit('unsubscribe:type', { type });
  }

  /**
   * Subscribe to specific device updates
   */
  subscribeToDevice(deviceId: string) {
    if (!this.socket) return;
    this.socket.emit('subscribe:device', { deviceId });
  }

  /**
   * Unsubscribe from specific device updates
   */
  unsubscribeFromDevice(deviceId: string) {
    if (!this.socket) return;
    this.socket.emit('unsubscribe:device', { deviceId });
  }

  /**
   * Disconnect the WebSocket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Reconnect the WebSocket
   */
  reconnect() {
    if (this.socket) {
      this.socket.connect();
    } else {
      this.setupSocket();
    }
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.connectedSubject.value;
  }
}
