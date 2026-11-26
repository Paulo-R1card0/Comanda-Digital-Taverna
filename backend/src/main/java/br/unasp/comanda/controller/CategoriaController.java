package br.unasp.comanda.controller;

import br.unasp.comanda.dto.CategoriaDto;
import br.unasp.comanda.dto.PageResponse;
import br.unasp.comanda.model.enums.StatusRegistro;
import br.unasp.comanda.service.CategoriaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/categorias")
@PreAuthorize("hasAnyRole('ADMIN','GERENTE')")
@Tag(name = "5. Categorias")
public class CategoriaController {

    private final CategoriaService categoriaService;

    public CategoriaController(CategoriaService categoriaService) {
        this.categoriaService = categoriaService;
    }

    @GetMapping
    @Operation(summary = "Lista categorias (paginado)")
    public PageResponse<CategoriaDto.Response> listar(@RequestParam(required = false) String busca,
                                                      @RequestParam(required = false) StatusRegistro status,
                                                      @ParameterObject @PageableDefault(sort = "ordem") Pageable pageable) {
        return categoriaService.listar(busca, status, pageable);
    }

    @GetMapping("/{id}")
    public CategoriaDto.Response buscar(@PathVariable Long id) {
        return categoriaService.buscar(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CategoriaDto.Response criar(@Valid @RequestBody CategoriaDto.Request req) {
        return categoriaService.criar(req);
    }

    @PutMapping("/{id}")
    public CategoriaDto.Response atualizar(@PathVariable Long id, @Valid @RequestBody CategoriaDto.Request req) {
        return categoriaService.atualizar(id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Desativa a categoria (exclusão lógica)")
    public void desativar(@PathVariable Long id) {
        categoriaService.desativar(id);
    }
}
