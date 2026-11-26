package br.unasp.comanda.repository;

import br.unasp.comanda.model.Ingrediente;
import br.unasp.comanda.model.enums.StatusRegistro;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface IngredienteRepository extends JpaRepository<Ingrediente, Long> {

    boolean existsBySkuIgnoreCase(String sku);

    boolean existsBySkuIgnoreCaseAndIdNot(String sku, Long id);

    List<Ingrediente> findByStatusOrderByNomeAsc(StatusRegistro status);

    @Query("""
            SELECT i FROM Ingrediente i
            WHERE (LOWER(i.nome) LIKE LOWER(CONCAT('%', :busca, '%')) OR LOWER(i.sku) LIKE LOWER(CONCAT('%', :busca, '%')))
              AND (:status IS NULL OR i.status = :status)
            """)
    Page<Ingrediente> buscar(@Param("busca") String busca, @Param("status") StatusRegistro status, Pageable pageable);
}
