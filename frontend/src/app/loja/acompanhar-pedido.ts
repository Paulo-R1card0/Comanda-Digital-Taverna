import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { filter, interval, startWith, switchMap } from 'rxjs';
import { ApiService } from '../core/api.service';
import { FLUXO_PEDIDO, FORMAS_PAGAMENTO, STATUS_PEDIDO } from '../core/labels';
import { Pedido, StatusPedido } from '../core/models';
import { NotificacaoService } from '../core/notificacao.service';
import { MotivoDialog } from '../shared/dialogs';
import { StatusPedidoChip } from '../shared/status-chip';

/** RF-007: acompanhamento do pedido com linha do tempo (atualiza sozinho a cada 10 s). */
@Component({
  selector: 'app-acompanhar-pedido',
  imports: [CurrencyPipe, DatePipe, RouterLink, MatButtonModule, MatIconModule, StatusPedidoChip],
  template: `
    <div class="conteudo estreito">
      <a mat-button routerLink="/meus-pedidos"><mat-icon>arrow_back</mat-icon>Meus pedidos</a>

      @if (pedido(); as p) {
        @if (novo()) {
          <div class="sucesso">
            <mat-icon>celebration</mat-icon>
            <div><strong>Pedido confirmado!</strong><br />A cozinha já recebeu e você pode acompanhar tudo por aqui.</div>
          </div>
        }

        <div class="cartao">
          <div class="cabecalho-pagina">
            <div>
              <h1>Pedido #{{ p.id }}</h1>
              <p>Feito em {{ p.createdAt | date: "dd/MM/yyyy 'às' HH:mm" }}</p>
            </div>
            <app-status-pedido [status]="p.status" />
          </div>

          @if (p.status === 'CANCELADO') {
            <div class="cancelado">
              <mat-icon>cancel</mat-icon>
              <div><strong>Pedido cancelado</strong><br />Motivo: {{ p.motivoCancelamento }}</div>
            </div>
          } @else {
            <ol class="timeline">
              @for (s of fluxo; track s; let i = $index) {
                <li [class.feito]="i <= indiceAtual()" [class.atual]="i === indiceAtual()">
                  <span class="bolinha"><mat-icon>{{ status[s].icon }}</mat-icon></span>
                  <span class="rotulo">{{ status[s].label }}</span>
                  <span class="hora">{{ horario(s) | date: 'HH:mm' }}</span>
                </li>
              }
            </ol>
            @if (p.status === 'FINALIZADO') {
              <p class="entregue"><mat-icon>task_alt</mat-icon>Pedido entregue. Bom apetite!</p>
            }
          }
        </div>

        <div class="cartao mt">
          <h2>Itens</h2>
          @for (item of p.itens; track item.id) {
            <div class="linha-item">
              <span>{{ item.quantidade }}x {{ item.pratoNome }}
                @if (item.observacoes) { <small class="texto-suave">({{ item.observacoes }})</small> }
              </span>
              <span>{{ item.subtotal | currency }}</span>
            </div>
          }
          <div class="linha-item total"><span>Total</span><strong>{{ p.valorTotal | currency }}</strong></div>
          <p class="texto-suave"><mat-icon inline>location_on</mat-icon> {{ p.enderecoEntrega }}</p>
          <p class="texto-suave"><mat-icon inline>payments</mat-icon> {{ formaPagamento(p.formaPagamento) }} · {{ p.pago ? 'pago' : 'pendente' }}</p>
          @if (p.status === 'RECEBIDO' || p.status === 'CONFIRMADO') {
            <button mat-stroked-button class="mt" (click)="cancelar(p)"><mat-icon>close</mat-icon>Cancelar pedido</button>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .estreito { max-width: 820px; }
    .sucesso, .cancelado { display: flex; gap: 12px; align-items: center; padding: 14px 16px; border-radius: var(--cd-raio); margin: 8px 0 16px; }
    .sucesso { background: var(--cd-ok-bg); color: #1e6b33; }
    .cancelado { background: var(--cd-erro-bg); color: var(--cd-erro); }
    .timeline { list-style: none; padding: 0; margin: 8px 0 0; display: grid; grid-template-columns: repeat(5, 1fr); position: relative; }
    .timeline li { display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; position: relative; color: #b3a69c; }
    .timeline li::before { content: ''; position: absolute; top: 22px; left: -50%; width: 100%; height: 4px; background: #eee3da; z-index: 0; }
    .timeline li:first-child::before { display: none; }
    .timeline li.feito::before { background: var(--cd-brasa); }
    .bolinha { width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; background: #f1ebe6; z-index: 1; }
    .feito { color: var(--mat-sys-on-surface); }
    .feito .bolinha { background: var(--cd-brasa); color: #fff; }
    .atual .bolinha { box-shadow: 0 0 0 6px #e8590c33; animation: pulso 1.6s infinite; }
    .rotulo { font-weight: 600; font-size: 0.85rem; }
    .hora { font-size: 0.78rem; min-height: 1em; }
    .entregue { display: flex; align-items: center; gap: 6px; color: var(--cd-ok); font-weight: 600; margin: 16px 0 0; }
    .linha-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed var(--cd-borda); }
    .linha-item.total { border: none; font-size: 1.1rem; }
    @keyframes pulso { 50% { box-shadow: 0 0 0 10px #e8590c11; } }
    @media (max-width: 560px) {
      .timeline { grid-template-columns: 1fr; gap: 10px; }
      .timeline li { flex-direction: row; text-align: left; }
      .timeline li::before { display: none; }
    }
  `,
})
export class AcompanharPedido implements OnInit {
  id = input.required<string>();
  novo = input<string | undefined>();

  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private notificacao = inject(NotificacaoService);
  private destroyRef = inject(DestroyRef);

  fluxo = FLUXO_PEDIDO;
  status = STATUS_PEDIDO;
  pedido = signal<Pedido | null>(null);
  indiceAtual = computed(() => {
    const st = this.pedido()?.status;
    if (st === 'FINALIZADO') return this.fluxo.length;
    return st ? this.fluxo.indexOf(st) : -1;
  });

  ngOnInit(): void {
    // Atualiza o status a cada 10 segundos enquanto o pedido não terminar
    interval(10000)
      .pipe(
        startWith(0),
        filter(() => !this.encerrado()),
        switchMap((n) => this.api.meuPedido(Number(this.id()), n > 0)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((p) => this.pedido.set(p));
  }

  horario(s: StatusPedido): string | null {
    return this.pedido()?.historico.find((h) => h.status === s)?.data ?? null;
  }

  formaPagamento(f: string): string {
    return FORMAS_PAGAMENTO.find((x) => x.valor === f)?.label ?? f;
  }

  cancelar(p: Pedido): void {
    this.dialog
      .open(MotivoDialog, { data: { titulo: `Cancelar pedido #${p.id}?`, mensagem: 'Conte para a gente o motivo.', confirmar: 'Cancelar pedido' } })
      .afterClosed()
      .subscribe((motivo?: string) => {
        if (!motivo) return;
        this.api.cancelarMeuPedido(p.id, motivo).subscribe((atualizado) => {
          this.pedido.set(atualizado);
          this.notificacao.sucesso('Pedido cancelado');
        });
      });
  }

  private encerrado(): boolean {
    const st = this.pedido()?.status;
    return st === 'FINALIZADO' || st === 'CANCELADO';
  }
}
