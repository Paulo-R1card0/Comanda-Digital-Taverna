import { Component, inject } from '@angular/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { CarrinhoService } from '../core/carrinho.service';

/** Moldura da área do cliente (Taverna da Brasa): topo com brasão, carrinho e conta. */
@Component({
  selector: 'app-loja-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatButtonModule, MatIconModule, MatBadgeModule, MatMenuModule],
  template: `
    <header class="topo">
      <div class="topo-interno">
        <a routerLink="/" class="marca" aria-label="Taverna da Brasa - início">
          <span class="marca-icone" aria-hidden="true"><mat-icon>local_fire_department</mat-icon></span>
          <span class="marca-nome">Taverna <small>da</small><b>&nbsp;Brasa</b></span>
        </a>
        <nav class="nav">
          <a mat-button routerLink="/" routerLinkActive="ativo" [routerLinkActiveOptions]="{ exact: true }">Cardápio</a>
          @if (auth.ehCliente()) {
            <a mat-button routerLink="/meus-pedidos" routerLinkActive="ativo">Meus pedidos</a>
          }
          @if (auth.ehInterno()) {
            <a mat-button [routerLink]="auth.rotaInicial()">Painel</a>
          }
        </nav>
        <span class="espacador"></span>
        <a mat-icon-button routerLink="/carrinho" aria-label="Carrinho" class="botao-carrinho">
          <mat-icon [matBadge]="carrinho.quantidadeTotal() || null" matBadgeColor="warn" matBadgeSize="medium" [matBadgeDescription]="carrinho.quantidadeTotal() === 1 ? '1 item no carrinho' : carrinho.quantidadeTotal() + ' itens no carrinho'">shopping_bag</mat-icon>
        </a>
        @if (auth.logado()) {
          <button mat-button [matMenuTriggerFor]="menu" class="botao-conta">
            <mat-icon>account_circle</mat-icon>
            <span class="nome-usuario">{{ primeiroNome() }}</span>
          </button>
          <mat-menu #menu="matMenu">
            @if (auth.ehCliente()) {
              <a mat-menu-item routerLink="/meus-pedidos"><mat-icon>receipt_long</mat-icon>Meus pedidos</a>
            }
            @if (auth.ehInterno()) {
              <a mat-menu-item [routerLink]="auth.rotaInicial()"><mat-icon>dashboard</mat-icon>Painel</a>
            }
            <button mat-menu-item (click)="auth.logout()"><mat-icon>logout</mat-icon>Sair</button>
          </mat-menu>
        } @else {
          <a mat-flat-button routerLink="/login">Entrar</a>
        }
      </div>
    </header>
    <main class="loja">
      <router-outlet />
    </main>
    <footer class="rodape">
      <div class="rodape-interno">
        <span class="rodape-marca"><mat-icon aria-hidden="true">local_fire_department</mat-icon>Taverna da Brasa</span>
        <span>Cozinha de taverna só para delivery · peça pelo site e acompanhe o preparo até a sua porta</span>
      </div>
    </footer>
  `,
  styles: `
    .topo {
      background: linear-gradient(180deg, var(--cd-carvao-2), var(--cd-carvao));
      color: #fff; position: sticky; top: 0; z-index: 100;
      border-bottom: 2px solid var(--cd-brasa);
      box-shadow: 0 2px 18px rgb(166 82 31 / 35%);
    }
    .topo-interno { max-width: 1180px; margin: 0 auto; padding: 8px 16px; display: flex; align-items: center; gap: 8px; }
    .marca { display: flex; align-items: center; gap: 10px; color: #fff; text-decoration: none; margin-right: 12px; flex-shrink: 0; }
    .marca-icone {
      display: grid; place-items: center; width: 38px; height: 38px; border-radius: 50% 50% 12px 12px;
      background: radial-gradient(circle at 50% 70%, #f2b36b, var(--cd-brasa) 60%, #5a2a0e);
      box-shadow: 0 0 14px rgb(224 160 100 / 55%);
    }
    .marca-nome { font-family: var(--cd-fonte-taverna); font-size: 1.2rem; font-weight: 700; letter-spacing: 0.04em; color: #f7eedf; white-space: nowrap; }
    .marca-nome small { font-size: 0.75em; font-weight: 600; color: #d8c3a5; }
    .marca-nome b { color: var(--cd-cobre-claro); }
    .nav { display: flex; min-width: 0; overflow: hidden; }
    .nav a { color: #e9dccb; flex-shrink: 0; }
    .nav a.ativo { color: #fff; background: rgb(224 160 100 / 14%); }
    .botao-carrinho, .botao-conta { color: #fff; --mat-button-text-label-text-color: #f7eedf; --mat-icon-button-icon-color: #f7eedf; }
    .rodape { background: var(--cd-carvao); color: #d8c3a5; border-top: 2px solid var(--cd-brasa); font-size: 0.85rem; }
    .rodape-interno { max-width: 1180px; margin: 0 auto; padding: 22px 16px; display: flex; flex-wrap: wrap; gap: 6px 18px; align-items: center; justify-content: center; text-align: center; }
    .rodape-marca { display: inline-flex; align-items: center; gap: 6px; font-family: var(--cd-fonte-taverna); font-weight: 700; color: var(--cd-cobre-claro); letter-spacing: 0.04em; }
    .rodape-marca mat-icon { font-size: 18px; width: 18px; height: 18px; }
    main { min-height: calc(100vh - 140px); }
    @media (max-width: 600px) {
      .nome-usuario { display: none; }
      .topo-interno { gap: 4px; padding: 8px 12px; }
      .marca { margin-right: 4px; gap: 8px; }
      .marca-icone { width: 34px; height: 34px; }
      .marca-nome { font-size: 0.95rem; }
      .nav { display: none; } /* o brasão leva ao cardápio; Meus pedidos e Painel ficam no menu da conta */
      .nav a { padding: 0 8px; }
    }
    @media (max-width: 359px) {
      .marca-nome { font-size: 0.82rem; letter-spacing: 0.02em; }
    }
  `,
})
export class LojaLayout {
  auth = inject(AuthService);
  carrinho = inject(CarrinhoService);

  primeiroNome(): string {
    return this.auth.usuario()?.nome.split(' ')[0] ?? '';
  }
}
