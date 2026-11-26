package br.unasp.comanda.exception;

/** Violação de regra de negócio. Retorna HTTP 422. */
public class RegraNegocioException extends RuntimeException {
    public RegraNegocioException(String mensagem) {
        super(mensagem);
    }
}
