import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
}

export interface VehicleType {
  id: number;
  name: string;
  description: string | null;
}

export interface Part {
  id: number;
  sku: string;
  name: string;
  category: string | null;
  quantity: number;
  min_quantity: number;
  unit_price: number;
}

export interface Job {
  id: number;
  customer_id: number;
  customer_name: string;
  vehicle_type_id: number;
  vehicle_type_name: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  plate: string;
  work_description: string;
  status: string;
  total: number;
  created_at: string;
}

export interface MaintenanceSequence {
  id: number;
  vehicle_type_id: number;
  vehicle_type_name: string;
  position: number;
  name: string;
  interval_km: number;
  details: string | null;
}

export interface Dashboard {
  customers: number;
  parts: number;
  openJobs: number;
  lowStock: number;
  recentJobs: Job[];
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = 'http://localhost:3000/api';

  constructor(private readonly http: HttpClient) {}

  dashboard(): Promise<Dashboard> {
    return firstValueFrom(this.http.get<Dashboard>(`${this.baseUrl}/dashboard`));
  }

  customers(): Promise<Customer[]> {
    return firstValueFrom(this.http.get<Customer[]>(`${this.baseUrl}/customers`));
  }

  vehicleTypes(): Promise<VehicleType[]> {
    return firstValueFrom(this.http.get<VehicleType[]>(`${this.baseUrl}/vehicleTypes`));
  }

  parts(): Promise<Part[]> {
    return firstValueFrom(this.http.get<Part[]>(`${this.baseUrl}/parts`));
  }

  jobs(): Promise<Job[]> {
    return firstValueFrom(this.http.get<Job[]>(`${this.baseUrl}/jobs`));
  }

  maintenance(): Promise<MaintenanceSequence[]> {
    return firstValueFrom(this.http.get<MaintenanceSequence[]>(`${this.baseUrl}/maintenance`));
  }

  create(resource: string, data: object): Promise<unknown> {
    return firstValueFrom(this.http.post(`${this.baseUrl}/${resource}`, data));
  }

  update(resource: string, id: number, data: object): Promise<unknown> {
    return firstValueFrom(this.http.put(`${this.baseUrl}/${resource}/${id}`, data));
  }

  remove(resource: string, id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.baseUrl}/${resource}/${id}`));
  }
}
