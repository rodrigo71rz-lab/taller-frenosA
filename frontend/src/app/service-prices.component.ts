import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, ServicePrice } from './api.service';

interface ServicePriceForm {
  name: string;
  category: string;
  price: number | null;
  notes: string;
}

@Component({
  imports: [DecimalPipe, FormsModule],
  selector: 'app-service-prices',
  styleUrl: './service-prices.component.css',
  templateUrl: './service-prices.component.html',
})
export class ServicePricesComponent implements OnInit {
  readonly categories = ['Motor', 'Llantas', 'Mantenimiento', 'Transmisión', 'Frenos', 'Diagnóstico', 'Otros'];
  prices: ServicePrice[] = [];
  searchTerm = '';
  categoryFilter = '';
  loading = true;
  saving = false;
  errorMessage = '';
  successMessage = '';
  editingId: number | null = null;
  form: ServicePriceForm = this.emptyForm();

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    void this.loadPrices();
  }

  get filteredPrices(): ServicePrice[] {
    const query = this.searchTerm.trim().toLocaleLowerCase();
    return this.prices.filter((price) => {
      const matchesCategory = !this.categoryFilter || price.category === this.categoryFilter;
      const matchesQuery = !query || [price.name, price.category]
        .some((value) => value.toLocaleLowerCase().includes(query));
      return matchesCategory && matchesQuery;
    });
  }

  get pricedCount(): number {
    return this.prices.filter((price) => price.price !== null).length;
  }

  get quoteCount(): number {
    return this.prices.length - this.pricedCount;
  }

  async loadPrices(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    try {
      this.prices = await this.api.servicePrices();
    } catch (error) {
      this.errorMessage = this.errorText(error);
    } finally {
      this.loading = false;
    }
  }

  edit(price: ServicePrice): void {
    this.editingId = price.id;
    this.form = {
      name: price.name,
      category: price.category,
      price: price.price === null ? null : Number(price.price),
      notes: price.notes ?? '',
    };
    this.errorMessage = '';
    this.successMessage = '';
  }

  cancelEdit(): void {
    this.editingId = null;
    this.form = this.emptyForm();
    this.errorMessage = '';
  }

  async save(): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';
    const payload: Omit<ServicePrice, 'id'> = {
      name: this.form.name.trim(),
      category: this.form.category,
      price: this.form.price === null ? null : Number(this.form.price),
      notes: this.form.notes.trim() || null,
    };
    if (!payload.name) {
      this.errorMessage = 'Escribe el nombre del servicio.';
      return;
    }
    if (payload.price !== null && (!Number.isFinite(payload.price) || payload.price < 0)) {
      this.errorMessage = 'El precio debe ser un número mayor o igual a cero, o dejarse vacío para cotizar.';
      return;
    }

    this.saving = true;
    try {
      if (this.editingId === null) {
        await this.api.create<ServicePrice>('servicePrices', payload);
        this.successMessage = 'Servicio agregado correctamente.';
      } else {
        await this.api.update('servicePrices', this.editingId, payload);
        this.successMessage = 'Servicio actualizado correctamente.';
      }
      this.cancelEdit();
      await this.loadPrices();
    } catch (error) {
      this.errorMessage = this.errorText(error);
    } finally {
      this.saving = false;
    }
  }

  async remove(price: ServicePrice): Promise<void> {
    if (!window.confirm(`¿Eliminar el servicio «${price.name}» del tarifario?`)) return;
    this.errorMessage = '';
    this.successMessage = '';
    try {
      await this.api.remove('servicePrices', price.id);
      this.successMessage = 'Servicio eliminado del tarifario.';
      if (this.editingId === price.id) this.cancelEdit();
      await this.loadPrices();
    } catch (error) {
      this.errorMessage = this.errorText(error);
    }
  }

  private emptyForm(): ServicePriceForm {
    return {
      name: '',
      category: 'Motor',
      price: null,
      notes: '',
    };
  }

  private errorText(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const detail = error.error && typeof error.error === 'object' ? error.error.error : null;
      if (typeof detail === 'string' && detail) return detail;
    }
    return 'No se pudo completar la operación. Comprueba que la API y PostgreSQL estén en ejecución.';
  }
}
