package br.unasp.comanda.controller;

import br.unasp.comanda.dto.FornecedorDto;
import br.unasp.comanda.dto.PageResponse;
import br.unasp.comanda.model.enums.StatusRegistro;
import br.unasp.comanda.service.FornecedorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/** Fornecedores e catálogo de produtos (RF-021, RF-022). */
@RestController
@RequestMapping("/api/admin/fornecedores")
@PreAuthorize("hasAnyRole('ADMIN','GERENTE')")
@Tag(name = "9. Fornecedores")
public class FornecedorController {

    private final FornecedorService fornecedorService;

    public FornecedorController(FornecedorService fornecedorService) {
        this.fornecedorService = fornecedorService;
    }

    @GetMapping
    public PageResponse<FornecedorDto.Response> listar(@RequestParam(required = false) String busca,
                                                       @RequestParam(required = false) StatusRegistro status,
                                                       @ParameterObject @PageableDefault(sort = "razaoSocial") Pageable pageable) {
        return fornecedorService.listar(busca, status, pageable);
    }

    @GetMapping("/{id}")
    public FornecedorDto.Response buscar(@PathVariable Long id) {
        return fornecedorService.buscar(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Cadastra fornecedor (CNPJ validado pelo algoritmo oficial)")
    public FornecedorDto.Response criar(@Valid @RequestBody FornecedorDto.Request req) {
        return fornecedorService.criar(req);
    }

    @PutMapping("/{id}")
    public FornecedorDto.Response atualizar(@PathVariable Long id, @Valid @RequestBody FornecedorDto.Request req) {
        return fornecedorService.atualizar(id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Desativa o fornecedor (exclusão lógica)")
    public void desativar(@PathVariable Long id) {
        fornecedorService.desativar(id);
    }

    // ------------------------------ Catálogo ------------------------------

    @GetMapping("/{id}/produtos")
    @Operation(summary = "Catálogo de ingredientes vendidos pelo fornecedor")
    public PageResponse<FornecedorDto.ProdutoResponse> catalogo(@PathVariable Long id,
                                                                @ParameterObject @PageableDefault(size = 50) Pageable pageable) {
        return fornecedorService.listarCatalogo(id, pageable);
    }

    @PostMapping("/{id}/produtos")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Adiciona ou atualiza um ingrediente no catálogo (preço e unidade de venda)")
    public FornecedorDto.ProdutoResponse salvarProduto(@PathVariable Long id,
                                                       @Valid @RequestBody FornecedorDto.ProdutoRequest req) {
        return fornecedorService.salvarProduto(id, req);
    }

    @DeleteMapping("/{id}/produtos/{produtoId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removerProduto(@PathVariable Long id, @PathVariable Long produtoId) {
        fornecedorService.removerProduto(id, produtoId);
    }
}
