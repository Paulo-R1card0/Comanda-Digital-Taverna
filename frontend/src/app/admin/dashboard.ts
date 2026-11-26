import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { forkJoin } from 'rxjs';
import { ApiService, dataISO } from '../core/api.service';
import { Resumo, Saldo, TopPrato, VendaDia } from '../core/models';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Dashboard (RF-034 a RF-037): KPIs do dia, top 5 pratos, vendas por período e alertas de estoque. */
@Component({
  selector: 'app-dashboard',
  imports: [CurrencyPipe, DecimalPipe, DatePipe, FormsModule, RouterLink, MatIconModule, MatButtonToggleModule,
    BaseChartDirective],
  template: `
    <div class="cabecalho-pagina">
      <div><h1>Dashboard</h1><p>Visão de hoje, {{ hoje | date: "EEEE, dd 'de' MMMM" }}</p></div>
      <mat-button-toggle-group [(ngModel)]="periodo" (change)="carregarPeriodo()" aria-label="Período">
        <mat-button-toggle [value]="7">7 dias</mat-button-toggle>
        <mat-button-toggle [value]="15">15 dias</mat-button-toggle>
        <mat-button-toggle [value]="30">30 dias</mat-button-toggle>
      </mat-button-toggle-group>
    </div>

    @if (resumo(); as r) {
      <div class="grade-4">
        <div class="cartao kpi">
          <span class="kpi-rotulo"><mat-icon>payments</mat-icon>Faturamento do dia</span>
          <span class="kpi-valor">{{ r.faturamento | currency }}</span>
          <span class="kpi-rodape">pedidos não cancelados</span>
        </div>
        <div class="cartao kpi">
          <span class="kpi-rotulo"><mat-icon>receipt_long</mat-icon>Pedidos do dia</span>
          <span class="kpi-valor">{{ r.totalPedidos }}</span>
          <span class="kpi-rodape">{{ r.pedidosEmAberto }} em aberto agora</span>
        </div>
        <div class="cartao kpi">
          <span class="kpi-rotulo"><mat-icon>sell</mat-icon>Ticket médio</span>
          <span class="kpi-valor">{{ r.ticketMedio | currency }}</span>
          <span class="kpi-rodape">faturamento ÷ pedidos</span>
        </div>
        <div class="cartao kpi">
          <span class="kpi-rotulo"><mat-icon>percent</mat-icon>Food cost médio</span>
          <span class="kpi-valor" [class]="corFoodCost(r.foodCostMedio)">{{ r.foodCostMedio | number: '1.1-1' }}%</span>
          <span class="kpi-rodape">meta: até 30%</span>
        </div>
      </div>
    }

    <div class="grade-graficos mt">
      <div class="cartao">
        <h2>Vendas por dia</h2>
        <p class="texto-suave">Faturamento diário dos últimos {{ periodo }} dias</p>
        <div class="grafico"><canvas baseChart type="line" [data]="graficoVendas()" [options]="opcoesVendas"></canvas></div>
      </div>
      <div class="cartao">
        <h2>Top 5 pratos</h2>
        <p class="texto-suave">Mais vendidos nos últimos {{ periodo }} dias</p>
        @if (top().length) {
          <div class="grafico"><canvas baseChart type="bar" [data]="graficoTop()" [options]="opcoesTop"></canvas></div>
        } @else {
          <div class="vazio">Sem vendas no período.</div>
        }
      </div>
    </div>

    <div class="grade-graficos mt">
      <div class="cartao">
        <h2>Resumo do período</h2>
        <div class="tabela-container mt">
          <table class="tabela-simples">
            <thead><tr><th>Dia</th><th class="num">Pedidos</th><th class="num">Ticket médio</th><th class="num">Faturamento</th></tr></thead>
            <tbody>
              @for (v of vendasInvertidas(); track v.data) {
                <tr><td>{{ v.data | date: 'EEE, dd/MM' }}</td><td class="num">{{ v.pedidos }}</td>
                  <td class="num">{{ v.ticketMedio | currency }}</td><td class="num">{{ v.faturamento | currency }}</td></tr>
              }
            </tbody>
            <tfoot><tr><th>Total</th><th class="num">{{ totalPedidosPeriodo() }}</th><th></th><th class="num">{{ totalPeriodo() | currency }}</th></tr></tfoot>
          </table>
        </div>
      </div>
      <div class="cartao">
        <div class="linha"><h2>Alertas de estoque</h2><span class="espacador"></span><a routerLink="/admin/estoque">Ver estoque</a></div>
        @for (a of alertas(); track a.ingredienteId) {
          <div class="alerta">
            <mat-icon>warning</mat-icon>
            <div class="espacador">
              <strong>{{ a.ingredienteNome }}</strong>
              <div class="texto-suave">Saldo {{ a.saldo | number: '1.0-3' }} {{ a.unidade }} · mínimo {{ a.estoqueMinimo | number: '1.0-3' }} {{ a.unidade }}</div>
            </div>
            <a routerLink="/admin/cotacao" [queryParams]="{ ingrediente: a.ingredienteId }" class="cotar">Cotar</a>
          </div>
        } @empty {
          <div class="vazio"><mat-icon>check_circle</mat-icon><p>Nenhum ingrediente abaixo do mínimo.</p></div>
        }
      </div>
    </div>
  `,
  styles: `
    .grade-graficos { display: grid; grid-template-columns: 1.3fr 1fr; gap: 16px; }
    .grafico { position: relative; height: 280px; margin-top: 12px; }
    .vermelho { color: var(--cd-erro); } .amarelo { color: var(--cd-alerta); } .verde { color: var(--cd-ok); }
    .alerta { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--cd-borda); }
    .alerta > mat-icon { color: var(--cd-erro); }
    .cotar { font-weight: 600; }
    .tabela-simples { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    .tabela-simples th, .tabela-simples td { padding: 8px 12px; border-bottom: 1px solid var(--cd-borda); text-align: left; }
    .tabela-simples .num { text-align: right; }
    @media (max-width: 960px) { .grade-graficos { grid-template-columns: 1fr; } }
  `,
})
export class Dashboard implements OnInit {
  private api = inject(ApiService);

