import { DecimalPipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';

type Climate = 'Templado' | 'Caluroso' | 'Frío' | 'Lluvioso';
type Fault = 'oil' | 'temperature' | 'filter' | 'check' | 'battery' | 'brakes' | 'tires';
type FaultSeverity = 'low' | 'medium' | 'high';
type Service = 'oil' | 'air' | 'coolant' | 'overhaul';

interface MaintenanceOption {
  key: Service;
  title: string;
  cost: number;
  detail: string;
}

interface FaultOption {
  key: Fault;
  icon: string;
  label: string;
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
  engineHealth = 96;
  tireHealth = 92;
  brakeHealth = 84;
  batteryHealth = 94;
  timeScale = 1;
  faultSeverity: FaultSeverity = 'medium';
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
  readonly faultOptions: FaultOption[] = [
    { key: 'oil', icon: '●', label: 'Presión' },
    { key: 'temperature', icon: '♨', label: 'Temp.' },
    { key: 'filter', icon: '▼', label: 'Filtro' },
    { key: 'check', icon: '⚙', label: 'Check' },
    { key: 'battery', icon: '▰', label: 'Batería' },
    { key: 'brakes', icon: '⬟', label: 'Frenos' },
    { key: 'tires', icon: '◉', label: 'Llantas' },
  ];
  readonly faultLabels: Record<Fault, string> = {
    oil: 'Presión de aceite',
    temperature: 'Temperatura',
    filter: 'Filtro de aire',
    check: 'Motor / ECU',
    battery: 'Batería',
    brakes: 'Frenos',
    tires: 'Neumáticos',
  };
  readonly faultSeverities: Record<FaultSeverity, string> = {
    low: 'Leve',
    medium: 'Media',
    high: 'Alta',
  };
  readonly faults = new Set<Fault>(['battery']);
  readonly severityByFault: Partial<Record<Fault, FaultSeverity>> = { battery: 'medium' };
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
    return Math.min(125, temperature + (this.faults.has('temperature') ? this.temperatureFaultImpact : 0));
  }

  get oilPressure(): number {
    const pressure = this.engineRunning ? 0.65 + this.rpm / 1900 : 0;
    return pressure * (this.faults.has('oil') ? this.oilPressureFaultFactor : 1);
  }

  get engineHours(): number {
    return 1248.5 + this.elapsedSeconds / 3600;
  }

  get activeFaults(): Fault[] {
    return [...this.faults];
  }

  faultSeverityFor(fault: Fault): FaultSeverity {
    return this.severityByFault[fault] ?? 'medium';
  }

  private faultImpactFor(fault: Fault): number {
    const severity = this.faultSeverityFor(fault);
    if (severity === 'low') return 8;
    if (severity === 'high') return 38;
    return 20;
  }

  get temperatureFaultImpact(): number {
    const severity = this.faultSeverityFor('temperature');
    if (severity === 'low') return 8;
    if (severity === 'high') return 25;
    return 16;
  }

  get oilPressureFaultFactor(): number {
    const severity = this.faultSeverityFor('oil');
    if (severity === 'low') return 0.65;
    if (severity === 'high') return 0.25;
    return 0.45;
  }

  get engineCondition(): number {
    return Math.max(0, this.engineHealth - (this.faults.has('check') ? this.faultImpactFor('check') : 0));
  }

  get tireCondition(): number {
    return Math.max(0, this.tireHealth - (this.faults.has('tires') ? this.faultImpactFor('tires') : 0));
  }

  get brakeCondition(): number {
    return Math.max(0, this.brakeHealth - (this.faults.has('brakes') ? this.faultImpactFor('brakes') : 0));
  }

  get batteryCondition(): number {
    return Math.max(0, this.batteryHealth - (this.faults.has('battery') ? this.faultImpactFor('battery') : 0));
  }

  get filterCondition(): number {
    return Math.min(100, this.filterRestriction + (this.faults.has('filter') ? this.faultImpactFor('filter') : 0));
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
        this.advanceTime(this.timeScale / 60, false);
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
      delete this.severityByFault[fault];
      this.showToast('Testigo de demostración apagado.');
    } else {
      this.faults.add(fault);
      this.severityByFault[fault] = this.faultSeverity;
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
    if (service === 'oil') {
      this.oilHealth = 100;
      this.clearFault('oil');
    }
    if (service === 'air') {
      this.filterRestriction = 2;
      this.clearFault('filter');
    }
    if (service === 'coolant') this.clearFault('temperature');
    if (service === 'overhaul') {
      this.oilHealth = 100;
      this.filterRestriction = 2;
      this.engineHealth = 100;
      this.fuel = 85;
      this.clearFault('oil');
      this.clearFault('temperature');
      this.clearFault('filter');
      this.clearFault('check');
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
    return this.filterCondition > 70 ? 'critical' : this.filterCondition > 35 ? 'warning' : '';
  }

  get engineHealthStatus(): string {
    return this.engineCondition < 30 ? 'critical' : this.engineCondition < 65 ? 'warning' : '';
  }

  get tireHealthStatus(): string {
    return this.tireCondition < 30 ? 'critical' : this.tireCondition < 65 ? 'warning' : '';
  }

  get brakeHealthStatus(): string {
    return this.brakeCondition < 30 ? 'critical' : this.brakeCondition < 65 ? 'warning' : '';
  }

  get batteryHealthStatus(): string {
    return this.batteryCondition < 30 ? 'critical' : this.batteryCondition < 65 ? 'warning' : '';
  }

  generateRandomFault(): void {
    const availableFaults = this.faultOptions.filter(({ key }) => !this.faults.has(key));
    if (!availableFaults.length) {
      this.showToast('Ya están activas todas las fallas disponibles.');
      return;
    }

    const fault = availableFaults[Math.floor(Math.random() * availableFaults.length)];
    this.faults.add(fault.key);
    this.severityByFault[fault.key] = this.faultSeverity;
    this.showToast(`Falla aleatoria: ${this.faultLabels[fault.key]} (${this.faultSeverities[this.faultSeverity].toLowerCase()}).`);
  }

  resetFaults(): void {
    this.faults.clear();
    for (const fault of this.faultOptions) delete this.severityByFault[fault.key];
    this.showToast('Fallas de la simulación restablecidas.');
  }

  advanceTime(hours: number, notify = true): void {
    if (!Number.isFinite(hours) || hours <= 0) return;
    const simulatedMinutes = hours * 60;
    this.elapsedSeconds += hours * 3600;
    this.fuel = Math.max(0, this.fuel - (0.03 + this.throttle * 0.0018) * simulatedMinutes);
    this.oilHealth = Math.max(0, this.oilHealth - 0.002 * simulatedMinutes);
    this.filterRestriction = Math.min(100, this.filterRestriction + 0.004 * simulatedMinutes);
    this.engineHealth = Math.max(0, this.engineHealth - 0.0003 * simulatedMinutes);
    this.tireHealth = Math.max(0, this.tireHealth - 0.0008 * simulatedMinutes);
    this.brakeHealth = Math.max(0, this.brakeHealth - 0.0006 * simulatedMinutes);
    this.changeDetector.markForCheck();
    if (notify) this.showToast(`Tiempo de uso simulado: +${hours < 1 ? `${Math.round(hours * 60)} min` : `${hours} h`}.`);
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

  private clearFault(fault: Fault): void {
    this.faults.delete(fault);
    delete this.severityByFault[fault];
  }
}
