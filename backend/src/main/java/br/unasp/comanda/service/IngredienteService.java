package br.unasp.comanda.service;

import br.unasp.comanda.dto.IngredienteDto;
import br.unasp.comanda.dto.PageResponse;
import br.unasp.comanda.exception.ConflitoException;
import br.unasp.comanda.exception.RecursoNaoEncontradoException;
import br.unasp.comanda.exception.RegraNegocioException;
import br.unasp.comanda.model.Ingrediente;
import br.unasp.comanda.model.enums.StatusRegistro;
import br.unasp.comanda.repository.IngredienteRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Map;

/** CRUD de ingredientes (RF-027, RN06). */
@Service
@Transactional(readOnly = true)
public class IngredienteService {

    private final IngredienteRepository ingredienteRepository;
    private final EstoqueService estoqueService;

    public IngredienteService(IngredienteRepository ingredienteRepository, EstoqueService estoqueService) {
        this.ingredienteRepository = ingredienteRepository;
        this.estoqueService = estoqueService;
    }

    public PageResponse<IngredienteDto.Response> listar(String busca, StatusRegistro status, Pageable pageable) {
        Map<Long, BigDecimal> saldos = estoqueService.saldos();
        return PageResponse.of(ingredienteRepository.buscar(busca == null ? "" : busca.trim(), status, pageable)
                .map(i -> toResponse(i, saldos.getOrDefault(i.getId(), BigDecimal.ZERO))));
    }

    public IngredienteDto.Response buscar(Long id) {
        Ingrediente i = obter(id);
        return toResponse(i, estoqueService.saldo(id));
    }

    @Transactional
    public IngredienteDto.Response criar(IngredienteDto.Request req) {
        String sku = req.sku().trim().toUpperCase();
        if (ingredienteRepository.existsBySkuIgnoreCase(sku)) {
            throw new ConflitoException("Já existe um ingrediente com o SKU " + sku);
        }
        Ingrediente i = new Ingrediente();
        i.setUnidadePadrao(req.unidadePadrao());
        preencher(i, req, sku);
        ingredienteRepository.save(i);
        return toResponse(i, BigDecimal.ZERO);
    }

    @Transactional
    public IngredienteDto.Response atualizar(Long id, IngredienteDto.Request req) {
        Ingrediente i = obter(id);
        String sku = req.sku().trim().toUpperCase();
        if (ingredienteRepository.existsBySkuIgnoreCaseAndIdNot(sku, id)) {
            throw new ConflitoException("Já existe um ingrediente com o SKU " + sku);
        }
        BigDecimal saldo = estoqueService.saldo(id);
        // As movimentações estão na unidade padrão: trocar a unidade com estoque existente distorceria o saldo
        if (i.getUnidadePadrao() != req.unidadePadrao() && saldo.signum() != 0) {
            throw new RegraNegocioException("Não é possível trocar a unidade padrão de um ingrediente com saldo em estoque");
        }
        i.setUnidadePadrao(req.unidadePadrao());
        preencher(i, req, sku);
        return toResponse(i, saldo);
    }

    @Transactional
    public void desativar(Long id) {
        obter(id).setStatus(StatusRegistro.INATIVO);
    }

    public Ingrediente obter(Long id) {
        return ingredienteRepository.findById(id).orElseThrow(() -> RecursoNaoEncontradoException.de("Ingrediente", id));
    }

    private void preencher(Ingrediente i, IngredienteDto.Request req, String sku) {
        i.setNome(req.nome().trim());
        i.setSku(sku);
        i.setEstoqueMinimo(req.estoqueMinimo());
        i.setCustoUnitario(req.custoUnitario());
        i.setStatus(req.status() == null ? StatusRegistro.ATIVO : req.status());
    }

    private IngredienteDto.Response toResponse(Ingrediente i, BigDecimal saldo) {
        return new IngredienteDto.Response(i.getId(), i.getNome(), i.getSku(), i.getUnidadePadrao(), i.getEstoqueMinimo(),
                i.getCustoUnitario(), i.getStatus(), saldo, saldo.compareTo(i.getEstoqueMinimo()) < 0);
    }
}
