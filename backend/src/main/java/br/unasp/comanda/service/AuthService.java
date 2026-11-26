package br.unasp.comanda.service;

import br.unasp.comanda.dto.AuthDto;
import br.unasp.comanda.exception.ConflitoException;
import br.unasp.comanda.model.Usuario;
import br.unasp.comanda.model.enums.Perfil;
import br.unasp.comanda.model.enums.StatusRegistro;
import br.unasp.comanda.repository.UsuarioRepository;
import br.unasp.comanda.security.JwtService;
import br.unasp.comanda.security.SecurityUtils;
import br.unasp.comanda.security.UsuarioPrincipal;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/** Login e cadastro público (RF-004, RF-005, RF-038, RF-039, RN10). */
@Service
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional(readOnly = true)
    public AuthDto.TokenResponse login(AuthDto.LoginRequest req) {
        Usuario usuario = usuarioRepository.findByEmailIgnoreCase(req.email().trim())
                .filter(u -> passwordEncoder.matches(req.senha(), u.getSenhaHash()))
                .orElseThrow(() -> new BadCredentialsException("Credenciais inválidas"));
        if (usuario.getStatus() != StatusRegistro.ATIVO) {
            throw new BadCredentialsException("Usuário inativo");
        }
        return gerarResposta(usuario);
    }

    /** Cadastro público: sempre cria o perfil CLIENTE. Os outros perfis só o ADMIN cria. */
    @Transactional
    public AuthDto.TokenResponse registrar(AuthDto.RegisterRequest req) {
        String email = req.email().trim().toLowerCase();
        if (usuarioRepository.existsByEmailIgnoreCase(email)) {
            throw new ConflitoException("Já existe uma conta com este email"); // RN10 -> 409
        }
        Usuario usuario = new Usuario();
        usuario.setNome(req.nome().trim());
        usuario.setEmail(email);
        usuario.setSenhaHash(passwordEncoder.encode(req.senha())); // RNF01: BCrypt
        usuario.setPerfil(Perfil.CLIENTE);
        usuario.setTelefone(req.telefone());
        usuario.setEndereco(req.endereco());
        usuario.setStatus(StatusRegistro.ATIVO);
        usuarioRepository.save(usuario);
        return gerarResposta(usuario);
    }

    @Transactional(readOnly = true)
    public AuthDto.UsuarioLogado meusDados() {
        UsuarioPrincipal principal = SecurityUtils.usuarioLogado();
        Usuario usuario = usuarioRepository.findById(principal.getId())
                .orElseThrow(() -> new BadCredentialsException("Usuário não encontrado"));
        return toUsuarioLogado(usuario);
    }

    private AuthDto.TokenResponse gerarResposta(Usuario usuario) {
        UsuarioPrincipal principal = new UsuarioPrincipal(usuario);
        String token = jwtService.gerarToken(principal);
        Instant expira = jwtService.calcularExpiracao(Instant.now());
        return new AuthDto.TokenResponse(token, "Bearer", expira, toUsuarioLogado(usuario));
    }

    private AuthDto.UsuarioLogado toUsuarioLogado(Usuario u) {
        return new AuthDto.UsuarioLogado(u.getId(), u.getNome(), u.getEmail(), u.getPerfil(), u.getTelefone(), u.getEndereco());
    }
}
