import { DecimalPipe } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, Customer, Dashboard, Job, MaintenanceSequence, Part, VehicleType } from './api.service';

type Section = 'dashboard' | 'customers' | 'inventory' | 'jobs' | 'vehicles' | 'maintenance';

@Component({
  imports: [DecimalPipe, FormsModule],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App implements OnInit {
  section: Section = 'dashboard';
  loading = true;
  errorMessage = '';
  successMessage = '';
  dashboard: Dashboard | null = null;
  customers: Customer[] = [];
  vehicleTypes: VehicleType[] = [];
  parts: Part[] = [];
  jobs: Job[] = [];
  maintenance: MaintenanceSequence[] = [];

  customerForm = { name: '', phone: '', email: '' };
  vehicleForm = { name: '', description: '' };
  partForm = { sku: '', name: '', category: '', quantity: 0, min_quantity: 0, unit_price: 0 };
  jobForm = {
    customer_id: 0,
    vehicle_type_id: 0,
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: new Date().getFullYear(),
    plate: '',
    work_description: '',
    status: 'pendiente',
    total: 0,
  };
  maintenanceForm = { vehicle_type_id: 0, position: 1, name: '', interval_km: 10000, details: '' };

  readonly sections: { id: Section; title: string; icon: string }[] = [
    { id: 'dashboard', title: 'Información', icon: '⌂' },
    { id: 'inventory', title: 'Repuestos', icon: '▦' },
    { id: 'jobs', title: 'Trabajos', icon: '⚙' },
    { id: 'customers', title: 'Clientes', icon: '♙' },
    { id: 'vehicles', title: 'Tipos de carro', icon: '▰' },
    { id: 'maintenance', title: 'Mantenimiento', icon: '↻' },
  ];

  constructor(
    private readonly api: ApiService,
    private readonly changeDetector: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    void this.reload();
  }

  async reload(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    try {
      const [dashboard, customers, vehicleTypes, parts, jobs, maintenance] = await Promise.all([
        this.api.dashboard(),
        this.api.customers(),
        this.api.vehicleTypes(),
        this.api.parts(),
        this.api.jobs(),
        this.api.maintenance(),
      ]);
      this.dashboard = dashboard;
      this.customers = customers;
      this.vehicleTypes = vehicleTypes;
      this.parts = parts;
      this.jobs = jobs;
      this.maintenance = maintenance;
    } catch (error) {
      this.errorMessage = this.errorText(error);
    } finally {
      this.loading = false;
      this.changeDetector.markForCheck();
    }
  }

  async save(resource: string, data: object, reset: () => void): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';
    try {
      await this.api.create(resource, data);
      reset();
      this.successMessage = 'Registro guardado correctamente.';
      await this.reload();
    } catch (error) {
      this.errorMessage = this.errorText(error);
    } finally {
      this.changeDetector.markForCheck();
    }
  }

  async saveJob(): Promise<void> {
    await this.save('jobs', this.jobForm, () => {
      this.jobForm = {
        customer_id: 0,
        vehicle_type_id: 0,
        vehicle_make: '',
        vehicle_model: '',
        vehicle_year: new Date().getFullYear(),
        plate: '',
        work_description: '',
        status: 'pendiente',
        total: 0,
      };
    });
  }

  async remove(resource: string, id: number): Promise<void> {
    if (!window.confirm('¿Seguro que deseas eliminar este registro?')) return;
    this.errorMessage = '';
    this.successMessage = '';
    try {
      await this.api.remove(resource, id);
      this.successMessage = 'Registro eliminado.';
      await this.reload();
    } catch (error) {
      this.errorMessage = this.errorText(error);
    } finally {
      this.changeDetector.markForCheck();
    }
  }

  async updateJobStatus(job: Job, event: Event): Promise<void> {
    const status = (event.target as HTMLSelectElement).value;
    this.errorMessage = '';
    try {
      await this.api.update('jobs', job.id, {
        customer_id: job.customer_id,
        vehicle_type_id: job.vehicle_type_id,
        vehicle_make: job.vehicle_make,
        vehicle_model: job.vehicle_model,
        vehicle_year: job.vehicle_year,
        plate: job.plate,
        work_description: job.work_description,
        status,
        total: job.total,
      });
      this.successMessage = 'Estado del trabajo actualizado.';
      await this.reload();
    } catch (error) {
      this.errorMessage = this.errorText(error);
    } finally {
      this.changeDetector.markForCheck();
    }
  }

  private errorText(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const detail = (error as { error: { error?: string } }).error?.error;
      if (detail) return detail;
    }
    return 'No se pudo conectar con el servidor. Comprueba que PostgreSQL y la API estén en ejecución.';
  }
}
