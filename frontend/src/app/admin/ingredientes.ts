import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { UNIDADES } from '../core/labels';
import { Ingrediente, Page } from '../core/models';
import { NotificacaoService } from '../core/notificacao.service';
import { ConfirmarDialog } from '../shared/dialogs';
import { Etiqueta } from '../shared/status-chip';

/** RF-027: CRUD de ingredientes com saldo atual. */
@Component({
  selector: 'app-ingredientes',
  imports: [CurrencyPipe, DecimalPipe, FormsModule, RouterLink, MatTableModule, MatPaginatorModule, MatButtonModule,
    MatIconModule, MatFormFieldModule, MatInputModule, Etiqueta],
  template: `
    <div class="cabecalho-pagina">
      <div><h1>Ingredientes</h1><p>Custo unitário sempre na unidade padrão (ex.: R$ por grama).</p></div>
      <button mat-flat-button (click)="abrir()"><mat-icon>add</mat-icon>Novo ingrediente</button>
    </div>
    <div class="filtros">
      <mat-form-field subscriptSizing="dynamic">
        <mat-label>Buscar por nome ou SKU</mat-label>
        <input matInput [(ngModel)]="busca" (keyup.enter)="filtrar()" (blur)="filtrar()" />
        <mat-icon matSuffix>search</mat-icon>
      </mat-form-field>
    </div>
    <div class="tabela-container mt">
      <table mat-table [dataSource]="pagina()?.content ?? []">
        <ng-container matColumnDef="nome"><th mat-header-cell *matHeaderCellDef>Ingrediente</th>
          <td mat-cell *matCellDef="let i"><strong>{{ i.nome }}</strong><div class="texto-suave">{{ i.sku }}</div></td></ng-container>
        <ng-container matColumnDef="custo"><th mat-header-cell *matHeaderCellDef class="num">Custo unitário</th>
          <td mat-cell *matCellDef="let i" class="num">{{ i.custoUnitario | currency: 'BRL' : 'symbol' : '1.2-4' }}/{{ i.unidadePadrao }}</td></ng-container>
        <ng-container matColumnDef="saldo"><th mat-header-cell *matHeaderCellDef class="num">Saldo</th>
          <td mat-cell *matCellDef="let i" class="num" [class.critico]="i.abaixoMinimo">{{ i.saldo | number: '1.0-3' }} {{ i.unidadePadrao }}</td></ng-container>
        <ng-container matColumnDef="minimo"><th mat-header-cell *matHeaderCellDef class="num">Mínimo</th>
          <td mat-cell *matCellDef="let i" class="num">{{ i.estoqueMinimo | number: '1.0-3' }} {{ i.unidadePadrao }}</td></ng-container>
        <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Status</th>
          <td mat-cell *matCellDef="let i"><app-etiqueta [texto]="i.status" [cor]="i.status === 'ATIVO' ? 'ok' : 'neutro'" /></td></ng-container>
        <ng-container matColumnDef="acoes"><th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let i" class="direita">
            <a mat-icon-button routerLink="/admin/cotacao" [queryParams]="{ ingrediente: i.id }" aria-label="Cotação"><mat-icon>compare_arrows</mat-icon></a>
            <button mat-icon-button (click)="abrir(i)" aria-label="Editar"><mat-icon>edit</mat-icon></button>
            @if (i.status === 'ATIVO') { <button mat-icon-button (click)="desativar(i)" aria-label="Desativar"><mat-icon>block</mat-icon></button> }
          </td></ng-container>
        <tr mat-header-row *matHeaderRowDef="colunas"></tr>
        <tr mat-row *matRowDef="let row; columns: colunas"></tr>
      </table>
    </div>
    <mat-paginator [length]="pagina()?.totalElements ?? 0" [pageSize]="20" [pageIndex]="paginaAtual" (page)="mudarPagina($event)" />
  `,
  styles: `.critico { color: var(--cd-erro); font-weight: 700; } mat-paginator { background: transparent; }`,
})
export class Ingredientes implements OnInit {
  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private notificacao = inject(NotificacaoService);

