package br.unasp.comanda.repository;

import br.unasp.comanda.model.PrecoHistorico;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PrecoHistoricoRepository extends JpaRepository<PrecoHistorico, Long> {

    @Query("""
            SELECT h FROM PrecoHistorico h JOIN FETCH h.fornecedor
            WHERE h.ingrediente.id = :ingredienteId
            ORDER BY h.createdAt ASC
            """)
    List<PrecoHistorico> buscarPorIngrediente(@Param("ingredienteId") Long ingredienteId);
}
