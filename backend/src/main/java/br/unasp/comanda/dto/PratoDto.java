package br.unasp.comanda.dto;

import br.unasp.comanda.model.enums.StatusPrato;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/** DTOs de prato (RF-001, RF-002, RF-010). */
public final class PratoDto {

    private PratoDto() {
    }

    public record Request(
            @NotNull Long categoriaId,
            @NotBlank @Size(max = 120) String nome,
            @Size(max = 1000) String descricao,
            @Size(max = 500) String fotoUrl,
            @NotNull @DecimalMin(value = "0.01", message = "deve ser maior que zero") BigDecimal precoVenda,
            @NotNull @Min(1) Integer tempoPreparoMin,
            StatusPrato status
    ) {
    }

    public record StatusRequest(@NotNull StatusPrato status) {
    }

    /** Visão do painel admin: inclui custo e food cost. */
    public record Response(
            Long id,
            Long categoriaId,
            String categoriaNome,
            String nome,
            String descricao,
            String fotoUrl,
            BigDecimal precoVenda,
            Integer tempoPreparoMin,
            StatusPrato status,
            boolean possuiFicha,
            BigDecimal custo,
            BigDecimal foodCost,
            String faixaFoodCost
    ) {
    }

    /** Visão pública do cardápio: sem nenhuma informação de custo. */
    public record PublicoResponse(
            Long id,
            Long categoriaId,
            String categoriaNome,
            String nome,
            String descricao,
            String fotoUrl,
            BigDecimal precoVenda,
            Integer tempoPreparoMin
    ) {
    }
}
