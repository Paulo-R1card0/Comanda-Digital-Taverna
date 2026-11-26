package br.unasp.comanda.model.enums;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Unidades de medida. Cada unidade pertence a um grupo (massa, volume, unidade)
 * e tem um fator em relação à unidade base do grupo (g, ml, un).
 * Ex.: 1 KG = 1000 G, 1 L = 1000 ML.
 */
public enum UnidadeMedida {
    G("MASSA", 1),
    KG("MASSA", 1000),
    ML("VOLUME", 1),
    L("VOLUME", 1000),
    UN("UNIDADE", 1);

    private final String grupo;
    private final BigDecimal fator;

    UnidadeMedida(String grupo, int fator) {
        this.grupo = grupo;
        this.fator = BigDecimal.valueOf(fator);
    }

    public String getGrupo() {
        return grupo;
    }

    public boolean compativelCom(UnidadeMedida outra) {
        return outra != null && this.grupo.equals(outra.grupo);
    }

    /**
     * Converte uma quantidade desta unidade para a unidade de destino.
     * Ex.: G.converter(500, KG) = 0.5
     */
    public BigDecimal converter(BigDecimal quantidade, UnidadeMedida destino) {
        if (!compativelCom(destino)) {
            throw new IllegalArgumentException("Não é possível converter " + this + " para " + destino);
        }
        return quantidade.multiply(this.fator).divide(destino.fator, 6, RoundingMode.HALF_UP);
    }
}
