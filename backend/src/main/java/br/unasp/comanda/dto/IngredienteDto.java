package br.unasp.comanda.dto;

import br.unasp.comanda.model.enums.StatusRegistro;
import br.unasp.comanda.model.enums.UnidadeMedida;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/** DTOs de ingrediente (RF-027). */
public final class IngredienteDto {

    private IngredienteDto() {
    }

    public record Request(
            @NotBlank @Size(max = 120) String nome,
            @NotBlank @Size(max = 40) String sku,
            @NotNull UnidadeMedida unidadePadrao,
            @NotNull @DecimalMin("0") BigDecimal estoqueMinimo,
            @NotNull @DecimalMin("0") BigDecimal custoUnitario,
            StatusRegistro status
    ) {
    }

    public record Response(
            Long id,
            String nome,
            String sku,
            UnidadeMedida unidadePadrao,
            BigDecimal estoqueMinimo,
            BigDecimal custoUnitario,
            StatusRegistro status,
            BigDecimal saldo,
            boolean abaixoMinimo
    ) {
    }
}
