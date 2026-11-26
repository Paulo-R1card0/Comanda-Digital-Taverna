package br.unasp.comanda.repository;

import br.unasp.comanda.model.FichaTecnica;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface FichaTecnicaRepository extends JpaRepository<FichaTecnica, Long> {

    Optional<FichaTecnica> findByPratoId(Long pratoId);

    /** Busca as fichas de vários pratos de uma vez, já com itens e ingredientes (evita N+1). */
    @Query("""
            SELECT DISTINCT f FROM FichaTecnica f
            LEFT JOIN FETCH f.itens i
            LEFT JOIN FETCH i.ingrediente
            WHERE f.prato.id IN :pratoIds
            """)
    List<FichaTecnica> buscarComItens(@Param("pratoIds") Collection<Long> pratoIds);
}
