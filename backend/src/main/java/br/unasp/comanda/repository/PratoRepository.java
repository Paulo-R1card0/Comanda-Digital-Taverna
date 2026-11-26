package br.unasp.comanda.repository;

import br.unasp.comanda.model.Prato;
import br.unasp.comanda.model.enums.StatusPrato;
import br.unasp.comanda.model.enums.StatusRegistro;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PratoRepository extends JpaRepository<Prato, Long> {

    /** RN09: cardápio público só com pratos ATIVOS de categorias ATIVAS. */
    @Query(value = """
            SELECT p FROM Prato p JOIN FETCH p.categoria c
            WHERE p.status = :statusPrato
              AND c.status = :statusCategoria
              AND (:categoriaId IS NULL OR c.id = :categoriaId)
            """,
            countQuery = """
            SELECT COUNT(p) FROM Prato p JOIN p.categoria c
            WHERE p.status = :statusPrato
              AND c.status = :statusCategoria
              AND (:categoriaId IS NULL OR c.id = :categoriaId)
            """)
    Page<Prato> buscarCardapio(@Param("statusPrato") StatusPrato statusPrato,
                               @Param("statusCategoria") StatusRegistro statusCategoria,
                               @Param("categoriaId") Long categoriaId,
                               Pageable pageable);

    @Query("""
            SELECT p FROM Prato p
            WHERE LOWER(p.nome) LIKE LOWER(CONCAT('%', :busca, '%'))
              AND (:categoriaId IS NULL OR p.categoria.id = :categoriaId)
              AND (:status IS NULL OR p.status = :status)
            """)
    Page<Prato> buscar(@Param("busca") String busca,
                       @Param("categoriaId") Long categoriaId,
                       @Param("status") StatusPrato status,
                       Pageable pageable);
}
