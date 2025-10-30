import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { WebsocketService } from './core/services/websocket.service';
import { DeviceStateService } from './core/services/device-state.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  template: `
    <mat-toolbar color="primary">
      <span class="toolbar-spacer"></span>
      <h1 class="app-title">🔌 MQTT Simulator</h1>
      <span class="toolbar-spacer"></span>
      <button
        mat-icon-button
        [matTooltip]="(ws.connected$ | async) ? 'WebSocket: Verbunden' : 'WebSocket: Getrennt'"
        [class.connected]="ws.connected$ | async"
      >
        <mat-icon>{{ (ws.connected$ | async) ? 'cloud_done' : 'cloud_off' }}</mat-icon>
      </button>
      <button
        mat-raised-button
        color="accent"
        routerLink="/devices/new"
      >
        <mat-icon>add</mat-icon>
        Gerät erstellen
      </button>
    </mat-toolbar>

    <mat-progress-bar
      *ngIf="ds.loading$ | async"
      mode="indeterminate"
    ></mat-progress-bar>

    <main>
      <router-outlet></router-outlet>
    </main>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100vh;
    }

    mat-toolbar {
      display: flex;
      align-items: center;
      gap: 16px;

      .toolbar-spacer {
        flex: 1 1 auto;
      }

      .app-title {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 500;
        letter-spacing: -0.5px;
      }

      button[color="accent"] {
        mat-icon {
          margin-right: 8px;
        }
      }
    }

    mat-progress-bar {
      position: absolute;
      top: 64px;
      left: 0;
      right: 0;
    }

    main {
      flex: 1;
      overflow-y: auto;
      background-color: #fafafa;
    }
  `],
})
export class App implements OnInit {
  constructor(
    public ws: WebsocketService,
    public ds: DeviceStateService,
  ) {}

  ngOnInit() {
    // Load initial data
    this.ds.loadDevices();
  }
}
