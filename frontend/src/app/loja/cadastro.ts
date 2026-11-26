import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { NotificacaoService } from '../core/notificacao.service';

/** RF-004: cadastro do cliente (nome, email, senha, telefone e endereço). */
@Component({
  selector: 'app-cadastro',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <div class="conteudo centro">
      <form class="cartao formulario" [formGroup]="form" (ngSubmit)="cadastrar()">
        <h1>Criar conta</h1>
        <p class="texto-suave">É rapidinho: só precisamos saber para onde entregar.</p>

        <mat-form-field>
          <mat-label>Nome completo</mat-label>
          <input matInput formControlName="nome" autocomplete="name" />
          <mat-error>Informe seu nome</mat-error>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Email</mat-label>
          <input matInput formControlName="email" type="email" autocomplete="email" />
          <mat-error>Informe um email válido</mat-error>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Senha</mat-label>
          <input matInput formControlName="senha" type="password" autocomplete="new-password" />
          <mat-hint>Mínimo de 6 caracteres</mat-hint>
          <mat-error>A senha precisa ter pelo menos 6 caracteres</mat-error>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Telefone</mat-label>
          <input matInput formControlName="telefone" type="tel" autocomplete="tel" placeholder="(11) 99999-9999" />
          <mat-error>Informe seu telefone</mat-error>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Endereço de entrega</mat-label>
          <textarea matInput formControlName="endereco" rows="2" autocomplete="street-address"
                    placeholder="Rua, número, complemento, bairro, cidade"></textarea>
          <mat-error>Informe o endereço de entrega</mat-error>
        </mat-form-field>

        <button mat-flat-button type="submit" [disabled]="enviando()">
          {{ enviando() ? 'Criando conta...' : 'Criar conta' }}
        </button>
        <p class="texto-suave rodape">
          Já tem conta? <a routerLink="/login" [queryParams]="{ returnUrl: returnUrl() }">Entrar</a>
        </p>
      </form>
    </div>
  `,
  styles: `
    .centro { display: flex; justify-content: center; }
    .formulario { width: 100%; max-width: 480px; display: flex; flex-direction: column; gap: 4px; margin-top: 24px; }
    button[type=submit] { height: 46px; margin-top: 8px; }
    .rodape { text-align: center; margin-top: 16px; }
  `,
})
export class Cadastro {
  returnUrl = input<string | undefined>();

  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private notificacao = inject(NotificacaoService);

  enviando = signal(false);

  form = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required, Validators.minLength(6)]],
    telefone: ['', [Validators.required, Validators.maxLength(20)]],
    endereco: ['', [Validators.required, Validators.maxLength(255)]],
  });

  cadastrar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.auth.cadastrar(this.form.getRawValue()).subscribe({
      next: () => {
        this.notificacao.sucesso('Conta criada! Bem-vindo(a) à Taverna da Brasa.');
        const destino = this.returnUrl();
        this.router.navigateByUrl(destino && !destino.startsWith('/admin') ? destino : '/');
      },
      error: () => this.enviando.set(false),
    });
  }
}