  hoje = new Date();
  periodo = 7;
  resumo = signal<Resumo | null>(null);
  vendas = signal<VendaDia[]>([]);
  top = signal<TopPrato[]>([]);
  alertas = signal<Saldo[]>([]);

  vendasInvertidas = computed(() => [...this.vendas()].reverse());
  totalPeriodo = computed(() => this.vendas().reduce((s, v) => s + v.faturamento, 0));
  totalPedidosPeriodo = computed(() => this.vendas().reduce((s, v) => s + v.pedidos, 0));

  graficoVendas = computed<ChartConfiguration<'line'>['data']>(() => ({
    labels: this.vendas().map((v) => v.data.slice(8, 10) + '/' + v.data.slice(5, 7)),
    datasets: [{
      label: 'Faturamento',
      data: this.vendas().map((v) => v.faturamento),
      borderColor: '#e8590c',
      backgroundColor: 'rgba(232, 89, 12, 0.12)',
      fill: true,
      tension: 0.35,
      pointRadius: 4,
    }],
  }));

  graficoTop = computed<ChartConfiguration<'bar'>['data']>(() => ({
    labels: this.top().map((t) => t.nome),
    datasets: [{
      label: 'Unidades vendidas',
      data: this.top().map((t) => t.quantidade),
      backgroundColor: ['#e8590c', '#f76707', '#fd7e14', '#ff922b', '#ffa94d'],
      borderRadius: 6,
    }],
  }));

  opcoesVendas: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => BRL.format(Number(c.parsed.y)) } } },
    scales: { y: { beginAtZero: true, ticks: { callback: (v) => BRL.format(Number(v)) } } },
  };

  opcoesTop: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true, ticks: { precision: 0 } } },
  };

  ngOnInit(): void {
    this.api.resumo().subscribe((r) => this.resumo.set(r));
    this.api.alertas({ size: 6 }).subscribe((p) => this.alertas.set(p.content));
    this.carregarPeriodo();
  }

  carregarPeriodo(): void {
    const fim = new Date();
    const inicio = new Date();
    inicio.setDate(fim.getDate() - (this.periodo - 1));
    forkJoin({
      vendas: this.api.vendas(dataISO(inicio), dataISO(fim)),
      top: this.api.topPratos(dataISO(inicio), dataISO(fim)),
    }).subscribe(({ vendas, top }) => {
      this.vendas.set(vendas);
      this.top.set(top);
    });
  }

  corFoodCost(v: number): string {
    return v > 35 ? 'kpi-valor vermelho' : v > 30 ? 'kpi-valor amarelo' : 'kpi-valor verde';
  }
}
