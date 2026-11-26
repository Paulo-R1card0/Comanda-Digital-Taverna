package br.unasp.comanda.repository;

import br.unasp.comanda.model.Categoria;
import br.unasp.comanda.model.enums.StatusRegistro;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CategoriaRepository extends JpaRepository<Categoria, Long> {

    Page<Categoria> findByStatus(StatusRegistro status, Pageable pageable);

    @Query("""
            SELECT c FROM Categoria c
            WHERE LOWER(c.nome) LIKE LOWER(CONCAT('%', :busca, '%'))
              AND (:status IS NULL OR c.status = :status)
            """)
    Page<Categoria> buscar(@Param("busca") String busca, @Param("status") StatusRegistro status, Pageable pageable);
}
