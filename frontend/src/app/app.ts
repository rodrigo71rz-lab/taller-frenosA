import { DecimalPipe } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VehicleSimulatorComponent } from './vehicle-simulator.component';
import { WindTunnelComponent } from './wind-tunnel.component';
import { ApiService, Customer, Dashboard, Job, JobPayment, MaintenanceSequence, Part, VehicleType } from './api.service';

type Section = 'dashboard' | 'customers' | 'inventory' | 'jobs' | 'vehicles' | 'maintenance' | 'control-systems' | 'wind-tunnel' | 'vehicle-simulator';
type SimulationStatus = 'normal' | 'warning' | 'critical' | 'inactive';
type SimulationSensorKey = 'brakeFluid' | 'batteryVoltage' | 'oilPressure' | 'airPressure' | 'exhaustCO' | 'fuelPressure' | 'throttle' | 'engineTemperature';

interface SimulationSensor {
  key: SimulationSensorKey;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
}

interface SimulationCalculation {
  name: string;
  formula: string;
  result: number;
  unit: string;
}

interface SimulationAlert {
  key: string;
  severity: 'warning' | 'critical';
  title: string;
  message: string;
}

@Component({
  imports: [DecimalPipe, FormsModule, VehicleSimulatorComponent, WindTunnelComponent],
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
  printJobDetails: Job | null = null;
  jobBrandSelection = '';
  jobBrandSearch = '';
  readonly customJobBrand = '__custom__';
  readonly jobBrandOptions = [
    { name: 'Acura', slug: 'acura' },
    { name: 'Audi', slug: 'audi' },
    { name: 'BMW', slug: 'bmw' },
    { name: 'Chevrolet', slug: 'chevrolet' },
    { name: 'Citroën', slug: 'citroen' },
    { name: 'Ferrari', slug: 'ferrari' },
    { name: 'Fiat', slug: 'fiat' },
    { name: 'Ford', slug: 'ford' },
    { name: 'Honda', slug: 'honda' },
    { name: 'Hyundai', slug: 'hyundai' },
    { name: 'Jeep', slug: 'jeep' },
    { name: 'Kia', slug: 'kia' },
    { name: 'Mazda', slug: 'mazda' },
    { name: 'Mitsubishi', slug: 'mitsubishi' },
    { name: 'Nissan', slug: 'nissan' },
    { name: 'Peugeot', slug: 'peugeot' },
    { name: 'Porsche', slug: 'porsche' },
    { name: 'Renault', slug: 'renault' },
    { name: 'Subaru', slug: 'subaru' },
    { name: 'Suzuki', slug: 'suzuki' },
    { name: 'Tesla', slug: 'tesla' },
    { name: 'Toyota', slug: 'toyota' },
    { name: 'Volkswagen', slug: 'volkswagen' },
    { name: 'Volvo', slug: 'volvo' },
  ];
  selectedPaymentJobId: number | null = null;
  jobPayments: JobPayment[] = [];
  paymentForm = { amount: 0, method: 'efectivo' as JobPayment['method'], reference: '' };
  engineRunning = false;
  engineRpm = 0;
  simulationValues: Record<SimulationSensorKey, number> = {
    brakeFluid: 82,
    batteryVoltage: 12.6,
    oilPressure: 38,
    airPressure: 32,
    exhaustCO: 0.4,
    fuelPressure: 43,
    throttle: 0,
    engineTemperature: 90,
  };
  readonly simulationSensors: SimulationSensor[] = [
    { key: 'brakeFluid', label: 'Nivel de fluido de frenos', unit: '%', min: 0, max: 100, step: 1 },
    { key: 'batteryVoltage', label: 'Voltaje de batería', unit: 'V', min: 10, max: 16, step: 0.1 },
    { key: 'oilPressure', label: 'Presión de aceite', unit: 'psi', min: 0, max: 100, step: 1 },
    { key: 'airPressure', label: 'Presión de aire de admisión', unit: 'kPa', min: 0, max: 120, step: 1 },
    { key: 'exhaustCO', label: 'Emisiones de escape (CO)', unit: '%', min: 0, max: 5, step: 0.1 },
    { key: 'fuelPressure', label: 'Presión de bomba de gasolina', unit: 'psi', min: 0, max: 80, step: 1 },
    { key: 'throttle', label: 'Apertura de mariposa', unit: '%', min: 0, max: 100, step: 1 },
    { key: 'engineTemperature', label: 'Temperatura del motor', unit: '°C', min: 0, max: 140, step: 1 },
  ];
  customerForm = { name: '', phone: '', email: '' };
  customerPhoto: File | null = null;
  vehicleForm = { name: '', description: '' };
  vehicleTypeSelection = '';
  vehicleTypeSearch = '';
  readonly customVehicleOption = '__custom__';
  readonly vehicleTypeOptions = [
    { name: 'Sedán', icon: '🚘' },
    { name: 'Todoterreno', icon: '🚙' },
    { name: 'Hatchback', icon: '🚗' },
    { name: 'Camioneta', icon: '🛻' },
    { name: 'Furgoneta', icon: '🚐' },
    { name: 'Deportivo', icon: '🏎️' },
    { name: 'Micro', icon: '🚐' },
    { name: 'Convertible', icon: '🚘' },
    { name: 'Crossover', icon: '🚙' },
    { name: 'SUV', icon: '🚙' },
    { name: 'Familiar', icon: '🚐' },
    { name: 'Músculo', icon: '🚗' },
    { name: 'Roadster', icon: '🏎️' },
    { name: 'Cabriolet', icon: '🚘' },
    { name: 'Limusina', icon: '🚘' },
    { name: 'Fórmula 1', icon: '🏎️' },
  ];
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
    { id: 'control-systems', title: 'Control de sistemas', icon: '◉' },
    { id: 'wind-tunnel', title: 'Túnel de viento', icon: '○' },
    { id: 'vehicle-simulator', title: 'Simulador de vehículo', icon: '◈' },
  ];

  constructor(
    private readonly api: ApiService,
    private readonly changeDetector: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    void this.reload();
  }

  toggleEngine(): void {
    this.engineRunning = !this.engineRunning;
    this.engineRpm = this.engineRunning ? 800 + Math.round(this.simulationValues.throttle * 52) : 0;
  }

  setSimulationValue(key: SimulationSensorKey, value: number): void {
    if (!Number.isFinite(value)) return;
    this.simulationValues[key] = value;
    if (key === 'throttle' && this.engineRunning) {
      this.engineRpm = 800 + Math.round(value * 52);
    }
  }

  simulationPercent(sensor: SimulationSensor): number {
    return ((this.simulationValues[sensor.key] - sensor.min) / (sensor.max - sensor.min)) * 100;
  }

  get simulationCalculations(): SimulationCalculation[] {
    const throttle = this.simulationValues.throttle;
    const format = (value: number, digits = 1): string => value.toFixed(digits);
    return [
      {
        name: 'Revoluciones del motor',
        formula: this.engineRunning ? `800 + (${format(throttle, 0)} × 52)` : 'Motor apagado = 0',
        result: this.engineRpm,
        unit: 'RPM',
      },
      {
        name: 'Fluido de frenos estimado',
        formula: `500 mL × ${format(this.simulationValues.brakeFluid, 0)} ÷ 100`,
        result: 500 * this.simulationValues.brakeFluid / 100,
        unit: 'mL',
      },
      {
        name: 'Voltaje vs. referencia nominal',
        formula: `${format(this.simulationValues.batteryVoltage, 1)} V ÷ 12.6 V × 100`,
        result: this.simulationValues.batteryVoltage / 12.6 * 100,
        unit: '%',
      },
      {
        name: 'Presión de aceite convertida',
        formula: `${format(this.simulationValues.oilPressure, 0)} psi × 6.895`,
        result: this.simulationValues.oilPressure * 6.89476,
        unit: 'kPa',
      },
      {
        name: 'Presión de admisión vs. atmosférica',
        formula: `${format(this.simulationValues.airPressure, 0)} kPa ÷ 101.3 kPa × 100`,
        result: this.simulationValues.airPressure / 101.3 * 100,
        unit: '%',
      },
      {
        name: 'Monóxido de carbono',
        formula: `${format(this.simulationValues.exhaustCO, 1)}% × 10,000`,
        result: this.simulationValues.exhaustCO * 10000,
        unit: 'ppm',
      },
      {
        name: 'Presión de gasolina convertida',
        formula: `${format(this.simulationValues.fuelPressure, 0)} psi × 6.895`,
        result: this.simulationValues.fuelPressure * 6.89476,
        unit: 'kPa',
      },
      {
        name: 'Apertura angular estimada',
        formula: `${format(throttle, 0)}% × 90° ÷ 100`,
        result: throttle * 0.9,
        unit: '°',
      },
      {
        name: 'Temperatura convertida',
        formula: `${format(this.simulationValues.engineTemperature, 0)}°C × 9 ÷ 5 + 32`,
        result: this.simulationValues.engineTemperature * 9 / 5 + 32,
        unit: '°F',
      },
    ];
  }

  get simulationPhysicalCalculations(): SimulationCalculation[] {
    const format = (value: number, digits = 1): string => value.toFixed(digits);
    return [
      {
        name: 'Velocidad angular del motor',
        formula: `ω = 2π × ${format(this.engineRpm, 0)} ÷ 60`,
        result: 2 * Math.PI * this.engineRpm / 60,
        unit: 'rad/s',
      },
      {
        name: 'Frecuencia de rotación',
        formula: `f = ${format(this.engineRpm, 0)} ÷ 60`,
        result: this.engineRpm / 60,
        unit: 'Hz',
      },
      {
        name: 'Presión de aceite',
        formula: `${format(this.simulationValues.oilPressure, 1)} psi × 6,894.76`,
        result: this.simulationValues.oilPressure * 6894.76,
        unit: 'Pa',
      },
      {
        name: 'Presión de admisión',
        formula: `${format(this.simulationValues.airPressure, 1)} kPa × 1,000`,
        result: this.simulationValues.airPressure * 1000,
        unit: 'Pa',
      },
      {
        name: 'Presión de bomba de gasolina',
        formula: `${format(this.simulationValues.fuelPressure, 1)} psi × 6,894.76`,
        result: this.simulationValues.fuelPressure * 6894.76,
        unit: 'Pa',
      },
      {
        name: 'Temperatura absoluta del motor',
        formula: `${format(this.simulationValues.engineTemperature, 1)} + 273.15`,
        result: this.simulationValues.engineTemperature + 273.15,
        unit: 'K',
      },
    ];
  }

  get simulationAlerts(): SimulationAlert[] {
    const alerts: SimulationAlert[] = [];
    const addSensorAlert = (
      key: SimulationSensorKey,
      title: string,
      warningMessage: string,
      criticalMessage: string,
    ): void => {
      const severity = this.simulationStatus(key);
      if (severity === 'warning' || severity === 'critical') {
        alerts.push({
          key,
          severity,
          title,
          message: severity === 'critical' ? criticalMessage : warningMessage,
        });
      }
    };

    if (this.engineRpmStatus === 'warning') {
      alerts.push({
        key: 'engineRpm',
        severity: 'warning',
        title: 'Revoluciones del motor fuera del rango simulado',
        message: this.engineRpm > 5500
          ? 'RPM elevadas: reduce la apertura del acelerador para evitar sobrerrevoluciones.'
          : 'RPM demasiado bajas: revisa el ralentí y la respuesta del motor.',
      });
    }
    addSensorAlert('brakeFluid', 'Fluido de frenos bajo', 'Nivel reducido; inspecciona el depósito y busca fugas.', 'Nivel muy bajo; evita circular y revisa el sistema de frenos.');
    addSensorAlert('batteryVoltage', 'Voltaje de batería bajo', 'Voltaje inferior a la referencia de carga simulada; comprueba batería y alternador.', 'Voltaje críticamente bajo; revisa batería, conexiones y sistema de carga.');
    addSensorAlert('oilPressure', 'Presión de aceite anormal', 'La presión está fuera del rango de referencia; verifica nivel y viscosidad del aceite.', 'Presión de aceite crítica; apaga el motor y verifica lubricación antes de continuar.');
    addSensorAlert('airPressure', 'Presión de admisión anormal', 'La presión está fuera del rango esperado; inspecciona filtro, conductos y sensor.', 'Presión de admisión crítica; revisa obstrucciones, fugas y sensor.');
    addSensorAlert('exhaustCO', 'Emisiones de CO elevadas', 'La concentración simulada supera el nivel de referencia; revisa mezcla y combustión.', 'Concentración de CO crítica; ventila el área y revisa combustión y escape.');
    addSensorAlert('fuelPressure', 'Presión de combustible anormal', 'La presión está fuera del rango de referencia; inspecciona filtro y bomba.', 'Presión de combustible crítica; revisa bomba, filtro y regulador.');
    addSensorAlert('engineTemperature', 'Temperatura del motor elevada', 'Temperatura alta; revisa refrigerante, ventilador y radiador.', 'Sobrecalentamiento crítico; detén el motor y deja que se enfríe antes de inspeccionarlo.');
    return alerts.sort((first, second) => first.severity === second.severity
      ? 0
      : first.severity === 'critical' ? -1 : 1);
  }

  simulationStatus(key: SimulationSensorKey): SimulationStatus {
    const value = this.simulationValues[key];
    switch (key) {
      case 'brakeFluid':
        return value < 15 ? 'critical' : value < 35 ? 'warning' : 'normal';
      case 'batteryVoltage':
        return value < 11.8 ? 'critical' : value < (this.engineRunning ? 13.2 : 12.2) ? 'warning' : 'normal';
      case 'oilPressure':
        return value < 15 || value > 75 ? 'critical' : value < 25 || value > 60 ? 'warning' : 'normal';
      case 'airPressure':
        return value < 15 || value > 110 ? 'critical' : value < 22 || value > 95 ? 'warning' : 'normal';
      case 'exhaustCO':
        return value > 2 ? 'critical' : value > 1 ? 'warning' : 'normal';
      case 'fuelPressure':
        return value < 25 || value > 65 ? 'critical' : value < 35 || value > 58 ? 'warning' : 'normal';
      case 'engineTemperature':
        return value > 115 ? 'critical' : value > 100 ? 'warning' : 'normal';
      case 'throttle':
        return 'normal';
    }
  }

  get engineRpmStatus(): SimulationStatus {
    if (!this.engineRunning) return 'inactive';
    return this.engineRpm < 600 || this.engineRpm > 5500 ? 'warning' : 'normal';
  }

  get simulationOverviewStatus(): SimulationStatus {
    const statuses = this.simulationSensors
      .filter((sensor) => sensor.key !== 'throttle')
      .map((sensor) => this.simulationStatus(sensor.key))
      .concat(this.engineRpmStatus)
      .filter((status) => status !== 'inactive');
    if (statuses.includes('critical')) return 'critical';
    if (statuses.includes('warning')) return 'warning';
    return 'normal';
  }

  statusLabel(status: SimulationStatus): string {
    switch (status) {
      case 'normal': return 'Normal';
      case 'warning': return 'Revisar';
      case 'critical': return 'Crítico';
      case 'inactive': return 'Apagado';
    }
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

  get filteredVehicleTypeOptions() {
    const query = this.vehicleTypeSearch.trim().toLocaleLowerCase();
    return this.vehicleTypeOptions.filter((option) => option.name.toLocaleLowerCase().includes(query));
  }

  onVehicleTypeChange(selection: string): void {
    this.vehicleForm.name = selection === this.customVehicleOption ? '' : selection;
  }

  async saveVehicleType(): Promise<void> {
    const name = this.vehicleTypeSelection === this.customVehicleOption
      ? this.vehicleForm.name.trim()
      : this.vehicleTypeSelection.trim();
    if (!name) {
      this.errorMessage = 'Selecciona un tipo de carro o escribe un tipo personalizado.';
      return;
    }
    this.vehicleForm.name = name;
    await this.save('vehicleTypes', this.vehicleForm, () => {
      this.vehicleForm = { name: '', description: '' };
      this.vehicleTypeSelection = '';
      this.vehicleTypeSearch = '';
    });
  }

  async saveJob(): Promise<void> {
    if (!this.jobForm.vehicle_make.trim()) {
      this.errorMessage = 'Selecciona una marca o escribe el nombre de la marca del vehículo.';
      this.successMessage = '';
      return;
    }
    this.jobForm.vehicle_make = this.jobForm.vehicle_make.trim();
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
      this.jobBrandSelection = '';
      this.jobBrandSearch = '';
    });
  }

  get filteredJobBrandOptions() {
    const query = this.jobBrandSearch.trim().toLocaleLowerCase();
    return this.jobBrandOptions.filter((brand) => brand.name.toLocaleLowerCase().includes(query));
  }

  selectJobBrand(selection: string): void {
    this.jobBrandSelection = selection;
    this.jobForm.vehicle_make = selection === this.customJobBrand ? '' : selection;
  }

  vehicleBrandLogoUrl(make: string): string {
    const normalizedMake = make.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase();
    const brand = this.jobBrandOptions.find((option) => option.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase() === normalizedMake);
    return brand ? `https://cdn.simpleicons.org/${brand.slug}` : '';
  }

  vehicleBrandInitial(make: string): string {
    return make.trim().charAt(0).toLocaleUpperCase() || '?';
  }

  hideBrandLogo(event: Event): void {
    const image = event.target;
    if (image instanceof HTMLImageElement) image.hidden = true;
  }

  showPrintBrandFallback(event: Event): void {
    const image = event.target;
    if (image instanceof HTMLImageElement) {
      image.hidden = true;
      image.nextElementSibling?.removeAttribute('hidden');
    }
  }

  setCustomerPhoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.customerPhoto = input.files?.item(0) ?? null;
    if (this.customerPhoto) this.errorMessage = this.imageError(this.customerPhoto) ?? '';
  }

  async saveCustomer(): Promise<void> {
    if (this.customerPhoto && this.imageError(this.customerPhoto)) {
      this.errorMessage = this.imageError(this.customerPhoto) ?? '';
      return;
    }
    this.errorMessage = '';
    this.successMessage = '';
    let customer: Customer | null = null;
    try {
      customer = await this.api.create<Customer>('customers', this.customerForm);
      this.customerForm = { name: '', phone: '', email: '' };
      const photo = this.customerPhoto;
      this.customerPhoto = null;
      if (photo) await this.api.uploadCustomerPhoto(customer.id, photo);
      await this.reload();
      this.successMessage = 'Cliente guardado correctamente.';
    } catch (error) {
      if (customer) {
        await this.reload();
        this.errorMessage = `El cliente se guardó, pero no se pudo guardar su foto: ${this.errorText(error)}`;
      } else {
        this.errorMessage = this.errorText(error);
      }
    } finally {
      this.changeDetector.markForCheck();
    }
  }

  jobsForCustomer(customerId: number): Job[] {
    return this.jobs.filter((job) => job.customer_id === customerId);
  }

  async uploadCustomerPhoto(customer: Customer, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const photo = input.files?.item(0) ?? null;
    input.value = '';
    if (!photo) return;
    const errorMessage = this.imageError(photo);
    if (errorMessage) {
      this.errorMessage = errorMessage;
      return;
    }
    this.errorMessage = '';
    this.successMessage = '';
    try {
      await this.api.uploadCustomerPhoto(customer.id, photo);
      await this.reload();
      this.successMessage = 'Foto del cliente guardada correctamente.';
    } catch (error) {
      this.errorMessage = this.errorText(error);
    } finally {
      this.changeDetector.markForCheck();
    }
  }

  async uploadVehiclePhoto(job: Job, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const photo = input.files?.item(0) ?? null;
    input.value = '';
    if (!photo) return;
    const errorMessage = this.imageError(photo);
    if (errorMessage) {
      this.errorMessage = errorMessage;
      return;
    }
    this.errorMessage = '';
    this.successMessage = '';
    try {
      await this.api.uploadVehiclePhoto(job.id, photo);
      await this.reload();
      this.successMessage = 'Foto del vehículo guardada correctamente.';
    } catch (error) {
      this.errorMessage = this.errorText(error);
    } finally {
      this.changeDetector.markForCheck();
    }
  }

  imageUrl(photoPath: string | null): string {
    return photoPath ? this.api.imageUrl(photoPath) : '';
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

  async toggleJobPayments(job: Job): Promise<void> {
    if (this.selectedPaymentJobId === job.id) {
      this.selectedPaymentJobId = null;
      this.jobPayments = [];
      return;
    }
    this.selectedPaymentJobId = job.id;
    this.jobPayments = [];
    this.paymentForm = { amount: 0, method: 'efectivo', reference: '' };
    this.errorMessage = '';
    try {
      this.jobPayments = await this.api.jobPayments(job.id);
    } catch (error) {
      this.errorMessage = this.errorText(error);
    } finally {
      this.changeDetector.markForCheck();
    }
  }

  async addJobPayment(job: Job): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';
    try {
      await this.api.addJobPayment(job.id, this.paymentForm);
      this.paymentForm = { amount: 0, method: 'efectivo', reference: '' };
      await this.reload();
      this.jobPayments = await this.api.jobPayments(job.id);
      this.successMessage = 'Pago registrado correctamente.';
    } catch (error) {
      this.errorMessage = this.errorText(error);
    } finally {
      this.changeDetector.markForCheck();
    }
  }

  paymentBalance(job: Job): number {
    return Math.max(0, Number(job.balance));
  }

  printJob(job: Job): void {
    this.printJobDetails = job;
    this.changeDetector.markForCheck();
    window.setTimeout(() => window.print(), 0);
  }

  get printCustomer(): Customer | undefined {
    return this.customers.find((customer) => customer.id === this.printJobDetails?.customer_id);
  }

  formatJobDate(value: string): string {
    return new Intl.DateTimeFormat('es', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  closePrintSheet(): void {
    this.printJobDetails = null;
    this.changeDetector.markForCheck();
  }

  private imageError(photo: File): string | null {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(photo.type)) {
      return 'Selecciona una imagen JPG, PNG o WebP.';
    }
    if (photo.size > 5 * 1024 * 1024) {
      return 'La imagen no puede superar los 5 MB.';
    }
    return null;
  }

  private errorText(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const detail = (error as { error: { error?: string } }).error?.error;
      if (detail) return detail;
    }
    return 'No se pudo conectar con el servidor. Comprueba que PostgreSQL y la API estén en ejecución.';
  }
}
