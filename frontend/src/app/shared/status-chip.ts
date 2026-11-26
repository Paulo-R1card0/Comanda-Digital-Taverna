import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { STATUS_PEDIDO } from '../core/labels';
import { FaixaFoodCost, StatusPedido } from '../core/models';

/** Etiqueta colorida com o status do pedido. */
@Component({
  selector: 'app-status-pedido',
  imports: [MatIconModule],
  template: `
    <span class="chip" [class]="'chip chip-' + info().cor">
      <mat-icon>{{ info().icon }}</mat-icon>{{ info().label }}
    </span>
  `,
})
export class StatusPedidoChip {
  status = input.required<StatusPedido>();
  info = computed(() => STATUS_PEDIDO[this.status()]);
}

/** Etiqueta genérica (ATIVO, INATIVO, RASCUNHO...). */
@Component({
  selector: 'app-etiqueta',
  template: `<span [class]="'chip chip-' + cor()">{{ texto() }}</span>`,
})
export class Etiqueta {
  texto = input.required<string>();
  cor = input<string>('neutro');
}

/** RF-013: food cost com cor (verde ≤ 30%, amarelo 31-35%, vermelho > 35%). */
@Component({
  selector: 'app-food-cost',
  template: `
    @if (valor() !== null && valor() !== undefined) {
      <span [class]="'chip chip-fc-' + (faixa() ?? 'VERDE').toLowerCase()">{{ valor()!.toFixed(1).replace('.', ',') }}%</span>
    } @else {
      <span class="chip chip-neutro">sem ficha</span>
    }
  `,
})
export class FoodCostChip {
  valor = input<number | null | undefined>();
  faixa = input<FaixaFoodCost | null | undefined>();
}
