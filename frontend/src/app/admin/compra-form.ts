import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';
import { startWith } from 'rxjs';
import { ApiService, dataISO } from '../core/api.service';
import { Compra, Fornecedor, FornecedorProduto, Ingrediente } from '../core/models';
import { NotificacaoService } from '../core/notificacao.service';
import { ConfirmarDialog } from '../shared/dialogs';
import { Etiqueta } from '../shared/status-chip';
import { COR_COMPRA } from './compras';

/** RF-024 (pedido de compra) e RF-025 (recebimento com lote e validade). */
@Component({
  selector: 'app-compra-form',
  imports: [CurrencyPipe, DatePipe, DecimalPipe, FormsModule, ReactiveFormsModule, RouterLink, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatIconModule, MatDatepickerModule, Etiqueta],
  template: `
    <a mat-button routerLink="/admin/compras"><mat-icon>arrow_back</mat-icon>Compras</a>

    <div class="cabecalho-pagina mt">
      <div>
        <h1>{{ compra() ? 'Compra #' + compra()!.id : 'Nova compra' }}</h1>
        @if (compra(); as c) {
          <p>Criada em {{ c.createdAt | date: 'dd/MM/yyyy HH:mm' }} por {{ c.usuarioNome }}
            @if (c.recebidoEm) { · recebida em {{ c.recebidoEm | date: 'dd/MM/yyyy HH:mm' }} }</p>
        } @else {
          <p>Quantidades e preços na unidade padrão de cada ingrediente.</p>
        }
      </div>
      <div class="linha">
        @if (compra(); as c) { <app-etiqueta [texto]="c.status" [cor]="cor[c.status]" /> }
        @if (editavel()) {
          <button mat-flat-button (click)="salvar()"><mat-icon>save</mat-icon>Salvar rascunho</button>
        }
        @if (compra()?.status === 'RASCUNHO') {
          <button mat-flat-button (click)="enviar()"><mat-icon>send</mat-icon>Enviar ao fornecedor</button>
        }
        @if (compra()?.status === 'ENVIADO') {
          <button mat-flat-button (click)="receber()"><mat-icon>inventory</mat-icon>Registrar recebimento</button>
        }
        @if (compra()?.status === 'RASCUNHO' || compra()?.status === 'ENVIADO') {
          <button mat-stroked-button (click)="cancelar()"><mat-icon>cancel</mat-icon>Cancelar</button>
        }
      </div>
    </div>

    @if (editavel()) {
      <form class="cartao" [formGroup]="form">
        <div class="form-grade">
          <mat-form-field>
            <mat-label>Fornecedor</mat-label>
            <mat-select formControlName="fornecedorId" (selectionChange)="carregarCatalogo()">
              @for (f of fornecedores(); track f.id) { <mat-option [value]="f.id">{{ f.razaoSocial }}</mat-option> }
            </mat-select>
            <mat-error>Escolha o fornecedor</mat-error>
          </mat-form-field>
          <mat-form-field><mat-label>Observações</mat-label><input matInput formControlName="observacoes" /></mat-form-field>
        </div>

        <h2 class="mt">Itens</h2>
        <div formArrayName="itens">
          @for (item of itens.controls; track item; let i = $index) {
            <div class="item" [formGroupName]="i">
              <mat-form-field subscriptSizing="dynamic" class="ing">
                <mat-label>Ingrediente</mat-label>
                <mat-select formControlName="ingredienteId" (selectionChange)="sugerirPreco(i)">
                  @for (ing of ingredientes(); track ing.id) {
                    <mat-option [value]="ing.id">{{ ing.nome }}{{ precoCatalogo(ing.id) ? '' : ' (fora do catálogo)' }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field subscriptSizing="dynamic">
                <mat-label>Quantidade</mat-label>
                <input matInput type="number" formControlName="quantidade" min="0" step="any" />
                <span matTextSuffix>{{ unidade(i) }}</span>
              </mat-form-field>
              <mat-form-field subscriptSizing="dynamic">
                <mat-label>Preço por {{ unidade(i) || 'un.' }}</mat-label>
                <span matTextPrefix>R$&nbsp;</span>
                <input matInput type="number" formControlName="precoUnitario" min="0" step="0.0001" />
              </mat-form-field>
              <strong class="subtotal">{{ subtotal(i) | currency }}</strong>
              <button mat-icon-button (click)="itens.removeAt(i)" aria-label="Remover"><mat-icon>delete</mat-icon></button>
            </div>
          }
        </div>
        <div class="linha mt">
          <button mat-stroked-button type="button" (click)="adicionarItem()"><mat-icon>add</mat-icon>Adicionar item</button>
          <span class="espacador"></span>
          <span class="total">Total: <strong>{{ total() | currency }}</strong></span>
        </div>
      </form>
    } @else if (compra(); as c) {
      <div class="cartao">
        <p><strong>Fornecedor:</strong> {{ c.fornecedorNome }}</p>
        @if (c.observacoes) { <p><strong>Observações:</strong> {{ c.observacoes }}</p> }
        <table class="tabela">
          <thead><tr><th>Ingrediente</th><th class="num">Quantidade</th><th class="num">Preço unit.</th><th class="num">Subtotal</th>
            @if (c.status === 'ENVIADO') { <th>Lote</th><th>Validade</th> }</tr></thead>
          <tbody>
            @for (i of c.itens; track i.id) {
              <tr>
                <td>{{ i.ingredienteNome }}</td>
                <td class="num">{{ i.quantidade | number: '1.0-3' }} {{ i.unidade }}</td>
                <td class="num">{{ i.precoUnitario | currency: 'BRL' : 'symbol' : '1.2-4' }}</td>
                <td class="num">{{ i.subtotal | currency }}</td>
                @if (c.status === 'ENVIADO') {
                  <td><input class="campo" [(ngModel)]="lotes[i.id]" placeholder="Lote" /></td>
                  <td><input class="campo" type="date" [(ngModel)]="validades[i.id]" /></td>
                }
              </tr>
            }
          </tbody>
          <tfoot><tr><th colspan="3">Total</th><th class="num">{{ c.valorTotal | currency }}</th></tr></tfoot>
        </table>
        @if (c.status === 'ENVIADO') {
          <p class="texto-suave mt">Preencha lote e validade (opcionais) e clique em "Registrar recebimento".
            O estoque recebe a entrada e o custo unitário de cada ingrediente passa a ser o preço desta compra.</p>
        }
      </div>
    }
  `,
  styles: `
    .item { display: grid; grid-template-columns: minmax(180px, 2fr) 1fr 1fr 110px 40px; gap: 8px; align-items: center; margin-bottom: 10px; }
    .subtotal { text-align: right; }
    .total { font-size: 1.1rem; }
    .total strong { font-family: Outfit, sans-serif; font-size: 1.4rem; }
    .tabela { width: 100%; border-collapse: collapse; margin-top: 12px; }
    .tabela th, .tabela td { padding: 10px 8px; border-bottom: 1px solid var(--cd-borda); text-align: left; }
    .tabela .num { text-align: right; }
    .campo { border: 1px solid var(--cd-borda); border-radius: 8px; padding: 6px 8px; font: inherit; max-width: 140px; }
    @media (max-width: 760px) { .item { grid-template-columns: 1fr 1fr; } .ing { grid-column: span 2; } }
  `,
})
export class CompraForm implements OnInit {
  id = input<string | undefined>();
  fornecedor = input<string | undefined>(); // ?fornecedor=ID (vindo da cotação)
  ingrediente = input<string | undefined>(); // ?ingrediente=ID

  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private notificacao = inject(NotificacaoService);

