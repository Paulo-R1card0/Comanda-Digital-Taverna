import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { CarrinhoService } from '../core/carrinho.service';
import { Categoria, PratoPublico } from '../core/models';
import { NotificacaoService } from '../core/notificacao.service';

/** RF-001: cardápio público com filtro por categoria. */
@Component({
  selector: 'app-cardapio',
  imports: [CurrencyPipe, RouterLink, MatButtonModule, MatIconModule, MatChipsModule],
  template: `
    <section class="hero">
      <div class="hero-interno">
        <span class="selo"><mat-icon>delivery_dining</mat-icon>Só delivery · direto da brasa</span>
        <h1>Banquetes da taverna,<br />entregues na sua porta.</h1>
        <p>Lanches na brasa, refeições completas, porções e elixires gelados. Escolha, acompanhe o preparo e receba quentinho.</p>
      </div>
    </section>

    <div class="conteudo">
      <div class="categorias" role="tablist">
        <mat-chip-listbox [value]="categoriaSelecionada()" (change)="filtrar($event.value)" aria-label="Categorias">
          <mat-chip-option [value]="null">Todos</mat-chip-option>
          @for (c of categorias(); track c.id) {
            <mat-chip-option [value]="c.id">{{ c.nome }}</mat-chip-option>
          }
        </mat-chip-listbox>
      </div>

      @for (grupo of grupos(); track grupo.nome) {
        <h2 class="titulo-grupo"><span>{{ grupo.nome }}</span></h2>
        <div class="grade-pratos">
          @for (p of grupo.pratos; track p.id) {
            <article class="card-prato">
              <a [routerLink]="['/prato', p.id]" class="foto" [attr.aria-label]="p.nome">
                @if (p.fotoUrl) {
                  <img [src]="p.fotoUrl" [alt]="p.nome" loading="lazy" />
                } @else {
                  <div class="foto-placeholder"><mat-icon>restaurant</mat-icon></div>
                }
                <span class="tempo"><mat-icon>schedule</mat-icon>{{ p.tempoPreparoMin }} min</span>
              </a>
              <div class="info">
                <a [routerLink]="['/prato', p.id]" class="nome">{{ p.nome }}</a>
                <p class="descricao">{{ p.descricao }}</p>
                <div class="rodape-card">
                  <span class="preco">{{ p.precoVenda | currency }}</span>
                  <button mat-flat-button (click)="adicionar(p)">
                    <mat-icon>add</mat-icon>Adicionar
                  </button>
                </div>
              </div>
            </article>
          }
        </div>
      } @empty {
        @if (!carregando()) {
          <div class="vazio"><mat-icon>no_meals</mat-icon><p>Nenhum prato disponível nesta categoria.</p></div>
        }
      }
    </div>
  `,
  styles: `
    /* Destaque: cenário da taverna (9º quadro da referência) sob um véu de carvão, para o texto continuar legível */
    .hero {
      color: #fff;
      background-color: var(--cd-carvao);
      background-image:
        linear-gradient(90deg, rgb(20 15 12 / 94%) 0%, rgb(20 15 12 / 84%) 45%, rgb(20 15 12 / 45%) 100%),
        url('/imagens/taverna/cenario-da-taverna.webp');
      background-size: cover;
      background-position: center 40%;
    }
    .hero-interno { max-width: 1180px; margin: 0 auto; padding: 44px 16px 64px; }
    .hero h1 { font-size: clamp(1.7rem, 4vw, 2.8rem); line-height: 1.15; margin: 14px 0 10px; color: #fbf3e6; text-shadow: 0 2px 12px rgb(0 0 0 / 60%); }
    .hero p { color: #efe2cf; margin: 0; max-width: 540px; text-shadow: 0 1px 8px rgb(0 0 0 / 70%); }
    .selo { display: inline-flex; align-items: center; gap: 6px; background: rgb(20 15 12 / 70%); border: 1px solid rgb(224 160 100 / 45%); padding: 4px 12px; border-radius: 999px; font-size: 0.85rem; }
    .selo mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--cd-cobre-claro); }
    .categorias { margin: -48px 0 16px; background: var(--cd-pergaminho); border: 1px solid var(--cd-borda); border-radius: var(--cd-raio); padding: 10px 12px; box-shadow: var(--cd-sombra); overflow-x: auto; }
    .titulo-grupo { margin: 28px 0 12px; display: flex; align-items: center; gap: 12px; color: var(--cd-carvao-2); }
    .titulo-grupo::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, var(--cd-brasa), transparent); }
    .grade-pratos { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 18px; }
    .card-prato { background: var(--cd-pergaminho); border-radius: var(--cd-raio); overflow: hidden; border: 1px solid var(--cd-borda); display: flex; flex-direction: column; transition: transform .15s, box-shadow .15s; }
    .card-prato:hover { transform: translateY(-2px); box-shadow: 0 8px 26px rgb(166 82 31 / 22%); }
    .foto { position: relative; display: block; aspect-ratio: 3 / 2; background: var(--cd-carvao); }
    .foto img, .foto .foto-placeholder { width: 100%; height: 100%; object-fit: cover; display: block; }
    .tempo { position: absolute; left: 10px; bottom: 10px; display: inline-flex; align-items: center; gap: 4px; background: rgb(27 22 19 / 80%); color: #fff; border-radius: 999px; padding: 2px 10px; font-size: 0.78rem; }
    .tempo mat-icon { font-size: 15px; width: 15px; height: 15px; }
    .info { padding: 14px 16px 16px; display: flex; flex-direction: column; gap: 6px; flex: 1; }
    .nome { font-family: var(--cd-fonte-taverna); font-weight: 700; font-size: 1.08rem; color: var(--cd-carvao-2); text-decoration: none; }
    .descricao { margin: 0; color: var(--cd-texto-suave); font-size: 0.88rem; flex: 1; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
    .rodape-card { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; }
    .preco { font-family: Outfit, sans-serif; font-weight: 700; font-size: 1.2rem; color: var(--cd-brasa-escura); }
  `,
})
export class Cardapio implements OnInit {
  private api = inject(ApiService);
  private carrinho = inject(CarrinhoService);
  private notificacao = inject(NotificacaoService);

