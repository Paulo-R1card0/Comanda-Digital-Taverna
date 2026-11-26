package br.unasp.comanda.repository;

import br.unasp.comanda.model.Pedido;
import br.unasp.comanda.model.enums.CanalPedido;
import br.unasp.comanda.model.enums.StatusPedido;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface PedidoRepository extends JpaRepository<Pedido, Long> {

    Page<Pedido> findByClienteId(Long clienteId, Pageable pageable);

    /** RF-019: lista de pedidos com filtros opcionais de data, status e canal. */
    @Query("""
            SELECT p FROM Pedido p
            WHERE (:status IS NULL OR p.status = :status)
              AND (:canal IS NULL OR p.canal = :canal)
              AND p.createdAt >= :inicio
              AND p.createdAt < :fim
            """)
    Page<Pedido> buscar(@Param("status") StatusPedido status,
                        @Param("canal") CanalPedido canal,
                        @Param("inicio") LocalDateTime inicio,
                        @Param("fim") LocalDateTime fim,
                        Pageable pageable);

    // ---------- Consultas do dashboard (RF-034 / RF-037) ----------

    @Query("""
            SELECT COALESCE(SUM(p.valorTotal), 0) FROM Pedido p
            WHERE p.status <> :cancelado AND p.createdAt >= :inicio AND p.createdAt < :fim
            """)
    BigDecimal somarFaturamento(@Param("cancelado") StatusPedido cancelado,
                                @Param("inicio") LocalDateTime inicio,
                                @Param("fim") LocalDateTime fim);

    @Query("""
            SELECT COUNT(p) FROM Pedido p
            WHERE p.status <> :cancelado AND p.createdAt >= :inicio AND p.createdAt < :fim
            """)
    long contarPedidos(@Param("cancelado") StatusPedido cancelado,
                       @Param("inicio") LocalDateTime inicio,
                       @Param("fim") LocalDateTime fim);

    long countByStatusIn(Collection<StatusPedido> status);

    /** Retorna [createdAt, valorTotal] dos pedidos válidos do período (agrupados por dia no service). */
    @Query("""
            SELECT p.createdAt, p.valorTotal FROM Pedido p
            WHERE p.status <> :cancelado AND p.createdAt >= :inicio AND p.createdAt < :fim
            """)
    List<Object[]> buscarVendas(@Param("cancelado") StatusPedido cancelado,
                                @Param("inicio") LocalDateTime inicio,
                                @Param("fim") LocalDateTime fim);
}
