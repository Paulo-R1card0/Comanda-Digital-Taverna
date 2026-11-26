import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Categoria, Page, Prato } from '../core/models';
import { NotificacaoService } from '../core/notificacao.service';
import { Etiqueta, FoodCostChip } from '../shared/status-chip';

/** RF-010 / RF-013: lista de pratos com custo e food cost colorido. */
@Component({
  selector: 'app-pratos',
  imports: [CurrencyPipe, FormsModule, RouterLink, MatTableModule, MatPaginatorModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatSlideToggleModule, MatTooltipModule, Etiqueta, FoodCostChip],
  template: `
    <div class="cabecalho-pagina">
      <div><h1>Pratos e fichas técnicas</h1><p>Custo calculado pela ficha técnica. Food cost: verde ≤ 30%, amarelo até 35%, vermelho acima.</p></div>
      <a mat-flat-button routerLink="/admin/pratos/novo"><mat-icon>add</mat-icon>Novo prato</a>
    </div>

    <div class="filtros">
      <mat-form-field subscriptSizing="dynamic">
        <mat-label>Buscar</mat-label>
        <input matInput [(ngModel)]="busca" (keyup.enter)="filtrar()" (blur)="filtrar()" />
        <mat-icon matSuffix>search</mat-icon>
      </mat-form-field>
      <mat-form-field subscriptSizing="dynamic">
        <mat-label>Categoria</mat-label>
        <mat-select [(ngModel)]="categoriaId" (selectionChange)="filtrar()">
          <mat-option [value]="null">Todas</mat-option>
          @for (c of categorias(); track c.id) { <mat-option [value]="c.id">{{ c.nome }}</mat-option> }
        </mat-select>
      </mat-form-field>
      <mat-form-field subscriptSizing="dynamic">
        <mat-label>Status</mat-label>
        <mat-select [(ngModel)]="status" (selectionChange)="filtrar()">
          <mat-option [value]="null">Todos</mat-option>
          <mat-option value="ATIVO">Ativo</mat-option>
          <mat-option value="PAUSADO">Pausado</mat-option>
          <mat-option value="INATIVO">Inativo</mat-option>
        </mat-select>
      </mat-form-field>
    </div>

    <div class="tabela-container mt">
      <table mat-table [dataSource]="pagina()?.content ?? []">
        <ng-container matColumnDef="nome">
          <th mat-header-cell *matHeaderCellDef>Prato</th>
          <td mat-cell *matCellDef="let p"><strong>{{ p.nome }}</strong><div class="texto-suave">{{ p.categoriaNome }}</div></td>
        </ng-container>
        <ng-container matColumnDef="preco"><th mat-header-cell *matHeaderCellDef class="num">Preço</th><td mat-cell *matCellDef="let p" class="num">{{ p.precoVenda | currency }}</td></ng-container>
        <ng-container matColumnDef="custo"><th mat-header-cell *matHeaderCellDef class="num">Custo</th><td mat-cell *matCellDef="let p" class="num">{{ p.custo !== null ? (p.custo | currency) : '-' }}</td></ng-container>
        <ng-container matColumnDef="foodCost"><th mat-header-cell *matHeaderCellDef>Food cost</th><td mat-cell *matCellDef="let p"><app-food-cost [valor]="p.foodCost" [faixa]="p.faixaFoodCost" /></td></ng-container>
        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>No cardápio</th>
          <td mat-cell *matCellDef="let p" (click)="$event.stopPropagation()">
            <mat-slide-toggle [checked]="p.status === 'ATIVO'" (change)="alternar(p, $event.checked)"
                              [matTooltip]="p.possuiFicha ? '' : 'Cadastre a ficha técnica para ativar'">
              <app-etiqueta [texto]="p.status" [cor]="p.status === 'ATIVO' ? 'ok' : p.status === 'PAUSADO' ? 'warn' : 'neutro'" />
            </mat-slide-toggle>
          </td>
        </ng-container>
        <ng-container matColumnDef="acoes">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let p" class="direita"><mat-icon class="texto-suave">chevron_right</mat-icon></td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="colunas"></tr>
        <tr mat-row *matRowDef="let row; columns: colunas" class="clicavel" (click)="abrir(row)"></tr>
        <tr class="mat-row" *matNoDataRow><td class="vazio" [attr.colspan]="colunas.length">Nenhum prato encontrado.</td></tr>
      </table>
    </div>
    <mat-paginator [length]="pagina()?.totalElements ?? 0" [pageSize]="10" [pageIndex]="paginaAtual" (page)="mudarPagina($event)" />
  `,
})
export class Pratos implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private notificacao = inject(NotificacaoService);

  colunas = ['nome', 'preco', 'custo', 'foodCost', 'status', 'acoes'];
  pagina = signal<Page<Prato> | null>(null);
  categorias = signal<Categoria[]>([]);
  paginaAtual = 0;
  busca = '';
  categoriaId: number | null = null;
  status: string | null = null;

  ngOnInit(): void {
    this.api.categorias.listar({ size: 100, sort: 'ordem' }).subscribe((p) => this.categorias.set(p.content));
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

  abrir(p: Prato): void {
    this.router.navigate(['/admin/pratos', p.id]);
  }

  /** RN01: o back recusa ativar prato sem ficha técnica; nesse caso a tela volta ao estado anterior. */
  alternar(p: Prato, ativo: boolean): void {
    this.api.alterarStatusPrato(p.id, ativo ? 'ATIVO' : 'INATIVO').subscribe({
      next: () => {
        this.notificacao.sucesso(ativo ? `${p.nome} está no cardápio` : `${p.nome} saiu do cardápio`);
        this.carregar();
      },
      error: () => this.carregar(),
    });
  }

  private carregar(): void {
    this.api.pratos
      .listar({ busca: this.busca, categoriaId: this.categoriaId, status: this.status, page: this.paginaAtual, size: 10, sort: 'nome' })
      .subscribe((p) => this.pagina.set(p));
  }
}
