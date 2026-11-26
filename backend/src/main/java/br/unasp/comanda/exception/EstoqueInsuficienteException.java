package br.unasp.comanda.exception;

import java.util.List;

/** RN03: estoque insuficiente para atender o pedido. Retorna HTTP 422 com a lista do que falta. */
public class EstoqueInsuficienteException extends RuntimeException {

    private final List<String> faltas;

    public EstoqueInsuficienteException(List<String> faltas) {
        super("Estoque insuficiente para atender o pedido");
        this.faltas = faltas;
    }

    public List<String> getFaltas() {
        return faltas;
    }
}
