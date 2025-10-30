// src/devices/devices.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

/**
 * WebSocket Gateway for real-time device updates
 *
 * Events emitted to clients:
 * - device:created: New device created
 * - device:updated: Device updated (name, capabilities, etc.)
 * - device:deleted: Device deleted
 * - device:state:changed: Device state changed (e.g., light turned on)
 *
 * Clients can subscribe to:
 * - All devices: room 'devices:all'
 * - Specific type: room 'devices:type:{type}' (e.g., 'devices:type:light')
 * - Specific device: room 'devices:id:{id}'
 */
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },
})
export class DevicesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('DevicesGateway');

  constructor() {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    // Auto-subscribe to all devices updates
    client.join('devices:all');
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Client subscribes to specific device type updates
   * Usage: socket.emit('subscribe:type', { type: 'light' })
   */
  @SubscribeMessage('subscribe:type')
  handleSubscribeType(client: Socket, data: { type: string }) {
    const room = `devices:type:${data.type}`;
    client.join(room);
    this.logger.debug(`Client ${client.id} subscribed to ${room}`);
  }

  /**
   * Client unsubscribes from specific device type updates
   */
  @SubscribeMessage('unsubscribe:type')
  handleUnsubscribeType(client: Socket, data: { type: string }) {
    const room = `devices:type:${data.type}`;
    client.leave(room);
    this.logger.debug(`Client ${client.id} unsubscribed from ${room}`);
  }

  /**
   * Client subscribes to specific device updates
   * Usage: socket.emit('subscribe:device', { deviceId: 'uuid-here' })
   */
  @SubscribeMessage('subscribe:device')
  handleSubscribeDevice(client: Socket, data: { deviceId: string }) {
    const room = `devices:id:${data.deviceId}`;
    client.join(room);
    this.logger.debug(`Client ${client.id} subscribed to ${room}`);
  }

  /**
   * Client unsubscribes from specific device updates
   */
  @SubscribeMessage('unsubscribe:device')
  handleUnsubscribeDevice(client: Socket, data: { deviceId: string }) {
    const room = `devices:id:${data.deviceId}`;
    client.leave(room);
    this.logger.debug(`Client ${client.id} unsubscribed from ${room}`);
  }

  // ========== Methods called by DevicesService ==========

  /**
   * Emit device created event
   */
  emitDeviceCreated(device: any) {
    this.server.to('devices:all').emit('device:created', device);
    this.server.to(`devices:type:${device.type}`).emit('device:created', device);
  }

  /**
   * Emit device updated event
   */
  emitDeviceUpdated(device: any) {
    this.server.to('devices:all').emit('device:updated', device);
    this.server.to(`devices:type:${device.type}`).emit('device:updated', device);
    this.server.to(`devices:id:${device.id}`).emit('device:updated', device);
  }

  /**
   * Emit device deleted event
   */
  emitDeviceDeleted(deviceId: string, type: string) {
    this.server.to('devices:all').emit('device:deleted', { id: deviceId, type });
    this.server.to(`devices:type:${type}`).emit('device:deleted', { id: deviceId, type });
    this.server.to(`devices:id:${deviceId}`).emit('device:deleted', { id: deviceId, type });
  }

  /**
   * Emit device state changed event
   * Called when telemetry updates or commands change device state
   */
  emitDeviceStateChanged(deviceId: string, type: string, state: any) {
    this.server.to('devices:all').emit('device:state:changed', { id: deviceId, type, state });
    this.server.to(`devices:type:${type}`).emit('device:state:changed', { id: deviceId, type, state });
    this.server.to(`devices:id:${deviceId}`).emit('device:state:changed', { id: deviceId, type, state });
  }
}
