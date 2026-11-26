package br.unasp.comanda.service;

import br.unasp.comanda.dto.CompraDto;
import br.unasp.comanda.dto.PageResponse;
import br.unasp.comanda.exception.RecursoNaoEncontradoException;
import br.unasp.comanda.exception.RegraNegocioException;
import br.unasp.comanda.model.Fornecedor;
import br.unasp.comanda.model.Ingrediente;
import br.unasp.comanda.model.PedidoCompra;
import br.unasp.comanda.model.PedidoCompraItem;
import br.unasp.comanda.model.Usuario;
import br.unasp.comanda.model.enums.StatusCompra;
import br.unasp.comanda.model.enums.StatusRegistro;
import br.unasp.comanda.repository.PedidoCompraRepository;
import br.unasp.comanda.repository.UsuarioRepository;
import br.unasp.comanda.security.SecurityUtils;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Pedidos de compra (RF-024) e recebimento de mercadoria (RF-025, RN05).
 * Fluxo: RASCUNHO > ENVIADO > RECEBIDO (ou CANCELADO antes de receber).
 */
@Service
@Transactional(readOnly = true)
public class CompraService {

    private final PedidoCompraRepository compraRepository;
    private final UsuarioRepository usuarioRepository;
    private final FornecedorService fornecedorService;
    private final IngredienteService ingredienteService;
    private final EstoqueService estoqueService;

    public CompraService(PedidoCompraRepository compraRepository, UsuarioRepository usuarioRepository,
                         FornecedorService fornecedorService, IngredienteService ingredienteService,
                         EstoqueService estoqueService) {
        this.compraRepository = compraRepository;
        this.usuarioRepository = usuarioRepository;
        this.fornecedorService = fornecedorService;
        this.ingredienteService = ingredienteService;
        this.estoqueService = estoqueService;
    }

