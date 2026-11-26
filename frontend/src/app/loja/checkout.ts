import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { CarrinhoService } from '../core/carrinho.service';
import { FORMAS_PAGAMENTO } from '../core/labels';
import { ApiError } from '../core/models';
import { NotificacaoService } from '../core/notificacao.service';

/** RF-006: resumo do carrinho + endereço + pagamento simulado + "Confirmar pedido". */
@Component({
  selector: 'app-checkout',
  imports: [CurrencyPipe, ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatIconModule, MatRadioModule],
  template: `
    <div class="conteudo">
      <div class="cabecalho-pagina">
        <div>
          <h1>Finalizar pedido</h1>
          <p>Confira tudo antes de confirmar.</p>
        </div>
        <a mat-button routerLink="/carrinho"><mat-icon>arrow_back</mat-icon>Voltar ao carrinho</a>
      </div>

      @if (carrinho.vazio()) {
        <div class="cartao vazio">
          <mat-icon>shopping_bag</mat-icon><p>Seu carrinho está vazio.</p>
          <a mat-flat-button routerLink="/">Ver cardápio</a>
        </div>
      } @else {
        <div class="layout">
          <form class="cartao" [formGroup]="form">
            <h2><mat-icon>location_on</mat-icon>Entrega</h2>
            <mat-form-field class="largura-total">
              <mat-label>Endereço de entrega</mat-label>
              <textarea matInput formControlName="enderecoEntrega" rows="2"></textarea>
              <mat-error>Informe o endereço de entrega</mat-error>
            </mat-form-field>
            <mat-form-field class="largura-total">
              <mat-label>Observações para a cozinha ou entregador (opcional)</mat-label>
              <textarea matInput formControlName="observacoes" rows="2" maxlength="500"></textarea>
            </mat-form-field>

            <h2><mat-icon>payments</mat-icon>Pagamento</h2>
            <p class="texto-suave simulado">Pagamento simulado para fins acadêmicos: nenhuma cobrança real é feita.</p>
            <mat-radio-group formControlName="formaPagamento" class="formas">
              @for (f of formas; track f.valor) {
                <mat-radio-button [value]="f.valor">{{ f.label }}</mat-radio-button>
              }
            </mat-radio-group>

            @if (faltas().length) {
              <div class="faltas">
                <strong><mat-icon>inventory_2</mat-icon>Alguns ingredientes acabaram:</strong>
                <ul>@for (f of faltas(); track f) { <li>{{ f }}</li> }</ul>
                <span>Ajuste as quantidades no carrinho e tente novamente.</span>
              </div>
            }
          </form>

          <aside class="cartao resumo">
            <h2>Resumo</h2>
            @for (item of carrinho.itens(); track $index) {
              <div class="linha-resumo">
                <span>{{ item.quantidade }}x {{ item.prato.nome }}
                  @if (item.observacoes) { <small class="texto-suave">({{ item.observacoes }})</small> }
                </span>
                <span>{{ item.quantidade * item.prato.precoVenda | currency }}</span>
              </div>
            }
            <div class="linha-resumo"><span class="texto-suave">Taxa de entrega</span><span class="gratis">Grátis</span></div>
            <div class="total"><span>Total</span><strong>{{ carrinho.total() | currency }}</strong></div>
            <button mat-flat-button class="confirmar" (click)="confirmar()" [disabled]="enviando()">
              <mat-icon>check</mat-icon>{{ enviando() ? 'Enviando...' : 'Confirmar pedido' }}
            </button>
          </aside>
        </div>
      }
    </div>
  `,
  styles: `
    .layout { display: grid; grid-template-columns: 1.4fr 1fr; gap: 20px; align-items: start; }
    h2 { display: flex; align-items: center; gap: 8px; margin: 4px 0 14px; }
    h2 mat-icon { color: var(--cd-brasa); }
    .simulado { margin-top: -6px; font-size: 0.85rem; }
    .formas { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
    .resumo { position: sticky; top: 80px; }
    .linha-resumo { display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; border-bottom: 1px dashed var(--cd-borda); }
    .gratis { color: var(--cd-ok); font-weight: 600; }
    .total { display: flex; justify-content: space-between; align-items: center; padding: 14px 0; }
    .total strong { font-family: Outfit, sans-serif; font-size: 1.6rem; }
    .confirmar { width: 100%; height: 48px; }
    .faltas { margin-top: 16px; padding: 12px 14px; background: var(--cd-erro-bg); color: var(--cd-erro); border-radius: 10px; }
    .faltas strong { display: flex; align-items: center; gap: 6px; }
    @media (max-width: 860px) { .layout { grid-template-columns: 1fr; } .resumo { position: static; } }
  `,
})
export class Checkout implements OnInit {
  carrinho = inject(CarrinhoService);
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private notificacao = inject(NotificacaoService);
  private fb = inject(FormBuilder);

  formas = FORMAS_PAGAMENTO;
  enviando = signal(false);
  faltas = signal<string[]>([]);

  form = this.fb.nonNullable.group({
    enderecoEntrega: ['', [Validators.required, Validators.maxLength(255)]],
    observacoes: [''],
    formaPagamento: ['PIX'],
  });

  ngOnInit(): void {
    // Preenche com o endereço do cadastro do cliente
    this.auth.meusDados().subscribe((u) => {
      if (u?.endereco && !this.form.controls.enderecoEntrega.value) {
        this.form.patchValue({ enderecoEntrega: u.endereco });
      }
    });
  }

  confirmar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.faltas.set([]);
    const dados = {
      ...this.form.getRawValue(),
      itens: this.carrinho.itens().map((i) => ({
        pratoId: i.prato.id,
        quantidade: i.quantidade,
        observacoes: i.observacoes || null,
      })),
    };
    this.api.criarPedido(dados).subscribe({
      next: (pedido) => {
        this.carrinho.limpar();
        this.notificacao.sucesso(`Pedido #${pedido.id} confirmado!`);
        this.router.navigate(['/meus-pedidos', pedido.id], { queryParams: { novo: 1 } });
      },
      error: (err: HttpErrorResponse) => {
        this.enviando.set(false);
        // RN03: o back devolve 422 com a lista do que falta no estoque
        const api = err.error as ApiError | null;
        if (err.status === 422 && api?.detalhes?.length) {
          this.faltas.set(api.detalhes);
        }
      },
    });
  }
}
