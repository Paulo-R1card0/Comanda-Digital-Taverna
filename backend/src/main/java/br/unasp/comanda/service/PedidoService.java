package br.unasp.comanda.service;

import br.unasp.comanda.dto.PageResponse;
import br.unasp.comanda.dto.PedidoDto;
import br.unasp.comanda.exception.AcessoNegadoException;
import br.unasp.comanda.exception.EstoqueInsuficienteException;
import br.unasp.comanda.exception.RecursoNaoEncontradoException;
import br.unasp.comanda.exception.RegraNegocioException;
import br.unasp.comanda.model.EstoqueMovimentacao;
import br.unasp.comanda.model.FichaTecnica;
import br.unasp.comanda.model.FichaTecnicaItem;
import br.unasp.comanda.model.Ingrediente;
import br.unasp.comanda.model.Pedido;
import br.unasp.comanda.model.PedidoItem;
import br.unasp.comanda.model.PedidoStatusHistorico;
import br.unasp.comanda.model.Prato;
import br.unasp.comanda.model.Usuario;
import br.unasp.comanda.model.enums.CanalPedido;
import br.unasp.comanda.model.enums.FormaPagamento;
import br.unasp.comanda.model.enums.MotivoMovimentacao;
import br.unasp.comanda.model.enums.Perfil;
import br.unasp.comanda.model.enums.StatusPedido;
import br.unasp.comanda.model.enums.StatusPrato;
import br.unasp.comanda.repository.EstoqueMovimentacaoRepository;
import br.unasp.comanda.repository.FichaTecnicaRepository;
import br.unasp.comanda.repository.IngredienteRepository;
import br.unasp.comanda.repository.PedidoRepository;
import br.unasp.comanda.repository.PratoRepository;
import br.unasp.comanda.repository.UsuarioRepository;
import br.unasp.comanda.security.SecurityUtils;
import br.unasp.comanda.security.UsuarioPrincipal;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Pedidos do cliente e fluxo da cozinha (RF-006 a RF-008, RF-015 a RF-020, RN03, RN04).
 *
 * Integração pedido x estoque:
 * - ao criar: valida se há estoque para todos os ingredientes (RN03 -> 422);
 * - ao CONFIRMAR: dá baixa automática conforme a ficha técnica (RF-017), na mesma transação;
 * - ao CANCELAR: se já houve baixa, cria movimentações de ESTORNO (RF-018).
 */
@Service
@Transactional(readOnly = true)
public class PedidoService {

    private final PedidoRepository pedidoRepository;
    private final PratoRepository pratoRepository;
    private final FichaTecnicaRepository fichaRepository;
    private final UsuarioRepository usuarioRepository;
    private final EstoqueMovimentacaoRepository movimentacaoRepository;
    private final IngredienteRepository ingredienteRepository;
    private final FichaTecnicaService fichaService;
    private final EstoqueService estoqueService;

    public PedidoService(PedidoRepository pedidoRepository, PratoRepository pratoRepository,
                         FichaTecnicaRepository fichaRepository, UsuarioRepository usuarioRepository,
                         EstoqueMovimentacaoRepository movimentacaoRepository, IngredienteRepository ingredienteRepository,
                         FichaTecnicaService fichaService, EstoqueService estoqueService) {
        this.ingredienteRepository = ingredienteRepository;
        this.pedidoRepository = pedidoRepository;
        this.pratoRepository = pratoRepository;
        this.fichaRepository = fichaRepository;
        this.usuarioRepository = usuarioRepository;
        this.movimentacaoRepository = movimentacaoRepository;
        this.fichaService = fichaService;
        this.estoqueService = estoqueService;
    }

    // =============================== Cliente ===============================

