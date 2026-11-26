import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { ApiError } from './models';
import { LoadingService, NotificacaoService } from './notificacao.service';

/** Marque uma requisição com este token para ela não exibir a barra de loading (ex.: atualização automática). */
export const SEM_LOADING = new HttpContextToken<boolean>(() => false);

/** Marque uma requisição com este token para o erro não virar toast (a tela trata o erro sozinha). */
export const SEM_TOAST_ERRO = new HttpContextToken<boolean>(() => false);

/**
 * RF-042: coloca "Authorization: Bearer <token>" em toda requisição
 * e, se o back responder 401, desloga e manda para o login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token;
  const autenticada = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(autenticada).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !req.url.endsWith('/auth/login')) {
        auth.logout(false);
        router.navigate(['/login'], { queryParams: { returnUrl: router.url, expirado: 1 } });
      }
      return throwError(() => err);
    }),
  );
};

/** Barra de progresso global enquanto houver requisições em andamento. */
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(SEM_LOADING)) {
    return next(req);
  }
  const loading = inject(LoadingService);
  loading.iniciar();
  return next(req).pipe(finalize(() => loading.terminar()));
};

/** Mostra um toast com a mensagem de erro padronizada do back-end (ApiError). */
export const erroInterceptor: HttpInterceptorFn = (req, next) => {
  const notificacao = inject(NotificacaoService);
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (!req.context.get(SEM_TOAST_ERRO) && (err.status !== 401 || req.url.endsWith('/auth/login'))) {
        notificacao.erro(mensagemDeErro(err));
      }
      return throwError(() => err);
    }),
  );
};

export function mensagemDeErro(err: HttpErrorResponse): string {
  if (err.status === 0) {
    return 'Não foi possível falar com o servidor. Se ele estava parado, aguarde alguns segundos e tente de novo.';
  }
  const api = err.error as ApiError | null;
  if (api?.mensagem) {
    return api.detalhes?.length ? `${api.mensagem}: ${api.detalhes.join(' | ')}` : api.mensagem;
  }
  return `Erro ${err.status}: ${err.statusText || 'falha na requisição'}`;
}
