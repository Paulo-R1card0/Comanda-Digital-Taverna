package br.unasp.comanda.service;

import br.unasp.comanda.dto.FornecedorDto;
import br.unasp.comanda.dto.PageResponse;
import br.unasp.comanda.exception.ConflitoException;
import br.unasp.comanda.exception.RecursoNaoEncontradoException;
import br.unasp.comanda.exception.RegraNegocioException;
import br.unasp.comanda.model.Fornecedor;
import br.unasp.comanda.model.FornecedorProduto;
import br.unasp.comanda.model.Ingrediente;
import br.unasp.comanda.model.PrecoHistorico;
import br.unasp.comanda.model.enums.StatusRegistro;
import br.unasp.comanda.repository.FornecedorProdutoRepository;
import br.unasp.comanda.repository.FornecedorRepository;
import br.unasp.comanda.repository.PrecoHistoricoRepository;
import br.unasp.comanda.validation.CnpjValidator;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/** Fornecedores, catálogo, cotação comparativa e histórico de preços (RF-021 a RF-023, RF-026). */
@Service
@Transactional(readOnly = true)
public class FornecedorService {

    private final FornecedorRepository fornecedorRepository;
    private final FornecedorProdutoRepository produtoRepository;
    private final PrecoHistoricoRepository historicoRepository;
    private final IngredienteService ingredienteService;

    public FornecedorService(FornecedorRepository fornecedorRepository, FornecedorProdutoRepository produtoRepository,
                             PrecoHistoricoRepository historicoRepository, IngredienteService ingredienteService) {
        this.fornecedorRepository = fornecedorRepository;
        this.produtoRepository = produtoRepository;
        this.historicoRepository = historicoRepository;
        this.ingredienteService = ingredienteService;
    }

    // ------------------------------ CRUD ------------------------------

    public PageResponse<FornecedorDto.Response> listar(String busca, StatusRegistro status, Pageable pageable) {
        String termo = busca == null ? "" : busca.trim();
        // Permite buscar pelo CNPJ com ou sem máscara
        if (!termo.isEmpty() && termo.matches("[\\d./-]+")) {
            termo = CnpjValidator.somenteDigitos(termo);
        }
        return PageResponse.of(fornecedorRepository.buscar(termo, status, pageable).map(this::toResponse));
    }

    public FornecedorDto.Response buscar(Long id) {
        return toResponse(obter(id));
    }

    @Transactional
    public FornecedorDto.Response criar(FornecedorDto.Request req) {
        String cnpj = CnpjValidator.somenteDigitos(req.cnpj());
        if (fornecedorRepository.existsByCnpj(cnpj)) {
            throw new ConflitoException("Já existe um fornecedor com este CNPJ");
        }
        Fornecedor f = new Fornecedor();
        preencher(f, req, cnpj);
        return toResponse(fornecedorRepository.save(f));
    }

    @Transactional
    public FornecedorDto.Response atualizar(Long id, FornecedorDto.Request req) {
        Fornecedor f = obter(id);
        String cnpj = CnpjValidator.somenteDigitos(req.cnpj());
        if (fornecedorRepository.existsByCnpjAndIdNot(cnpj, id)) {
            throw new ConflitoException("Já existe um fornecedor com este CNPJ");
        }
        preencher(f, req, cnpj);
        return toResponse(f);
    }

    @Transactional
    public void desativar(Long id) {
        obter(id).setStatus(StatusRegistro.INATIVO);
    }

    public Fornecedor obter(Long id) {
        return fornecedorRepository.findById(id).orElseThrow(() -> RecursoNaoEncontradoException.de("Fornecedor", id));
    }

    // ------------------------------ Catálogo (RF-022) ------------------------------

    public PageResponse<FornecedorDto.ProdutoResponse> listarCatalogo(Long fornecedorId, Pageable pageable) {
        obter(fornecedorId);
        return PageResponse.of(produtoRepository.buscarCatalogo(fornecedorId, StatusRegistro.ATIVO, pageable)
                .map(this::toProduto));
    }

    /** Adiciona (ou reativa/atualiza) um ingrediente no catálogo do fornecedor. */
    @Transactional
    public FornecedorDto.ProdutoResponse salvarProduto(Long fornecedorId, FornecedorDto.ProdutoRequest req) {
        Fornecedor fornecedor = obter(fornecedorId);
        Ingrediente ingrediente = ingredienteService.obter(req.ingredienteId());
        if (!req.unidadeVenda().compativelCom(ingrediente.getUnidadePadrao())) {
            throw new RegraNegocioException("A unidade de venda " + req.unidadeVenda() + " não é compatível com "
                    + ingrediente.getNome() + " (unidade padrão " + ingrediente.getUnidadePadrao() + ")");
        }
        FornecedorProduto fp = produtoRepository.findByFornecedorIdAndIngredienteId(fornecedorId, ingrediente.getId())
                .orElseGet(FornecedorProduto::new);
        boolean precoMudou = fp.getId() == null || fp.getPreco().compareTo(req.preco()) != 0
                || fp.getUnidadeVenda() != req.unidadeVenda() || fp.getStatus() != StatusRegistro.ATIVO;
        fp.setFornecedor(fornecedor);
        fp.setIngrediente(ingrediente);
        fp.setPreco(req.preco());
        fp.setUnidadeVenda(req.unidadeVenda());
        fp.setStatus(StatusRegistro.ATIVO);
        produtoRepository.save(fp);
        if (precoMudou) {
            registrarHistorico(fornecedor, ingrediente, precoPorUnidadePadrao(fp));
        }
        return toProduto(fp);
    }

