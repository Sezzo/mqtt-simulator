import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-export-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Geräte exportieren</h2>
    <mat-dialog-content>
      <p>Alle Geräte und ihre Zustände als JSON exportieren.</p>
      <button mat-raised-button color="primary" (click)="export()" class="export-btn">
        <mat-icon>download</mat-icon>
        JSON herunterladen
      </button>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-button (click)="close()">Schließen</button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      padding: 24px;

      .export-btn {
        margin-top: 12px;
      }
    }

    mat-dialog-actions {
      justify-content: flex-end;
      padding: 12px;
      gap: 8px;
    }
  `],
})
export class ExportDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<ExportDialogComponent>,
    private api: ApiService
  ) {}

  export() {
    this.api.exportDevices().subscribe({
      next: (data) => {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mqtt-devices-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.close();
      },
      error: (err) => {
        console.error('Export failed:', err);
      },
    });
  }

  close() {
    this.dialogRef.close();
  }
}