  colunas = ['nome', 'custo', 'saldo', 'minimo', 'status', 'acoes'];
  pagina = signal<Page<Ingrediente> | null>(null);
  paginaAtual = 0;
  busca = '';

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

  abrir(i?: Ingrediente): void {
    this.dialog.open(IngredienteDialog, { data: i ?? null, width: '560px' }).afterClosed().subscribe((ok) => ok && this.carregar());
  }

  desativar(i: Ingrediente): void {
    this.dialog
      .open(ConfirmarDialog, { data: { titulo: 'Desativar ingrediente?', mensagem: `"${i.nome}" não aparecerá mais nas listas.`, confirmar: 'Desativar', perigo: true } })
      .afterClosed()
      .subscribe((ok) => ok && this.api.ingredientes.desativar(i.id).subscribe(() => {
        this.notificacao.sucesso('Ingrediente desativado');
        this.carregar();
      }));
  }

  private carregar(): void {
    this.api.ingredientes.listar({ busca: this.busca, page: this.paginaAtual, size: 20, sort: 'nome' }).subscribe((p) => this.pagina.set(p));
  }
}

@Component({
  selector: 'app-ingrediente-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Editar ingrediente' : 'Novo ingrediente' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form-grade">
        <mat-form-field class="span-2"><mat-label>Nome</mat-label><input matInput formControlName="nome" /><mat-error>Obrigatório</mat-error></mat-form-field>
        <mat-form-field><mat-label>SKU</mat-label><input matInput formControlName="sku" placeholder="Ex.: HOR-001" /><mat-error>Obrigatório</mat-error></mat-form-field>
        <mat-form-field>
          <mat-label>Unidade padrão</mat-label>
          <mat-select formControlName="unidadePadrao">@for (u of unidades; track u) { <mat-option [value]="u">{{ u }}</mat-option> }</mat-select>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Custo unitário (por {{ form.controls.unidadePadrao.value }})</mat-label>
          <span matTextPrefix>R$&nbsp;</span>
          <input matInput type="number" formControlName="custoUnitario" min="0" step="0.0001" />
        </mat-form-field>
        <mat-form-field>
          <mat-label>Estoque mínimo</mat-label>
          <input matInput type="number" formControlName="estoqueMinimo" min="0" />
          <span matTextSuffix>{{ form.controls.unidadePadrao.value }}</span>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Status</mat-label>
          <mat-select formControlName="status"><mat-option value="ATIVO">Ativo</mat-option><mat-option value="INATIVO">Inativo</mat-option></mat-select>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button (click)="salvar()" [disabled]="salvando()">Salvar</button>
    </mat-dialog-actions>
  `,
})
export class IngredienteDialog {
  data = inject<Ingrediente | null>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<IngredienteDialog>);
  private api = inject(ApiService);
  private notificacao = inject(NotificacaoService);
  unidades = UNIDADES;
  salvando = signal(false);

  form = inject(FormBuilder).nonNullable.group({
    nome: [this.data?.nome ?? '', Validators.required],
    sku: [this.data?.sku ?? '', Validators.required],
    unidadePadrao: [this.data?.unidadePadrao ?? 'G', Validators.required],
    custoUnitario: [this.data?.custoUnitario ?? 0, [Validators.required, Validators.min(0)]],
    estoqueMinimo: [this.data?.estoqueMinimo ?? 0, [Validators.required, Validators.min(0)]],
    status: [this.data?.status ?? 'ATIVO'],
  });

  salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.salvando.set(true);
    const dados = this.form.getRawValue();
    const req = this.data ? this.api.ingredientes.atualizar(this.data.id, dados) : this.api.ingredientes.criar(dados);
    req.subscribe({
      next: () => {
        this.notificacao.sucesso('Ingrediente salvo');
        this.ref.close(true);
      },
      error: () => this.salvando.set(false),
    });
  }
}
