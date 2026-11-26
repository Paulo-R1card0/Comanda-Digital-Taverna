package br.unasp.comanda.repository;

import br.unasp.comanda.model.EstoqueMovimentacao;
import br.unasp.comanda.model.enums.MotivoMovimentacao;
import br.unasp.comanda.model.enums.TipoMovimentacao;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface EstoqueMovimentacaoRepository extends JpaRepository<EstoqueMovimentacao, Long> {

    /**
     * RF-031: soma das movimentações por ingrediente e tipo.
     * Cada linha: [ingredienteId, tipo, somaQuantidade]. O saldo é calculado no EstoqueService:
     * saldo = ENTRADA + ESTORNO - SAIDA.
     */
    @Query("""
            SELECT m.ingrediente.id, m.tipo, SUM(m.quantidade)
            FROM EstoqueMovimentacao m
            GROUP BY m.ingrediente.id, m.tipo
            """)
    List<Object[]> somarPorIngredienteETipo();

    @Query("""
            SELECT m.tipo, SUM(m.quantidade)
            FROM EstoqueMovimentacao m
            WHERE m.ingrediente.id = :ingredienteId
            GROUP BY m.tipo
            """)
    List<Object[]> somarPorTipo(@Param("ingredienteId") Long ingredienteId);

    List<EstoqueMovimentacao> findByPedidoIdAndMotivo(Long pedidoId, MotivoMovimentacao motivo);

    boolean existsByPedidoIdAndMotivo(Long pedidoId, MotivoMovimentacao motivo);

    @Query(value = """
            SELECT m FROM EstoqueMovimentacao m JOIN FETCH m.ingrediente
            WHERE (:ingredienteId IS NULL OR m.ingrediente.id = :ingredienteId)
              AND (:tipo IS NULL OR m.tipo = :tipo)
            """,
            countQuery = """
            SELECT COUNT(m) FROM EstoqueMovimentacao m
            WHERE (:ingredienteId IS NULL OR m.ingrediente.id = :ingredienteId)
              AND (:tipo IS NULL OR m.tipo = :tipo)
            """)
    Page<EstoqueMovimentacao> buscar(@Param("ingredienteId") Long ingredienteId,
                                     @Param("tipo") TipoMovimentacao tipo,
                                     Pageable pageable);
}
