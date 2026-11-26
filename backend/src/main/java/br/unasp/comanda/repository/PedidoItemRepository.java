package br.unasp.comanda.repository;

import br.unasp.comanda.model.PedidoItem;
import br.unasp.comanda.model.enums.StatusPedido;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface PedidoItemRepository extends JpaRepository<PedidoItem, Long> {

    /**
     * RF-035: ranking de pratos vendidos no período.
     * Cada linha: [pratoId, nomePrato, quantidadeVendida, faturamento].
     */
    @Query("""
            SELECT i.prato.id, i.prato.nome, SUM(i.quantidade), SUM(i.precoUnitario * i.quantidade)
            FROM PedidoItem i
            WHERE i.pedido.status <> :cancelado
              AND i.pedido.createdAt >= :inicio
              AND i.pedido.createdAt < :fim
            GROUP BY i.prato.id, i.prato.nome
            ORDER BY SUM(i.quantidade) DESC
            """)
    List<Object[]> rankingPratos(@Param("cancelado") StatusPedido cancelado,
                                 @Param("inicio") LocalDateTime inicio,
                                 @Param("fim") LocalDateTime fim);
}
