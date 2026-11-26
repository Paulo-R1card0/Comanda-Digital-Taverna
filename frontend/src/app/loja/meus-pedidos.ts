import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Page, Pedido } from '../core/models';
import { StatusPedidoChip } from '../shared/status-chip';

/** RF-008: histórico de pedidos do cliente, mais recente primeiro. */
@Component({
  selector: 'app-meus-pedidos',
  imports: [CurrencyPipe, DatePipe, RouterLink, MatButtonModule, MatIconModule, MatPaginatorModule, StatusPedidoChip],
  template: `
    <div class="conteudo estreito">
      <div class="cabecalho-pagina">
        <div><h1>Meus pedidos</h1><p>Acompanhe e reveja seus pedidos.</p></div>
      </div>

      @for (p of pagina()?.content ?? []; track p.id) {
        <a class="cartao pedido" [routerLink]="['/meus-pedidos', p.id]">
          <div class="topo">
            <div>
              <strong>Pedido #{{ p.id }}</strong>
              <div class="texto-suave">{{ p.createdAt | date: "dd/MM/yyyy 'às' HH:mm" }}</div>
            </div>
            <app-status-pedido [status]="p.status" />
          </div>
          <div class="itens">{{ resumoItens(p) }}</div>
          <div class="rodape">
            <strong>{{ p.valorTotal | currency }}</strong>
            <span class="ver">Acompanhar <mat-icon>chevron_right</mat-icon></span>
          </div>
        </a>
      } @empty {
        @if (pagina()) {
          <div class="cartao vazio">
            <mat-icon>receipt_long</mat-icon>
            <p>Você ainda não fez nenhum pedido.</p>
            <a mat-flat-button routerLink="/">Ver cardápio</a>
          </div>
        }
      }

      @if ((pagina()?.totalElements ?? 0) > tamanho) {
        <mat-paginator [length]="pagina()!.totalElements" [pageSize]="tamanho" [pageIndex]="pagina()!.page"
                       [hidePageSize]="true" (page)="mudarPagina($event)" />
      }
    </div>
  `,
  styles: `
    .estreito { max-width: 760px; }
    .pedido { display: block; color: inherit; text-decoration: none; margin-bottom: 12px; transition: border-color .15s; }
    .pedido:hover { border-color: var(--cd-brasa); }
    .topo { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .itens { margin: 10px 0; color: var(--cd-texto-suave); }
    .rodape { display: flex; justify-content: space-between; align-items: center; }
    .ver { display: inline-flex; align-items: center; color: var(--cd-brasa-escura); font-weight: 600; }
    mat-paginator { background: transparent; }
  `,
})
export class MeusPedidos implements OnInit {
  private api = inject(ApiService);
  pagina = signal<Page<Pedido> | null>(null);
  tamanho = 10;

  ngOnInit(): void {
    this.carregar(0);
  }

  mudarPagina(e: PageEvent): void {
    this.carregar(e.pageIndex);
  }

  resumoItens(p: Pedido): string {
    return p.itens.map((i) => `${i.quantidade}x ${i.pratoNome}`).join(', ');
  }

  private carregar(page: number): void {
    this.api.meusPedidos(page, this.tamanho).subscribe((p) => this.pagina.set(p));
  }
}
