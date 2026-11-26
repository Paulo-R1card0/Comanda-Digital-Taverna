package br.unasp.comanda.dto;

import br.unasp.comanda.model.enums.UnidadeMedida;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.List;

/** DTOs de ficha técnica e custo (RF-011 a RF-014). */
public final class FichaDto {

    private FichaDto() {
    }

    public record ItemRequest(
            @NotNull Long ingredienteId,
            @NotNull @DecimalMin(value = "0.001", message = "deve ser maior que zero") BigDecimal quantidade,
            @NotNull UnidadeMedida unidade,
            /* RN08: fator de correção nunca menor que 1.0 */
            @NotNull @DecimalMin(value = "1.0", message = "o fator de correção não pode ser menor que 1.0") BigDecimal fatorCorrecao
    ) {
    }

    public record Request(
            @NotNull @Min(value = 1, message = "o rendimento deve ser de pelo menos 1 porção") Integer rendimento,
            String modoPreparo,
            @NotNull @Valid List<ItemRequest> itens
    ) {
    }

    /** Usado para o cálculo em tempo real na tela, antes de salvar. */
    public record SimulacaoRequest(
            @NotNull @DecimalMin("0.01") BigDecimal precoVenda,
            @NotNull @Min(1) Integer rendimento,
            @NotNull @Valid List<ItemRequest> itens
    ) {
    }

    public record ItemResponse(
            Long id,
            Long ingredienteId,
            String ingredienteNome,
            BigDecimal quantidade,
            UnidadeMedida unidade,
            BigDecimal fatorCorrecao,
            BigDecimal custoUnitario,
            UnidadeMedida unidadePadrao,
            BigDecimal custoItem
    ) {
    }

    /**
     * Resultado do cálculo (RF-012 / RF-013):
     * custo = SUM(qtd × fator_correcao × custo_unitario) / rendimento
     * foodCost = custo / preco_venda × 100
     */
    public record CustoResponse(
            BigDecimal precoVenda,
            Integer rendimento,
            BigDecimal custoTotalReceita,
            BigDecimal custoPorcao,
            BigDecimal foodCost,
            String faixa,
            String aviso,
            List<ItemResponse> itens
    ) {
    }

    public record Response(
            Long id,
            Long pratoId,
            String pratoNome,
            Integer rendimento,
            String modoPreparo,
            CustoResponse custo
    ) {
    }
}
