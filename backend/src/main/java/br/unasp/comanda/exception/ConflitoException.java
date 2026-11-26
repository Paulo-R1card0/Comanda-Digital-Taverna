package br.unasp.comanda.exception;

/** Conflito com dado já existente (ex.: email ou CNPJ duplicado). Retorna HTTP 409. */
public class ConflitoException extends RuntimeException {
    public ConflitoException(String mensagem) {
        super(mensagem);
    }
}
