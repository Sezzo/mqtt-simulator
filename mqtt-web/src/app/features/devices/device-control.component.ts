import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSliderModule } from '@angular/material/slider';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { Device, DEVICE_TYPES } from '../../core/models/device.model';
import { DeviceStateService } from '../../core/services/device-state.service';
import { ApiService } from '../../core/services/api.service';
import { WebsocketService } from '../../core/services/websocket.service';

@Component({
  selector: 'app-device-control',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatSliderModule,
    MatSelectModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="control-container" *ngIf="device$ | async as device">
      <button mat-icon-button (click)="goBack()" class="back-btn">
        <mat-icon>arrow_back</mat-icon>
      </button>

      <h1>Steuer: {{ $any(device).name }}</h1>

      <mat-card>
        <mat-card-content>
          <!-- Light Control -->
          <ng-container *ngIf="$any(device).type === 'light'">
            <h2>Licht-Steuerung</h2>

            <div class="control-group">
              <button
                mat-raised-button
                (click)="sendCommand($any(device), { state: 'ON' })"
                color="accent"
                class="full-width"
              >
                <mat-icon>lightbulb</mat-icon>
                An
              </button>
              <button
                mat-raised-button
                (click)="sendCommand($any(device), { state: 'OFF' })"
                class="full-width"
              >
                <mat-icon>lightbulb_outline</mat-icon>
                Aus
              </button>
            </div>

            <!-- Brightness -->
            <div class="control-group" *ngIf="$any(device).capabilities?.brightness">
              <label>Helligkeit</label>
              <mat-slider min="0" max="255" step="1">
                <input matSliderThumb (change)="onBrightnessChange($any(device), $event)" />
              </mat-slider>
            </div>

            <!-- Color Temperature -->
            <div class="control-group" *ngIf="$any(device).capabilities?.colorTemperature">
              <label>Farbtemperatur</label>
              <mat-slider min="153" max="500" step="1">
                <input matSliderThumb (change)="onColorTemperatureChange($any(device), $event)" />
              </mat-slider>
            </div>
          </ng-container>

          <!-- Switch Control -->
          <ng-container *ngIf="$any(device).type === 'switch'">
            <h2>Schalter-Steuerung</h2>

            <div class="control-group">
              <button
                mat-raised-button
                (click)="sendCommand($any(device), { state: 'ON' })"
                color="accent"
                class="full-width"
              >
                <mat-icon>toggle_on</mat-icon>
                An
              </button>
              <button
                mat-raised-button
                (click)="sendCommand($any(device), { state: 'OFF' })"
                class="full-width"
              >
                <mat-icon>toggle_off</mat-icon>
                Aus
              </button>
            </div>
          </ng-container>

          <!-- Cover Control -->
          <ng-container *ngIf="$any(device).type === 'cover'">
            <h2>Vorhang-Steuerung</h2>

            <div class="control-group">
              <button
                mat-raised-button
                (click)="sendCommand($any(device), { action: 'OPEN' })"
                color="accent"
                class="full-width"
              >
                <mat-icon>unfold_more</mat-icon>
                Öffnen
              </button>
              <button
                mat-raised-button
                (click)="sendCommand($any(device), { action: 'STOP' })"
                class="full-width"
              >
                <mat-icon>pause</mat-icon>
                Stop
              </button>
              <button
                mat-raised-button
                (click)="sendCommand($any(device), { action: 'CLOSE' })"
                class="full-width"
              >
                <mat-icon>unfold_less</mat-icon>
                Schließen
              </button>
            </div>

            <!-- Position -->
            <div class="control-group" *ngIf="$any(device).capabilities?.position">
              <label>Position (%)</label>
              <mat-slider min="0" max="100" step="1">
                <input matSliderThumb (change)="onPositionChange($any(device), $event)" />
              </mat-slider>
            </div>
          </ng-container>

          <!-- Fan Control -->
          <ng-container *ngIf="$any(device).type === 'fan'">
            <h2>Ventilator-Steuerung</h2>

            <div class="control-group">
              <mat-form-field>
                <mat-label>Geschwindigkeit</mat-label>
                <mat-select (change)="sendCommand($any(device), { speed: $any($event.target).value })">
                  <mat-option value="0">Aus</mat-option>
                  <mat-option value="1">Langsam</mat-option>
                  <mat-option value="2">Mittel</mat-option>
                  <mat-option value="3">Schnell</mat-option>
                </mat-select>
              </mat-form-field>
            </div>
          </ng-container>

          <!-- Temp Sensor (Read-Only) -->
          <ng-container *ngIf="$any(device).type === 'sensor.temp'">
            <h2>Temperatursensor</h2>

            <div class="sensor-display">
              <div class="temp-value">{{ $any(device).state?.data?.temperature }}°C</div>
              <p class="sensor-note">Nur Lesezugriff - Telemetrie alle {{ $any(device).telemetryIntervalSec }}s</p>
            </div>
          </ng-container>

          <!-- Device State Display -->
          <div class="state-display">
            <h3>Aktueller Zustand</h3>
            <pre>{{ $any(device).state?.data | json }}</pre>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .control-container {
      max-width: 600px;
      margin: 0 auto;
      padding: 24px 16px;

      .back-btn {
        margin-bottom: 16px;
      }

      h1 {
        margin-bottom: 24px;
      }

      h2 {
        margin-top: 0;
        margin-bottom: 16px;
        font-size: 1.1rem;
      }

      h3 {
        margin-top: 24px;
        margin-bottom: 12px;
        font-size: 0.95rem;
      }

      .control-group {
        margin-bottom: 24px;

        label {
          display: block;
          margin-bottom: 12px;
          font-weight: 500;
          font-size: 0.875rem;
        }

        button.full-width {
          width: 100%;
          margin-bottom: 8px;

          mat-icon {
            margin-right: 8px;
          }

          &:last-child {
            margin-bottom: 0;
          }
        }
      }

      mat-form-field {
        width: 100%;
      }

      .sensor-display {
        text-align: center;
        padding: 24px;
        background-color: #f5f5f5;
        border-radius: 8px;

        .temp-value {
          font-size: 2.5rem;
          font-weight: 300;
          color: #ff5722;
        }

        .sensor-note {
          margin: 12px 0 0 0;
          font-size: 0.875rem;
          color: #999;
        }
      }

      .state-display {
        background-color: #f5f5f5;
        border-radius: 4px;
        padding: 12px;
        margin-top: 24px;

        pre {
          margin: 0;
          font-size: 0.75rem;
          overflow-x: auto;
          max-height: 200px;
        }
      }
    }
  `],
})
export class DeviceControlComponent implements OnInit, OnDestroy {
  deviceId: string | null = null;
  device$: Observable<Device | undefined> | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    public deviceState: DeviceStateService,
    private api: ApiService,
    private router: Router,
    private websocket: WebsocketService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.route.params.subscribe((params) => {
      this.deviceId = params['id'];
      // Filter device observable
      if (this.deviceId) {
        this.device$ = this.deviceState.getDeviceObservable(this.deviceId);
        // Subscribe to WebSocket updates for this specific device
        this.websocket.subscribeToDevice(this.deviceId);
      }
    });
  }

  ngOnDestroy() {
    // Unsubscribe from device updates when leaving component
    if (this.deviceId) {
      this.websocket.unsubscribeFromDevice(this.deviceId);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Helper method to parse string values to numbers for slider inputs
   */
  parseNumber(value: any): number {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Handle brightness slider change
   */
  onBrightnessChange(device: Device, event: Event): void {
    const value = this.parseNumber((event.target as HTMLInputElement).value);
    this.sendCommand(device, { brightness: value });
  }

  /**
   * Handle color temperature slider change
   */
  onColorTemperatureChange(device: Device, event: Event): void {
    const value = this.parseNumber((event.target as HTMLInputElement).value);
    this.sendCommand(device, { colorTemperature: value });
  }

  /**
   * Handle position slider change (for covers)
   */
  onPositionChange(device: Device, event: Event): void {
    const value = this.parseNumber((event.target as HTMLInputElement).value);
    this.sendCommand(device, { position: value });
  }

  sendCommand(device: Device, command: any) {
    console.log('Sending command to device', device.id, ':', command);
    this.api.sendCommand(device.id, command).subscribe({
      next: () => {
        this.snackBar.open('Befehl erfolgreich gesendet', 'OK', { duration: 2000 });
        console.log('Command sent successfully:', command);
      },
      error: (err) => {
        console.error('Failed to send command:', err);
        this.snackBar.open('Fehler beim Senden des Befehls: ' + (err?.error?.message || err?.message), 'OK', { duration: 3000 });
      },
    });
  }

  goBack() {
    this.router.navigate(['/']);
  }
}
