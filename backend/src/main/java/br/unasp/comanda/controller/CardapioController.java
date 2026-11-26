package br.unasp.comanda.controller;

import br.unasp.comanda.dto.CategoriaDto;
import br.unasp.comanda.dto.PageResponse;
import br.unasp.comanda.dto.PratoDto;
import br.unasp.comanda.service.CategoriaService;
import br.unasp.comanda.service.PratoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

/** Cardápio público: não exige login (RF-001, RF-002). */
@RestController
@RequestMapping("/api/cardapio")
@Tag(name = "2. Cardápio público", description = "Rotas abertas, sem login")
public class CardapioController {

    private final PratoService pratoService;
    private final CategoriaService categoriaService;

    public CardapioController(PratoService pratoService, CategoriaService categoriaService) {
        this.pratoService = pratoService;
        this.categoriaService = categoriaService;
    }

    @GetMapping
    @Operation(summary = "Lista os pratos ativos, com filtro opcional por categoria")
    public PageResponse<PratoDto.PublicoResponse> listar(@RequestParam(required = false) Long categoriaId,
                                                         @ParameterObject @PageableDefault(size = 50, sort = "nome") Pageable pageable) {
        return pratoService.listarCardapio(categoriaId, pageable);
    }

    @GetMapping("/categorias")
    @Operation(summary = "Categorias ativas (para o filtro do cardápio)")
    public PageResponse<CategoriaDto.Response> categorias() {
        return categoriaService.listarAtivas();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Detalhe de um prato ativo")
    public PratoDto.PublicoResponse detalhe(@PathVariable Long id) {
        return pratoService.detalheCardapio(id);
    }
}
