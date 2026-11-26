package br.unasp.comanda.dto;

import br.unasp.comanda.model.enums.Perfil;
import br.unasp.comanda.model.enums.StatusRegistro;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

/** DTOs do CRUD de usuários internos (RF-041). */
public final class UsuarioDto {

    private UsuarioDto() {
    }

    /** Na edição, a senha é opcional: se vier vazia, a senha atual é mantida. */
    public record Request(
            @NotBlank @Size(max = 120) String nome,
            @NotBlank @Email @Size(max = 160) String email,
            @Size(max = 60) String senha,
            @NotNull Perfil perfil,
            @Size(max = 20) String telefone,
            StatusRegistro status
    ) {
    }

    public record Response(
            Long id,
            String nome,
            String email,
            Perfil perfil,
            String telefone,
            String endereco,
            StatusRegistro status,
            LocalDateTime createdAt
    ) {
    }
}
