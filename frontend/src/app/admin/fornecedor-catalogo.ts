import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { unidadesCompativeis } from '../core/labels';
import { Fornecedor, FornecedorProduto, Ingrediente } from '../core/models';
import { NotificacaoService } from '../core/notificacao.service';
import { formatarCnpj } from './fornecedores';

/** RF-022: catálogo do fornecedor ("este fornecedor vende alface a R$ 12,00 o KG"). */
@Component({
  selector: 'app-fornecedor-catalogo',
  imports: [CurrencyPipe, ReactiveFormsModule, RouterLink, MatTableModule, MatButtonModule, MatIconModule, MatFormFieldModule,
    MatInputModule, MatSelectModule],
  template: `
    <a mat-button routerLink="/admin/fornecedores"><mat-icon>arrow_back</mat-icon>Fornecedores</a>
    @if (fornecedor(); as f) {
      <div class="cabecalho-pagina mt">
        <div><h1>{{ f.razaoSocial }}</h1><p>CNPJ {{ cnpj(f.cnpj) }} · {{ f.telefone }} · {{ f.email }}</p></div>
        <a mat-flat-button routerLink="/admin/compras/nova" [queryParams]="{ fornecedor: f.id }"><mat-icon>shopping_cart</mat-icon>Novo pedido de compra</a>
      </div>
    }

    <div class="cartao">
      <h2>Adicionar ou atualizar produto</h2>
      <form [formGroup]="form" class="linha-form mt" (ngSubmit)="salvar()">
        <mat-form-field subscriptSizing="dynamic" class="ing">
          <mat-label>Ingrediente</mat-label>
          <mat-select formControlName="ingredienteId" (selectionChange)="sugerirUnidade()">
            @for (i of ingredientes(); track i.id) { <mat-option [value]="i.id">{{ i.nome }}</mat-option> }
          </mat-select>
        </mat-form-field>
        <mat-form-field subscriptSizing="dynamic">
          <mat-label>Preço</mat-label>
          <span matTextPrefix>R$&nbsp;</span>
          <input matInput type="number" formControlName="preco" min="0" step="0.01" />
        </mat-form-field>
        <mat-form-field subscriptSizing="dynamic">
          <mat-label>por</mat-label>
          <mat-select formControlName="unidadeVenda">@for (u of unidades(); track u) { <mat-option [value]="u">{{ u }}</mat-option> }</mat-select>
        </mat-form-field>
        <button mat-flat-button type="submit"><mat-icon>add</mat-icon>Salvar</button>
      </form>
    </div>

    <div class="tabela-container mt">
      <table mat-table [dataSource]="produtos()">
        <ng-container matColumnDef="ingrediente"><th mat-header-cell *matHeaderCellDef>Ingrediente</th>
          <td mat-cell *matCellDef="let p"><strong>{{ p.ingredienteNome }}</strong></td></ng-container>
        <ng-container matColumnDef="preco"><th mat-header-cell *matHeaderCellDef class="num">Preço de venda</th>
          <td mat-cell *matCellDef="let p" class="num">{{ p.preco | currency }}/{{ p.unidadeVenda }}</td></ng-container>
        <ng-container matColumnDef="padrao"><th mat-header-cell *matHeaderCellDef class="num">Na unidade padrão</th>
          <td mat-cell *matCellDef="let p" class="num texto-suave">{{ p.precoPorUnidadePadrao | currency: 'BRL' : 'symbol' : '1.2-4' }}/{{ p.unidadePadrao }}</td></ng-container>
        <ng-container matColumnDef="acoes"><th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let p" class="direita">
            <button mat-icon-button (click)="editar(p)" aria-label="Editar"><mat-icon>edit</mat-icon></button>
            <a mat-icon-button routerLink="/admin/cotacao" [queryParams]="{ ingrediente: p.ingredienteId }" aria-label="Cotação"><mat-icon>compare_arrows</mat-icon></a>
            <button mat-icon-button (click)="remover(p)" aria-label="Remover"><mat-icon>delete</mat-icon></button>
          </td></ng-container>
        <tr mat-header-row *matHeaderRowDef="colunas"></tr>
        <tr mat-row *matRowDef="let row; columns: colunas"></tr>
        <tr class="mat-row" *matNoDataRow><td class="vazio" [attr.colspan]="colunas.length">Catálogo vazio.</td></tr>
      </table>
    </div>
  `,
  styles: `
    .linha-form { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
    .linha-form .ing { flex: 1 1 240px; }
  `,
})
export class FornecedorCatalogo implements OnInit {
  id = input.required<string>();

  private api = inject(ApiService);
  private notificacao = inject(NotificacaoService);

  colunas = ['ingrediente', 'preco', 'padrao', 'acoes'];
  cnpj = formatarCnpj;
  fornecedor = signal<Fornecedor | null>(null);
  produtos = signal<FornecedorProduto[]>([]);
  ingredientes = signal<Ingrediente[]>([]);

  form = inject(FormBuilder).group({
    ingredienteId: [null as number | null, Validators.required],
    preco: [null as number | null, [Validators.required, Validators.min(0.0001)]],
    unidadeVenda: ['KG', Validators.required],
  });

  ngOnInit(): void {
    this.api.fornecedores.buscar(Number(this.id())).subscribe((f) => this.fornecedor.set(f));
    this.api.ingredientes.listar({ size: 1000, sort: 'nome', status: 'ATIVO' }).subscribe((p) => this.ingredientes.set(p.content));
    this.carregar();
  }

  unidades(): string[] {
    const ing = this.ingredientes().find((i) => i.id === this.form.controls.ingredienteId.value);
    return ing ? unidadesCompativeis(ing.unidadePadrao) : ['G', 'KG', 'ML', 'L', 'UN'];
  }

  sugerirUnidade(): void {
    const opcoes = this.unidades();
    this.form.patchValue({ unidadeVenda: opcoes[opcoes.length - 1] });
  }

  editar(p: FornecedorProduto): void {
    this.form.patchValue({ ingredienteId: p.ingredienteId, preco: p.preco, unidadeVenda: p.unidadeVenda });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.api.salvarProduto(Number(this.id()), this.form.getRawValue()).subscribe(() => {
      this.notificacao.sucesso('Produto salvo no catálogo (preço registrado no histórico)');
      this.form.reset({ ingredienteId: null, preco: null, unidadeVenda: 'KG' });
      this.carregar();
    });
  }

  remover(p: FornecedorProduto): void {
    this.api.removerProduto(Number(this.id()), p.id).subscribe(() => {
      this.notificacao.sucesso(`${p.ingredienteNome} removido do catálogo`);
      this.carregar();
    });
  }

  private carregar(): void {
    this.api.catalogo(Number(this.id())).subscribe((p) => this.produtos.set(p.content));
  }
}
