import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { CarrinhoService } from '../core/carrinho.service';
import { PratoPublico } from '../core/models';
import { NotificacaoService } from '../core/notificacao.service';

/** RF-002: detalhe do prato com quantidade, observações e "Adicionar ao carrinho". */
@Component({
  selector: 'app-prato-detalhe',
  imports: [CurrencyPipe, FormsModule, RouterLink, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule],
  template: `
    <div class="conteudo">
      <a mat-button routerLink="/"><mat-icon>arrow_back</mat-icon>Voltar ao cardápio</a>
      @if (prato(); as p) {
        <div class="detalhe cartao">
          <div class="foto">
            @if (p.fotoUrl) {
              <img [src]="p.fotoUrl" [alt]="p.nome" />
            } @else {
              <div class="foto-placeholder"><mat-icon>restaurant</mat-icon></div>
            }
          </div>
          <div class="info">
            <span class="chip chip-neutro">{{ p.categoriaNome }}</span>
            <h1>{{ p.nome }}</h1>
            <p class="descricao">{{ p.descricao }}</p>
            <p class="tempo"><mat-icon>schedule</mat-icon>Tempo de preparo: {{ p.tempoPreparoMin }} minutos</p>
            <div class="preco">{{ p.precoVenda | currency }}</div>

            <div class="quantidade">
              <span>Quantidade</span>
              <button mat-icon-button (click)="quantidade.set(quantidade() - 1)" [disabled]="quantidade() <= 1" aria-label="Diminuir">
                <mat-icon>remove</mat-icon>
              </button>
              <strong>{{ quantidade() }}</strong>
              <button mat-icon-button (click)="quantidade.set(quantidade() + 1)" [disabled]="quantidade() >= 50" aria-label="Aumentar">
                <mat-icon>add</mat-icon>
              </button>
            </div>

            <mat-form-field class="largura-total">
              <mat-label>Observações (opcional)</mat-label>
              <textarea matInput [(ngModel)]="observacoes" rows="2" maxlength="255" placeholder="Ex.: sem cebola, ponto da carne..."></textarea>
            </mat-form-field>

            <button mat-flat-button class="botao-adicionar" (click)="adicionar(p)">
              <mat-icon>add_shopping_cart</mat-icon>
              Adicionar ao carrinho · {{ p.precoVenda * quantidade() | currency }}
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .detalhe { display: grid; grid-template-columns: 1.1fr 1fr; gap: 28px; margin-top: 12px; padding: 0; overflow: hidden; }
    .foto { background: var(--cd-carvao); }
    .foto img, .foto .foto-placeholder { width: 100%; height: 100%; min-height: 320px; object-fit: cover; display: block; }
    h1 { color: var(--cd-carvao-2); }
    .info { padding: 24px 24px 24px 0; display: flex; flex-direction: column; gap: 10px; align-items: flex-start; }
    .descricao { margin: 0; color: var(--cd-texto-suave); line-height: 1.5; }
    .tempo { display: flex; align-items: center; gap: 6px; margin: 0; color: var(--cd-texto-suave); }
    .preco { font-family: Outfit, sans-serif; font-size: 2rem; font-weight: 700; color: var(--cd-brasa-escura); }
    .quantidade { display: flex; align-items: center; gap: 8px; }
    .quantidade strong { min-width: 24px; text-align: center; font-size: 1.1rem; }
    .botao-adicionar { width: 100%; height: 48px; }
    @media (max-width: 760px) {
      .detalhe { grid-template-columns: 1fr; }
      .info { padding: 0 20px 20px; }
      .foto img, .foto .foto-placeholder { min-height: 0; aspect-ratio: 3 / 2; height: auto; }
    }
  `,
})
export class PratoDetalhe implements OnInit {
  id = input.required<string>(); // vem da rota /prato/:id

  private api = inject(ApiService);
  private carrinho = inject(CarrinhoService);
  private notificacao = inject(NotificacaoService);
  private router = inject(Router);
  private titulo = inject(Title);

  prato = signal<PratoPublico | null>(null);
  quantidade = signal(1);
  observacoes = '';

  ngOnInit(): void {
    this.api.pratoPublico(Number(this.id())).subscribe({
      next: (p) => {
        this.prato.set(p);
        this.titulo.setTitle(`${p.nome} · Taverna da Brasa`);
      },
      error: () => this.router.navigateByUrl('/'),
    });
  }

  adicionar(p: PratoPublico): void {
    this.carrinho.adicionar(p, this.quantidade(), this.observacoes);
    this.notificacao.sucesso(`${this.quantidade()}x ${p.nome} no carrinho`);
    this.router.navigateByUrl('/carrinho');
  }
}
