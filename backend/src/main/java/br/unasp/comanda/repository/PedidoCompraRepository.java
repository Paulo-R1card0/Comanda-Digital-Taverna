package br.unasp.comanda.repository;

import br.unasp.comanda.model.PedidoCompra;
import br.unasp.comanda.model.enums.StatusCompra;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PedidoCompraRepository extends JpaRepository<PedidoCompra, Long> {

    @Query("""
            SELECT c FROM PedidoCompra c
            WHERE (:status IS NULL OR c.status = :status)
              AND (:fornecedorId IS NULL OR c.fornecedor.id = :fornecedorId)
            """)
    Page<PedidoCompra> buscar(@Param("status") StatusCompra status,
                              @Param("fornecedorId") Long fornecedorId,
                              Pageable pageable);
}
