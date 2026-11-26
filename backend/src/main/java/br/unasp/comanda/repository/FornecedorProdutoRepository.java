package br.unasp.comanda.repository;

import br.unasp.comanda.model.FornecedorProduto;
import br.unasp.comanda.model.enums.StatusRegistro;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FornecedorProdutoRepository extends JpaRepository<FornecedorProduto, Long> {

    @Query(value = """
            SELECT fp FROM FornecedorProduto fp JOIN FETCH fp.ingrediente
            WHERE fp.fornecedor.id = :fornecedorId AND fp.status = :status
            """,
            countQuery = """
            SELECT COUNT(fp) FROM FornecedorProduto fp
            WHERE fp.fornecedor.id = :fornecedorId AND fp.status = :status
            """)
    Page<FornecedorProduto> buscarCatalogo(@Param("fornecedorId") Long fornecedorId,
                                           @Param("status") StatusRegistro status,
                                           Pageable pageable);

    Optional<FornecedorProduto> findByFornecedorIdAndIngredienteId(Long fornecedorId, Long ingredienteId);

    /** RF-023: todos os fornecedores ativos que vendem o ingrediente. */
    @Query("""
            SELECT fp FROM FornecedorProduto fp JOIN FETCH fp.fornecedor f JOIN FETCH fp.ingrediente
            WHERE fp.ingrediente.id = :ingredienteId
              AND fp.status = :status
              AND f.status = :status
            """)
    List<FornecedorProduto> buscarOfertas(@Param("ingredienteId") Long ingredienteId,
                                          @Param("status") StatusRegistro status);
}
