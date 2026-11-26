package br.unasp.comanda.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;

/**
 * Geração e validação de tokens JWT (RNF02).
 * A chave vem da variável de ambiente JWT_SECRET (mínimo 32 caracteres) e o token expira em 8h.
 */
@Service
public class JwtService {

    private final SecretKey chave;
    private final long expiracaoHoras;

    public JwtService(@Value("${app.jwt.secret}") String segredo,
                      @Value("${app.jwt.expiracao-horas:8}") long expiracaoHoras) {
        if (segredo == null || segredo.length() < 32) {
            throw new IllegalStateException("A variável JWT_SECRET precisa ter pelo menos 32 caracteres");
        }
        this.chave = Keys.hmacShaKeyFor(segredo.getBytes(StandardCharsets.UTF_8));
        this.expiracaoHoras = expiracaoHoras;
    }

    public String gerarToken(UsuarioPrincipal usuario) {
        Instant agora = Instant.now();
        return Jwts.builder()
                .subject(usuario.getUsername())
                .claim("id", usuario.getId())
                .claim("nome", usuario.getNome())
                .claim("perfil", usuario.getPerfil().name())
                .issuedAt(Date.from(agora))
                .expiration(Date.from(calcularExpiracao(agora)))
                .signWith(chave)
                .compact();
    }

    public Instant calcularExpiracao(Instant base) {
        return base.plusSeconds(expiracaoHoras * 3600);
    }

    /** Retorna o email (subject) se o token for válido e não estiver expirado. */
    public Optional<String> extrairEmail(String token) {
        try {
            Claims claims = Jwts.parser().verifyWith(chave).build().parseSignedClaims(token).getPayload();
            return Optional.ofNullable(claims.getSubject());
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
