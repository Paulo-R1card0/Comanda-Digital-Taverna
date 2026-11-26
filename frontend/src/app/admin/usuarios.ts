import { DatePipe } from '@angular/common';
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
import { ApiService } from '../core/api.service';
import { PERFIS } from '../core/labels';
import { Page, Perfil, Usuario } from '../core/models';
import { NotificacaoService } from '../core/notificacao.service';
import { ConfirmarDialog } from '../shared/dialogs';
import { Etiqueta } from '../shared/status-chip';

/** RF-041: gestão de usuários internos (somente ADMIN). Senhas são salvas com BCrypt no back-end. */
@Component({
  selector: 'app-usuarios',
  imports: [DatePipe, FormsModule, MatTableModule, MatPaginatorModule, MatButtonModule, MatIconModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, Etiqueta],
  template: `
    <div class="cabecalho-pagina">
      <div><h1>Usuários</h1><p>Crie gerentes e cozinheiros. Clientes se cadastram sozinhos pelo site.</p></div>
      <button mat-flat-button (click)="abrir()"><mat-icon>person_add</mat-icon>Novo usuário</button>
    </div>
    <div class="filtros">
      <mat-form-field subscriptSizing="dynamic">
        <mat-label>Buscar</mat-label>
        <input matInput [(ngModel)]="busca" (keyup.enter)="filtrar()" (blur)="filtrar()" />
        <mat-icon matSuffix>search</mat-icon>
      </mat-form-field>
      <mat-form-field subscriptSizing="dynamic">
        <mat-label>Perfil</mat-label>
        <mat-select [(ngModel)]="perfil" (selectionChange)="filtrar()">
          <mat-option [value]="null">Todos</mat-option>
          @for (p of perfis; track p.valor) { <mat-option [value]="p.valor">{{ p.label }}</mat-option> }
        </mat-select>
      </mat-form-field>
    </div>
    <div class="tabela-container mt">
      <table mat-table [dataSource]="pagina()?.content ?? []">
        <ng-container matColumnDef="nome"><th mat-header-cell *matHeaderCellDef>Nome</th>
          <td mat-cell *matCellDef="let u"><strong>{{ u.nome }}</strong><div class="texto-suave">{{ u.email }}</div></td></ng-container>
        <ng-container matColumnDef="perfil"><th mat-header-cell *matHeaderCellDef>Perfil</th>
          <td mat-cell *matCellDef="let u"><app-etiqueta [texto]="nomePerfil(u.perfil)" [cor]="u.perfil === 'CLIENTE' ? 'neutro' : 'info'" /></td></ng-container>
        <ng-container matColumnDef="telefone"><th mat-header-cell *matHeaderCellDef>Telefone</th><td mat-cell *matCellDef="let u">{{ u.telefone }}</td></ng-container>
        <ng-container matColumnDef="criado"><th mat-header-cell *matHeaderCellDef>Desde</th><td mat-cell *matCellDef="let u">{{ u.createdAt | date: 'dd/MM/yyyy' }}</td></ng-container>
        <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Status</th>
          <td mat-cell *matCellDef="let u"><app-etiqueta [texto]="u.status" [cor]="u.status === 'ATIVO' ? 'ok' : 'neutro'" /></td></ng-container>
        <ng-container matColumnDef="acoes"><th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let u" class="direita">
            <button mat-icon-button (click)="abrir(u)" aria-label="Editar"><mat-icon>edit</mat-icon></button>
            @if (u.status === 'ATIVO') { <button mat-icon-button (click)="desativar(u)" aria-label="Desativar"><mat-icon>block</mat-icon></button> }
          </td></ng-container>
        <tr mat-header-row *matHeaderRowDef="colunas"></tr>
        <tr mat-row *matRowDef="let row; columns: colunas"></tr>
      </table>
    </div>
    <mat-paginator [length]="pagina()?.totalElements ?? 0" [pageSize]="10" [pageIndex]="paginaAtual" (page)="mudarPagina($event)" />
  `,
})
export class Usuarios implements OnInit {
  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private notificacao = inject(NotificacaoService);

