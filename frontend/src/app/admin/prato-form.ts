import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink } from '@angular/router';
import { Observable, catchError, concatMap, debounceTime, of, switchMap } from 'rxjs';
import { ApiService } from '../core/api.service';
import { unidadesCompativeis } from '../core/labels';
import { Categoria, Custo, FichaItemRequest, Ingrediente, Prato, StatusPrato } from '../core/models';
import { NotificacaoService } from '../core/notificacao.service';
import { FoodCostChip } from '../shared/status-chip';

/**
 * RF-010 a RF-014: cadastro do prato + ficha técnica (FormArray) + custo em tempo real.
 * O cálculo é feito no back-end (FichaTecnicaService) a cada alteração, via POST /pratos/simular-custo.
 */
@Component({
  selector: 'app-prato-form',
  imports: [CurrencyPipe, ReactiveFormsModule, RouterLink, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatTooltipModule, FoodCostChip],
  template: `
    <a mat-button routerLink="/admin/pratos"><mat-icon>arrow_back</mat-icon>Pratos</a>
    <div class="cabecalho-pagina mt">
      <div>
        <h1>{{ ehNovo() ? 'Novo prato' : form.controls.nome.value }}</h1>
        <p>Preencha os dados, monte a ficha técnica e veja o custo calculado na hora.</p>
      </div>
      <button mat-flat-button (click)="salvar()" [disabled]="salvando()"><mat-icon>save</mat-icon>{{ salvando() ? 'Salvando...' : 'Salvar' }}</button>
    </div>

    <div class="layout" [formGroup]="form">
      <div class="coluna">
        <section class="cartao">
          <h2>Dados do prato</h2>
          <div class="form-grade mt">
            <mat-form-field class="span-2"><mat-label>Nome</mat-label><input matInput formControlName="nome" /><mat-error>Obrigatório</mat-error></mat-form-field>
            <mat-form-field>
              <mat-label>Categoria</mat-label>
              <mat-select formControlName="categoriaId">
                @for (c of categorias(); track c.id) { <mat-option [value]="c.id">{{ c.nome }}</mat-option> }
              </mat-select>
              <mat-error>Escolha a categoria</mat-error>
            </mat-form-field>
            <mat-form-field>
              <mat-label>Status no cardápio</mat-label>
              <mat-select formControlName="status">
                <mat-option value="ATIVO">Ativo (aparece no cardápio)</mat-option>
                <mat-option value="PAUSADO">Pausado</mat-option>
                <mat-option value="INATIVO">Inativo</mat-option>
              </mat-select>
              <mat-hint>Para ativar, a ficha técnica precisa ter ingredientes</mat-hint>
            </mat-form-field>
            <mat-form-field>
              <mat-label>Preço de venda</mat-label>
              <span matTextPrefix>R$&nbsp;</span>
              <input matInput type="number" formControlName="precoVenda" min="0.01" step="0.01" />
              <mat-error>Informe um preço maior que zero</mat-error>
            </mat-form-field>
            <mat-form-field>
              <mat-label>Tempo de preparo</mat-label>
              <input matInput type="number" formControlName="tempoPreparoMin" min="1" />
              <span matTextSuffix>min</span>
            </mat-form-field>
            <mat-form-field class="span-2"><mat-label>Descrição</mat-label><textarea matInput formControlName="descricao" rows="2"></textarea></mat-form-field>
            <mat-form-field class="span-2">
              <mat-label>URL da foto</mat-label>
              <input matInput formControlName="fotoUrl" placeholder="/imagens/taverna/... ou https://..." />
              <mat-hint>Caminho de uma foto do site (ex.: /imagens/taverna/brasao-da-casa.webp) ou link externo. Opcional.</mat-hint>
            </mat-form-field>
          </div>
        </section>

        <section class="cartao mt">
          <div class="linha">
            <h2>Ficha técnica</h2>
            <span class="espacador"></span>
            <mat-form-field class="rendimento" subscriptSizing="dynamic">
              <mat-label>Rendimento</mat-label>
              <input matInput type="number" formControlName="rendimento" min="1" />
              <span matTextSuffix>porções</span>
            </mat-form-field>
          </div>
          <p class="texto-suave">FC = fator de correção (perda no preparo, mínimo 1,00). Ex.: alface com FC 1,40 perde 40% ao limpar.</p>
          <p class="texto-suave">
            A receita rende <strong>{{ form.controls.rendimento.value || 1 }} porção(ões)</strong>; o preço de venda corresponde a
            <strong>1 porção</strong> e a baixa de estoque de cada venda é a receita dividida pelo rendimento.
          </p>

          <div formArrayName="itens" class="itens">
            @for (item of itens.controls; track item; let i = $index) {
              <div class="item" [formGroupName]="i">
                <mat-form-field class="ing" subscriptSizing="dynamic">
                  <mat-label>Ingrediente</mat-label>
                  <mat-select formControlName="ingredienteId" (selectionChange)="ajustarUnidade(i)">
                    @for (ing of ingredientes(); track ing.id) { <mat-option [value]="ing.id">{{ ing.nome }}</mat-option> }
                  </mat-select>
                </mat-form-field>
                <mat-form-field class="qtd" subscriptSizing="dynamic">
                  <mat-label>Qtd</mat-label>
                  <input matInput type="number" formControlName="quantidade" min="0" step="any" />
                </mat-form-field>
                <mat-form-field class="un" subscriptSizing="dynamic">
                  <mat-label>Un.</mat-label>
                  <mat-select formControlName="unidade">
                    @for (u of unidadesDoItem(i); track u) { <mat-option [value]="u">{{ u }}</mat-option> }
                  </mat-select>
                </mat-form-field>
                <mat-form-field class="fc" subscriptSizing="dynamic">
                  <mat-label>FC</mat-label>
                  <input matInput type="number" formControlName="fatorCorrecao" min="1" step="0.01" />
                  @if (item.get('fatorCorrecao')?.hasError('min')) { <mat-error>≥ 1,0</mat-error> }
                </mat-form-field>
                <span class="custo-item" matTooltip="Custo deste ingrediente na receita">
                  {{ custo()?.itens?.[i]?.custoItem ?? 0 | currency }}
                </span>
                <button mat-icon-button (click)="removerItem(i)" aria-label="Remover ingrediente"><mat-icon>delete</mat-icon></button>
              </div>
            } @empty {
              <div class="vazio">Nenhum ingrediente ainda. Adicione o primeiro abaixo.</div>
            }
          </div>
          <button mat-stroked-button (click)="adicionarItem()"><mat-icon>add</mat-icon>Adicionar ingrediente</button>
        </section>

        <section class="cartao mt">
          <h2>Modo de preparo</h2>
          <p class="texto-suave">Receita interna completa (não aparece para o cliente). Use passos numerados e as mesmas quantidades da ficha.</p>
          <mat-form-field class="largura-total">
            <mat-label>Instruções passo a passo</mat-label>
            <textarea matInput formControlName="modoPreparo" rows="11" placeholder="1. ...&#10;2. ..."></textarea>
          </mat-form-field>
        </section>
      </div>

      <aside class="cartao painel-custo">
        <h2>Custo do prato</h2>
        <p class="texto-suave">Calculado no servidor a cada alteração</p>
        <div class="metrica"><span>Custo da receita</span><strong>{{ custo()?.custoTotalReceita ?? 0 | currency }}</strong></div>
        <div class="metrica"><span>Rendimento</span><strong>{{ form.controls.rendimento.value || 1 }} porção(ões)</strong></div>
        <div class="metrica destaque"><span>Custo por porção</span><strong>{{ custo()?.custoPorcao ?? 0 | currency }}</strong></div>
        <div class="metrica"><span>Preço de venda</span><strong>{{ form.controls.precoVenda.value ?? 0 | currency }}</strong></div>
        <div class="metrica"><span>Margem bruta</span><strong>{{ (form.controls.precoVenda.value ?? 0) - (custo()?.custoPorcao ?? 0) | currency }}</strong></div>
        <div class="food-cost">
          <span>Food cost</span>
          <app-food-cost [valor]="custo()?.foodCost ?? null" [faixa]="custo()?.faixa" />
        </div>
        <div class="barra-fc"><div [style.width.%]="larguraBarra()" [class]="'preenchido ' + (custo()?.faixa ?? 'VERDE').toLowerCase()"></div></div>
        <p class="legenda">Verde ≤ 30% · Amarelo 31-35% · Vermelho &gt; 35%</p>
        @if (custo()?.aviso) {
          <div class="aviso"><mat-icon>warning</mat-icon>{{ custo()!.aviso }}</div>
        }
      </aside>
    </div>
  `,
  styles: `
    .layout { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 16px; align-items: start; }
    .rendimento { width: 150px; }
    .itens { display: flex; flex-direction: column; gap: 10px; margin: 12px 0; }
    .item { display: grid; grid-template-columns: minmax(160px, 2fr) 90px 80px 80px 90px 40px; gap: 8px; align-items: center; }
    .custo-item { text-align: right; font-weight: 600; }
    .painel-custo { position: sticky; top: 80px; }
    .metrica { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed var(--cd-borda); }
    .metrica.destaque strong { font-family: Outfit, sans-serif; font-size: 1.3rem; color: var(--cd-brasa-escura); }
    .food-cost { display: flex; justify-content: space-between; align-items: center; margin-top: 14px; font-weight: 600; }
    .barra-fc { height: 10px; background: #f1ebe6; border-radius: 999px; margin-top: 10px; overflow: hidden; }
    .preenchido { height: 100%; border-radius: 999px; transition: width .3s; }
    .preenchido.verde { background: var(--cd-ok); } .preenchido.amarelo { background: #f59f00; } .preenchido.vermelho { background: var(--cd-erro); }
    .legenda { font-size: 0.75rem; color: var(--cd-texto-suave); margin: 6px 0 0; }
    .aviso { display: flex; gap: 8px; margin-top: 14px; padding: 10px 12px; background: var(--cd-erro-bg); color: var(--cd-erro); border-radius: 10px; font-size: 0.88rem; }
    @media (max-width: 1100px) { .layout { grid-template-columns: 1fr; } .painel-custo { position: static; } }
    @media (max-width: 700px) {
      .item { grid-template-columns: 1fr 1fr 1fr; padding-bottom: 10px; border-bottom: 1px solid var(--cd-borda); }
      .ing { grid-column: span 3; }
    }
  `,
})
export class PratoForm implements OnInit {
  id = input<string | undefined>(); // ausente em /admin/pratos/novo

  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private notificacao = inject(NotificacaoService);
  private destroyRef = inject(DestroyRef);

