import { DecimalPipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';

type Climate = 'Templado' | 'Caluroso' | 'Frío' | 'Lluvioso';
type Fault = 'oil' | 'temperature' | 'filter' | 'check' | 'battery' | 'brakes';
type Service = 'oil' | 'air' | 'coolant' | 'overhaul';

interface MaintenanceOption {
  key: Service;
  title: string;
  cost: number;
  detail: string;
}

@Component({
  selector: 'app-vehicle-simulator',
  imports: [DecimalPipe, FormsModule],
  templateUrl: './vehicle-simulator.component.html',
})
export class VehicleSimulatorComponent implements OnDestroy {
  engineRunning = false;
  throttle = 0;
  climate: Climate = 'Templado';
  fuel = 85;
  oilHealth = 76;
  filterRestriction = 24;
  elapsedSeconds = 0;
  toastMessage = '';

  readonly climateTemperatures: Record<Climate, number> = {
    Templado: 22,
    Caluroso: 34,
    Frío: 8,
    Lluvioso: 18,
  };
  readonly maintenanceOptions: MaintenanceOption[] = [
    { key: 'oil', title: 'Aceite Plus-50 II', cost: 180, detail: 'Renueva el aceite del motor' },
    { key: 'air', title: 'Filtro de aire de admisión', cost: 95, detail: 'Reduce la restricción del filtro' },
    { key: 'coolant', title: 'Cool-Gard Purga', cost: 140, detail: 'Purga el sistema de refrigeración' },
    { key: 'overhaul', title: 'Overhaul de motor', cost: 2100, detail: 'Restablece los valores del motor' },
  ];
  readonly faults = new Set<Fault>(['battery']);
  readonly selectedServices = new Set<Service>();

  private elapsedTimer: ReturnType<typeof setInterval> | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly changeDetector: ChangeDetectorRef) {}

  get rpm(): number {
    return this.engineRunning ? Math.round(800 + this.throttle * 52) : 0;
  }

  get speed(): number {
    return this.engineRunning ? Math.max(0, (this.rpm - 800) * 0.035) : 0;
  }

  get engineLoad(): number {
    return this.engineRunning ? Math.min(100, 14 + this.throttle * 0.82) : 0;
  }

  get coolantTemperature(): number {
    const temperature = this.engineRunning
      ? this.climateTemperatures[this.climate] + 14 + this.throttle * 0.19
      : this.climateTemperatures[this.climate];
    return Math.min(125, temperature + (this.faults.has('temperature') ? 18 : 0));
  }

  get oilPressure(): number {
    const pressure = this.engineRunning ? 0.65 + this.rpm / 1900 : 0;
    return pressure * (this.faults.has('oil') ? 0.28 : 1);
  }

  get engineHours(): number {
    return 1248.5 + this.elapsedSeconds / 3600;
  }

  get boostPressure(): number {
    return this.engineRunning ? this.throttle * 0.014 : 0;
  }

  get maintenanceCost(): number {
    return this.maintenanceOptions
      .filter((option) => this.selectedServices.has(option.key))
      .reduce((total, option) => total + option.cost, 0);
  }

  toggleEngine(): void {
    this.engineRunning = !this.engineRunning;
    if (this.engineRunning) {
      this.elapsedTimer = setInterval(() => {
        this.elapsedSeconds += 60;
        this.fuel = Math.max(0, this.fuel - (0.03 + this.throttle * 0.0018));
        this.oilHealth = Math.max(0, this.oilHealth - 0.002);
        this.filterRestriction = Math.min(100, this.filterRestriction + 0.004);
        this.changeDetector.markForCheck();
      }, 1000);
      this.showToast('Motor encendido. Telemetría en ejecución.');
    } else {
      this.stopElapsedTimer();
      this.showToast('Motor apagado.');
    }
  }

  toggleFault(fault: Fault): void {
    if (this.faults.has(fault)) {
      this.faults.delete(fault);
      this.showToast('Testigo de demostración apagado.');
    } else {
      this.faults.add(fault);
      this.showToast('Testigo de demostración activado.');
    }
  }

  toggleService(service: Service): void {
    if (this.selectedServices.has(service)) {
      this.selectedServices.delete(service);
      this.showToast('Servicio quitado de la simulación.');
      return;
    }

    this.selectedServices.add(service);
    if (service === 'oil') this.oilHealth = 100;
    if (service === 'air') this.filterRestriction = 2;
    if (service === 'coolant') this.faults.delete('temperature');
    if (service === 'overhaul') {
      this.oilHealth = 100;
      this.filterRestriction = 2;
      this.fuel = 85;
      this.faults.delete('oil');
      this.faults.delete('temperature');
      this.faults.delete('filter');
      this.faults.delete('check');
    }
    this.showToast('Servicio preventivo aplicado a la simulación.');
  }

  hasFault(fault: Fault): boolean {
    return this.faults.has(fault);
  }

  hasService(service: Service): boolean {
    return this.selectedServices.has(service);
  }

  get fuelStatus(): string {
    return this.fuel < 15 ? 'critical' : '';
  }

  get temperatureStatus(): string {
    return this.coolantTemperature > 100 ? 'critical' : this.coolantTemperature > 90 ? 'warning' : '';
  }

  get oilPressureStatus(): string {
    return this.engineRunning && this.oilPressure < 0.8 ? 'critical' : '';
  }

  get oilHealthStatus(): string {
    return this.oilHealth < 30 ? 'critical' : this.oilHealth < 65 ? 'warning' : '';
  }

  get filterStatus(): string {
    return this.filterRestriction > 70 ? 'critical' : this.filterRestriction > 35 ? 'warning' : '';
  }

  climateChanged(climate: Climate): void {
    this.climate = climate;
    this.showToast(`Clima simulado: ${climate}.`);
  }

  showToast(message: string): void {
    this.toastMessage = message;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastMessage = '';
      this.changeDetector.markForCheck();
    }, 2200);
  }

  ngOnDestroy(): void {
    this.stopElapsedTimer();
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  private stopElapsedTimer(): void {
    if (this.elapsedTimer) {
      clearInterval(this.elapsedTimer);
      this.elapsedTimer = null;
    }
  }
}
