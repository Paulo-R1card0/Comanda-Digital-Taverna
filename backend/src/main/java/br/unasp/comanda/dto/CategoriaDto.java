package br.unasp.comanda.dto;

import br.unasp.comanda.model.enums.StatusRegistro;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** DTOs de categoria (RF-009). */
public final class CategoriaDto {

    private CategoriaDto() {
    }

    public record Request(
            @NotBlank @Size(max = 80) String nome,
            @Size(max = 255) String descricao,
            @Min(0) Integer ordem,
            StatusRegistro status
    ) {
    }

    public record Response(
            Long id,
            String nome,
            String descricao,
            Integer ordem,
            StatusRegistro status
    ) {
    }
}