  categorias = signal<Categoria[]>([]);
  ingredientes = signal<Ingrediente[]>([]);
  custo = signal<Custo | null>(null);
  salvando = signal(false);
  ehNovo = signal(true);
  private prato: Prato | null = null;

  form = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(120)]],
    categoriaId: [null as number | null, Validators.required],
    descricao: [''],
    fotoUrl: [''],
    precoVenda: [null as number | null, [Validators.required, Validators.min(0.01)]],
    tempoPreparoMin: [15, [Validators.required, Validators.min(1)]],
    status: ['INATIVO' as StatusPrato],
    rendimento: [1, [Validators.required, Validators.min(1)]],
    modoPreparo: [''],
    itens: this.fb.array<FormGroup>([]),
  });

  get itens(): FormArray<FormGroup> {
    return this.form.controls.itens;
  }

  ngOnInit(): void {
    this.api.categorias.listar({ size: 100, sort: 'ordem', status: 'ATIVO' }).subscribe((p) => this.categorias.set(p.content));
    this.api.ingredientes.listar({ size: 1000, sort: 'nome', status: 'ATIVO' }).subscribe((p) => this.ingredientes.set(p.content));

    const id = this.id();
    if (id) {
      this.ehNovo.set(false);
      this.carregar(Number(id));
    }

    // RF-012: recalcula o custo no back-end sempre que o formulário muda
    this.form.valueChanges
      .pipe(
        debounceTime(350),
        switchMap(() => this.simular()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((c) => c && this.custo.set(c));
  }

  novoItem(dados?: Partial<FichaItemRequest>): FormGroup {
    return this.fb.group({
      ingredienteId: [dados?.ingredienteId ?? null, Validators.required],
      quantidade: [dados?.quantidade ?? null, [Validators.required, Validators.min(0.001)]],
      unidade: [dados?.unidade ?? 'G', Validators.required],
      fatorCorrecao: [dados?.fatorCorrecao ?? 1, [Validators.required, Validators.min(1)]], // RN08
    });
  }

  adicionarItem(): void {
    this.itens.push(this.novoItem());
  }

  removerItem(i: number): void {
    this.itens.removeAt(i);
  }

  unidadesDoItem(i: number): string[] {
    const ing = this.ingredientes().find((x) => x.id === this.itens.at(i).value.ingredienteId);
    return ing ? unidadesCompativeis(ing.unidadePadrao) : ['G', 'KG', 'ML', 'L', 'UN'];
  }

  /** Ao escolher o ingrediente, já sugere a unidade padrão dele. */
  ajustarUnidade(i: number): void {
    const grupo = this.itens.at(i);
    const ing = this.ingredientes().find((x) => x.id === grupo.value.ingredienteId);
    if (ing) grupo.patchValue({ unidade: ing.unidadePadrao });
  }

  larguraBarra(): number {
    return Math.min(100, ((this.custo()?.foodCost ?? 0) / 50) * 100);
  }

  salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notificacao.erro('Revise os campos destacados');
      return;
    }
    const v = this.form.getRawValue();
    const statusDesejado = v.status as StatusPrato;
    const dadosPrato = {
      categoriaId: v.categoriaId, nome: v.nome, descricao: v.descricao, fotoUrl: v.fotoUrl,
      precoVenda: v.precoVenda, tempoPreparoMin: v.tempoPreparoMin,
    };
    const ficha = { rendimento: Number(v.rendimento), modoPreparo: v.modoPreparo ?? '', itens: this.itensValidos() };
    const statusAtual: StatusPrato = this.prato?.status ?? 'INATIVO';

    this.salvando.set(true);
    // Ordem pensada para respeitar a RN01 (prato ativo precisa de ficha com ingredientes):
    // 1) salva os dados  2) se for desativar, desativa antes  3) salva a ficha  4) se for ativar, ativa por último
    const salvarPrato$: Observable<Prato> = this.prato
      ? this.api.pratos.atualizar(this.prato.id, { ...dadosPrato, status: null })
      : this.api.pratos.criar({ ...dadosPrato, status: 'INATIVO' });

    salvarPrato$
      .pipe(
        concatMap((p) => (statusDesejado !== 'ATIVO' && statusDesejado !== p.status
          ? this.api.alterarStatusPrato(p.id, statusDesejado) : of(p))),
        concatMap((p) => (ficha.itens.length || !this.ehNovo() ? this.api.salvarFicha(p.id, ficha).pipe(concatMap(() => of(p))) : of(p))),
        concatMap((p) => (statusDesejado === 'ATIVO' && (statusAtual !== 'ATIVO' || p.status !== 'ATIVO')
          ? this.api.alterarStatusPrato(p.id, 'ATIVO') : of(p))),
      )
      .subscribe({
        next: (p) => {
          this.salvando.set(false);
          this.notificacao.sucesso('Prato e ficha técnica salvos');
          if (this.custo()?.aviso) this.notificacao.aviso(this.custo()!.aviso!); // RN02: só avisa
          if (this.ehNovo()) {
            this.router.navigate(['/admin/pratos', p.id]);
          } else {
            this.carregar(p.id);
          }
        },
        error: (_e: HttpErrorResponse) => {
          this.salvando.set(false);
          if (this.prato) this.carregar(this.prato.id);
        },
      });
  }

  private itensValidos(): FichaItemRequest[] {
    return this.itens.controls
      .filter((g) => g.valid)
      .map((g) => ({
        ingredienteId: g.value.ingredienteId,
        quantidade: Number(g.value.quantidade),
        unidade: g.value.unidade,
        fatorCorrecao: Number(g.value.fatorCorrecao),
      }));
  }

  private simular(): Observable<Custo | null> {
    const preco = Number(this.form.controls.precoVenda.value);
    const itens = this.itensValidos();
    if (!preco || preco <= 0 || itens.length === 0) {
      return of(null);
    }
    return this.api
      .simularCusto({ precoVenda: preco, rendimento: Number(this.form.controls.rendimento.value) || 1, itens })
      .pipe(catchError(() => of(null)));
  }

  private carregar(id: number): void {
    this.api.pratos.buscar(id).subscribe((p) => {
      this.prato = p;
      this.form.patchValue({
        nome: p.nome, categoriaId: p.categoriaId, descricao: p.descricao ?? '', fotoUrl: p.fotoUrl ?? '',
        precoVenda: p.precoVenda, tempoPreparoMin: p.tempoPreparoMin, status: p.status,
      }, { emitEvent: false });
    });
    this.api.ficha(id).subscribe({
      next: (f) => {
        this.itens.clear({ emitEvent: false });
        f.custo.itens.forEach((i) => this.itens.push(this.novoItem(i), { emitEvent: false }));
        this.form.patchValue({ rendimento: f.rendimento, modoPreparo: f.modoPreparo ?? '' }, { emitEvent: false });
        this.custo.set(f.custo);
      },
      error: () => this.custo.set(null), // prato ainda sem ficha (404): tudo bem
    });
  }
}
