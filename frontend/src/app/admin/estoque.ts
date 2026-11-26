import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterLink } from '@angular/router';
import { ApiService, dataISO } from '../core/api.service';
import { MOTIVOS_PERDA, rotulo } from '../core/labels';
import { Ingrediente, Movimentacao, Page, Saldo, TipoMovimentacao } from '../core/models';
import { NotificacaoService } from '../core/notificacao.service';

/** RF-028 a RF-033: saldo em tempo real, alertas de mínimo, movimentações e saídas manuais. */
@Component({
  selector: 'app-estoque',
  imports: [CurrencyPipe, DatePipe, DecimalPipe, FormsModule, RouterLink, MatTabsModule, MatTableModule, MatPaginatorModule,
    MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <div class="cabecalho-pagina">
      <div><h1>Estoque</h1><p>Saldo = entradas + estornos − saídas. Baixas de venda são automáticas ao confirmar pedidos.</p></div>
      <button mat-flat-button (click)="registrar()"><mat-icon>add</mat-icon>Registrar movimentação</button>
    </div>

    <mat-tab-group [(selectedIndex)]="aba" (selectedIndexChange)="carregarAba()" animationDuration="0">
      <mat-tab label="Saldo atual">
        <div class="filtros mt">
          <mat-form-field subscriptSizing="dynamic">
            <mat-label>Buscar ingrediente</mat-label>
            <input matInput [(ngModel)]="busca" (keyup.enter)="carregarSaldos(0)" (blur)="carregarSaldos(0)" />
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>
        </div>
        <div class="tabela-container mt">
          <table mat-table [dataSource]="saldos()?.content ?? []">
            <ng-container matColumnDef="nome"><th mat-header-cell *matHeaderCellDef>Ingrediente</th>
              <td mat-cell *matCellDef="let s"><strong>{{ s.ingredienteNome }}</strong><div class="texto-suave">{{ s.sku }}</div></td></ng-container>
            <ng-container matColumnDef="saldo"><th mat-header-cell *matHeaderCellDef class="num">Saldo</th>
              <td mat-cell *matCellDef="let s" class="num" [class.critico]="s.abaixoMinimo">{{ s.saldo | number: '1.0-3' }} {{ s.unidade }}</td></ng-container>
            <ng-container matColumnDef="minimo"><th mat-header-cell *matHeaderCellDef class="num">Mínimo</th>
              <td mat-cell *matCellDef="let s" class="num">{{ s.estoqueMinimo | number: '1.0-3' }} {{ s.unidade }}</td></ng-container>
            <ng-container matColumnDef="nivel"><th mat-header-cell *matHeaderCellDef>Nível</th>
              <td mat-cell *matCellDef="let s"><div class="nivel"><div [style.width.%]="nivel(s)" [class.baixo]="s.abaixoMinimo"></div></div></td></ng-container>
            <ng-container matColumnDef="valor"><th mat-header-cell *matHeaderCellDef class="num">Valor em estoque</th>
              <td mat-cell *matCellDef="let s" class="num">{{ s.valorEmEstoque | currency }}</td></ng-container>
            <tr mat-header-row *matHeaderRowDef="colunasSaldo"></tr>
            <tr mat-row *matRowDef="let row; columns: colunasSaldo"></tr>
          </table>
        </div>
        <mat-paginator [length]="saldos()?.totalElements ?? 0" [pageSize]="20" (page)="carregarSaldos($event.pageIndex)" />
      </mat-tab>

      <mat-tab>
        <ng-template mat-tab-label>
          Alertas de mínimo
          @if ((alertas()?.totalElements ?? 0) > 0) { <span class="badge">{{ alertas()!.totalElements }}</span> }
        </ng-template>
        <div class="tabela-container mt">
          <table mat-table [dataSource]="alertas()?.content ?? []">
            <ng-container matColumnDef="nome"><th mat-header-cell *matHeaderCellDef>Ingrediente</th>
              <td mat-cell *matCellDef="let s"><mat-icon class="icone-alerta" inline>warning</mat-icon> <strong>{{ s.ingredienteNome }}</strong></td></ng-container>
            <ng-container matColumnDef="saldo"><th mat-header-cell *matHeaderCellDef class="num">Saldo</th>
              <td mat-cell *matCellDef="let s" class="num critico">{{ s.saldo | number: '1.0-3' }} {{ s.unidade }}</td></ng-container>
            <ng-container matColumnDef="minimo"><th mat-header-cell *matHeaderCellDef class="num">Mínimo</th>
              <td mat-cell *matCellDef="let s" class="num">{{ s.estoqueMinimo | number: '1.0-3' }} {{ s.unidade }}</td></ng-container>
            <ng-container matColumnDef="falta"><th mat-header-cell *matHeaderCellDef class="num">Para o mínimo</th>
              <td mat-cell *matCellDef="let s" class="num">{{ s.estoqueMinimo - s.saldo | number: '1.0-3' }} {{ s.unidade }}</td></ng-container>
            <ng-container matColumnDef="acoes"><th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let s" class="direita">
                <a mat-stroked-button routerLink="/admin/cotacao" [queryParams]="{ ingrediente: s.ingredienteId }">Cotar e comprar</a>
              </td></ng-container>
            <tr mat-header-row *matHeaderRowDef="colunasAlerta"></tr>
            <tr mat-row *matRowDef="let row; columns: colunasAlerta"></tr>
            <tr class="mat-row" *matNoDataRow><td class="vazio" [attr.colspan]="colunasAlerta.length">Nenhum ingrediente abaixo do mínimo.</td></tr>
          </table>
        </div>
        <mat-paginator [length]="alertas()?.totalElements ?? 0" [pageSize]="20" (page)="carregarAlertas($event.pageIndex)" />
      </mat-tab>

      <mat-tab label="Movimentações">
        <div class="filtros mt">
          <mat-form-field subscriptSizing="dynamic">
            <mat-label>Ingrediente</mat-label>
            <mat-select [(ngModel)]="filtroIngrediente" (selectionChange)="carregarMovimentacoes(0)">
              <mat-option [value]="null">Todos</mat-option>
              @for (i of ingredientes(); track i.id) { <mat-option [value]="i.id">{{ i.nome }}</mat-option> }
            </mat-select>
          </mat-form-field>
          <mat-form-field subscriptSizing="dynamic">
            <mat-label>Tipo</mat-label>
            <mat-select [(ngModel)]="filtroTipo" (selectionChange)="carregarMovimentacoes(0)">
              <mat-option [value]="null">Todos</mat-option>
              <mat-option value="ENTRADA">Entrada</mat-option>
              <mat-option value="SAIDA">Saída</mat-option>
              <mat-option value="ESTORNO">Estorno</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
        <div class="tabela-container mt">
          <table mat-table [dataSource]="movimentacoes()?.content ?? []">
            <ng-container matColumnDef="data"><th mat-header-cell *matHeaderCellDef>Data</th>
              <td mat-cell *matCellDef="let m">{{ m.createdAt | date: 'dd/MM/yy HH:mm' }}</td></ng-container>
            <ng-container matColumnDef="ingrediente"><th mat-header-cell *matHeaderCellDef>Ingrediente</th>
              <td mat-cell *matCellDef="let m">{{ m.ingredienteNome }}</td></ng-container>
            <ng-container matColumnDef="tipo"><th mat-header-cell *matHeaderCellDef>Tipo</th>
              <td mat-cell *matCellDef="let m"><span [class]="'chip ' + corTipo(m.tipo)">{{ m.tipo }}</span></td></ng-container>
            <ng-container matColumnDef="quantidade"><th mat-header-cell *matHeaderCellDef class="num">Quantidade</th>
              <td mat-cell *matCellDef="let m" class="num">{{ m.tipo === 'SAIDA' ? '−' : '+' }}{{ m.quantidade | number: '1.0-3' }} {{ m.unidade }}</td></ng-container>
            <ng-container matColumnDef="motivo"><th mat-header-cell *matHeaderCellDef>Motivo</th>
              <td mat-cell *matCellDef="let m">{{ rotulo(m.motivo) }}
                @if (m.lote) { <div class="texto-suave">Lote {{ m.lote }}{{ m.validade ? ' · val. ' + (m.validade | date: 'dd/MM/yy') : '' }}</div> }
              </td></ng-container>
            <ng-container matColumnDef="referencia"><th mat-header-cell *matHeaderCellDef>Referência</th>
              <td mat-cell *matCellDef="let m">
                @if (m.pedidoId) { <a [routerLink]="['/admin/pedidos', m.pedidoId]">Pedido #{{ m.pedidoId }}</a> }
                @if (m.pedidoCompraId) { <a [routerLink]="['/admin/compras', m.pedidoCompraId]">Compra #{{ m.pedidoCompraId }}</a> }
                @if (!m.pedidoId && !m.pedidoCompraId) { <span class="texto-suave">{{ m.observacao || '-' }}</span> }
              </td></ng-container>
            <ng-container matColumnDef="usuario"><th mat-header-cell *matHeaderCellDef>Usuário</th>
              <td mat-cell *matCellDef="let m" class="texto-suave">{{ m.usuarioNome }}</td></ng-container>
            <tr mat-header-row *matHeaderRowDef="colunasMov"></tr>
            <tr mat-row *matRowDef="let row; columns: colunasMov"></tr>
          </table>
        </div>
        <mat-paginator [length]="movimentacoes()?.totalElements ?? 0" [pageSize]="20" (page)="carregarMovimentacoes($event.pageIndex)" />
      </mat-tab>
    </mat-tab-group>
  `,
  styles: `
    .critico { color: var(--cd-erro); font-weight: 700; }
    .nivel { width: 120px; height: 8px; background: #f1ebe6; border-radius: 999px; overflow: hidden; }
    .nivel div { height: 100%; background: var(--cd-ok); border-radius: 999px; }
    .nivel div.baixo { background: var(--cd-erro); }
    .badge { margin-left: 8px; background: #e03131; color: #fff; border-radius: 999px; font-size: 0.72rem; padding: 1px 8px; }
    .icone-alerta { color: var(--cd-erro); }
    mat-paginator { background: transparent; }
  `,
})
export class Estoque implements OnInit {
  private api = inject(ApiService);
  private dialog = inject(MatDialog);

  rotulo = rotulo;
  aba = 0;
  busca = '';
  filtroIngrediente: number | null = null;
  filtroTipo: TipoMovimentacao | null = null;

  colunasSaldo = ['nome', 'saldo', 'minimo', 'nivel', 'valor'];
  colunasAlerta = ['nome', 'saldo', 'minimo', 'falta', 'acoes'];
  colunasMov = ['data', 'ingrediente', 'tipo', 'quantidade', 'motivo', 'referencia', 'usuario'];

  saldos = signal<Page<Saldo> | null>(null);
  alertas = signal<Page<Saldo> | null>(null);
  movimentacoes = signal<Page<Movimentacao> | null>(null);
  ingredientes = signal<Ingrediente[]>([]);

  ngOnInit(): void {
    this.api.ingredientes.listar({ size: 1000, sort: 'nome', status: 'ATIVO' }).subscribe((p) => this.ingredientes.set(p.content));
    this.carregarSaldos(0);
    this.carregarAlertas(0);
  }

  carregarAba(): void {
    if (this.aba === 0) this.carregarSaldos(0);
    if (this.aba === 1) this.carregarAlertas(0);
    if (this.aba === 2) this.carregarMovimentacoes(0);
  }

  carregarSaldos(page: number): void {
    this.api.saldos({ busca: this.busca, page, size: 20, sort: 'nome' }).subscribe((p) => this.saldos.set(p));
  }

  carregarAlertas(page: number): void {
    this.api.alertas({ page, size: 20 }).subscribe((p) => this.alertas.set(p));
  }

  carregarMovimentacoes(page: number): void {
    this.api
      .movimentacoes({ ingredienteId: this.filtroIngrediente, tipo: this.filtroTipo, page, size: 20, sort: 'createdAt,desc' })
      .subscribe((p) => this.movimentacoes.set(p));
  }

  nivel(s: Saldo): number {
    if (!s.estoqueMinimo) return 100;
    return Math.max(2, Math.min(100, (s.saldo / (s.estoqueMinimo * 3)) * 100));
  }

  corTipo(t: TipoMovimentacao): string {
    return t === 'SAIDA' ? 'chip-erro' : t === 'ESTORNO' ? 'chip-info' : 'chip-ok';
  }

  registrar(): void {
    this.dialog
      .open(MovimentacaoDialog, { data: this.ingredientes(), width: '560px' })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) {
          this.carregarSaldos(0);
          this.carregarAlertas(0);
          if (this.aba === 2) this.carregarMovimentacoes(0);
        }
      });
  }
}

/** RF-028 (entrada de ajuste) e RF-030 (saída por perda com motivo obrigatório). */
@Component({
  selector: 'app-movimentacao-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule,
    MatButtonToggleModule, MatDatepickerModule],
  template: `
    <h2 mat-dialog-title>Registrar movimentação</h2>
    <mat-dialog-content>
      <form [formGroup]="form">
        <mat-button-toggle-group formControlName="tipo" class="largura-total mb" (change)="trocarTipo()">
          <mat-button-toggle value="SAIDA">Saída (perda)</mat-button-toggle>
          <mat-button-toggle value="ENTRADA">Entrada (ajuste)</mat-button-toggle>
        </mat-button-toggle-group>
        <div class="form-grade">
          <mat-form-field class="span-2">
            <mat-label>Ingrediente</mat-label>
            <mat-select formControlName="ingredienteId">@for (i of ingredientes; track i.id) { <mat-option [value]="i.id">{{ i.nome }} ({{ i.unidadePadrao }})</mat-option> }</mat-select>
            <mat-error>Escolha o ingrediente</mat-error>
          </mat-form-field>
          <mat-form-field>
            <mat-label>Quantidade</mat-label>
            <input matInput type="number" formControlName="quantidade" min="0" step="any" />
            <span matTextSuffix>{{ unidade() }}</span>
            <mat-error>Informe a quantidade</mat-error>
          </mat-form-field>
          @if (form.controls.tipo.value === 'SAIDA') {
            <mat-form-field>
              <mat-label>Motivo</mat-label>
              <mat-select formControlName="motivo">@for (m of motivos; track m.valor) { <mat-option [value]="m.valor">{{ m.label }}</mat-option> }</mat-select>
              <mat-error>Motivo obrigatório</mat-error>
            </mat-form-field>
          } @else {
            <mat-form-field>
              <mat-label>Custo unitário</mat-label>
              <span matTextPrefix>R$&nbsp;</span>
              <input matInput type="number" formControlName="custoUnitario" min="0" step="0.0001" />
            </mat-form-field>
            <mat-form-field><mat-label>Lote</mat-label><input matInput formControlName="lote" /></mat-form-field>
            <mat-form-field>
              <mat-label>Validade</mat-label>
              <input matInput [matDatepicker]="dp" formControlName="validade" />
              <mat-datepicker-toggle matIconSuffix [for]="dp" />
              <mat-datepicker #dp />
            </mat-form-field>
          }
          <mat-form-field class="span-2"><mat-label>Observação</mat-label><input matInput formControlName="observacao" /></mat-form-field>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button (click)="salvar()" [disabled]="salvando()">Registrar</button>
    </mat-dialog-actions>
  `,
})
export class MovimentacaoDialog {
  ingredientes = inject<Ingrediente[]>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<MovimentacaoDialog>);
  private api = inject(ApiService);
  private notificacao = inject(NotificacaoService);
  motivos = MOTIVOS_PERDA;
  salvando = signal(false);

  form = inject(FormBuilder).group({
    tipo: ['SAIDA'],
    ingredienteId: [null as number | null, Validators.required],
    quantidade: [null as number | null, [Validators.required, Validators.min(0.001)]],
    motivo: ['DESPERDICIO', Validators.required],
    custoUnitario: [null as number | null],
    lote: [''],
    validade: [null as Date | null],
    observacao: [''],
  });

  unidade(): string {
    return this.ingredientes.find((i) => i.id === this.form.controls.ingredienteId.value)?.unidadePadrao ?? '';
  }

  trocarTipo(): void {
    this.form.patchValue({ motivo: this.form.controls.tipo.value === 'SAIDA' ? 'DESPERDICIO' : 'AJUSTE' });
  }

  salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.salvando.set(true);
    this.api
      .registrarMovimentacao({ ...v, motivo: v.tipo === 'SAIDA' ? v.motivo : 'AJUSTE', validade: v.validade ? dataISO(v.validade) : null })
      .subscribe({
        next: () => {
          this.notificacao.sucesso('Movimentação registrada');
          this.ref.close(true);
        },
        error: () => this.salvando.set(false),
      });
  }
}
