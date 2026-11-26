package br.unasp.comanda.exception;

/** Usuário autenticado sem permissão para a ação (regra de negócio). Retorna HTTP 403. */
public class AcessoNegadoException extends RuntimeException {
    public AcessoNegadoException(String mensagem) {
        super(mensagem);
    }
}
