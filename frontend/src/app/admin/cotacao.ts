import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { ApiService } from '../core/api.service';
import { Cotacao, HistoricoPreco, Ingrediente } from '../core/models';

const CORES = ['#e8590c', '#1c64b4', '#2f9e44', '#9c36b5', '#f59f00', '#0c8599'];

/** RF-023: cotação comparativa (ordenada por preço) e RF-026: gráfico de evolução de preços. */
@Component({
  selector: 'app-cotacao',
  imports: [CurrencyPipe, FormsModule, RouterLink, MatFormFieldModule, MatSelectModule, MatTableModule, MatButtonModule,
    MatIconModule, BaseChartDirective],
  template: `
    <div class="cabecalho-pagina">
      <div><h1>Cotação comparativa</h1><p>Compare o preço de um ingrediente entre fornecedores (já convertido para a mesma unidade).</p></div>
    </div>

    <mat-form-field class="seletor">
      <mat-label>Ingrediente</mat-label>
      <mat-select [(ngModel)]="ingredienteId" (selectionChange)="carregar()">
        @for (i of ingredientes(); track i.id) { <mat-option [value]="i.id">{{ i.nome }}</mat-option> }
      </mat-select>
    </mat-form-field>

    @if (cotacao(); as c) {
      <div class="grade-cotacao">
        <div class="cartao">
          <h2>{{ c.ingredienteNome }}</h2>
          <p class="texto-suave">Custo atual no sistema: {{ c.custoAtual | currency: 'BRL' : 'symbol' : '1.2-4' }}/{{ c.unidadePadrao }}</p>
          <div class="tabela-container mt">
            <table mat-table [dataSource]="c.ofertas">
              <ng-container matColumnDef="pos"><th mat-header-cell *matHeaderCellDef>#</th><td mat-cell *matCellDef="let o; let i = index">{{ i + 1 }}º</td></ng-container>
              <ng-container matColumnDef="fornecedor"><th mat-header-cell *matHeaderCellDef>Fornecedor</th>
                <td mat-cell *matCellDef="let o"><strong>{{ o.fornecedorNome }}</strong>
                  @if (o.maisBarato) { <span class="chip chip-ok">mais barato</span> }</td></ng-container>
              <ng-container matColumnDef="preco"><th mat-header-cell *matHeaderCellDef class="num">Preço</th>
                <td mat-cell *matCellDef="let o" class="num">{{ o.preco | currency }}/{{ o.unidadeVenda }}</td></ng-container>
              <ng-container matColumnDef="padrao"><th mat-header-cell *matHeaderCellDef class="num">Por {{ c.unidadePadrao }}</th>
                <td mat-cell *matCellDef="let o" class="num">{{ o.precoPorUnidadePadrao | currency: 'BRL' : 'symbol' : '1.2-4' }}</td></ng-container>
              <ng-container matColumnDef="diferenca"><th mat-header-cell *matHeaderCellDef class="num">vs. mais barato</th>
                <td mat-cell *matCellDef="let o" class="num">{{ diferenca(o.precoPorUnidadePadrao) }}</td></ng-container>
              <ng-container matColumnDef="acoes"><th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let o" class="direita">
                  <a mat-stroked-button routerLink="/admin/compras/nova" [queryParams]="{ fornecedor: o.fornecedorId, ingrediente: c.ingredienteId }">Comprar</a>
                </td></ng-container>
              <tr mat-header-row *matHeaderRowDef="colunas"></tr>
              <tr mat-row *matRowDef="let row; columns: colunas"></tr>
              <tr class="mat-row" *matNoDataRow><td class="vazio" [attr.colspan]="colunas.length">Nenhum fornecedor vende este ingrediente ainda.</td></tr>
            </table>
          </div>
        </div>
        <div class="cartao">
          <h2>Evolução do preço</h2>
          <p class="texto-suave">Preço por {{ c.unidadePadrao }} em cada fornecedor</p>
          @if (historico().length) {
            <div class="grafico"><canvas baseChart type="line" [data]="grafico()" [options]="opcoes"></canvas></div>
          } @else {
            <div class="vazio">Sem histórico de preços.</div>
          }
        </div>
      </div>
    } @else {
      <div class="cartao vazio"><mat-icon>compare_arrows</mat-icon><p>Escolha um ingrediente para comparar os preços.</p></div>
    }
  `,
  styles: `
    .seletor { width: 100%; max-width: 420px; }
    .grade-cotacao { display: grid; grid-template-columns: 1.2fr 1fr; gap: 16px; align-items: start; }
    .grafico { position: relative; height: 300px; margin-top: 12px; }
    .chip { margin-left: 6px; }
    @media (max-width: 1000px) { .grade-cotacao { grid-template-columns: 1fr; } }
  `,
})
export class CotacaoPage implements OnInit {
  ingrediente = input<string | undefined>(); // ?ingrediente=ID

  private api = inject(ApiService);

  colunas = ['pos', 'fornecedor', 'preco', 'padrao', 'diferenca', 'acoes'];
  ingredientes = signal<Ingrediente[]>([]);
  cotacao = signal<Cotacao | null>(null);
  historico = signal<HistoricoPreco[]>([]);
  ingredienteId: number | null = null;

  grafico = computed<ChartConfiguration<'line'>['data']>(() => {
    const pontos = this.historico();
    const datas = [...new Set(pontos.map((p) => p.data.slice(0, 10)))].sort();
    const fornecedores = [...new Set(pontos.map((p) => p.fornecedorNome))];
    return {
      labels: datas.map((d) => `${d.slice(8, 10)}/${d.slice(5, 7)}`),
      datasets: fornecedores.map((nome, idx) => ({
        label: nome,
        data: datas.map((d) => pontos.filter((p) => p.fornecedorNome === nome && p.data.startsWith(d)).at(-1)?.precoUnitario ?? null),
        borderColor: CORES[idx % CORES.length],
        backgroundColor: CORES[idx % CORES.length],
        spanGaps: true,
        tension: 0.3,
      })),
    };
  });

  opcoes: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
    scales: { y: { ticks: { callback: (v) => 'R$ ' + Number(v).toFixed(4).replace('.', ',') } } },
  };

  ngOnInit(): void {
    this.api.ingredientes.listar({ size: 1000, sort: 'nome', status: 'ATIVO' }).subscribe((p) => this.ingredientes.set(p.content));
    const inicial = this.ingrediente();
    if (inicial) {
      this.ingredienteId = Number(inicial);
      this.carregar();
    }
  }

  carregar(): void {
    if (!this.ingredienteId) return;
    this.api.cotacao(this.ingredienteId).subscribe((c) => this.cotacao.set(c));
    this.api.historicoPrecos(this.ingredienteId).subscribe((h) => this.historico.set(h));
  }

  diferenca(preco: number): string {
    const menor = this.cotacao()?.ofertas[0]?.precoPorUnidadePadrao;
    if (!menor || preco === menor) return '-';
    return `+${(((preco - menor) / menor) * 100).toFixed(1).replace('.', ',')}%`;
  }
}
