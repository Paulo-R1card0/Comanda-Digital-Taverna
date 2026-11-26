import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ACAO_PROXIMO_STATUS, FORMAS_PAGAMENTO, PROXIMO_STATUS, STATUS_PEDIDO } from '../core/labels';
import { Pedido } from '../core/models';
import { NotificacaoService } from '../core/notificacao.service';
import { MotivoDialog } from '../shared/dialogs';
import { StatusPedidoChip } from '../shared/status-chip';

/** RF-020: detalhe do pedido com itens, cliente, valores e linha do tempo. RF-018: cancelamento com motivo. */
@Component({
  selector: 'app-pedido-detalhe',
  imports: [CurrencyPipe, DatePipe, RouterLink, MatButtonModule, MatIconModule, StatusPedidoChip],
  template: `
    <a mat-button routerLink="/admin/pedidos"><mat-icon>arrow_back</mat-icon>Pedidos</a>
    @if (pedido(); as p) {
      <div class="cabecalho-pagina mt">
        <div>
          <h1>Pedido #{{ p.id }}</h1>
          <p>{{ p.createdAt | date: "dd/MM/yyyy 'às' HH:mm" }} · canal {{ p.canal }}</p>
        </div>
        <div class="linha">
          <app-status-pedido [status]="p.status" />
          @if (podeAvancar()) {
            <button mat-flat-button (click)="avancar(p)">{{ acao[p.status] }}</button>
          }
          @if (podeCancelar()) {
            <button mat-stroked-button (click)="cancelar(p)"><mat-icon>cancel</mat-icon>Cancelar</button>
          }
        </div>
      </div>

      <div class="grade">
        <div class="cartao">
          <h2>Itens</h2>
          <table class="itens">
            <thead><tr><th>Prato</th><th class="num">Qtd</th><th class="num">Unitário</th><th class="num">Subtotal</th></tr></thead>
            <tbody>
              @for (i of p.itens; track i.id) {
                <tr>
                  <td>{{ i.pratoNome }} @if (i.observacoes) { <div class="obs"><mat-icon inline>sticky_note_2</mat-icon> {{ i.observacoes }}</div> }</td>
                  <td class="num">{{ i.quantidade }}</td>
                  <td class="num">{{ i.precoUnitario | currency }}</td>
                  <td class="num">{{ i.subtotal | currency }}</td>
                </tr>
              }
            </tbody>
            <tfoot><tr><th colspan="3">Total</th><th class="num">{{ p.valorTotal | currency }}</th></tr></tfoot>
          </table>
          @if (p.observacoes) { <p class="obs-geral"><strong>Observações do pedido:</strong> {{ p.observacoes }}</p> }
          @if (p.motivoCancelamento) { <p class="cancelado"><strong>Motivo do cancelamento:</strong> {{ p.motivoCancelamento }}</p> }
        </div>

        <div class="lateral">
          <div class="cartao">
            <h2>Cliente</h2>
            <p><strong>{{ p.clienteNome }}</strong></p>
            <p class="texto-suave"><mat-icon inline>mail</mat-icon> {{ p.clienteEmail }}</p>
            <p class="texto-suave"><mat-icon inline>call</mat-icon> {{ p.clienteTelefone || '-' }}</p>
            <p class="texto-suave"><mat-icon inline>location_on</mat-icon> {{ p.enderecoEntrega }}</p>
            <p class="texto-suave"><mat-icon inline>payments</mat-icon> {{ formaPagamento(p.formaPagamento) }} · {{ p.pago ? 'pago' : 'pendente' }}</p>
          </div>
          <div class="cartao mt">
            <h2>Linha do tempo</h2>
            <ol class="timeline">
              @for (h of p.historico; track $index) {
                <li>
                  <mat-icon>{{ status[h.status].icon }}</mat-icon>
                  <div>
                    <strong>{{ status[h.status].label }}</strong>
                    <div class="texto-suave">{{ h.data | date: 'dd/MM HH:mm' }}{{ h.usuarioNome ? ' · ' + h.usuarioNome : '' }}</div>
                  </div>
                </li>
              }
            </ol>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .grade { display: grid; grid-template-columns: 1.5fr 1fr; gap: 16px; align-items: start; }
    .itens { width: 100%; border-collapse: collapse; margin-top: 8px; }
    .itens th, .itens td { padding: 10px 8px; border-bottom: 1px solid var(--cd-borda); text-align: left; vertical-align: top; }
    .itens .num { text-align: right; white-space: nowrap; }
    .obs { color: var(--cd-alerta); font-size: 0.85rem; margin-top: 4px; }
    .obs-geral { margin-top: 16px; }
    .cancelado { margin-top: 16px; color: var(--cd-erro); }
    .lateral p { margin: 6px 0; }
    .timeline { list-style: none; padding: 0; margin: 8px 0 0; }
    .timeline li { display: flex; gap: 10px; padding: 8px 0; border-left: 3px solid var(--cd-borda); padding-left: 12px; }
    .timeline mat-icon { color: var(--cd-brasa); }
    @media (max-width: 900px) { .grade { grid-template-columns: 1fr; } }
  `,
})
export class PedidoDetalhe implements OnInit {
  id = input.required<string>();

