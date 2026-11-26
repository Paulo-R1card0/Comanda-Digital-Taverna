package br.unasp.comanda.controller;

import br.unasp.comanda.dto.AuthDto;
import br.unasp.comanda.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "1. Autenticação", description = "Login e cadastro público de clientes")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    @Operation(summary = "Login (todos os perfis). Retorna JWT com o perfil no payload")
    public AuthDto.TokenResponse login(@Valid @RequestBody AuthDto.LoginRequest req) {
        return authService.login(req);
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Cadastro público: cria uma conta com perfil CLIENTE e já devolve o JWT")
    public AuthDto.TokenResponse registrar(@Valid @RequestBody AuthDto.RegisterRequest req) {
        return authService.registrar(req);
    }

    @GetMapping("/me")
    @Operation(summary = "Dados do usuário logado")
    public AuthDto.UsuarioLogado me() {
        return authService.meusDados();
    }
}
