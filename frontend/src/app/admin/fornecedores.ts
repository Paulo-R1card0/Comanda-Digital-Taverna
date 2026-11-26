import { Component, OnInit, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Fornecedor, Page } from '../core/models';
import { NotificacaoService } from '../core/notificacao.service';
import { ConfirmarDialog } from '../shared/dialogs';
import { Etiqueta } from '../shared/status-chip';

/** Formata 11222333000181 como 11.222.333/0001-81 */
export function formatarCnpj(cnpj: string): string {
  const d = (cnpj ?? '').replace(/\D/g, '');
  return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : cnpj;
}

/** RN07: mesma validação de CNPJ do back-end, para dar feedback imediato no formulário. */
export function cnpjValidator(control: AbstractControl): ValidationErrors | null {
  const d = String(control.value ?? '').replace(/\D/g, '');
  if (!d) return null;
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return { cnpj: true };
  const calc = (base: string, pesos: number[]) => {
    const r = base.split('').reduce((s, n, i) => s + Number(n) * pesos[i], 0) % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = calc(d.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calc(d.slice(0, 12) + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d.endsWith(`${d1}${d2}`) ? null : { cnpj: true };
}

/** RF-021: CRUD de fornecedores. */
@Component({
  selector: 'app-fornecedores',
  imports: [FormsModule, MatTableModule, MatPaginatorModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, Etiqueta],
  template: `
    <div class="cabecalho-pagina">
      <div><h1>Fornecedores</h1><p>Clique em um fornecedor para ver e editar o catálogo de produtos e preços.</p></div>
      <button mat-flat-button (click)="abrir()"><mat-icon>add</mat-icon>Novo fornecedor</button>
    </div>
    <div class="filtros">
      <mat-form-field subscriptSizing="dynamic">
        <mat-label>Buscar por razão social ou CNPJ</mat-label>
        <input matInput [(ngModel)]="busca" (keyup.enter)="filtrar()" (blur)="filtrar()" />
        <mat-icon matSuffix>search</mat-icon>
      </mat-form-field>
    </div>
    <div class="tabela-container mt">
      <table mat-table [dataSource]="pagina()?.content ?? []">
        <ng-container matColumnDef="razao"><th mat-header-cell *matHeaderCellDef>Razão social</th>
          <td mat-cell *matCellDef="let f"><strong>{{ f.razaoSocial }}</strong><div class="texto-suave">{{ f.categorias }}</div></td></ng-container>
        <ng-container matColumnDef="cnpj"><th mat-header-cell *matHeaderCellDef>CNPJ</th><td mat-cell *matCellDef="let f">{{ cnpj(f.cnpj) }}</td></ng-container>
        <ng-container matColumnDef="contato"><th mat-header-cell *matHeaderCellDef>Contato</th>
          <td mat-cell *matCellDef="let f">{{ f.telefone }}<div class="texto-suave">{{ f.email }}</div></td></ng-container>
        <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Status</th>
          <td mat-cell *matCellDef="let f"><app-etiqueta [texto]="f.status" [cor]="f.status === 'ATIVO' ? 'ok' : 'neutro'" /></td></ng-container>
        <ng-container matColumnDef="acoes"><th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let f" class="direita" (click)="$event.stopPropagation()">
            <button mat-icon-button (click)="abrir(f)" aria-label="Editar"><mat-icon>edit</mat-icon></button>
            @if (f.status === 'ATIVO') { <button mat-icon-button (click)="desativar(f)" aria-label="Desativar"><mat-icon>block</mat-icon></button> }
          </td></ng-container>
        <tr mat-header-row *matHeaderRowDef="colunas"></tr>
        <tr mat-row *matRowDef="let row; columns: colunas" class="clicavel" (click)="catalogo(row)"></tr>
      </table>
    </div>
    <mat-paginator [length]="pagina()?.totalElements ?? 0" [pageSize]="10" [pageIndex]="paginaAtual" (page)="mudarPagina($event)" />
  `,
})
export class Fornecedores implements OnInit {
  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private notificacao = inject(NotificacaoService);

  colunas = ['razao', 'cnpj', 'contato', 'status', 'acoes'];
  pagina = signal<Page<Fornecedor> | null>(null);
  paginaAtual = 0;
  busca = '';
  cnpj = formatarCnpj;

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

  catalogo(f: Fornecedor): void {
    this.router.navigate(['/admin/fornecedores', f.id]);
  }

  abrir(f?: Fornecedor): void {
    this.dialog.open(FornecedorDialog, { data: f ?? null, width: '600px' }).afterClosed().subscribe((ok) => ok && this.carregar());
  }

  desativar(f: Fornecedor): void {
    this.dialog
      .open(ConfirmarDialog, { data: { titulo: 'Desativar fornecedor?', mensagem: `"${f.razaoSocial}" deixa de aparecer nas cotações.`, confirmar: 'Desativar', perigo: true } })
      .afterClosed()
      .subscribe((ok) => ok && this.api.fornecedores.desativar(f.id).subscribe(() => {
        this.notificacao.sucesso('Fornecedor desativado');
        this.carregar();
      }));
  }

  private carregar(): void {
    this.api.fornecedores.listar({ busca: this.busca, page: this.paginaAtual, size: 10, sort: 'razaoSocial' }).subscribe((p) => this.pagina.set(p));
  }
}

@Component({
  selector: 'app-fornecedor-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Editar fornecedor' : 'Novo fornecedor' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form-grade">
        <mat-form-field class="span-2"><mat-label>Razão social</mat-label><input matInput formControlName="razaoSocial" /><mat-error>Obrigatório</mat-error></mat-form-field>
        <mat-form-field>
          <mat-label>CNPJ</mat-label>
          <input matInput formControlName="cnpj" placeholder="00.000.000/0000-00" (blur)="mascarar()" />
          @if (form.controls.cnpj.hasError('cnpj')) { <mat-error>CNPJ inválido</mat-error> } @else { <mat-error>Obrigatório</mat-error> }
        </mat-form-field>
        <mat-form-field><mat-label>Telefone</mat-label><input matInput formControlName="telefone" /></mat-form-field>
        <mat-form-field><mat-label>Email</mat-label><input matInput formControlName="email" type="email" /><mat-error>Email inválido</mat-error></mat-form-field>
        <mat-form-field>
          <mat-label>Status</mat-label>
          <mat-select formControlName="status"><mat-option value="ATIVO">Ativo</mat-option><mat-option value="INATIVO">Inativo</mat-option></mat-select>
        </mat-form-field>
        <mat-form-field class="span-2"><mat-label>Categorias de produtos</mat-label><input matInput formControlName="categorias" placeholder="Ex.: Hortifruti, Carnes" /></mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button (click)="salvar()" [disabled]="salvando()">Salvar</button>
    </mat-dialog-actions>
  `,
})
export class FornecedorDialog {
  data = inject<Fornecedor | null>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<FornecedorDialog>);
  private api = inject(ApiService);
  private notificacao = inject(NotificacaoService);
  salvando = signal(false);

  form = inject(FormBuilder).nonNullable.group({
    razaoSocial: [this.data?.razaoSocial ?? '', Validators.required],
    cnpj: [formatarCnpj(this.data?.cnpj ?? ''), [Validators.required, cnpjValidator]],
    telefone: [this.data?.telefone ?? ''],
    email: [this.data?.email ?? '', Validators.email],
    categorias: [this.data?.categorias ?? ''],
    status: [this.data?.status ?? 'ATIVO'],
  });

  mascarar(): void {
    this.form.controls.cnpj.setValue(formatarCnpj(this.form.controls.cnpj.value));
  }

  salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.salvando.set(true);
    const dados = { ...this.form.getRawValue(), email: this.form.controls.email.value || null };
    const req = this.data ? this.api.fornecedores.atualizar(this.data.id, dados) : this.api.fornecedores.criar(dados);
    req.subscribe({
      next: () => {
        this.notificacao.sucesso('Fornecedor salvo');
        this.ref.close(true);
      },
      error: () => this.salvando.set(false),
    });
  }
}
