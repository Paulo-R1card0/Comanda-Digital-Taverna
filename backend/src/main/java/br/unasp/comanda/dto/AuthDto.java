package br.unasp.comanda.dto;

import br.unasp.comanda.model.enums.Perfil;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;

/** DTOs de autenticação (RF-004, RF-005, RF-038, RF-039). */
public final class AuthDto {

    private AuthDto() {
    }

    public record LoginRequest(
            @NotBlank @Email String email,
            @NotBlank String senha
    ) {
    }

    public record RegisterRequest(
            @NotBlank @Size(max = 120) String nome,
            @NotBlank @Email @Size(max = 160) String email,
            @NotBlank @Size(min = 6, max = 60, message = "deve ter entre 6 e 60 caracteres") String senha,
            @NotBlank @Size(max = 20) String telefone,
            @NotBlank @Size(max = 255) String endereco
    ) {
    }

    public record UsuarioLogado(
            Long id,
            String nome,
            String email,
            Perfil perfil,
            String telefone,
            String endereco
    ) {
    }

    /** Resposta do login: nunca contém a senha (RNF01). */
    public record TokenResponse(
            String token,
            String tipo,
            Instant expiraEm,
            UsuarioLogado usuario
    ) {
    }
}