  private api = inject(ApiService);
  private auth = inject(AuthService);
  private dialog = inject(MatDialog);
  private notificacao = inject(NotificacaoService);

  pedido = signal<Pedido | null>(null);
  status = STATUS_PEDIDO;
  acao = ACAO_PROXIMO_STATUS as Record<string, string>;

  ngOnInit(): void {
    this.carregar();
  }

  podeAvancar(): boolean {
    const s = this.pedido()?.status;
    if (!s || !PROXIMO_STATUS[s]) return false;
    if (this.auth.perfil() === 'COZINHEIRO') return s === 'CONFIRMADO' || s === 'EM_PREPARO';
    return true;
  }

  /** RN04: o cancelamento pelo painel é do GERENTE ou ADMIN (o back valida a regra completa). */
  podeCancelar(): boolean {
    const s = this.pedido()?.status;
    return !!s && s !== 'FINALIZADO' && s !== 'CANCELADO' && this.auth.temPerfil('ADMIN', 'GERENTE');
  }

  avancar(p: Pedido): void {
    const proximo = PROXIMO_STATUS[p.status]!;
    this.api.alterarStatusPedido(p.id, proximo).subscribe((atualizado) => {
      this.pedido.set(atualizado);
      this.notificacao.sucesso(`Status alterado para ${STATUS_PEDIDO[proximo].label}`
        + (proximo === 'CONFIRMADO' ? '. Estoque baixado automaticamente.' : ''));
    });
  }

  cancelar(p: Pedido): void {
    const jaBaixou = p.status !== 'RECEBIDO';
    this.dialog
      .open(MotivoDialog, {
        data: {
          titulo: `Cancelar pedido #${p.id}?`,
          mensagem: jaBaixou ? 'Os ingredientes já baixados voltam para o estoque (estorno).' : 'Informe o motivo do cancelamento.',
          confirmar: 'Cancelar pedido',
        },
      })
      .afterClosed()
      .subscribe((motivo?: string) => {
        if (!motivo) return;
        this.api.cancelarPedido(p.id, motivo).subscribe((atualizado) => {
          this.pedido.set(atualizado);
          this.notificacao.sucesso('Pedido cancelado' + (jaBaixou ? ' e estoque estornado' : ''));
        });
      });
  }

  formaPagamento(f: string): string {
    return FORMAS_PAGAMENTO.find((x) => x.valor === f)?.label ?? f;
  }

  private carregar(): void {
    this.api.pedido(Number(this.id())).subscribe((p) => this.pedido.set(p));
  }
}
