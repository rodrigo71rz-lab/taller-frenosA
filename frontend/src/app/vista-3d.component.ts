import { DecimalPipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Job } from './api.service';

type VehiclePart = 'body' | 'engine' | 'front-brakes' | 'rear-brakes' | 'suspension' | 'wheels';
type CameraPreset = 'isometric' | 'side' | 'front';

interface Wheel {
  id: string;
  part: VehiclePart;
  front: boolean;
  side: number;
  x: number;
  y: number;
}

interface PartDetails {
  id: VehiclePart;
  name: string;
  label: string;
  description: string;
  specification: string;
}

@Component({
  selector: 'app-vista-3d',
  imports: [DecimalPipe, FormsModule],
  templateUrl: './vista-3d.component.html',
  styleUrl: './vista-3d.component.css',
})
export class Vista3dComponent {
  @Input() jobs: Job[] = [];

  selectedJobId = 0;
  selectedPart: VehiclePart = 'body';
  cameraYaw = -32;
  cameraPitch = 22;
  zoom = 1;
  steeringAngle = 0;
  chassisVisible = false;
  wheelsSpinning = false;
  exploded = false;

  readonly partDetails: PartDetails[] = [
    {
      id: 'body',
      name: 'Carrocería',
      label: 'Estructura exterior',
      description: 'Paneles exteriores y cabina del vehículo.',
      specification: 'Vista de carrocería',
    },
    {
      id: 'engine',
      name: 'Motor',
      label: 'Compartimento delantero',
      description: 'Zona del motor y del sistema de refrigeración.',
      specification: 'Ubicación: eje delantero',
    },
    {
      id: 'front-brakes',
      name: 'Frenos delanteros',
      label: 'Conjunto delantero',
      description: 'Ruedas y conjunto de freno del eje delantero.',
      specification: 'Inspección: ruedas delanteras',
    },
    {
      id: 'rear-brakes',
      name: 'Frenos traseros',
      label: 'Conjunto trasero',
      description: 'Ruedas y conjunto de freno del eje trasero.',
      specification: 'Inspección: ruedas traseras',
    },
    {
      id: 'suspension',
      name: 'Suspensión',
      label: 'Ejes y suspensión',
      description: 'Elementos de soporte y conexión de los ejes.',
      specification: 'Ejes: delantero y trasero',
    },
    {
      id: 'wheels',
      name: 'Ruedas',
      label: 'Conjunto de ruedas',
      description: 'Ruedas, neumáticos y rines del vehículo.',
      specification: 'Conjunto: cuatro ruedas',
    },
  ];

  get selectedJob(): Job | undefined {
    return this.jobs.find((job) => job.id === Number(this.selectedJobId));
  }

  get selectedPartDetails(): PartDetails {
    return this.partDetails.find((part) => part.id === this.selectedPart) ?? this.partDetails[0];
  }

  get wheels(): Wheel[] {
    return [
      this.createWheel('front-left', -1, 160, true),
      this.createWheel('front-right', 1, 160, true),
      this.createWheel('rear-left', -1, 365, false),
      this.createWheel('rear-right', 1, 365, false),
    ];
  }

  get vehicleTransform(): string {
    const rotation = this.cameraYaw + 32;
    const verticalScale = 1 - (this.cameraPitch - 22) * 0.003;
    return `translate(400 260) rotate(${rotation}) scale(${this.zoom} ${this.zoom * verticalScale}) translate(-400 -260)`;
  }

  setCamera(preset: CameraPreset): void {
    const views: Record<CameraPreset, { yaw: number; pitch: number }> = {
      isometric: { yaw: -32, pitch: 22 },
      side: { yaw: -90, pitch: 10 },
      front: { yaw: 0, pitch: 10 },
    };
    this.cameraYaw = views[preset].yaw;
    this.cameraPitch = views[preset].pitch;
  }

  rotate(direction: -1 | 1): void {
    this.cameraYaw = ((this.cameraYaw + direction * 15 + 180) % 360 + 360) % 360 - 180;
  }

  setSteering(value: number): void {
    if (Number.isFinite(value)) this.steeringAngle = value;
  }

  chassisRailPath(side: -1 | 1): string {
    const x = 400 + side * 46;
    return `M ${x} 135 L ${x} 388`;
  }

  axlePath(y: number): string {
    return `M 294 ${y} L 506 ${y}`;
  }

  wheelOffset(wheel: Wheel): string {
    const lateralOffset = this.exploded ? wheel.side * 20 : 0;
    const longitudinalOffset = this.exploded ? (wheel.front ? -14 : 14) : 0;
    const steering = wheel.front ? this.steeringAngle : 0;
    return `translate(${wheel.x + lateralOffset} ${wheel.y + longitudinalOffset}) rotate(${steering})`;
  }

  selectPart(part: VehiclePart): void {
    this.selectedPart = part;
  }

  private createWheel(id: string, side: number, y: number, front: boolean): Wheel {
    return {
      id,
      part: front ? 'front-brakes' : 'rear-brakes',
      front,
      side,
      x: 400 + side * 115,
      y,
    };
  }
}
