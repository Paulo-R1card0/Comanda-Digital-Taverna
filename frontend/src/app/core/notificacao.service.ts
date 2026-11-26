import { Injectable, inject, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

/** Toasts de sucesso/erro (RNF10). */
@Injectable({ providedIn: 'root' })
export class NotificacaoService {
  private snack = inject(MatSnackBar);

  sucesso(msg: string): void {
    this.snack.open(msg, 'OK', { duration: 3500, panelClass: 'toast-sucesso' });
  }

  erro(msg: string): void {
    this.snack.open(msg, 'Fechar', { duration: 7000, panelClass: 'toast-erro' });
  }

  aviso(msg: string): void {
    this.snack.open(msg, 'OK', { duration: 6000, panelClass: 'toast-aviso' });
  }
}

/** Contador de requisições em andamento: mostra a barra de progresso global (RNF10). */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private emAndamento = signal(0);
  readonly carregando = () => this.emAndamento() > 0;

  iniciar(): void {
    this.emAndamento.update((n) => n + 1);
  }

  terminar(): void {
    this.emAndamento.update((n) => Math.max(0, n - 1));
  }
}
