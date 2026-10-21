import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  photo_path: string | null;
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
  paid_total: number;
  balance: number;
  vehicle_photo_path: string | null;
  created_at: string;
}

export interface JobPayment {
  id: number;
  job_id: number;
  amount: number;
  method: 'efectivo' | 'transaccion';
  reference: string | null;
  paid_at: string;
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

  jobPayments(jobId: number): Promise<JobPayment[]> {
    return firstValueFrom(this.http.get<JobPayment[]>(`${this.baseUrl}/jobs/${jobId}/payments`));
  }

  addJobPayment(jobId: number, payment: { amount: number; method: JobPayment['method']; reference: string }): Promise<JobPayment> {
    return firstValueFrom(this.http.post<JobPayment>(`${this.baseUrl}/jobs/${jobId}/payments`, payment));
  }

  maintenance(): Promise<MaintenanceSequence[]> {
    return firstValueFrom(this.http.get<MaintenanceSequence[]>(`${this.baseUrl}/maintenance`));
  }

  create<T = unknown>(resource: string, data: object): Promise<T> {
    return firstValueFrom(this.http.post<T>(`${this.baseUrl}/${resource}`, data));
  }

  update(resource: string, id: number, data: object): Promise<unknown> {
    return firstValueFrom(this.http.put(`${this.baseUrl}/${resource}/${id}`, data));
  }

  remove(resource: string, id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.baseUrl}/${resource}/${id}`));
  }

  uploadCustomerPhoto(id: number, photo: File): Promise<void> {
    const formData = new FormData();
    formData.append('photo', photo);
    return firstValueFrom(this.http.post<void>(`${this.baseUrl}/customers/${id}/photo`, formData));
  }

  uploadVehiclePhoto(id: number, photo: File): Promise<void> {
    const formData = new FormData();
    formData.append('photo', photo);
    return firstValueFrom(this.http.post<void>(`${this.baseUrl}/jobs/${id}/vehicle-photo`, formData));
  }

  imageUrl(photoPath: string): string {
    return `${this.baseUrl.replace(/\/api$/, '')}${photoPath}`;
  }
}
