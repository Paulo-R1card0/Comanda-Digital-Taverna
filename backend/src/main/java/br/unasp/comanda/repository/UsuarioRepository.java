package br.unasp.comanda.repository;

import br.unasp.comanda.model.Usuario;
import br.unasp.comanda.model.enums.Perfil;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    Optional<Usuario> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCaseAndIdNot(String email, Long id);

    @Query("""
            SELECT u FROM Usuario u
            WHERE u.perfil IN :perfis
              AND (LOWER(u.nome) LIKE LOWER(CONCAT('%', :busca, '%')) OR LOWER(u.email) LIKE LOWER(CONCAT('%', :busca, '%')))
            """)
    Page<Usuario> buscar(@Param("perfis") Collection<Perfil> perfis, @Param("busca") String busca, Pageable pageable);
}
