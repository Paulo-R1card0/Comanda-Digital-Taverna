package br.unasp.comanda.config;

import br.unasp.comanda.exception.ApiError;
import br.unasp.comanda.security.JwtAuthenticationFilter;
import br.unasp.comanda.security.JwtService;
import br.unasp.comanda.security.UsuarioDetailsService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.io.IOException;

/**
 * Configuração de segurança:
 * - API stateless com JWT (sem sessão, sem CSRF);
 * - rotas públicas: login, cadastro, cardápio, Swagger e health check;
 * - /api/admin/** só para perfis internos (o controle fino fica no @PreAuthorize de cada endpoint).
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtService jwtService;
    private final UsuarioDetailsService usuarioDetailsService;
    private final ObjectMapper objectMapper;

    public SecurityConfig(JwtService jwtService, UsuarioDetailsService usuarioDetailsService, ObjectMapper objectMapper) {
        this.jwtService = jwtService;
        this.usuarioDetailsService = usuarioDetailsService;
        this.objectMapper = objectMapper;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/login", "/api/auth/register").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/cardapio", "/api/cardapio/**").permitAll()
                        .requestMatchers("/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**").permitAll()
                        .requestMatchers("/actuator/health", "/error", "/").permitAll()
                        .requestMatchers("/api/admin/**").hasAnyRole("ADMIN", "GERENTE", "COZINHEIRO")
                        .anyRequest().authenticated())
                .exceptionHandling(e -> e
                        .authenticationEntryPoint((req, res, ex) ->
                                escreverErro(req, res, HttpStatus.UNAUTHORIZED, "Autenticação necessária ou token expirado"))
                        .accessDeniedHandler((req, res, ex) ->
                                escreverErro(req, res, HttpStatus.FORBIDDEN, "Você não tem permissão para acessar este recurso")))
                .addFilterBefore(new JwtAuthenticationFilter(jwtService, usuarioDetailsService),
                        UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    private void escreverErro(HttpServletRequest req, HttpServletResponse res, HttpStatus status, String mensagem)
            throws IOException {
        res.setStatus(status.value());
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        res.setCharacterEncoding("UTF-8");
        ApiError erro = ApiError.of(status.value(), status.getReasonPhrase(), mensagem, req.getRequestURI(), null);
        objectMapper.writeValue(res.getOutputStream(), erro);
    }
}