    @Transactional
    public void removerProduto(Long fornecedorId, Long produtoId) {
        FornecedorProduto fp = produtoRepository.findById(produtoId)
                .filter(p -> p.getFornecedor().getId().equals(fornecedorId))
                .orElseThrow(() -> RecursoNaoEncontradoException.de("Produto do fornecedor", produtoId));
        fp.setStatus(StatusRegistro.INATIVO); // RN06
    }

    /** Preço do catálogo convertido para a unidade padrão do ingrediente (ex.: R$ 12,00/KG -> R$ 0,012/G). */
    public BigDecimal precoPorUnidadePadrao(FornecedorProduto fp) {
        BigDecimal qtdPadraoPorUnidadeVenda = fp.getUnidadeVenda().converter(BigDecimal.ONE, fp.getIngrediente().getUnidadePadrao());
        return fp.getPreco().divide(qtdPadraoPorUnidadeVenda, 6, RoundingMode.HALF_UP);
    }

    public BigDecimal precoCatalogo(Long fornecedorId, Long ingredienteId) {
        return produtoRepository.findByFornecedorIdAndIngredienteId(fornecedorId, ingredienteId)
                .filter(fp -> fp.getStatus() == StatusRegistro.ATIVO)
                .map(this::precoPorUnidadePadrao)
                .orElse(null);
    }

    @Transactional
    public void registrarHistorico(Fornecedor fornecedor, Ingrediente ingrediente, BigDecimal precoUnitario) {
        PrecoHistorico h = new PrecoHistorico();
        h.setFornecedor(fornecedor);
        h.setIngrediente(ingrediente);
        h.setPrecoUnitario(precoUnitario);
        historicoRepository.save(h);
    }

    // ------------------------------ Cotação (RF-023) e histórico (RF-026) ------------------------------

    public FornecedorDto.CotacaoResponse cotacao(Long ingredienteId) {
        Ingrediente ing = ingredienteService.obter(ingredienteId);
        List<FornecedorProduto> produtos = produtoRepository.buscarOfertas(ingredienteId, StatusRegistro.ATIVO);
        List<FornecedorProduto> ordenados = new ArrayList<>(produtos);
        ordenados.sort(Comparator.comparing(this::precoPorUnidadePadrao));
        List<FornecedorDto.Oferta> ofertas = new ArrayList<>();
        for (int i = 0; i < ordenados.size(); i++) {
            FornecedorProduto fp = ordenados.get(i);
            ofertas.add(new FornecedorDto.Oferta(fp.getFornecedor().getId(), fp.getFornecedor().getRazaoSocial(),
                    fp.getPreco(), fp.getUnidadeVenda(), precoPorUnidadePadrao(fp), i == 0));
        }
        return new FornecedorDto.CotacaoResponse(ing.getId(), ing.getNome(), ing.getUnidadePadrao(),
                ing.getCustoUnitario(), ofertas);
    }

    public List<FornecedorDto.HistoricoPreco> historicoPrecos(Long ingredienteId) {
        ingredienteService.obter(ingredienteId);
        return historicoRepository.buscarPorIngrediente(ingredienteId).stream()
                .map(h -> new FornecedorDto.HistoricoPreco(h.getFornecedor().getId(), h.getFornecedor().getRazaoSocial(),
                        h.getPrecoUnitario(), h.getCreatedAt()))
                .toList();
    }

    // ------------------------------ Apoio ------------------------------

    private void preencher(Fornecedor f, FornecedorDto.Request req, String cnpj) {
        f.setRazaoSocial(req.razaoSocial().trim());
        f.setCnpj(cnpj);
        f.setTelefone(req.telefone());
        f.setEmail(req.email());
        f.setCategorias(req.categorias());
        f.setStatus(req.status() == null ? StatusRegistro.ATIVO : req.status());
    }

    private FornecedorDto.Response toResponse(Fornecedor f) {
        return new FornecedorDto.Response(f.getId(), f.getRazaoSocial(), f.getCnpj(), f.getTelefone(), f.getEmail(),
                f.getCategorias(), f.getStatus());
    }

    private FornecedorDto.ProdutoResponse toProduto(FornecedorProduto fp) {
        Ingrediente i = fp.getIngrediente();
        return new FornecedorDto.ProdutoResponse(fp.getId(), fp.getFornecedor().getId(), i.getId(), i.getNome(),
                i.getUnidadePadrao(), fp.getPreco(), fp.getUnidadeVenda(), precoPorUnidadePadrao(fp));
    }
}
