package br.unasp.comanda.controller;

import br.unasp.comanda.dto.FornecedorDto;
import br.unasp.comanda.service.FornecedorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Cotação comparativa e histórico de preços (RF-023, RF-026). */
@RestController
@RequestMapping("/api/admin/cotacao")
@PreAuthorize("hasAnyRole('ADMIN','GERENTE')")
@Tag(name = "10. Cotação")
public class CotacaoController {

    private final FornecedorService fornecedorService;

    public CotacaoController(FornecedorService fornecedorService) {
        this.fornecedorService = fornecedorService;
    }

    @GetMapping("/{ingredienteId}")
    @Operation(summary = "Compara o preço do ingrediente entre fornecedores (do mais barato ao mais caro)")
    public FornecedorDto.CotacaoResponse cotacao(@PathVariable Long ingredienteId) {
        return fornecedorService.cotacao(ingredienteId);
    }

    @GetMapping("/{ingredienteId}/historico")
    @Operation(summary = "Evolução do preço do ingrediente por fornecedor (para o gráfico)")
    public List<FornecedorDto.HistoricoPreco> historico(@PathVariable Long ingredienteId) {
        return fornecedorService.historicoPrecos(ingredienteId);
    }
}
