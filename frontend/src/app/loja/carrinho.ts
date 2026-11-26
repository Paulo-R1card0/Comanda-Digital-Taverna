import { CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { CarrinhoService } from '../core/carrinho.service';

/** RF-003: carrinho com quantidade, observações, subtotal por item e total geral. */
@Component({
  selector: 'app-carrinho',
  imports: [CurrencyPipe, FormsModule, RouterLink, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule],
  template: `
    <div class="conteudo estreito">
      <div class="cabecalho-pagina">
        <div>
          <h1>Seu carrinho</h1>
          <p>{{ carrinho.quantidadeTotal() }} {{ carrinho.quantidadeTotal() === 1 ? 'item' : 'itens' }}</p>
        </div>
        <a mat-button routerLink="/"><mat-icon>add</mat-icon>Adicionar mais pratos</a>
      </div>

      @if (carrinho.vazio()) {
        <div class="cartao vazio">
          <mat-icon>shopping_bag</mat-icon>
          <p>Seu carrinho está vazio.</p>
          <a mat-flat-button routerLink="/">Ver cardápio</a>
        </div>
      } @else {
        <div class="cartao">
          @for (item of carrinho.itens(); track $index; let i = $index) {
            <div class="item">
              <div class="item-topo">
                <div>
                  <strong>{{ item.prato.nome }}</strong>
                  <div class="texto-suave">{{ item.prato.precoVenda | currency }} cada</div>
                </div>
                <div class="quantidade">
                  <button mat-icon-button (click)="carrinho.alterarQuantidade(i, item.quantidade - 1)" aria-label="Diminuir">
                    <mat-icon>{{ item.quantidade === 1 ? 'delete' : 'remove' }}</mat-icon>
                  </button>
                  <strong>{{ item.quantidade }}</strong>
                  <button mat-icon-button (click)="carrinho.alterarQuantidade(i, item.quantidade + 1)" aria-label="Aumentar">
                    <mat-icon>add</mat-icon>
                  </button>
                </div>
                <div class="subtotal">{{ item.quantidade * item.prato.precoVenda | currency }}</div>
                <button mat-icon-button (click)="carrinho.remover(i)" aria-label="Remover item">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
              <mat-form-field class="largura-total obs" subscriptSizing="dynamic">
                <mat-label>Observações</mat-label>
                <input matInput [ngModel]="item.observacoes" (ngModelChange)="carrinho.alterarObservacoes(i, $event)"
                       maxlength="255" placeholder="Ex.: sem cebola" />
              </mat-form-field>
            </div>
          }
          <div class="total">
            <span>Total</span>
            <strong>{{ carrinho.total() | currency }}</strong>
          </div>
          <button mat-flat-button class="finalizar" (click)="finalizar()">
            <mat-icon>arrow_forward</mat-icon>Finalizar pedido
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .estreito { max-width: 760px; }
    .item { padding: 12px 0; border-bottom: 1px solid var(--cd-borda); }
    .item-topo { display: grid; grid-template-columns: 1fr auto 100px auto; align-items: center; gap: 8px; }
    .quantidade { display: flex; align-items: center; gap: 4px; }
    .quantidade strong { min-width: 20px; text-align: center; }
    .subtotal { text-align: right; font-weight: 600; }
    .obs { margin-top: 6px; }
    .total { display: flex; justify-content: space-between; align-items: center; padding: 16px 0; font-size: 1.2rem; }
    .total strong { font-family: Outfit, sans-serif; font-size: 1.6rem; }
    .finalizar { width: 100%; height: 48px; }
    @media (max-width: 520px) {
      .item-topo { grid-template-columns: 1fr auto; }
      .subtotal { grid-column: 1; text-align: left; }
    }
  `,
})
export class Carrinho {
  carrinho = inject(CarrinhoService);
  private auth = inject(AuthService);
  private router = inject(Router);

  /** Se não estiver logado como cliente, vai para o login e volta para o checkout depois (RF-005). */
  finalizar(): void {
    if (this.auth.ehCliente()) {
      this.router.navigateByUrl('/checkout');
    } else {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/checkout' } });
    }
  }
}
