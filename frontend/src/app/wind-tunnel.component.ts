import { DecimalPipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface WindTunnelVehicle {
  brand: string;
  model: string;
  dragCoefficient: number;
  frontalArea: number;
  mass: number;
  imageUrl: string;
  imageSource: string;
  imageCredit: string;
  imageLicense: string;
}

@Component({
  selector: 'app-wind-tunnel',
  imports: [DecimalPipe, FormsModule],
  templateUrl: './wind-tunnel.component.html',
  styleUrl: './wind-tunnel.component.css',
})
export class WindTunnelComponent {
  windTunnelVehicle = 'Toyota';
  windTunnelSpeed = 90;

  readonly windTunnelOptions: WindTunnelVehicle[] = [
    {
      brand: 'Toyota',
      model: 'Corolla Altis HEV',
      dragCoefficient: 0.31,
      frontalArea: 2.2,
      mass: 1360,
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/2023_Toyota_Corolla_Altis_1.8_GR_Sport_HEV_in_Platinum_White_Pearl_Mica%2C_rear_left%2C_06-30-2024.jpg/960px-2023_Toyota_Corolla_Altis_1.8_GR_Sport_HEV_in_Platinum_White_Pearl_Mica%2C_rear_left%2C_06-30-2024.jpg',
      imageSource: 'https://commons.wikimedia.org/wiki/File:2023_Toyota_Corolla_Altis_1.8_GR_Sport_HEV_in_Platinum_White_Pearl_Mica,_rear_left,_06-30-2024.jpg',
      imageCredit: 'Ethan Llamas · CC BY-SA 4.0',
      imageLicense: 'https://creativecommons.org/licenses/by-sa/4.0/',
    },
    {
      brand: 'Renault',
      model: 'Clio V',
      dragCoefficient: 0.34,
      frontalArea: 2.1,
      mass: 1180,
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Renault_Clio_V_Genf_2019_1Y7A5590.jpg/960px-Renault_Clio_V_Genf_2019_1Y7A5590.jpg',
      imageSource: 'https://commons.wikimedia.org/wiki/File:Renault_Clio_V_Genf_2019_1Y7A5590.jpg',
      imageCredit: 'Alexander Migl · CC BY-SA 4.0',
      imageLicense: 'https://creativecommons.org/licenses/by-sa/4.0/',
    },
    {
      brand: 'Nissan',
      model: 'Sentra 2020',
      dragCoefficient: 0.33,
      frontalArea: 2.3,
      mass: 1420,
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Nissan_Sentra_2020_%2854219455256%29.jpg/960px-Nissan_Sentra_2020_%2854219455256%29.jpg',
      imageSource: 'https://commons.wikimedia.org/wiki/File:Nissan_Sentra_2020_(54219455256).jpg',
      imageCredit: 'RL GNZLZ · CC BY-SA 2.0',
      imageLicense: 'https://creativecommons.org/licenses/by-sa/2.0/',
    },
  ];

  get selectedWindTunnelVehicle(): WindTunnelVehicle {
    return this.windTunnelOptions.find((vehicle) => vehicle.brand === this.windTunnelVehicle) ?? this.windTunnelOptions[0];
  }

  get windTunnelForce(): number {
    const vehicle = this.selectedWindTunnelVehicle;
    const speedMps = this.windTunnelSpeed / 3.6;
    return 0.5 * 1.225 * speedMps * speedMps * vehicle.dragCoefficient * vehicle.frontalArea;
  }

  get windTunnelLoad(): number {
    return this.windTunnelForce / 9.81;
  }

  get windTunnelDynamicPressure(): number {
    const speedMps = this.windTunnelSpeed / 3.6;
    return 0.5 * 1.225 * speedMps * speedMps;
  }

  get windTunnelPower(): number {
    return this.windTunnelForce * (this.windTunnelSpeed / 3.6);
  }

  get windTunnelComparisons(): { vehicle: WindTunnelVehicle; force: number }[] {
    const speedMps = this.windTunnelSpeed / 3.6;
    return this.windTunnelOptions.map((vehicle) => ({
      vehicle,
      force: 0.5 * 1.225 * speedMps * speedMps * vehicle.dragCoefficient * vehicle.frontalArea,
    }));
  }

  get windTunnelLevel(): number {
    return Math.min((this.windTunnelForce / 1800) * 100, 100);
  }
}
