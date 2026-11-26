package br.unasp.comanda.controller;

import br.unasp.comanda.dto.PageResponse;
import br.unasp.comanda.dto.UsuarioDto;
import br.unasp.comanda.model.enums.Perfil;
import br.unasp.comanda.service.UsuarioService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/** Gestão de usuários internos (RF-041). Somente ADMIN. */
@RestController
@RequestMapping("/api/admin/usuarios")
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "13. Usuários")
public class UsuarioController {

    private final UsuarioService usuarioService;

    public UsuarioController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @GetMapping
    public PageResponse<UsuarioDto.Response> listar(@RequestParam(required = false) String busca,
                                                    @RequestParam(required = false) Perfil perfil,
                                                    @ParameterObject @PageableDefault(sort = "nome") Pageable pageable) {
        return usuarioService.listar(busca, perfil, pageable);
    }

    @GetMapping("/{id}")
    public UsuarioDto.Response buscar(@PathVariable Long id) {
        return usuarioService.buscar(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Cria usuário interno (ADMIN, GERENTE ou COZINHEIRO). Senha salva com BCrypt")
    public UsuarioDto.Response criar(@Valid @RequestBody UsuarioDto.Request req) {
        return usuarioService.criar(req);
    }

    @PutMapping("/{id}")
    public UsuarioDto.Response atualizar(@PathVariable Long id, @Valid @RequestBody UsuarioDto.Request req) {
        return usuarioService.atualizar(id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Desativa o usuário (exclusão lógica)")
    public void desativar(@PathVariable Long id) {
        usuarioService.desativar(id);
    }
}