    public PageResponse<CompraDto.Response> listar(StatusCompra status, Long fornecedorId, Pageable pageable) {
        Pageable ordenado = pageable.getSort().isSorted() ? pageable
                : PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), Sort.by(Sort.Direction.DESC, "createdAt"));
        return PageResponse.of(compraRepository.buscar(status, fornecedorId, ordenado).map(this::toResponse));
    }

    public CompraDto.Response buscar(Long id) {
        return toResponse(obter(id));
    }

    @Transactional
    public CompraDto.Response criar(CompraDto.Request req) {
        PedidoCompra compra = new PedidoCompra();
        compra.setStatus(StatusCompra.RASCUNHO);
        compra.setUsuario(usuarioRepository.getReferenceById(SecurityUtils.usuarioLogado().getId()));
        preencher(compra, req);
        return toResponse(compraRepository.save(compra));
    }

    /** Só é possível editar enquanto a compra está em RASCUNHO. */
    @Transactional
    public CompraDto.Response atualizar(Long id, CompraDto.Request req) {
        PedidoCompra compra = obter(id);
        exigirStatus(compra, StatusCompra.RASCUNHO, "editar");
        preencher(compra, req);
        return toResponse(compra);
    }

    @Transactional
    public CompraDto.Response enviar(Long id) {
        PedidoCompra compra = obter(id);
        exigirStatus(compra, StatusCompra.RASCUNHO, "enviar");
        compra.setStatus(StatusCompra.ENVIADO);
        return toResponse(compra);
    }

    /**
     * RF-025 + RN05: ao receber a mercadoria,
     * 1) cria uma ENTRADA no estoque para cada item (com lote e validade);
     * 2) atualiza o custo unitário do ingrediente para o preço desta compra;
     * 3) registra o preço no histórico. Como o custo dos pratos é calculado a partir do custo
     *    unitário, o food cost de todos os pratos que usam o ingrediente é recalculado automaticamente.
     */
    @Transactional
    public CompraDto.Response receber(Long id, CompraDto.RecebimentoRequest req) {
        PedidoCompra compra = obter(id);
        exigirStatus(compra, StatusCompra.ENVIADO, "receber");
        Usuario usuario = usuarioRepository.getReferenceById(SecurityUtils.usuarioLogado().getId());

        Map<Long, CompraDto.RecebimentoItem> dadosPorItem = new HashMap<>();
        if (req != null && req.itens() != null) {
            req.itens().forEach(r -> dadosPorItem.put(r.itemId(), r));
        }
        for (PedidoCompraItem item : compra.getItens()) {
            CompraDto.RecebimentoItem dados = dadosPorItem.get(item.getId());
            Ingrediente ing = item.getIngrediente();
            estoqueService.registrarEntradaCompra(ing, item.getQuantidade(), item.getPrecoUnitario(),
                    dados == null ? null : dados.lote(), dados == null ? null : dados.validade(), compra, usuario);
            ing.setCustoUnitario(item.getPrecoUnitario().setScale(4, RoundingMode.HALF_UP)); // RN05
            fornecedorService.registrarHistorico(compra.getFornecedor(), ing, item.getPrecoUnitario());
        }
        compra.setStatus(StatusCompra.RECEBIDO);
        compra.setRecebidoEm(LocalDateTime.now());
        return toResponse(compra);
    }

    /** RN06: a compra não é apagada, só cancelada (se ainda não foi recebida). */
    @Transactional
    public CompraDto.Response cancelar(Long id) {
        PedidoCompra compra = obter(id);
        if (compra.getStatus() == StatusCompra.RECEBIDO || compra.getStatus() == StatusCompra.CANCELADO) {
            throw new RegraNegocioException("Não é possível cancelar uma compra " + compra.getStatus());
        }
        compra.setStatus(StatusCompra.CANCELADO);
        return toResponse(compra);
    }

    // ------------------------------ Apoio ------------------------------

    private void preencher(PedidoCompra compra, CompraDto.Request req) {
        Fornecedor fornecedor = fornecedorService.obter(req.fornecedorId());
        if (fornecedor.getStatus() != StatusRegistro.ATIVO) {
            throw new RegraNegocioException("O fornecedor está inativo");
        }
        compra.setFornecedor(fornecedor);
        compra.setObservacoes(req.observacoes());
        compra.getItens().clear();
        BigDecimal total = BigDecimal.ZERO;
        for (CompraDto.ItemRequest itemReq : req.itens()) {
            Ingrediente ing = ingredienteService.obter(itemReq.ingredienteId());
            BigDecimal preco = itemReq.precoUnitario() != null
                    ? itemReq.precoUnitario()
                    : fornecedorService.precoCatalogo(fornecedor.getId(), ing.getId());
            if (preco == null) {
                throw new RegraNegocioException("Informe o preço de " + ing.getNome()
                        + ": ele não está no catálogo deste fornecedor");
            }
            PedidoCompraItem item = new PedidoCompraItem();
            item.setPedidoCompra(compra);
            item.setIngrediente(ing);
            item.setQuantidade(itemReq.quantidade());
            item.setPrecoUnitario(preco.setScale(4, RoundingMode.HALF_UP));
            item.setSubtotal(itemReq.quantidade().multiply(preco).setScale(2, RoundingMode.HALF_UP));
            compra.getItens().add(item);
            total = total.add(item.getSubtotal());
        }
        compra.setValorTotal(total);
    }

    private void exigirStatus(PedidoCompra compra, StatusCompra esperado, String acao) {
        if (compra.getStatus() != esperado) {
            throw new RegraNegocioException("Só é possível " + acao + " uma compra com status " + esperado
                    + " (status atual: " + compra.getStatus() + ")");
        }
    }

    private PedidoCompra obter(Long id) {
        return compraRepository.findById(id).orElseThrow(() -> RecursoNaoEncontradoException.de("Pedido de compra", id));
    }

    private CompraDto.Response toResponse(PedidoCompra c) {
        List<CompraDto.ItemResponse> itens = c.getItens().stream()
                .map(i -> new CompraDto.ItemResponse(i.getId(), i.getIngrediente().getId(), i.getIngrediente().getNome(),
                        i.getIngrediente().getUnidadePadrao(), i.getQuantidade(), i.getPrecoUnitario(), i.getSubtotal()))
                .toList();
        return new CompraDto.Response(c.getId(), c.getFornecedor().getId(), c.getFornecedor().getRazaoSocial(),
                c.getStatus(), c.getValorTotal(), c.getObservacoes(), c.getUsuario().getNome(), c.getCreatedAt(),
                c.getRecebidoEm(), itens);
    }
}