  categorias = signal<Categoria[]>([]);
  pratos = signal<PratoPublico[]>([]);
  categoriaSelecionada = signal<number | null>(null);
  carregando = signal(true);

  /** Agrupa os pratos por categoria, respeitando a ordem das categorias. */
  grupos = computed(() => {
    const ordem = this.categorias().map((c) => c.nome);
    const mapa = new Map<string, PratoPublico[]>();
    for (const p of this.pratos()) {
      mapa.set(p.categoriaNome, [...(mapa.get(p.categoriaNome) ?? []), p]);
    }
    return [...mapa.entries()]
      .sort((a, b) => ordem.indexOf(a[0]) - ordem.indexOf(b[0]))
      .map(([nome, pratos]) => ({ nome, pratos }));
  });

  ngOnInit(): void {
    this.api.categoriasPublicas().subscribe((p) => this.categorias.set(p.content));
    this.carregar();
  }

  filtrar(categoriaId: number | null | undefined): void {
    this.categoriaSelecionada.set(categoriaId ?? null);
    this.carregar();
  }

  adicionar(p: PratoPublico): void {
    this.carrinho.adicionar(p, 1, '');
    this.notificacao.sucesso(`${p.nome} adicionado ao carrinho`);
  }

  private carregar(): void {
    this.carregando.set(true);
    this.api.cardapio(this.categoriaSelecionada()).subscribe({
      next: (p) => {
        this.pratos.set(p.content);
        this.carregando.set(false);
      },
      error: () => this.carregando.set(false),
    });
  }
}