  cor = COR_COMPRA as Record<string, string>;
  compra = signal<Compra | null>(null);
  fornecedores = signal<Fornecedor[]>([]);
  ingredientes = signal<Ingrediente[]>([]);
  catalogo = signal<FornecedorProduto[]>([]);
  lotes: Record<number, string> = {};
  validades: Record<number, string> = {};

  form = this.fb.group({
    fornecedorId: [null as number | null, Validators.required],
    observacoes: [''],
    itens: this.fb.array<FormGroup>([]),
  });

  private valores = toSignal(this.form.valueChanges.pipe(startWith(this.form.value)));
  total = computed(() => {
    this.valores();
    return this.itens.controls.reduce((s, _g, i) => s + this.subtotal(i), 0);
  });

  editavel = computed(() => !this.compra() || this.compra()!.status === 'RASCUNHO');

  get itens(): FormArray<FormGroup> {
    return this.form.controls.itens;
  }

  ngOnInit(): void {
    this.api.fornecedores.listar({ size: 200, sort: 'razaoSocial', status: 'ATIVO' }).subscribe((p) => this.fornecedores.set(p.content));
    this.api.ingredientes.listar({ size: 1000, sort: 'nome', status: 'ATIVO' }).subscribe((p) => this.ingredientes.set(p.content));

    const id = this.id();
    if (id) {
      this.carregar(Number(id));
    } else {
      const fornecedorId = this.fornecedor() ? Number(this.fornecedor()) : null;
      this.form.patchValue({ fornecedorId });
      this.adicionarItem(this.ingrediente() ? Number(this.ingrediente()) : null);
      if (fornecedorId) this.carregarCatalogo();
    }
  }

