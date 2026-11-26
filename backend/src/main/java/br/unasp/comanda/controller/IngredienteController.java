package br.unasp.comanda.controller;

import br.unasp.comanda.dto.IngredienteDto;
import br.unasp.comanda.dto.PageResponse;
import br.unasp.comanda.model.enums.StatusRegistro;
import br.unasp.comanda.service.IngredienteService;
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
@RequestMapping("/api/admin/ingredientes")
@PreAuthorize("hasAnyRole('ADMIN','GERENTE')")
@Tag(name = "7. Ingredientes")
public class IngredienteController {

    private final IngredienteService ingredienteService;

    public IngredienteController(IngredienteService ingredienteService) {
        this.ingredienteService = ingredienteService;
    }

    @GetMapping
    @Operation(summary = "Lista ingredientes com saldo atual (paginado)")
    public PageResponse<IngredienteDto.Response> listar(@RequestParam(required = false) String busca,
                                                        @RequestParam(required = false) StatusRegistro status,
                                                        @ParameterObject @PageableDefault(sort = "nome") Pageable pageable) {
        return ingredienteService.listar(busca, status, pageable);
    }

    @GetMapping("/{id}")
    public IngredienteDto.Response buscar(@PathVariable Long id) {
        return ingredienteService.buscar(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public IngredienteDto.Response criar(@Valid @RequestBody IngredienteDto.Request req) {
        return ingredienteService.criar(req);
    }

    @PutMapping("/{id}")
    public IngredienteDto.Response atualizar(@PathVariable Long id, @Valid @RequestBody IngredienteDto.Request req) {
        return ingredienteService.atualizar(id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Desativa o ingrediente (exclusão lógica)")
    public void desativar(@PathVariable Long id) {
        ingredienteService.desativar(id);
    }
}
