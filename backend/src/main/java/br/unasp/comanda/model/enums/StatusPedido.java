package br.unasp.comanda.model.enums;

/**
 * Ciclo de vida do pedido (RF-016):
 * RECEBIDO > CONFIRMADO > EM_PREPARO > PRONTO > SAIU_ENTREGA > FINALIZADO. Também CANCELADO.
 */
public enum StatusPedido {
    RECEBIDO,
    CONFIRMADO,
    EM_PREPARO,
    PRONTO,
    SAIU_ENTREGA,
    FINALIZADO,
    CANCELADO;

    /** Próximo status do fluxo normal (ou null se não houver). */
    public StatusPedido proximo() {
        return switch (this) {
            case RECEBIDO -> CONFIRMADO;
            case CONFIRMADO -> EM_PREPARO;
            case EM_PREPARO -> PRONTO;
            case PRONTO -> SAIU_ENTREGA;
            case SAIU_ENTREGA -> FINALIZADO;
            case FINALIZADO, CANCELADO -> null;
        };
    }

    /** Status em que o pedido já entrou em produção (RN04). */
    public boolean emProducaoOuDepois() {
        return this == EM_PREPARO || this == PRONTO || this == SAIU_ENTREGA;
    }

    public boolean encerrado() {
        return this == FINALIZADO || this == CANCELADO;
    }
}