  adicionarItem(ingredienteId: number | null = null, quantidade: number | null = null, preco: number | null = null): void {
    this.itens.push(this.fb.group({
      ingredienteId: [ingredienteId, Validators.required],
      quantidade: [quantidade, [Validators.required, Validators.min(0.001)]],
      precoUnitario: [preco, [Validators.min(0)]],
    }));
  }

  carregarCatalogo(): void {
    const id = this.form.controls.fornecedorId.value;
    if (!id) return;
    this.api.catalogo(id).subscribe((p) => {
      this.catalogo.set(p.content);
      this.itens.controls.forEach((_g, i) => this.sugerirPreco(i, false));
    });
  }

  precoCatalogo(ingredienteId: number): number | null {
    return this.catalogo().find((p) => p.ingredienteId === ingredienteId)?.precoPorUnidadePadrao ?? null;
  }

  /** Preenche o preço com o valor do catálogo do fornecedor (já convertido para a unidade padrão). */
  sugerirPreco(i: number, sobrescrever = true): void {
    const g = this.itens.at(i);
    const preco = this.precoCatalogo(g.value.ingredienteId);
    if (preco !== null && (sobrescrever || !g.value.precoUnitario)) {
      g.patchValue({ precoUnitario: Number(preco.toFixed(4)) });
    }
  }

  unidade(i: number): string {
    return this.ingredientes().find((x) => x.id === this.itens.at(i).value.ingredienteId)?.unidadePadrao ?? '';
  }

  subtotal(i: number): number {
    const v = this.itens.at(i).value;
    return (Number(v.quantidade) || 0) * (Number(v.precoUnitario) || 0);
  }

  salvar(): void {
    if (this.form.invalid || this.itens.length === 0) {
      this.form.markAllAsTouched();
      this.notificacao.erro('Escolha o fornecedor e preencha ao menos um item');
      return;
    }
    const v = this.form.getRawValue();
    const dados = {
      fornecedorId: v.fornecedorId,
      observacoes: v.observacoes,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      itens: v.itens.map((i: any) => ({
        ingredienteId: i.ingredienteId,
        quantidade: Number(i.quantidade),
        precoUnitario: i.precoUnitario === null || i.precoUnitario === undefined || String(i.precoUnitario) === '' ? null : Number(i.precoUnitario),
      })),
    };
    const atual = this.compra();
    const req = atual ? this.api.compras.atualizar(atual.id, dados) : this.api.compras.criar(dados);
    req.subscribe((c) => {
      this.notificacao.sucesso('Rascunho salvo');
      if (!atual) {
        this.router.navigate(['/admin/compras', c.id]);
      } else {
        this.aplicar(c);
      }
    });
  }

  enviar(): void {
    this.api.enviarCompra(this.compra()!.id).subscribe((c) => {
      this.aplicar(c);
      this.notificacao.sucesso('Compra enviada ao fornecedor');
    });
  }

  receber(): void {
    const c = this.compra()!;
    this.dialog
      .open(ConfirmarDialog, { data: { titulo: 'Registrar recebimento?', mensagem: 'O estoque recebe a entrada de todos os itens e o custo dos ingredientes é atualizado. Os food costs são recalculados.', confirmar: 'Receber mercadoria' } })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok) return;
        const itens = c.itens.map((i) => ({ itemId: i.id, lote: this.lotes[i.id] || undefined, validade: this.validades[i.id] || undefined }));
        this.api.receberCompra(c.id, itens).subscribe((atualizada) => {
          this.aplicar(atualizada);
          this.notificacao.sucesso('Mercadoria recebida: estoque e custos atualizados');
        });
      });
  }

  cancelar(): void {
    this.dialog
      .open(ConfirmarDialog, { data: { titulo: 'Cancelar compra?', mensagem: 'A compra fica registrada como CANCELADA.', confirmar: 'Cancelar compra', perigo: true } })
      .afterClosed()
      .subscribe((ok) => ok && this.api.compras.desativar(this.compra()!.id).subscribe(() => {
        this.notificacao.sucesso('Compra cancelada');
        this.carregar(this.compra()!.id);
      }));
  }

  private carregar(id: number): void {
    this.api.compras.buscar(id).subscribe((c) => this.aplicar(c));
  }

  private aplicar(c: Compra): void {
    this.compra.set(c);
    if (c.status === 'RASCUNHO') {
      this.form.patchValue({ fornecedorId: c.fornecedorId, observacoes: c.observacoes ?? '' });
      this.itens.clear();
      c.itens.forEach((i) => this.adicionarItem(i.ingredienteId, i.quantidade, i.precoUnitario));
      this.carregarCatalogo();
    }
    const hoje = new Date();
    hoje.setDate(hoje.getDate() + 15);
    c.itens.forEach((i) => {
      this.lotes[i.id] ??= `L${c.id}-${i.id}`;
      this.validades[i.id] ??= dataISO(hoje);
    });
  }
}
