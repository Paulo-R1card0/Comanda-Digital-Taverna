import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { interval } from 'rxjs';
import { ApiService, dataISO } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ACAO_PROXIMO_STATUS, PROXIMO_STATUS, STATUS_PEDIDO } from '../core/labels';
import { Page, Pedido, StatusPedido } from '../core/models';
import { NotificacaoService } from '../core/notificacao.service';
import { StatusPedidoChip } from '../shared/status-chip';

/** RF-015, RF-016, RF-019: fila de pedidos da cozinha com filtros, paginação e avanço de status. */
@Component({
  selector: 'app-pedidos',
  imports: [CurrencyPipe, DatePipe, FormsModule, MatTableModule, MatPaginatorModule, MatFormFieldModule, MatSelectModule,
    MatInputModule, MatDatepickerModule, MatButtonModule, MatButtonToggleModule, MatIconModule, MatTooltipModule,
    StatusPedidoChip],
  template: `
    <div class="cabecalho-pagina">
      <div><h1>Pedidos</h1><p>A lista atualiza sozinha a cada 15 segundos.</p></div>
      <mat-button-toggle-group [(ngModel)]="atalho" (change)="aplicarAtalho()" aria-label="Atalhos">
        <mat-button-toggle value="abertos">Em aberto</mat-button-toggle>
        <mat-button-toggle value="hoje">Hoje</mat-button-toggle>
        <mat-button-toggle value="todos">Todos</mat-button-toggle>
      </mat-button-toggle-group>
    </div>

    <div class="filtros">
      <mat-form-field subscriptSizing="dynamic">
        <mat-label>Status</mat-label>
        <mat-select [(ngModel)]="status" (selectionChange)="filtrar()">
          <mat-option [value]="null">Todos</mat-option>
          @for (s of listaStatus; track s) { <mat-option [value]="s">{{ rotuloStatus[s].label }}</mat-option> }
        </mat-select>
      </mat-form-field>
      <mat-form-field subscriptSizing="dynamic">
        <mat-label>Canal</mat-label>
        <mat-select [(ngModel)]="canal" (selectionChange)="filtrar()">
          <mat-option [value]="null">Todos</mat-option>
          <mat-option value="SITE">Site</mat-option>
          <mat-option value="TELEFONE">Telefone</mat-option>
          <mat-option value="WHATSAPP">WhatsApp</mat-option>
        </mat-select>
      </mat-form-field>
      <mat-form-field subscriptSizing="dynamic">
        <mat-label>Período</mat-label>
        <mat-date-range-input [rangePicker]="picker">
          <input matStartDate placeholder="Início" [(ngModel)]="dataInicio" (dateChange)="filtrar()" />
          <input matEndDate placeholder="Fim" [(ngModel)]="dataFim" (dateChange)="filtrar()" />
        </mat-date-range-input>
        <mat-datepicker-toggle matIconSuffix [for]="picker" />
        <mat-date-range-picker #picker />
      </mat-form-field>
    </div>

    <div class="tabela-container mt">
      <table mat-table [dataSource]="pagina()?.content ?? []">
        <ng-container matColumnDef="id">
          <th mat-header-cell *matHeaderCellDef>Pedido</th>
          <td mat-cell *matCellDef="let p"><strong>#{{ p.id }}</strong><div class="texto-suave">{{ p.createdAt | date: 'dd/MM HH:mm' }}</div></td>
        </ng-container>
        <ng-container matColumnDef="cliente">
          <th mat-header-cell *matHeaderCellDef>Cliente</th>
          <td mat-cell *matCellDef="let p">{{ p.clienteNome }}<div class="texto-suave">{{ p.canal }}</div></td>
        </ng-container>
        <ng-container matColumnDef="itens">
          <th mat-header-cell *matHeaderCellDef>Itens</th>
          <td mat-cell *matCellDef="let p" class="itens">
            @for (i of p.itens; track i.id) {
              <div>{{ i.quantidade }}x {{ i.pratoNome }} @if (i.observacoes) { <em class="obs">({{ i.observacoes }})</em> }</div>
            }
          </td>
        </ng-container>
        <ng-container matColumnDef="total">
          <th mat-header-cell *matHeaderCellDef class="num">Total</th>
          <td mat-cell *matCellDef="let p" class="num">{{ p.valorTotal | currency }}</td>
        </ng-container>
        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>Status</th>
          <td mat-cell *matCellDef="let p"><app-status-pedido [status]="p.status" /></td>
        </ng-container>
        <ng-container matColumnDef="acoes">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let p" (click)="$event.stopPropagation()">
            @if (podeAvancar(p.status)) {
              <button mat-flat-button (click)="avancar(p)">{{ acao[p.status] }}</button>
            }
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="colunas"></tr>
        <tr mat-row *matRowDef="let row; columns: colunas" class="clicavel" (click)="abrir(row)"></tr>
        <tr class="mat-row" *matNoDataRow><td class="vazio" [attr.colspan]="colunas.length">Nenhum pedido encontrado.</td></tr>
      </table>
    </div>
    <mat-paginator [length]="pagina()?.totalElements ?? 0" [pageSize]="tamanho" [pageIndex]="paginaAtual"
                   [pageSizeOptions]="[10, 20, 50]" (page)="mudarPagina($event)" />
  `,
  styles: `
    .itens { font-size: 0.88rem; padding-top: 6px !important; padding-bottom: 6px !important; }
    .obs { color: var(--cd-alerta); }
    mat-paginator { background: transparent; }
  `,
})
export class Pedidos implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private notificacao = inject(NotificacaoService);
  private destroyRef = inject(DestroyRef);

  colunas = ['id', 'cliente', 'itens', 'total', 'status', 'acoes'];
  listaStatus = Object.keys(STATUS_PEDIDO) as StatusPedido[];
  rotuloStatus = STATUS_PEDIDO;
  acao = ACAO_PROXIMO_STATUS as Record<string, string>;

  pagina = signal<Page<Pedido> | null>(null);
  paginaAtual = 0;
  tamanho = 10;
  atalho = 'todos';
  status: StatusPedido | null = null;
  canal: string | null = null;
  dataInicio: Date | null = null;
  dataFim: Date | null = null;

  ngOnInit(): void {
    // O cozinheiro começa vendo só a fila do que precisa preparar
    if (this.auth.perfil() === 'COZINHEIRO') {
      this.atalho = 'abertos';
    }
    this.carregar();
    interval(15000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.carregar(true));
  }

  aplicarAtalho(): void {
    this.status = null;
    this.dataInicio = null;
    this.dataFim = null;
    if (this.atalho === 'hoje') {
      this.dataInicio = new Date();
      this.dataFim = new Date();
    }
    this.filtrar();
  }

  filtrar(): void {
    this.paginaAtual = 0;
    this.carregar();
  }

  mudarPagina(e: PageEvent): void {
    this.paginaAtual = e.pageIndex;
    this.tamanho = e.pageSize;
    this.carregar();
  }

  /** O cozinheiro só pode mover CONFIRMADO > EM_PREPARO > PRONTO. */
  podeAvancar(s: StatusPedido): boolean {
    if (!PROXIMO_STATUS[s]) return false;
    if (this.auth.perfil() === 'COZINHEIRO') return s === 'CONFIRMADO' || s === 'EM_PREPARO';
    return true;
  }

  avancar(p: Pedido): void {
    const proximo = PROXIMO_STATUS[p.status]!;
    this.api.alterarStatusPedido(p.id, proximo).subscribe(() => {
      this.notificacao.sucesso(`Pedido #${p.id}: ${STATUS_PEDIDO[proximo].label}`
        + (proximo === 'CONFIRMADO' ? ' (estoque baixado)' : ''));
      this.carregar();
    });
  }

  abrir(p: Pedido): void {
    this.router.navigate(['/admin/pedidos', p.id]);
  }

  private carregar(silencioso = false): void {
    const abertos = this.atalho === 'abertos';
    this.api
      .pedidos({
        status: this.status,
        canal: this.canal,
        dataInicio: this.dataInicio ? dataISO(this.dataInicio) : null,
        dataFim: this.dataFim ? dataISO(this.dataFim) : (this.dataInicio ? dataISO(this.dataInicio) : null),
        page: this.paginaAtual,
        size: abertos ? 100 : this.tamanho,
        sort: 'createdAt,desc',
      }, silencioso)
      .subscribe((p) => {
        if (abertos && !this.status) {
          const filtrados = p.content.filter((x) => x.status !== 'FINALIZADO' && x.status !== 'CANCELADO');
          this.pagina.set({ ...p, content: filtrados, totalElements: filtrados.length });
        } else {
          this.pagina.set(p);
        }
      });
  }
}
