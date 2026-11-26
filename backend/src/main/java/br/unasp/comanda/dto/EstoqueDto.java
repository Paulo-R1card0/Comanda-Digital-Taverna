package br.unasp.comanda.dto;

import br.unasp.comanda.model.enums.MotivoMovimentacao;
import br.unasp.comanda.model.enums.TipoMovimentacao;
import br.unasp.comanda.model.enums.UnidadeMedida;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/** DTOs de estoque (RF-028 a RF-033). */
public final class EstoqueDto {

    private EstoqueDto() {
    }

    public record SaldoResponse(
            Long ingredienteId,
            String ingredienteNome,
            String sku,
            UnidadeMedida unidade,
            BigDecimal saldo,
            BigDecimal estoqueMinimo,
            boolean abaixoMinimo,
            BigDecimal custoUnitario,
            BigDecimal valorEmEstoque
    ) {
    }

    /**
     * Movimentação manual.
     * SAIDA (perda): motivo obrigatório entre DESPERDICIO, VENCIMENTO, QUEBRA, USO_INTERNO (RF-030).
     * ENTRADA (ajuste): motivo AJUSTE, com lote, validade e custo (RF-028).
     * A quantidade é sempre informada na unidade padrão do ingrediente.
     */
    public record MovimentacaoRequest(
            @NotNull Long ingredienteId,
            @NotNull TipoMovimentacao tipo,
            @NotNull @DecimalMin(value = "0.001", message = "deve ser maior que zero") BigDecimal quantidade,
            @NotNull MotivoMovimentacao motivo,
            @Size(max = 40) String lote,
            LocalDate validade,
            @DecimalMin("0") BigDecimal custoUnitario,
            @Size(max = 255) String observacao
    ) {
    }

    public record MovimentacaoResponse(
            Long id,
            Long ingredienteId,
            String ingredienteNome,
            UnidadeMedida unidade,
            TipoMovimentacao tipo,
            BigDecimal quantidade,
            MotivoMovimentacao motivo,
            String lote,
            LocalDate validade,
            BigDecimal custoUnitario,
            String observacao,
            Long pedidoId,
            Long pedidoCompraId,
            String usuarioNome,
            LocalDateTime createdAt
    ) {
    }
}
