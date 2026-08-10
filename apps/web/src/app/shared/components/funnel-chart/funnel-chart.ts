import { Component, computed, input } from '@angular/core';

export interface FunnelStage {
  key: string;
  label: string;
  value: number;
}

interface RenderedStage extends FunnelStage {
  widthPercentage: number;
  gradient: string;
}

// Degradado por etapa: violeta suave (recién enviada) → verde saturado
// (convertida = ingreso ganado) — la progresión de color refuerza la
// progresión del embudo, no solo el ancho.
const STAGE_GRADIENTS = [
  'linear-gradient(135deg, #c4b5fd, #a78bfa)',
  'linear-gradient(135deg, #8b5cf6, #7c3aed)',
  'linear-gradient(135deg, #34d399, #16a34a)',
];

// Ancho fijo y decreciente por posición (100/85/70/…), no proporcional al
// valor real: un embudo con conteos iguales (p. ej. 7/7/7, 100% de
// conversión) debe seguir *viéndose* como embudo, no como tres barras
// idénticas — el número real de cada etapa ya se muestra dentro de la
// barra, así que no se pierde información, solo cambia lo que comunica el
// ancho (orden del embudo, no proporción).
const WIDTH_STEP_PERCENTAGE = 15;
const MIN_WIDTH_PERCENTAGE = 40;

@Component({
  selector: 'app-funnel-chart',
  imports: [],
  templateUrl: './funnel-chart.html',
  styleUrl: './funnel-chart.scss',
})
export class FunnelChart {
  readonly stages = input<FunnelStage[]>([]);

  protected readonly renderedStages = computed<RenderedStage[]>(() =>
    this.stages().map((stage, index) => ({
      ...stage,
      widthPercentage: Math.max(100 - index * WIDTH_STEP_PERCENTAGE, MIN_WIDTH_PERCENTAGE),
      gradient: STAGE_GRADIENTS[index % STAGE_GRADIENTS.length],
    })),
  );
}
