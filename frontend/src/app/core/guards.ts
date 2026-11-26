import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Perfil } from './models';
import { NotificacaoService } from './notificacao.service';

/** AuthGuard (RF-043): só deixa entrar quem está logado. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.logado()) {
    return true;
  }
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/**
 * RoleGuard (RF-043): exige um dos perfis definidos em data.perfis da rota.
 * Ex.: cliente não acessa o admin; cozinheiro não acessa fornecedores.
 */
export const roleGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const notificacao = inject(NotificacaoService);
  const perfis = (route.data['perfis'] ?? []) as Perfil[];

  if (!auth.logado()) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }
  if (perfis.length === 0 || auth.temPerfil(...perfis)) {
    return true;
  }
  notificacao.erro('Você não tem permissão para acessar esta página');
  return router.createUrlTree([auth.rotaInicial()]);
};
