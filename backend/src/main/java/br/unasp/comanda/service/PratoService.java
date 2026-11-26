package br.unasp.comanda.service;

import br.unasp.comanda.dto.FichaDto;
import br.unasp.comanda.dto.PageResponse;
import br.unasp.comanda.dto.PratoDto;
import br.unasp.comanda.exception.RecursoNaoEncontradoException;
import br.unasp.comanda.exception.RegraNegocioException;
import br.unasp.comanda.model.Categoria;
import br.unasp.comanda.model.FichaTecnica;
import br.unasp.comanda.model.Prato;
import br.unasp.comanda.model.enums.StatusPrato;
import br.unasp.comanda.model.enums.StatusRegistro;
import br.unasp.comanda.repository.FichaTecnicaRepository;
import br.unasp.comanda.repository.PratoRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Pratos do cardápio (RF-001, RF-002, RF-010, RN01, RN06, RN09). */
@Service
@Transactional(readOnly = true)
public class PratoService {

    private final PratoRepository pratoRepository;
    private final FichaTecnicaRepository fichaRepository;
    private final CategoriaService categoriaService;
    private final FichaTecnicaService fichaService;

    public PratoService(PratoRepository pratoRepository, FichaTecnicaRepository fichaRepository,
                        CategoriaService categoriaService, FichaTecnicaService fichaService) {
        this.pratoRepository = pratoRepository;
        this.fichaRepository = fichaRepository;
        this.categoriaService = categoriaService;
        this.fichaService = fichaService;
    }

    // ------------------------------ Cardápio público ------------------------------

    /** RN09: só pratos ATIVOS (de categorias ativas) aparecem no cardápio público. */
    public PageResponse<PratoDto.PublicoResponse> listarCardapio(Long categoriaId, Pageable pageable) {
        return PageResponse.of(pratoRepository
                .buscarCardapio(StatusPrato.ATIVO, StatusRegistro.ATIVO, categoriaId, pageable)
                .map(this::toPublico));
    }

    public PratoDto.PublicoResponse detalheCardapio(Long id) {
        Prato p = obter(id);
        if (p.getStatus() != StatusPrato.ATIVO || p.getCategoria().getStatus() != StatusRegistro.ATIVO) {
            throw new RecursoNaoEncontradoException("Prato não disponível no cardápio");
        }
        return toPublico(p);
    }

    // ------------------------------ Painel admin ------------------------------

    public PageResponse<PratoDto.Response> listar(String busca, Long categoriaId, StatusPrato status, Pageable pageable) {
        Page<Prato> pagina = pratoRepository.buscar(busca == null ? "" : busca.trim(), categoriaId, status, pageable);
        // Carrega as fichas da página inteira de uma vez para calcular os custos
        List<Long> ids = pagina.getContent().stream().map(Prato::getId).toList();
        Map<Long, FichaTecnica> fichas = ids.isEmpty() ? Map.<Long, FichaTecnica>of() :fichaRepository.buscarComItens(ids).stream()
                .collect(Collectors.toMap(f -> f.getPrato().getId(), Function.identity()));
        return PageResponse.of(pagina.map(p -> toResponse(p, fichas.get(p.getId()))));
    }

    public PratoDto.Response buscar(Long id) {
        Prato p = obter(id);
        return toResponse(p, fichaRepository.findByPratoId(id).orElse(null));
    }

    @Transactional
    public PratoDto.Response criar(PratoDto.Request req) {
        Prato p = new Prato();
        preencher(p, req);
        StatusPrato status = req.status() == null ? StatusPrato.INATIVO : req.status();
        // RN01: um prato novo ainda não tem ficha, então não pode nascer ATIVO
        if (status == StatusPrato.ATIVO) {
            throw new RegraNegocioException("Um prato só pode ficar ATIVO depois de ter ficha técnica com pelo menos "
                    + "1 ingrediente. Cadastre como INATIVO, monte a ficha e depois ative.");
        }
        p.setStatus(status);
        pratoRepository.save(p);
        return toResponse(p, null);
    }

    @Transactional
    public PratoDto.Response atualizar(Long id, PratoDto.Request req) {
        Prato p = obter(id);
        preencher(p, req);
        if (req.status() != null) {
            alterarStatus(p, req.status());
        }
        return toResponse(p, fichaRepository.findByPratoId(id).orElse(null));
    }

    @Transactional
    public PratoDto.Response atualizarStatus(Long id, StatusPrato status) {
        Prato p = obter(id);
        alterarStatus(p, status);
        return toResponse(p, fichaRepository.findByPratoId(id).orElse(null));
    }

    /** RN06: exclusão lógica. */
    @Transactional
    public void desativar(Long id) {
        obter(id).setStatus(StatusPrato.INATIVO);
    }

    public Prato obter(Long id) {
        return pratoRepository.findById(id).orElseThrow(() -> RecursoNaoEncontradoException.de("Prato", id));
    }

    // ------------------------------ Regras ------------------------------

    /** RN01: prato só fica ATIVO se tiver ficha técnica com pelo menos 1 ingrediente. */
    private void alterarStatus(Prato p, StatusPrato novoStatus) {
        if (novoStatus == StatusPrato.ATIVO) {
            boolean temIngredientes = fichaRepository.findByPratoId(p.getId())
                    .map(f -> !f.getItens().isEmpty())
                    .orElse(false);
            if (!temIngredientes) {
                throw new RegraNegocioException("O prato '" + p.getNome()
                        + "' só pode ser ativado depois de ter ficha técnica com pelo menos 1 ingrediente");
            }
            if (p.getCategoria().getStatus() != StatusRegistro.ATIVO) {
                throw new RegraNegocioException("A categoria deste prato está inativa");
            }
        }
        p.setStatus(novoStatus);
    }

    private void preencher(Prato p, PratoDto.Request req) {
        Categoria categoria = categoriaService.obter(req.categoriaId());
        p.setCategoria(categoria);
        p.setNome(req.nome().trim());
        p.setDescricao(req.descricao());
        p.setFotoUrl(req.fotoUrl() == null || req.fotoUrl().isBlank() ? null : req.fotoUrl().trim());
        p.setPrecoVenda(req.precoVenda());
        p.setTempoPreparoMin(req.tempoPreparoMin());
    }

    private PratoDto.Response toResponse(Prato p, FichaTecnica ficha) {
        boolean possuiFicha = ficha != null && !ficha.getItens().isEmpty();
        FichaDto.CustoResponse custo = possuiFicha ? fichaService.calcular(ficha) : null;
        return new PratoDto.Response(p.getId(), p.getCategoria().getId(), p.getCategoria().getNome(), p.getNome(),
                p.getDescricao(), p.getFotoUrl(), p.getPrecoVenda(), p.getTempoPreparoMin(), p.getStatus(), possuiFicha,
                custo == null ? null : custo.custoPorcao(),
                custo == null ? null : custo.foodCost(),
                custo == null ? null : custo.faixa());
    }

    private PratoDto.PublicoResponse toPublico(Prato p) {
        return new PratoDto.PublicoResponse(p.getId(), p.getCategoria().getId(), p.getCategoria().getNome(), p.getNome(),
                p.getDescricao(), p.getFotoUrl(), p.getPrecoVenda(), p.getTempoPreparoMin());
    }
}
