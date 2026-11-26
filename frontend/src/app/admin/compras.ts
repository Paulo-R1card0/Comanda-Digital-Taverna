import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Compra, Page, StatusCompra } from '../core/models';
import { Etiqueta } from '../shared/status-chip';

export const COR_COMPRA: Record<StatusCompra, string> = { RASCUNHO: 'neutro', ENVIADO: 'info', RECEBIDO: 'ok', CANCELADO: 'erro' };

/** RF-024: lista de pedidos de compra (RASCUNHO > ENVIADO > RECEBIDO). */
@Component({
  selector: 'app-compras',
  imports: [CurrencyPipe, DatePipe, FormsModule, RouterLink, MatTableModule, MatPaginatorModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatSelectModule, Etiqueta],
  template: `
    <div class="cabecalho-pagina">
      <div><h1>Compras</h1><p>Ao receber a mercadoria, o estoque e o custo dos ingredientes são atualizados automaticamente.</p></div>
      <a mat-flat-button routerLink="/admin/compras/nova"><mat-icon>add</mat-icon>Nova compra</a>
    </div>
    <div class="filtros">
      <mat-form-field subscriptSizing="dynamic">
        <mat-label>Status</mat-label>
        <mat-select [(ngModel)]="status" (selectionChange)="filtrar()">
          <mat-option [value]="null">Todos</mat-option>
          <mat-option value="RASCUNHO">Rascunho</mat-option>
          <mat-option value="ENVIADO">Enviado</mat-option>
          <mat-option value="RECEBIDO">Recebido</mat-option>
          <mat-option value="CANCELADO">Cancelado</mat-option>
        </mat-select>
      </mat-form-field>
    </div>
    <div class="tabela-container mt">
      <table mat-table [dataSource]="pagina()?.content ?? []">
        <ng-container matColumnDef="id"><th mat-header-cell *matHeaderCellDef>Compra</th>
          <td mat-cell *matCellDef="let c"><strong>#{{ c.id }}</strong><div class="texto-suave">{{ c.createdAt | date: 'dd/MM/yy HH:mm' }}</div></td></ng-container>
        <ng-container matColumnDef="fornecedor"><th mat-header-cell *matHeaderCellDef>Fornecedor</th>
          <td mat-cell *matCellDef="let c">{{ c.fornecedorNome }}<div class="texto-suave">{{ c.itens.length }} item(ns) · por {{ c.usuarioNome }}</div></td></ng-container>
        <ng-container matColumnDef="total"><th mat-header-cell *matHeaderCellDef class="num">Total</th>
          <td mat-cell *matCellDef="let c" class="num">{{ c.valorTotal | currency }}</td></ng-container>
        <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Status</th>
          <td mat-cell *matCellDef="let c"><app-etiqueta [texto]="c.status" [cor]="cor[c.status]" /></td></ng-container>
        <tr mat-header-row *matHeaderRowDef="colunas"></tr>
        <tr mat-row *matRowDef="let row; columns: colunas" class="clicavel" (click)="abrir(row)"></tr>
        <tr class="mat-row" *matNoDataRow><td class="vazio" [attr.colspan]="colunas.length">Nenhuma compra encontrada.</td></tr>
      </table>
    </div>
    <mat-paginator [length]="pagina()?.totalElements ?? 0" [pageSize]="10" [pageIndex]="paginaAtual" (page)="mudarPagina($event)" />
  `,
})
export class Compras implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);

  colunas = ['id', 'fornecedor', 'total', 'status'];
  cor = COR_COMPRA as Record<string, string>;
  pagina = signal<Page<Compra> | null>(null);
  paginaAtual = 0;
  status: StatusCompra | null = null;

  ngOnInit(): void {
    this.carregar();
  }

  filtrar(): void {
    this.paginaAtual = 0;
    this.carregar();
  }

  mudarPagina(e: PageEvent): void {
    this.paginaAtual = e.pageIndex;
    this.carregar();
  }

  abrir(c: Compra): void {
    this.router.navigate(['/admin/compras', c.id]);
  }

  private carregar(): void {
    this.api.compras.listar({ status: this.status, page: this.paginaAtual, size: 10, sort: 'createdAt,desc' }).subscribe((p) => this.pagina.set(p));
  }
}
