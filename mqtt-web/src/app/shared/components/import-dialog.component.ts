import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormBuilder, ReactiveFormsModule, FormGroup } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { DeviceStateService } from '../../core/services/device-state.service';

@Component({
  selector: 'app-import-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
  ],
  template: `
    <h2 mat-dialog-title>Geräte importieren</h2>
    <mat-dialog-content>
      <p>JSON-Datei mit Geräten importieren.</p>

      <form [formGroup]="form">
        <input
          #fileInput
          type="file"
          accept=".json"
          style="display: none"
          (change)="onFileSelected($event)"
        />

        <button
          type="button"
          mat-raised-button
          color="primary"
          (click)="fileInput.click()"
          class="import-btn"
        >
          <mat-icon>upload</mat-icon>
          Datei wählen
        </button>

        <mat-checkbox formControlName="replaceAll" class="checkbox">
          Alle bestehenden Geräte ersetzen
        </mat-checkbox>

        <div *ngIf="fileName" class="file-info">
          Datei: <strong>{{ fileName }}</strong>
        </div>

        <button
          type="button"
          mat-raised-button
          color="accent"
          (click)="import()"
          [disabled]="!fileContent || importing"
          class="import-btn"
        >
          <mat-icon>{{ importing ? 'hourglass_empty' : 'import_export' }}</mat-icon>
          {{ importing ? 'Wird importiert...' : 'Importieren' }}
        </button>
      </form>

      <div *ngIf="importResult" class="import-result">
        <h4>Import-Ergebnis</h4>
        <p>Erstellt: {{ importResult.created }}</p>
        <p>Aktualisiert: {{ importResult.updated }}</p>
        <p>Unverändert: {{ importResult.unchanged }}</p>
        <p *ngIf="importResult.errors">Fehler: {{ importResult.errors }}</p>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-button (click)="close()">Schließen</button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      padding: 24px;

      .import-btn {
        margin-bottom: 12px;
        margin-right: 12px;
      }

      .checkbox {
        display: block;
        margin: 12px 0;
      }

      .file-info {
        padding: 12px;
        background-color: #f5f5f5;
        border-radius: 4px;
        margin: 12px 0;
        font-size: 0.875rem;
      }

      .import-result {
        padding: 12px;
        background-color: #e8f5e9;
        border-left: 4px solid #4caf50;
        border-radius: 4px;
        margin-top: 16px;

        h4 {
          margin: 0 0 8px 0;
          color: #2e7d32;
        }

        p {
          margin: 4px 0;
          color: #333;
          font-size: 0.875rem;
        }
      }
    }

    mat-dialog-actions {
      justify-content: flex-end;
      padding: 12px;
      gap: 8px;
    }
  `],
})
export class ImportDialogComponent {
  form: FormGroup;
  fileContent: string | null = null;
  fileName: string | null = null;
  importing = false;
  importResult: any = null;

  constructor(
    private dialogRef: MatDialogRef<ImportDialogComponent>,
    private api: ApiService,
    private deviceState: DeviceStateService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      replaceAll: [false],
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.fileName = file.name;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.fileContent = e.target.result;
      };
      reader.readAsText(file);
    }
  }

  import() {
    if (!this.fileContent) return;

    this.importing = true;
    try {
      const data = JSON.parse(this.fileContent);
      const request = {
        devices: data.devices || data,
        replaceAll: this.form.get('replaceAll')?.value,
      };

      this.api.importDevices(request).subscribe({
        next: (result) => {
          this.importResult = result;
          this.importing = false;
          this.deviceState.loadDevices();
        },
        error: (err) => {
          console.error('Import failed:', err);
          this.importing = false;
        },
      });
    } catch (err) {
      console.error('Invalid JSON:', err);
      this.importing = false;
    }
  }

  close() {
    this.dialogRef.close();
  }
}
