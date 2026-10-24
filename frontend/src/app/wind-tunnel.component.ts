import { DecimalPipe } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-wind-tunnel',
  imports: [DecimalPipe],
  templateUrl: './wind-tunnel.component.html',
  styleUrl: './wind-tunnel.component.css',
})
export class WindTunnelComponent {
  windTunnelSpeed = 100;
  windTunnelViewMode: 'lines' | 'particles' = 'lines';

  readonly windTunnelDragCoefficient = 0.35;
  readonly windTunnelFrontalArea = 2.6;
  readonly windTunnelParticles = Array.from({ length: 24 }, (_, index) => index);

  setWindTunnelSpeed(event: Event): void {
    if (event.target instanceof HTMLInputElement) {
      this.windTunnelSpeed = Number(event.target.value);
    }
  }

  get windTunnelForce(): number {
    const speedMps = this.windTunnelSpeed / 3.6;
    return 0.5 * 1.225 * speedMps * speedMps * this.windTunnelDragCoefficient * this.windTunnelFrontalArea;
  }
}
