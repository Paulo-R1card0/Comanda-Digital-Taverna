package br.unasp.comanda.service;

import br.unasp.comanda.dto.PageResponse;
import br.unasp.comanda.dto.UsuarioDto;
import br.unasp.comanda.exception.ConflitoException;
import br.unasp.comanda.exception.RecursoNaoEncontradoException;
import br.unasp.comanda.exception.RegraNegocioException;
import br.unasp.comanda.model.Usuario;
import br.unasp.comanda.model.enums.Perfil;
import br.unasp.comanda.model.enums.StatusRegistro;
import br.unasp.comanda.repository.UsuarioRepository;
import br.unasp.comanda.security.SecurityUtils;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

/** CRUD de usuários internos: ADMIN, GERENTE e COZINHEIRO (RF-041, RN06, RN10). */
@Service
@Transactional(readOnly = true)
public class UsuarioService {

    private static final Set<Perfil> PERFIS_INTERNOS = Set.of(Perfil.ADMIN, Perfil.GERENTE, Perfil.COZINHEIRO);

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    public UsuarioService(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public PageResponse<UsuarioDto.Response> listar(String busca, Perfil perfil, Pageable pageable) {
        var perfis = perfil == null ? List.of(Perfil.values()) : List.of(perfil);
        return PageResponse.of(usuarioRepository.buscar(perfis, busca == null ? "" : busca.trim(), pageable)
                .map(this::toResponse));
    }

    public UsuarioDto.Response buscar(Long id) {
        return toResponse(obter(id));
    }

    @Transactional
    public UsuarioDto.Response criar(UsuarioDto.Request req) {
        validarPerfilInterno(req.perfil());
        String email = req.email().trim().toLowerCase();
        if (usuarioRepository.existsByEmailIgnoreCase(email)) {
            throw new ConflitoException("Já existe um usuário com este email");
        }
        if (req.senha() == null || req.senha().length() < 6) {
            throw new RegraNegocioException("A senha deve ter pelo menos 6 caracteres");
        }
        Usuario u = new Usuario();
        preencher(u, req, email);
        u.setSenhaHash(passwordEncoder.encode(req.senha()));
        return toResponse(usuarioRepository.save(u));
    }

    @Transactional
    public UsuarioDto.Response atualizar(Long id, UsuarioDto.Request req) {
        Usuario u = obter(id);
        String email = req.email().trim().toLowerCase();
        if (usuarioRepository.existsByEmailIgnoreCaseAndIdNot(email, id)) {
            throw new ConflitoException("Já existe um usuário com este email");
        }
        // Um cliente pode ser editado (ex.: reativar), mas não promovido a perfil interno por aqui
        if (u.getPerfil() == Perfil.CLIENTE && req.perfil() != Perfil.CLIENTE) {
            throw new RegraNegocioException("Clientes não podem ser convertidos em usuários internos");
        }
        if (u.getPerfil() != Perfil.CLIENTE) {
            validarPerfilInterno(req.perfil());
        }
        protegerProprioAdmin(u, req.perfil(), req.status());
        preencher(u, req, email);
        if (req.senha() != null && !req.senha().isBlank()) {
            if (req.senha().length() < 6) {
                throw new RegraNegocioException("A senha deve ter pelo menos 6 caracteres");
            }
            u.setSenhaHash(passwordEncoder.encode(req.senha()));
        }
        return toResponse(u);
    }

    /** RN06: exclusão lógica. */
    @Transactional
    public void desativar(Long id) {
        Usuario u = obter(id);
        protegerProprioAdmin(u, u.getPerfil(), StatusRegistro.INATIVO);
        u.setStatus(StatusRegistro.INATIVO);
    }

    private void preencher(Usuario u, UsuarioDto.Request req, String email) {
        u.setNome(req.nome().trim());
        u.setEmail(email);
        u.setPerfil(req.perfil());
        u.setTelefone(req.telefone());
        u.setStatus(req.status() == null ? StatusRegistro.ATIVO : req.status());
    }

    private void validarPerfilInterno(Perfil perfil) {
        if (!PERFIS_INTERNOS.contains(perfil)) {
            throw new RegraNegocioException("Pelo painel só é possível criar ADMIN, GERENTE ou COZINHEIRO. "
                    + "Clientes se cadastram pelo site.");
        }
    }

    /** Evita que o admin logado se desative ou perca o próprio perfil de ADMIN. */
    private void protegerProprioAdmin(Usuario u, Perfil novoPerfil, StatusRegistro novoStatus) {
        Long logado = SecurityUtils.usuarioLogado().getId();
        if (u.getId().equals(logado) && (novoPerfil != Perfil.ADMIN || novoStatus == StatusRegistro.INATIVO)) {
            throw new RegraNegocioException("Você não pode desativar ou rebaixar o seu próprio usuário");
        }
    }

    private Usuario obter(Long id) {
        return usuarioRepository.findById(id).orElseThrow(() -> RecursoNaoEncontradoException.de("Usuário", id));
    }

    private UsuarioDto.Response toResponse(Usuario u) {
        return new UsuarioDto.Response(u.getId(), u.getNome(), u.getEmail(), u.getPerfil(), u.getTelefone(),
                u.getEndereco(), u.getStatus(), u.getCreatedAt());
    }
}