  colunas = ['nome', 'perfil', 'telefone', 'criado', 'status', 'acoes'];
  perfis = PERFIS;
  pagina = signal<Page<Usuario> | null>(null);
  paginaAtual = 0;
  busca = '';
  perfil: Perfil | null = null;

  ngOnInit(): void {
    this.carregar();
  }

  nomePerfil(p: Perfil): string {
    return PERFIS.find((x) => x.valor === p)?.label ?? p;
  }

  filtrar(): void {
    this.paginaAtual = 0;
    this.carregar();
  }

  mudarPagina(e: PageEvent): void {
    this.paginaAtual = e.pageIndex;
    this.carregar();
  }

  abrir(u?: Usuario): void {
    this.dialog.open(UsuarioDialog, { data: u ?? null, width: '560px' }).afterClosed().subscribe((ok) => ok && this.carregar());
  }

  desativar(u: Usuario): void {
    this.dialog
      .open(ConfirmarDialog, { data: { titulo: 'Desativar usuário?', mensagem: `${u.nome} perde o acesso ao sistema imediatamente.`, confirmar: 'Desativar', perigo: true } })
      .afterClosed()
      .subscribe((ok) => ok && this.api.usuarios.desativar(u.id).subscribe(() => {
        this.notificacao.sucesso('Usuário desativado');
        this.carregar();
      }));
  }

  private carregar(): void {
    this.api.usuarios.listar({ busca: this.busca, perfil: this.perfil, page: this.paginaAtual, size: 10, sort: 'nome' }).subscribe((p) => this.pagina.set(p));
  }
}

@Component({
  selector: 'app-usuario-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Editar usuário' : 'Novo usuário' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form-grade">
        <mat-form-field class="span-2"><mat-label>Nome</mat-label><input matInput formControlName="nome" /><mat-error>Obrigatório</mat-error></mat-form-field>
        <mat-form-field class="span-2"><mat-label>Email</mat-label><input matInput formControlName="email" type="email" /><mat-error>Email inválido</mat-error></mat-form-field>
        <mat-form-field>
          <mat-label>{{ data ? 'Nova senha (opcional)' : 'Senha' }}</mat-label>
          <input matInput formControlName="senha" type="password" autocomplete="new-password" />
          <mat-error>Mínimo de 6 caracteres</mat-error>
        </mat-form-field>
        <mat-form-field><mat-label>Telefone</mat-label><input matInput formControlName="telefone" /></mat-form-field>
        <mat-form-field>
          <mat-label>Perfil</mat-label>
          <mat-select formControlName="perfil">
            @for (p of perfisInternos; track p.valor) { <mat-option [value]="p.valor">{{ p.label }}</mat-option> }
          </mat-select>
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
export class UsuarioDialog {
  data = inject<Usuario | null>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<UsuarioDialog>);
  private api = inject(ApiService);
  private notificacao = inject(NotificacaoService);
  salvando = signal(false);
  perfisInternos = this.data?.perfil === 'CLIENTE' ? PERFIS.filter((p) => p.valor === 'CLIENTE') : PERFIS.filter((p) => p.valor !== 'CLIENTE');

  form = inject(FormBuilder).nonNullable.group({
    nome: [this.data?.nome ?? '', Validators.required],
    email: [this.data?.email ?? '', [Validators.required, Validators.email]],
    senha: ['', this.data ? [Validators.minLength(6)] : [Validators.required, Validators.minLength(6)]],
    telefone: [this.data?.telefone ?? ''],
    perfil: [this.data?.perfil ?? 'COZINHEIRO'],
    status: [this.data?.status ?? 'ATIVO'],
  });

  salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.salvando.set(true);
    const dados = this.form.getRawValue();
    const req = this.data ? this.api.usuarios.atualizar(this.data.id, dados) : this.api.usuarios.criar(dados);
    req.subscribe({
      next: () => {
        this.notificacao.sucesso('Usuário salvo');
        this.ref.close(true);
      },
      error: () => this.salvando.set(false),
    });
  }
}
