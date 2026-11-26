package br.unasp.comanda.repository;

import br.unasp.comanda.model.Fornecedor;
import br.unasp.comanda.model.enums.StatusRegistro;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FornecedorRepository extends JpaRepository<Fornecedor, Long> {

    boolean existsByCnpj(String cnpj);

    boolean existsByCnpjAndIdNot(String cnpj, Long id);

    @Query("""
            SELECT f FROM Fornecedor f
            WHERE (LOWER(f.razaoSocial) LIKE LOWER(CONCAT('%', :busca, '%')) OR f.cnpj LIKE CONCAT('%', :busca, '%'))
              AND (:status IS NULL OR f.status = :status)
            """)
    Page<Fornecedor> buscar(@Param("busca") String busca, @Param("status") StatusRegistro status, Pageable pageable);
}
