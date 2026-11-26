package br.unasp.comanda.security;

import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/** Atalho para obter o usuário logado na requisição atual. */
public final class SecurityUtils {

    private SecurityUtils() {
    }

    public static UsuarioPrincipal usuarioLogado() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UsuarioPrincipal principal) {
            return principal;
        }
        throw new AuthenticationCredentialsNotFoundException("Usuário não autenticado");
    }
}
