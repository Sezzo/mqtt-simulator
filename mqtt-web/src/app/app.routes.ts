import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { DeviceFormComponent } from './features/devices/device-form.component';
import { DeviceControlComponent } from './features/devices/device-control.component';

export const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'devices/new', component: DeviceFormComponent },
  { path: 'devices/:id/edit', component: DeviceFormComponent },
  { path: 'devices/:id/control', component: DeviceControlComponent },
  { path: '**', redirectTo: '' },
];
