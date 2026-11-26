package br.unasp.comanda.exception;

import java.time.LocalDateTime;
import java.util.List;

/** Formato padrão das respostas de erro da API (RNF06). */
public record ApiError(
        LocalDateTime timestamp,
        int status,
        String erro,
        String mensagem,
        String path,
        List<String> detalhes
) {
    public static ApiError of(int status, String erro, String mensagem, String path, List<String> detalhes) {
        return new ApiError(LocalDateTime.now(), status, erro, mensagem, path, detalhes == null ? List.of() : detalhes);
    }
}
