package br.unasp.comanda.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/** DTOs do dashboard (RF-034 a RF-037). */
public final class DashboardDto {

    private DashboardDto() {
    }

    public record Resumo(
            LocalDate data,
            BigDecimal faturamento,
            long totalPedidos,
            BigDecimal ticketMedio,
            BigDecimal foodCostMedio,
            long pedidosEmAberto,
            long alertasEstoque
    ) {
    }

    public record TopPrato(
            Long pratoId,
            String nome,
            long quantidade,
            BigDecimal faturamento
    ) {
    }

    public record VendaDia(
            LocalDate data,
            BigDecimal faturamento,
            long pedidos,
            BigDecimal ticketMedio
    ) {
    }
}
