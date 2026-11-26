import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { NotificacaoService } from '../core/notificacao.service';

/** RF-005 / RF-038: login único para clientes e equipe. */
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule],
  template: `
    <div class="conteudo centro">
      <form class="cartao formulario" [formGroup]="form" (ngSubmit)="entrar()">
        <h1>Entrar</h1>
        @if (expirado()) {
          <p class="aviso">Sua sessão expirou. Entre novamente.</p>
        } @else if (returnUrl() === '/checkout') {
          <p class="texto-suave">Entre ou crie sua conta para finalizar o pedido.</p>
        }

        <mat-form-field>
          <mat-label>Email</mat-label>
          <input matInput formControlName="email" type="email" autocomplete="email" />
          <mat-error>Informe um email válido</mat-error>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Senha</mat-label>
          <input matInput formControlName="senha" [type]="mostrarSenha() ? 'text' : 'password'" autocomplete="current-password" />
          <button mat-icon-button matSuffix type="button" (click)="mostrarSenha.set(!mostrarSenha())" aria-label="Mostrar senha">
            <mat-icon>{{ mostrarSenha() ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
          <mat-error>Informe a senha</mat-error>
        </mat-form-field>

        <button mat-flat-button type="submit" [disabled]="enviando()">
          {{ enviando() ? 'Entrando...' : 'Entrar' }}
        </button>
        <p class="texto-suave rodape">
          Ainda não tem conta?
          <a routerLink="/cadastro" [queryParams]="{ returnUrl: returnUrl() }">Cadastre-se</a>
        </p>
      </form>
    </div>
  `,
  styles: `
    .centro { display: flex; justify-content: center; }
    .formulario { width: 100%; max-width: 420px; display: flex; flex-direction: column; gap: 4px; margin-top: 24px; }
    h1 { margin-bottom: 12px; }
    .aviso { background: var(--cd-alerta-bg); color: var(--cd-alerta); padding: 8px 12px; border-radius: 8px; }
    button[type=submit] { height: 46px; margin-top: 8px; }
    .rodape { text-align: center; margin-top: 16px; }
  `,
})
export class Login {
  returnUrl = input<string | undefined>(); // query param ?returnUrl=
  expirado = input<string | undefined>();

  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private notificacao = inject(NotificacaoService);

  mostrarSenha = signal(false);
  enviando = signal(false);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', Validators.required],
  });

  entrar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    const { email, senha } = this.form.getRawValue();
    this.auth.login(email, senha).subscribe({
      next: (r) => {
        this.notificacao.sucesso(`Olá, ${r.usuario.nome.split(' ')[0]}!`);
        const destino = this.returnUrl();
        // Cliente volta para onde estava (ex.: checkout); equipe vai para o painel
        if (destino && (this.auth.ehCliente() ? !destino.startsWith('/admin') : destino.startsWith('/admin'))) {
          this.router.navigateByUrl(destino);
        } else {
          this.router.navigateByUrl(this.auth.rotaInicial());
        }
      },
      error: () => this.enviando.set(false),
    });
  }
}
