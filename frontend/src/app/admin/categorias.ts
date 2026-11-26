import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { ApiService } from '../core/api.service';
import { Categoria, Page } from '../core/models';
import { NotificacaoService } from '../core/notificacao.service';
import { ConfirmarDialog } from '../shared/dialogs';
import { Etiqueta } from '../shared/status-chip';

/** RF-009: CRUD de categorias. */
@Component({
  selector: 'app-categorias',
  imports: [MatTableModule, MatPaginatorModule, MatButtonModule, MatIconModule, Etiqueta],
  template: `
    <div class="cabecalho-pagina">
      <div><h1>Categorias</h1><p>Organizam o cardápio público (ex.: Lanches, Açaí, Bebidas).</p></div>
      <button mat-flat-button (click)="abrir()"><mat-icon>add</mat-icon>Nova categoria</button>
    </div>
    <div class="tabela-container">
      <table mat-table [dataSource]="pagina()?.content ?? []">
        <ng-container matColumnDef="ordem"><th mat-header-cell *matHeaderCellDef>Ordem</th><td mat-cell *matCellDef="let c">{{ c.ordem }}</td></ng-container>
        <ng-container matColumnDef="nome"><th mat-header-cell *matHeaderCellDef>Nome</th><td mat-cell *matCellDef="let c"><strong>{{ c.nome }}</strong></td></ng-container>
        <ng-container matColumnDef="descricao"><th mat-header-cell *matHeaderCellDef>Descrição</th><td mat-cell *matCellDef="let c" class="texto-suave">{{ c.descricao }}</td></ng-container>
        <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Status</th><td mat-cell *matCellDef="let c"><app-etiqueta [texto]="c.status" [cor]="c.status === 'ATIVO' ? 'ok' : 'neutro'" /></td></ng-container>
        <ng-container matColumnDef="acoes">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let c" class="direita">
            <button mat-icon-button (click)="abrir(c)" aria-label="Editar"><mat-icon>edit</mat-icon></button>
            @if (c.status === 'ATIVO') {
              <button mat-icon-button (click)="desativar(c)" aria-label="Desativar"><mat-icon>block</mat-icon></button>
            }
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="colunas"></tr>
        <tr mat-row *matRowDef="let row; columns: colunas"></tr>
      </table>
    </div>
    <mat-paginator [length]="pagina()?.totalElements ?? 0" [pageSize]="10" (page)="carregar($event)" />
  `,
})
export class Categorias implements OnInit {
  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private notificacao = inject(NotificacaoService);

  colunas = ['ordem', 'nome', 'descricao', 'status', 'acoes'];
  pagina = signal<Page<Categoria> | null>(null);
  private paginaAtual = 0;

  ngOnInit(): void {
    this.carregar();
  }

  carregar(e?: PageEvent): void {
    if (e) this.paginaAtual = e.pageIndex;
    this.api.categorias.listar({ page: this.paginaAtual, size: 10, sort: 'ordem' }).subscribe((p) => this.pagina.set(p));
  }

  abrir(c?: Categoria): void {
    this.dialog.open(CategoriaDialog, { data: c ?? null, width: '480px' }).afterClosed().subscribe((ok) => ok && this.carregar());
  }

  desativar(c: Categoria): void {
    this.dialog
      .open(ConfirmarDialog, { data: { titulo: 'Desativar categoria?', mensagem: `"${c.nome}" e seus pratos deixam de aparecer no cardápio.`, confirmar: 'Desativar', perigo: true } })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok) return;
        this.api.categorias.desativar(c.id).subscribe(() => {
          this.notificacao.sucesso('Categoria desativada');
          this.carregar();
        });
      });
  }
}

@Component({
  selector: 'app-categoria-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Editar categoria' : 'Nova categoria' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form-grade">
        <mat-form-field class="span-2"><mat-label>Nome</mat-label><input matInput formControlName="nome" /><mat-error>Obrigatório</mat-error></mat-form-field>
        <mat-form-field class="span-2"><mat-label>Descrição</mat-label><input matInput formControlName="descricao" /></mat-form-field>
        <mat-form-field><mat-label>Ordem no cardápio</mat-label><input matInput type="number" formControlName="ordem" min="0" /></mat-form-field>
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
export class CategoriaDialog {
  data = inject<Categoria | null>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<CategoriaDialog>);
  private api = inject(ApiService);
  private notificacao = inject(NotificacaoService);
  salvando = signal(false);

  form = inject(FormBuilder).nonNullable.group({
    nome: [this.data?.nome ?? '', [Validators.required, Validators.maxLength(80)]],
    descricao: [this.data?.descricao ?? ''],
    ordem: [this.data?.ordem ?? 0],
    status: [this.data?.status ?? 'ATIVO'],
  });

  salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.salvando.set(true);
    const dados = this.form.getRawValue() as Partial<Categoria>;
    const req = this.data ? this.api.categorias.atualizar(this.data.id, dados) : this.api.categorias.criar(dados);
    req.subscribe({
      next: () => {
        this.notificacao.sucesso('Categoria salva');
        this.ref.close(true);
      },
      error: () => this.salvando.set(false),
    });
  }
}