    /** POST /api/pedidos: transforma o carrinho em pedido com status RECEBIDO. */
    @Transactional
    public PedidoDto.Response criar(PedidoDto.CriarRequest req) {
        UsuarioPrincipal logado = SecurityUtils.usuarioLogado();
        Usuario cliente = usuarioRepository.findById(logado.getId())
                .orElseThrow(() -> RecursoNaoEncontradoException.de("Usuário", logado.getId()));

        String endereco = req.enderecoEntrega() != null && !req.enderecoEntrega().isBlank()
                ? req.enderecoEntrega().trim() : cliente.getEndereco();
        if (endereco == null || endereco.isBlank()) {
            throw new RegraNegocioException("Informe o endereço de entrega");
        }

        Pedido pedido = new Pedido();
        pedido.setCliente(cliente);
        pedido.setStatus(StatusPedido.RECEBIDO);
        pedido.setCanal(CanalPedido.SITE);
        pedido.setFormaPagamento(req.formaPagamento() == null ? FormaPagamento.PIX : req.formaPagamento());
        pedido.setPago(true); // pagamento simulado (RF-006)
        pedido.setEnderecoEntrega(endereco);
        pedido.setObservacoes(req.observacoes());

        BigDecimal total = BigDecimal.ZERO;
        for (PedidoDto.ItemRequest itemReq : req.itens()) {
            Prato prato = pratoRepository.findById(itemReq.pratoId())
                    .orElseThrow(() -> RecursoNaoEncontradoException.de("Prato", itemReq.pratoId()));
            if (prato.getStatus() != StatusPrato.ATIVO) {
                throw new RegraNegocioException("O prato '" + prato.getNome() + "' não está disponível no momento");
            }
            PedidoItem item = new PedidoItem();
            item.setPedido(pedido);
            item.setPrato(prato);
            item.setQuantidade(itemReq.quantidade());
            item.setPrecoUnitario(prato.getPrecoVenda()); // preço sempre do banco
            item.setObservacoes(itemReq.observacoes());
            pedido.getItens().add(item);
            total = total.add(prato.getPrecoVenda().multiply(BigDecimal.valueOf(itemReq.quantidade())));
        }
        pedido.setValorTotal(total.setScale(2, RoundingMode.HALF_UP));

        validarEstoque(calcularConsumo(pedido)); // RN03
        adicionarHistorico(pedido, StatusPedido.RECEBIDO, null);
        return toResponse(pedidoRepository.save(pedido));
    }

    /** RF-008: histórico do cliente logado, mais recente primeiro. */
    public PageResponse<PedidoDto.Response> meusPedidos(Pageable pageable) {
        Long clienteId = SecurityUtils.usuarioLogado().getId();
        Pageable ordenado = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        return PageResponse.of(pedidoRepository.findByClienteId(clienteId, ordenado).map(this::toResponse));
    }

    public PedidoDto.Response meuPedido(Long id) {
        return toResponse(obterDoClienteLogado(id));
    }

    /** RF-007: status atual + linha do tempo. */
    public PedidoDto.StatusResponse statusDoMeuPedido(Long id) {
        Pedido p = obterDoClienteLogado(id);
        return new PedidoDto.StatusResponse(p.getId(), p.getStatus(), p.getMotivoCancelamento(), historico(p));
    }

    /** O cliente pode cancelar o próprio pedido antes de entrar em preparo (RN04). */
    @Transactional
    public PedidoDto.Response cancelarMeuPedido(Long id, String motivo) {
        Pedido p = obterDoClienteLogado(id);
        return cancelar(p, motivo);
    }

    // =============================== Cozinha / Admin ===============================

