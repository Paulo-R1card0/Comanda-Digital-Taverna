package br.unasp.comanda.service;

import br.unasp.comanda.dto.CategoriaDto;
import br.unasp.comanda.dto.PageResponse;
import br.unasp.comanda.exception.RecursoNaoEncontradoException;
import br.unasp.comanda.model.Categoria;
import br.unasp.comanda.model.enums.StatusRegistro;
import br.unasp.comanda.repository.CategoriaRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** CRUD de categorias (RF-009, RN06). */
@Service
@Transactional(readOnly = true)
public class CategoriaService {

    private final CategoriaRepository categoriaRepository;

    public CategoriaService(CategoriaRepository categoriaRepository) {
        this.categoriaRepository = categoriaRepository;
    }

    public PageResponse<CategoriaDto.Response> listar(String busca, StatusRegistro status, Pageable pageable) {
        return PageResponse.of(categoriaRepository.buscar(busca == null ? "" : busca.trim(), status, pageable)
                .map(this::toResponse));
    }

    /** Categorias ativas para o filtro do cardápio público. */
    public PageResponse<CategoriaDto.Response> listarAtivas() {
        var pagina = PageRequest.of(0, 100, Sort.by("ordem").ascending().and(Sort.by("nome")));
        return PageResponse.of(categoriaRepository.findByStatus(StatusRegistro.ATIVO, pagina).map(this::toResponse));
    }

    public CategoriaDto.Response buscar(Long id) {
        return toResponse(obter(id));
    }

    @Transactional
    public CategoriaDto.Response criar(CategoriaDto.Request req) {
        Categoria c = new Categoria();
        preencher(c, req);
        return toResponse(categoriaRepository.save(c));
    }

    @Transactional
    public CategoriaDto.Response atualizar(Long id, CategoriaDto.Request req) {
        Categoria c = obter(id);
        preencher(c, req);
        return toResponse(c);
    }

    /** RN06: nunca apaga, só desativa. */
    @Transactional
    public void desativar(Long id) {
        obter(id).setStatus(StatusRegistro.INATIVO);
    }

    public Categoria obter(Long id) {
        return categoriaRepository.findById(id).orElseThrow(() -> RecursoNaoEncontradoException.de("Categoria", id));
    }

    private void preencher(Categoria c, CategoriaDto.Request req) {
        c.setNome(req.nome().trim());
        c.setDescricao(req.descricao());
        c.setOrdem(req.ordem() == null ? 0 : req.ordem());
        c.setStatus(req.status() == null ? StatusRegistro.ATIVO : req.status());
    }

    private CategoriaDto.Response toResponse(Categoria c) {
        return new CategoriaDto.Response(c.getId(), c.getNome(), c.getDescricao(), c.getOrdem(), c.getStatus());
    }
}
