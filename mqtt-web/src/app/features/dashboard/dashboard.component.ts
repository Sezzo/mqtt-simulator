import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

import { Device } from '../../core/models/device.model';
import { DeviceStateService } from '../../core/services/device-state.service';
import { ApiService } from '../../core/services/api.service';
import { ExportDialogComponent } from '../../shared/components/export-dialog.component';
import { ImportDialogComponent } from '../../shared/components/import-dialog.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatTabsModule,
    MatTooltipModule,
    RouterLink,
    DragDropModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  selectedType: string | null = null;
  allDeviceTypes: string[] = [];
  devices: Device[] = [];

  // Observables
  devices$: Observable<Device[]>;
  loading$: Observable<boolean>;
  error$: Observable<string>;
  pagination$: Observable<{page: number; limit: number; total: number; pages: number}>;

  // Lifecycle management
  private destroy$ = new Subject<void>();

  constructor(
    public deviceState: DeviceStateService,
    private api: ApiService,
    private dialog: MatDialog
  ) {
    this.devices$ = this.deviceState.devices$;
    this.loading$ = this.deviceState.loading$;
    this.error$ = this.deviceState.error$;
    this.pagination$ = this.deviceState.pagination$;
  }

  ngOnInit() {
    this.loadInitialData();
    this.loadDeviceTypes();

    // Subscribe to devices and load saved order
    this.devices$
      .pipe(takeUntil(this.destroy$))
      .subscribe(devices => {
        const savedOrder = this.loadDeviceOrder();
        if (savedOrder && savedOrder.length === devices.length) {
          const deviceMap = new Map(devices.map(d => [d.id, d]));
          this.devices = savedOrder.map(id => deviceMap.get(id)).filter((d): d is Device => !!d);
        } else {
          this.devices = devices;
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadInitialData() {
    this.deviceState.loadDevices();
  }

  private loadDeviceTypes() {
    this.api.getDeviceTypes().subscribe({
      next: (kinds) => {
        this.allDeviceTypes = kinds.map((k) => k.id);
      },
    });
  }

  filterByType(type: string | null) {
    this.selectedType = type;
    if (type) {
      this.deviceState.loadDevices(type);
    } else {
      this.deviceState.loadDevices();
    }
  }

  toggleLightPower(device: Device, event: Event) {
    event.stopPropagation();
    const currentState = device.state?.data?.['state'];
    const newState = currentState === 'ON' ? 'OFF' : 'ON';

    this.api.sendCommand(device.id, { state: newState }).subscribe({
      next: () => {
        // Update local state optimistically
        if (device.state?.data) {
          device.state.data['state'] = newState;
          this.deviceState.updateDeviceLocal(device);
        }
      },
      error: (err) => {
        console.error('Failed to toggle light:', err);
      },
    });
  }

  deleteDevice(device: Device, event: Event) {
    event.stopPropagation();
    if (confirm(`Gerät "${device.name}" löschen?`)) {
      this.api.deleteDevice(device.id).subscribe({
        next: () => {
          this.deviceState.removeDevice(device.id);
        },
        error: (err) => {
          console.error('Failed to delete device:', err);
        },
      });
    }
  }

  trackByDeviceId(index: number, device: Device): string {
    return device.id;
  }

  getStateValue(device: Device, key: string): any {
    return device.state?.data?.[key];
  }

  getDeviceIcon(type: string): string {
    switch (type) {
      case 'light':
        return 'lightbulb';
      case 'switch':
        return 'toggle_on';
      case 'sensor.temp':
        return 'thermostat';
      case 'cover':
        return 'window';
      case 'fan':
        return 'air';
      default:
        return 'devices';
    }
  }

  getDeviceColor(type: string): string {
    switch (type) {
      case 'light':
        return '#FFC107';
      case 'switch':
        return '#2196F3';
      case 'sensor.temp':
        return '#FF5722';
      case 'cover':
        return '#9C27B0';
      case 'fan':
        return '#4CAF50';
      default:
        return '#757575';
    }
  }

  openExportDialog() {
    this.dialog.open(ExportDialogComponent, {
      width: '400px',
    });
  }

  openImportDialog() {
    this.dialog.open(ImportDialogComponent, {
      width: '400px',
    });
  }

  drop(event: CdkDragDrop<Device[]>) {
    if (event.previousIndex !== event.currentIndex) {
      moveItemInArray(this.devices, event.previousIndex, event.currentIndex);
      this.saveDeviceOrder();
    }
  }

  private saveDeviceOrder() {
    const order = this.devices.map(d => d.id);
    localStorage.setItem('deviceOrder', JSON.stringify(order));
  }

  private loadDeviceOrder(): string[] | null {
    const stored = localStorage.getItem('deviceOrder');
    return stored ? JSON.parse(stored) : null;
  }
}
