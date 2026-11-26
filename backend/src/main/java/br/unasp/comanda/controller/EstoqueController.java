package br.unasp.comanda.controller;

import br.unasp.comanda.dto.EstoqueDto;
import br.unasp.comanda.dto.PageResponse;
import br.unasp.comanda.model.enums.TipoMovimentacao;
import br.unasp.comanda.service.EstoqueService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/** Saldo, alertas e movimentações de estoque (RF-028 a RF-033). */
@RestController
@RequestMapping("/api/admin/estoque")
@PreAuthorize("hasAnyRole('ADMIN','GERENTE')")
@Tag(name = "8. Estoque")
public class EstoqueController {

    private final EstoqueService estoqueService;

    public EstoqueController(EstoqueService estoqueService) {
        this.estoqueService = estoqueService;
    }

    @GetMapping("/saldo")
    @Operation(summary = "Saldo atual de cada ingrediente (entradas - saídas)")
    public PageResponse<EstoqueDto.SaldoResponse> saldo(@RequestParam(required = false) String busca,
                                                        @ParameterObject @PageableDefault(size = 20, sort = "nome") Pageable pageable) {
        return estoqueService.listarSaldos(busca, pageable);
    }

    @GetMapping("/alertas")
    @Operation(summary = "Ingredientes abaixo do estoque mínimo")
    public PageResponse<EstoqueDto.SaldoResponse> alertas(@ParameterObject @PageableDefault(size = 20) Pageable pageable) {
        return estoqueService.listarAlertas(pageable);
    }

    @GetMapping("/movimentacoes")
    @Operation(summary = "Histórico de entradas e saídas (paginado)")
    public PageResponse<EstoqueDto.MovimentacaoResponse> movimentacoes(@RequestParam(required = false) Long ingredienteId,
                                                                      @RequestParam(required = false) TipoMovimentacao tipo,
                                                                      @ParameterObject Pageable pageable) {
        return estoqueService.listarMovimentacoes(ingredienteId, tipo, pageable);
    }

    @PostMapping("/movimentacao")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Registra saída manual (perda) ou entrada de ajuste")
    public EstoqueDto.MovimentacaoResponse registrar(@Valid @RequestBody EstoqueDto.MovimentacaoRequest req) {
        return estoqueService.registrarManual(req);
    }
}
