import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, interval, map, startWith, switchMap } from 'rxjs';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { PERFIS } from '../core/labels';
import { Perfil } from '../core/models';

interface ItemMenu {
  rota: string;
  icone: string;
  rotulo: string;
  perfis: Perfil[];
  alerta?: boolean;
}

const GESTAO: Perfil[] = ['ADMIN', 'GERENTE'];

/** Moldura do painel: menu lateral filtrado pelo perfil do usuário (RF-040 / RF-043). */
@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatSidenavModule, MatToolbarModule, MatListModule,
    MatIconModule, MatButtonModule, MatBadgeModule],
  template: `
    <mat-sidenav-container class="container">
      <mat-sidenav #nav [mode]="telaPequena() ? 'over' : 'side'" [opened]="!telaPequena()" class="menu">
        <a routerLink="/" class="marca">
          <span class="marca-icone"><mat-icon>local_fire_department</mat-icon></span>
          <span>Comanda<b>Digital</b></span>
        </a>
        <mat-nav-list>
          @for (item of menu(); track item.rota) {
            <a mat-list-item [routerLink]="item.rota" routerLinkActive="ativo" (click)="telaPequena() && nav.close()">
              <mat-icon matListItemIcon>{{ item.icone }}</mat-icon>
              <span matListItemTitle class="rotulo-menu">
                {{ item.rotulo }}
                @if (item.alerta && alertas() > 0) {
                  <span class="badge-alerta" [attr.aria-label]="alertas() + ' alertas de estoque'">{{ alertas() }}</span>
                }
              </span>
            </a>
          }
        </mat-nav-list>
        <div class="usuario">
          <mat-icon>account_circle</mat-icon>
          <div>
            <strong>{{ auth.usuario()?.nome }}</strong>
            <div class="perfil">{{ nomePerfil() }}</div>
          </div>
        </div>
      </mat-sidenav>

      <mat-sidenav-content>
        <mat-toolbar class="barra">
          @if (telaPequena()) {
            <button mat-icon-button (click)="nav.toggle()" aria-label="Abrir menu"><mat-icon>menu</mat-icon></button>
          }
          <span class="titulo-barra">Painel da cozinha</span>
          <span class="espacador"></span>
          <a mat-button routerLink="/" class="ver-loja"><mat-icon>storefront</mat-icon><span class="ocultar-mobile">Ver loja</span></a>
          <button mat-button (click)="auth.logout()"><mat-icon>logout</mat-icon><span class="ocultar-mobile">Sair</span></button>
        </mat-toolbar>
        <div class="conteudo">
          <router-outlet />
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: `
    .container { min-height: 100vh; background: #faf6f2; }
    .menu { width: 248px; background: var(--cd-carvao); color: #e9dfd7; border-right: none; display: flex; flex-direction: column; }
    .marca { display: flex; align-items: center; gap: 10px; padding: 18px 16px; color: #fff; text-decoration: none; font-family: Outfit, sans-serif; font-size: 1.2rem; }
    .marca b { color: #ffa94d; font-weight: 800; }
    .marca-icone { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; background: var(--cd-brasa); }
    mat-nav-list { --mat-list-list-item-label-text-color: #e9dfd7; --mat-list-list-item-leading-icon-color: #b9aca2; --mat-list-list-item-hover-label-text-color: #fff; }
    a.ativo { background: rgb(232 89 12 / 22%); --mat-list-list-item-label-text-color: #fff; --mat-list-list-item-leading-icon-color: #ffa94d; }
    .rotulo-menu { display: flex; align-items: center; gap: 8px; }
    .badge-alerta { background: #e03131; color: #fff; border-radius: 999px; font-size: 0.72rem; font-weight: 700; padding: 1px 8px; }
    .usuario { margin-top: auto; display: flex; gap: 10px; align-items: center; padding: 16px; border-top: 1px solid rgb(255 255 255 / 8%); }
    .perfil { font-size: 0.78rem; color: #b9aca2; }
    .barra { background: #fff; border-bottom: 1px solid var(--cd-borda); position: sticky; top: 0; z-index: 10; }
    .titulo-barra { font-family: Outfit, sans-serif; font-size: 1.05rem; }
    @media (max-width: 600px) { .ocultar-mobile { display: none; } }
  `,
})
export class AdminLayout implements OnInit {
  auth = inject(AuthService);
  private api = inject(ApiService);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);

  telaPequena = toSignal(
    inject(BreakpointObserver).observe('(max-width: 900px)').pipe(map((r) => r.matches)),
    { initialValue: false },
  );
  alertas = signal(0);

  private itens: ItemMenu[] = [
    { rota: '/admin/dashboard', icone: 'monitoring', rotulo: 'Dashboard', perfis: GESTAO },
    { rota: '/admin/pedidos', icone: 'receipt_long', rotulo: 'Pedidos', perfis: ['ADMIN', 'GERENTE', 'COZINHEIRO'] },
    { rota: '/admin/pratos', icone: 'restaurant_menu', rotulo: 'Pratos e fichas', perfis: GESTAO },
    { rota: '/admin/categorias', icone: 'category', rotulo: 'Categorias', perfis: GESTAO },
    { rota: '/admin/ingredientes', icone: 'nutrition', rotulo: 'Ingredientes', perfis: GESTAO },
    { rota: '/admin/estoque', icone: 'inventory_2', rotulo: 'Estoque', perfis: GESTAO, alerta: true },
    { rota: '/admin/fornecedores', icone: 'local_shipping', rotulo: 'Fornecedores', perfis: GESTAO },
    { rota: '/admin/cotacao', icone: 'compare_arrows', rotulo: 'Cotação', perfis: GESTAO },
    { rota: '/admin/compras', icone: 'shopping_cart', rotulo: 'Compras', perfis: GESTAO },
    { rota: '/admin/usuarios', icone: 'group', rotulo: 'Usuários', perfis: ['ADMIN'] },
  ];

  menu = computed(() => this.itens.filter((i) => this.auth.temPerfil(...i.perfis)));
  nomePerfil = computed(() => PERFIS.find((p) => p.valor === this.auth.perfil())?.label ?? '');

  ngOnInit(): void {
    // RF-032: badge vermelho no menu com a quantidade de ingredientes abaixo do mínimo
    if (this.auth.temPerfil(...GESTAO)) {
      const navegou = this.router.events.pipe(filter((e) => e instanceof NavigationEnd));
      interval(60000)
        .pipe(
          startWith(0),
          switchMap(() => this.api.alertas({ size: 1 }, true)),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe({ next: (p) => this.alertas.set(p.totalElements), error: () => undefined });
      navegou
        .pipe(switchMap(() => this.api.alertas({ size: 1 }, true)), takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: (p) => this.alertas.set(p.totalElements), error: () => undefined });
    }
  }
}
