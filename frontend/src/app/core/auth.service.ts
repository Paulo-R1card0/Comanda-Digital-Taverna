import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Perfil, TokenResponse, UsuarioLogado } from './models';

const CHAVE = 'comanda.sessao';

interface Sessao {
  token: string;
  expiraEm: string;
  usuario: UsuarioLogado;
}

/** Guarda o JWT e os dados do usuário logado (no localStorage, para sobreviver ao F5). */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private sessao = signal<Sessao | null>(this.carregar());

  readonly usuario = computed(() => this.sessao()?.usuario ?? null);
  readonly logado = computed(() => this.sessao() !== null);
  readonly perfil = computed(() => this.usuario()?.perfil ?? null);
  readonly ehCliente = computed(() => this.perfil() === 'CLIENTE');
  readonly ehInterno = computed(() => this.logado() && !this.ehCliente());

  get token(): string | null {
    return this.sessao()?.token ?? null;
  }

  login(email: string, senha: string): Observable<TokenResponse> {
    return this.http
      .post<TokenResponse>(`${environment.apiUrl}/auth/login`, { email, senha })
      .pipe(tap((r) => this.salvar(r)));
  }

  cadastrar(dados: { nome: string; email: string; senha: string; telefone: string; endereco: string }) {
    return this.http
      .post<TokenResponse>(`${environment.apiUrl}/auth/register`, dados)
      .pipe(tap((r) => this.salvar(r)));
  }

  meusDados() {
    return this.http.get<UsuarioLogado>(`${environment.apiUrl}/auth/me`);
  }

  temPerfil(...perfis: Perfil[]): boolean {
    const p = this.perfil();
    return p !== null && perfis.includes(p);
  }

  /** Para onde levar o usuário depois do login, conforme o perfil. */
  rotaInicial(): string {
    switch (this.perfil()) {
      case 'ADMIN':
      case 'GERENTE':
        return '/admin/dashboard';
      case 'COZINHEIRO':
        return '/admin/pedidos';
      default:
        return '/';
    }
  }

  logout(redirecionar = true): void {
    this.sessao.set(null);
    try {
      localStorage.removeItem(CHAVE);
    } catch {
      /* armazenamento indisponível */
    }
    if (redirecionar) {
      this.router.navigateByUrl('/login');
    }
  }

  private salvar(r: TokenResponse): void {
    const s: Sessao = { token: r.token, expiraEm: r.expiraEm, usuario: r.usuario };
    try {
      localStorage.setItem(CHAVE, JSON.stringify(s));
    } catch {
      /* armazenamento indisponível: a sessão vale só enquanto a página estiver aberta */
    }
    this.sessao.set(s);
  }

  private carregar(): Sessao | null {
    try {
      const bruto = localStorage.getItem(CHAVE);
      if (!bruto) return null;
      const s = JSON.parse(bruto) as Sessao;
      if (new Date(s.expiraEm).getTime() < Date.now()) {
        return null;
      }
      return s;
    } catch {
      return null;
    }
  }
}
