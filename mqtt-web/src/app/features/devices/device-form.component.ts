import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';

import { ApiService } from '../../core/services/api.service';
import { DeviceStateService } from '../../core/services/device-state.service';
import { DeviceKind, DeviceTemplate } from '../../core/models/device.model';

@Component({
  selector: 'app-device-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatOptionModule,
    MatCardModule,
    MatIconModule,
    MatTooltipModule,
  ],
  template: `
    <div class="form-container">
      <h1>{{ isEdit ? 'Gerät bearbeiten' : 'Neues Gerät' }}</h1>

      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <mat-card>
          <mat-card-content>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label matTooltip="Wählen Sie den Gerätetyp aus" matTooltipPosition="above">Gerätetyp</mat-label>
              <mat-select
                formControlName="type"
                [disabled]="isEdit"
                matTooltip="Der Gerätetyp kann nach dem Erstellen nicht geändert werden"
                matTooltipPosition="above"
                [matTooltipDisabled]="!isEdit"
              >
                <mat-option *ngFor="let kind of deviceTypes" [value]="kind.id">
                  {{ kind.title }}
                </mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label matTooltip="Eindeutiger Name für das Gerät" matTooltipPosition="above">Name</mat-label>
              <input
                matInput
                formControlName="name"
                required
                matTooltip="Geben Sie einen aussagekräftigen Namen ein"
                matTooltipPosition="above"
              />
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width" *ngIf="!isEdit">
              <mat-label matTooltip="Wird automatisch generiert" matTooltipPosition="above">Slug (optional)</mat-label>
              <input
                matInput
                formControlName="slug"
                matTooltip="URL-freundliche Bezeichnung (wird automatisch generiert)"
                matTooltipPosition="above"
              />
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label matTooltip="Vordefinierte Konfiguration" matTooltipPosition="above">Template (optional)</mat-label>
              <mat-select
                formControlName="templateId"
                matTooltip="Wählen Sie ein vordefiniertes Template mit optimierten Einstellungen"
                matTooltipPosition="above"
              >
                <mat-option></mat-option>
                <mat-option *ngFor="let template of deviceTemplates" [value]="template.id">
                  {{ template.title }}
                </mat-option>
              </mat-select>
            </mat-form-field>
          </mat-card-content>

          <mat-card-actions>
            <button
              type="button"
              mat-stroked-button
              (click)="onCancel()"
              matTooltip="Zurück zum Dashboard ohne Änderungen zu speichern"
              matTooltipPosition="above"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              mat-raised-button
              color="primary"
              [disabled]="!form.valid || submitting"
              [matTooltip]="!form.valid ? 'Bitte füllen Sie alle erforderlichen Felder aus' : 'Speichern und zum Dashboard zurückkehren'"
              matTooltipPosition="above"
            >
              {{ submitting ? 'Wird gespeichert...' : 'Speichern' }}
            </button>
          </mat-card-actions>
        </mat-card>
      </form>
    </div>
  `,
  styles: [`
    .form-container {
      max-width: 500px;
      margin: 32px auto;
      padding: 0 16px;
    }

    h1 {
      margin-bottom: 24px;
      font-size: 2rem;
      font-weight: 300;
    }

    mat-card-content {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .full-width {
      width: 100%;
      margin: 0;
    }

    mat-card-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      padding: 16px 24px;
    }
  `],
})
export class DeviceFormComponent implements OnInit {
  form: FormGroup;
  isEdit = false;
  submitting = false;
  deviceTypes: DeviceKind[] = [];
  deviceTemplates: DeviceTemplate[] = [];
  deviceId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private deviceState: DeviceStateService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.form = this.fb.group({
      type: ['light', Validators.required],
      name: ['', [Validators.required, Validators.minLength(1)]],
      slug: [''],
      templateId: [''],
    });
  }

  ngOnInit() {
    this.loadDeviceTypes();
    this.loadDeviceTemplates();

    // Check if we're editing
    this.route.params.subscribe((params) => {
      if (params['id']) {
        this.isEdit = true;
        this.deviceId = params['id'];
        this.loadDeviceData();
        this.form.get('type')?.disable();
        this.form.get('slug')?.disable();
      }
    });
  }

  private loadDeviceTypes() {
    this.api.getDeviceTypes().subscribe({
      next: (kinds) => (this.deviceTypes = kinds),
    });
  }

  private loadDeviceTemplates() {
    this.api.getDeviceTemplates().subscribe({
      next: (data) => {
        // Convert templates object to array with id property
        this.deviceTemplates = Object.entries(data.templates).map(([id, template]: any) => ({
          id,
          ...template,
        }));
      },
    });
  }

  private loadDeviceData() {
    if (!this.deviceId) return;
    const device = this.deviceState.getDevice(this.deviceId);
    if (device) {
      this.form.patchValue({
        type: device.type,
        name: device.name,
        slug: device.slug,
        templateId: device.templateId || '',
      });
    }
  }

  onSubmit() {
    if (!this.form.valid) return;

    this.submitting = true;
    const formValue = this.form.value;

    if (this.isEdit && this.deviceId) {
      this.api.updateDevice(this.deviceId, {
        name: formValue.name,
        templateId: formValue.templateId || undefined,
      }).subscribe({
        next: () => {
          this.deviceState.loadDevices();
          this.router.navigate(['/']);
        },
        error: (err) => {
          console.error('Failed to update device:', err);
          this.submitting = false;
        },
      });
    } else {
      this.api.createDevice({
        type: formValue.type,
        name: formValue.name,
        slug: formValue.slug || undefined,
        templateId: formValue.templateId || undefined,
      }).subscribe({
        next: () => {
          this.deviceState.loadDevices();
          this.router.navigate(['/']);
        },
        error: (err) => {
          console.error('Failed to create device:', err);
          this.submitting = false;
        },
      });
    }
  }

  onCancel() {
    this.router.navigate(['/']);
  }
}