    /** RF-019: lista com filtros de data, status e canal, paginada e mais recentes primeiro. */
    public PageResponse<PedidoDto.Response> listar(StatusPedido status, CanalPedido canal, LocalDate dataInicio,
                                                   LocalDate dataFim, Pageable pageable) {
        LocalDateTime inicio = dataInicio == null ? LocalDateTime.of(2000, 1, 1, 0, 0) : dataInicio.atStartOfDay();
        LocalDateTime fim = dataFim == null ? LocalDateTime.of(2100, 1, 1, 0, 0) : dataFim.plusDays(1).atStartOfDay();
        Pageable ordenado = pageable.getSort().isSorted() ? pageable
                : PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), Sort.by(Sort.Direction.DESC, "createdAt"));
        return PageResponse.of(pedidoRepository.buscar(status, canal, inicio, fim, ordenado).map(this::toResponse));
    }

    public PedidoDto.Response buscar(Long id) {
        return toResponse(obter(id));
    }

    /**
     * RF-016: avança o pedido para o próximo status do ciclo.
     * O COZINHEIRO só pode mover CONFIRMADO > EM_PREPARO > PRONTO.
     * Ao CONFIRMAR, dá baixa no estoque (RF-017). Tudo na mesma transação.
     */
    @Transactional
    public PedidoDto.Response alterarStatus(Long id, StatusPedido novoStatus) {
        UsuarioPrincipal logado = SecurityUtils.usuarioLogado();
        Pedido pedido = obter(id);

        if (novoStatus == StatusPedido.CANCELADO) {
            throw new RegraNegocioException("Para cancelar use o endpoint de cancelamento informando o motivo");
        }
        StatusPedido esperado = pedido.getStatus().proximo();
        if (esperado != novoStatus) {
            throw new RegraNegocioException("Transição inválida: o pedido está " + pedido.getStatus()
                    + (esperado == null ? " e não pode mais mudar de status" : " e o próximo status é " + esperado));
        }
        if (logado.getPerfil() == Perfil.COZINHEIRO
                && novoStatus != StatusPedido.EM_PREPARO && novoStatus != StatusPedido.PRONTO) {
            throw new AcessoNegadoException("O cozinheiro só pode mudar o pedido para EM_PREPARO ou PRONTO");
        }

        if (novoStatus == StatusPedido.CONFIRMADO) {
            darBaixaNoEstoque(pedido);
        }
        pedido.setStatus(novoStatus);
        adicionarHistorico(pedido, novoStatus, usuarioRepository.getReferenceById(logado.getId()));
        return toResponse(pedido);
    }

    /** PATCH /api/admin/pedidos/{id}/cancelar */
    @Transactional
    public PedidoDto.Response cancelarPeloPainel(Long id, String motivo) {
        return cancelar(obter(id), motivo);
    }

    // =============================== Regras internas ===============================

    /**
     * RF-018 + RN04: antes de EM_PREPARO qualquer perfil cancela; depois, só GERENTE ou ADMIN.
     * Se o estoque já tinha sido baixado, cria ESTORNO de cada item.
     */
    private PedidoDto.Response cancelar(Pedido pedido, String motivo) {
        UsuarioPrincipal logado = SecurityUtils.usuarioLogado();
        if (motivo == null || motivo.isBlank()) {
            throw new RegraNegocioException("Informe o motivo do cancelamento");
        }
        if (pedido.getStatus().encerrado()) {
            throw new RegraNegocioException("O pedido já está " + pedido.getStatus() + " e não pode ser cancelado");
        }
        if (pedido.getStatus().emProducaoOuDepois() && !logado.temPerfil(Perfil.ADMIN, Perfil.GERENTE)) {
            throw new AcessoNegadoException("Depois que o pedido entra em preparo, só GERENTE ou ADMIN podem cancelar");
        }

        Usuario usuario = usuarioRepository.getReferenceById(logado.getId());
        boolean jaEstornado = movimentacaoRepository.existsByPedidoIdAndMotivo(pedido.getId(), MotivoMovimentacao.ESTORNO);
        if (!jaEstornado) {
            for (EstoqueMovimentacao saida : movimentacaoRepository.findByPedidoIdAndMotivo(pedido.getId(), MotivoMovimentacao.VENDA)) {
                estoqueService.registrarEstorno(saida, usuario);
            }
        }
        pedido.setStatus(StatusPedido.CANCELADO);
        pedido.setMotivoCancelamento(motivo.trim());
        adicionarHistorico(pedido, StatusPedido.CANCELADO, usuario);
        return toResponse(pedido);
    }

    /** RF-017: baixa automática = ficha técnica × quantidade de cada item. */
    private void darBaixaNoEstoque(Pedido pedido) {
        Map<Long, BigDecimal> consumo = calcularConsumo(pedido);
        validarEstoque(consumo);
        Usuario usuario = usuarioRepository.getReferenceById(SecurityUtils.usuarioLogado().getId());
        Map<Long, Ingrediente> ingredientes = ingredientesDoPedido(pedido);
        consumo.forEach((ingredienteId, quantidade) ->
                estoqueService.registrarSaidaVenda(ingredientes.get(ingredienteId), quantidade, pedido, usuario));
    }

    /** Soma o consumo de cada ingrediente para todos os itens do pedido. */
    private Map<Long, BigDecimal> calcularConsumo(Pedido pedido) {
        Map<Long, BigDecimal> total = new LinkedHashMap<>();
        for (PedidoItem item : pedido.getItens()) {
            FichaTecnica ficha = fichaRepository.findByPratoId(item.getPrato().getId())
                    .orElseThrow(() -> new RegraNegocioException("O prato '" + item.getPrato().getNome()
                            + "' não tem ficha técnica cadastrada"));
            BigDecimal qtdPedido = BigDecimal.valueOf(item.getQuantidade());
            fichaService.consumoPorPorcao(ficha).forEach((ingredienteId, porPorcao) ->
                    total.merge(ingredienteId, porPorcao.multiply(qtdPedido), BigDecimal::add));
        }
        return total;
    }

    /** RN03: se faltar algum ingrediente, devolve 422 dizendo exatamente o que falta. */
    private void validarEstoque(Map<Long, BigDecimal> consumo) {
        Map<Long, BigDecimal> saldos = estoqueService.saldos();
        List<String> faltas = new ArrayList<>();
        Map<Long, Ingrediente> cache = new HashMap<>();
        consumo.forEach((ingredienteId, necessario) -> {
            BigDecimal disponivel = saldos.getOrDefault(ingredienteId, BigDecimal.ZERO);
            if (disponivel.compareTo(necessario) < 0) {
                Ingrediente ing = cache.computeIfAbsent(ingredienteId, idIng -> ingredienteRepository.findById(idIng)
                        .orElseThrow(() -> RecursoNaoEncontradoException.de("Ingrediente", idIng)));
                faltas.add(ing.getNome() + ": necessário " + EstoqueService.formatar(necessario) + " "
                        + ing.getUnidadePadrao() + ", disponível " + EstoqueService.formatar(disponivel) + " "
                        + ing.getUnidadePadrao());
            }
        });
        if (!faltas.isEmpty()) {
            throw new EstoqueInsuficienteException(faltas);
        }
    }

    private Map<Long, Ingrediente> ingredientesDoPedido(Pedido pedido) {
        Map<Long, Ingrediente> mapa = new HashMap<>();
        for (PedidoItem item : pedido.getItens()) {
            fichaRepository.findByPratoId(item.getPrato().getId()).ifPresent(f -> {
                for (FichaTecnicaItem fi : f.getItens()) {
                    mapa.put(fi.getIngrediente().getId(), fi.getIngrediente());
                }
            });
        }
        return mapa;
    }

    private void adicionarHistorico(Pedido pedido, StatusPedido status, Usuario usuario) {
        PedidoStatusHistorico h = new PedidoStatusHistorico();
        h.setPedido(pedido);
        h.setStatus(status);
        h.setUsuario(usuario);
        h.setCreatedAt(LocalDateTime.now());
        pedido.getHistorico().add(h);
    }

    private Pedido obter(Long id) {
        return pedidoRepository.findById(id).orElseThrow(() -> RecursoNaoEncontradoException.de("Pedido", id));
    }

    private Pedido obterDoClienteLogado(Long id) {
        Pedido p = obter(id);
        if (!p.getCliente().getId().equals(SecurityUtils.usuarioLogado().getId())) {
            throw new RecursoNaoEncontradoException("Pedido não encontrado"); // não revela pedidos de outros clientes
        }
        return p;
    }

    private List<PedidoDto.HistoricoResponse> historico(Pedido p) {
        return p.getHistorico().stream()
                .map(h -> new PedidoDto.HistoricoResponse(h.getStatus(), h.getCreatedAt(),
                        h.getUsuario() == null ? null : h.getUsuario().getNome()))
                .toList();
    }

    private PedidoDto.Response toResponse(Pedido p) {
        List<PedidoDto.ItemResponse> itens = p.getItens().stream()
                .map(i -> new PedidoDto.ItemResponse(i.getId(), i.getPrato().getId(), i.getPrato().getNome(),
                        i.getPrato().getFotoUrl(), i.getQuantidade(), i.getPrecoUnitario(),
                        i.getPrecoUnitario().multiply(BigDecimal.valueOf(i.getQuantidade())).setScale(2, RoundingMode.HALF_UP),
                        i.getObservacoes()))
                .toList();
        Usuario c = p.getCliente();
        return new PedidoDto.Response(p.getId(), p.getStatus(), p.getCanal(), p.getFormaPagamento(),
                Boolean.TRUE.equals(p.getPago()), p.getValorTotal(), p.getEnderecoEntrega(), p.getObservacoes(),
                p.getMotivoCancelamento(), c.getId(), c.getNome(), c.getEmail(), c.getTelefone(), p.getCreatedAt(),
                p.getUpdatedAt(), itens, historico(p));
    }
}
