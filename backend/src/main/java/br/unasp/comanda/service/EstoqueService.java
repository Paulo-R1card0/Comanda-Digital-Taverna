package br.unasp.comanda.service;

import br.unasp.comanda.dto.EstoqueDto;
import br.unasp.comanda.dto.PageResponse;
import br.unasp.comanda.exception.RecursoNaoEncontradoException;
import br.unasp.comanda.exception.RegraNegocioException;
import br.unasp.comanda.model.EstoqueMovimentacao;
import br.unasp.comanda.model.Ingrediente;
import br.unasp.comanda.model.Pedido;
import br.unasp.comanda.model.PedidoCompra;
import br.unasp.comanda.model.Usuario;
import br.unasp.comanda.model.enums.MotivoMovimentacao;
import br.unasp.comanda.model.enums.StatusRegistro;
import br.unasp.comanda.model.enums.TipoMovimentacao;
import br.unasp.comanda.repository.EstoqueMovimentacaoRepository;
import br.unasp.comanda.repository.IngredienteRepository;
import br.unasp.comanda.repository.UsuarioRepository;
import br.unasp.comanda.security.SecurityUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Controle de estoque (RF-027 a RF-033).
 * O saldo nunca é guardado numa coluna: é sempre calculado a partir das movimentações
 * (saldo = ENTRADAS + ESTORNOS - SAÍDAS), o que garante rastreabilidade total.
 */
@Service
@Transactional(readOnly = true)
public class EstoqueService {

    /** RF-030: motivos aceitos para saída manual (perdas). */
    private static final Set<MotivoMovimentacao> MOTIVOS_PERDA = Set.of(
            MotivoMovimentacao.DESPERDICIO, MotivoMovimentacao.VENCIMENTO,
            MotivoMovimentacao.QUEBRA, MotivoMovimentacao.USO_INTERNO);

    private final EstoqueMovimentacaoRepository movimentacaoRepository;
    private final IngredienteRepository ingredienteRepository;
    private final UsuarioRepository usuarioRepository;

    public EstoqueService(EstoqueMovimentacaoRepository movimentacaoRepository,
                          IngredienteRepository ingredienteRepository,
                          UsuarioRepository usuarioRepository) {
        this.movimentacaoRepository = movimentacaoRepository;
        this.ingredienteRepository = ingredienteRepository;
        this.usuarioRepository = usuarioRepository;
    }

    // ---------------------------------- Saldos ----------------------------------

    /** Saldo atual de todos os ingredientes (id -> saldo na unidade padrão). */
    public Map<Long, BigDecimal> saldos() {
        Map<Long, BigDecimal> saldos = new HashMap<>();
        for (Object[] linha : movimentacaoRepository.somarPorIngredienteETipo()) {
            Long ingredienteId = (Long) linha[0];
            TipoMovimentacao tipo = (TipoMovimentacao) linha[1];
            BigDecimal soma = toBigDecimal(linha[2]);
            saldos.merge(ingredienteId, tipo == TipoMovimentacao.SAIDA ? soma.negate() : soma, BigDecimal::add);
        }
        return saldos;
    }

    public BigDecimal saldo(Long ingredienteId) {
        BigDecimal saldo = BigDecimal.ZERO;
        for (Object[] linha : movimentacaoRepository.somarPorTipo(ingredienteId)) {
            TipoMovimentacao tipo = (TipoMovimentacao) linha[0];
            BigDecimal soma = toBigDecimal(linha[1]);
            saldo = tipo == TipoMovimentacao.SAIDA ? saldo.subtract(soma) : saldo.add(soma);
        }
        return saldo;
    }

    /** RF-031: saldo em tempo real de cada ingrediente ativo. */
    public PageResponse<EstoqueDto.SaldoResponse> listarSaldos(String busca, Pageable pageable) {
        Map<Long, BigDecimal> saldos = saldos();
        Page<Ingrediente> pagina = ingredienteRepository.buscar(busca == null ? "" : busca.trim(),
                StatusRegistro.ATIVO, pageable);
        return PageResponse.of(pagina.map(i -> toSaldo(i, saldos.getOrDefault(i.getId(), BigDecimal.ZERO))));
    }

    /** RF-032: ingredientes ativos abaixo do estoque mínimo, do mais crítico para o menos crítico. */
    public PageResponse<EstoqueDto.SaldoResponse> listarAlertas(Pageable pageable) {
        List<EstoqueDto.SaldoResponse> alertas = calcularAlertas();
        int inicio = (int) Math.min(pageable.getOffset(), alertas.size());
        int fim = Math.min(inicio + pageable.getPageSize(), alertas.size());
        Page<EstoqueDto.SaldoResponse> pagina = new PageImpl<>(alertas.subList(inicio, fim), pageable, alertas.size());
        return PageResponse.of(pagina);
    }

    public long contarAlertas() {
        return calcularAlertas().size();
    }

    private List<EstoqueDto.SaldoResponse> calcularAlertas() {
        Map<Long, BigDecimal> saldos = saldos();
        return ingredienteRepository.findByStatusOrderByNomeAsc(StatusRegistro.ATIVO).stream()
                .map(i -> toSaldo(i, saldos.getOrDefault(i.getId(), BigDecimal.ZERO)))
                .filter(EstoqueDto.SaldoResponse::abaixoMinimo)
                .sorted((a, b) -> percentual(a).compareTo(percentual(b)))
                .toList();
    }

    // ------------------------------ Movimentações ------------------------------

    /** RF-033: histórico de movimentações (mais recentes primeiro por padrão). */
    public PageResponse<EstoqueDto.MovimentacaoResponse> listarMovimentacoes(Long ingredienteId, TipoMovimentacao tipo,
                                                                            Pageable pageable) {
        Pageable ordenado = pageable.getSort().isSorted() ? pageable
                : PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), Sort.by(Sort.Direction.DESC, "createdAt"));
        return PageResponse.of(movimentacaoRepository.buscar(ingredienteId, tipo, ordenado).map(this::toResponse));
    }

    /** Movimentação manual: saída por perda (RF-030) ou entrada de ajuste (RF-028). */
    @Transactional
    public EstoqueDto.MovimentacaoResponse registrarManual(EstoqueDto.MovimentacaoRequest req) {
        Ingrediente ingrediente = ingredienteRepository.findById(req.ingredienteId())
                .orElseThrow(() -> RecursoNaoEncontradoException.de("Ingrediente", req.ingredienteId()));
        Usuario usuario = usuarioRepository.getReferenceById(SecurityUtils.usuarioLogado().getId());

        EstoqueMovimentacao mov;
        switch (req.tipo()) {
            case SAIDA -> {
                if (!MOTIVOS_PERDA.contains(req.motivo())) {
                    throw new RegraNegocioException("Para saída manual o motivo deve ser DESPERDICIO, VENCIMENTO, QUEBRA ou USO_INTERNO");
                }
                BigDecimal saldoAtual = saldo(ingrediente.getId());
                if (saldoAtual.compareTo(req.quantidade()) < 0) {
                    throw new RegraNegocioException("Saldo insuficiente de " + ingrediente.getNome() + ": disponível "
                            + formatar(saldoAtual) + " " + ingrediente.getUnidadePadrao());
                }
                mov = novaMovimentacao(ingrediente, TipoMovimentacao.SAIDA, req.quantidade(), req.motivo(), usuario);
                mov.setCustoUnitario(ingrediente.getCustoUnitario());
            }
            case ENTRADA -> {
                if (req.motivo() != MotivoMovimentacao.AJUSTE) {
                    throw new RegraNegocioException("Entrada manual deve usar o motivo AJUSTE. Entradas de compra são criadas no recebimento.");
                }
                mov = novaMovimentacao(ingrediente, TipoMovimentacao.ENTRADA, req.quantidade(), MotivoMovimentacao.AJUSTE, usuario);
                mov.setLote(req.lote());
                mov.setValidade(req.validade());
                mov.setCustoUnitario(req.custoUnitario() != null ? req.custoUnitario() : ingrediente.getCustoUnitario());
            }
            default -> throw new RegraNegocioException("Estornos são gerados automaticamente no cancelamento de pedidos");
        }
        mov.setObservacao(req.observacao());
        return toResponse(movimentacaoRepository.save(mov));
    }

    // ------------- Métodos usados por PedidoService e CompraService -------------

    @Transactional
    public EstoqueMovimentacao registrarSaidaVenda(Ingrediente ingrediente, BigDecimal quantidade, Pedido pedido, Usuario usuario) {
        EstoqueMovimentacao mov = novaMovimentacao(ingrediente, TipoMovimentacao.SAIDA, quantidade, MotivoMovimentacao.VENDA, usuario);
        mov.setPedido(pedido);
        mov.setCustoUnitario(ingrediente.getCustoUnitario());
        mov.setObservacao("Baixa automática do pedido #" + pedido.getId());
        return movimentacaoRepository.save(mov);
    }

    @Transactional
    public void registrarEstorno(EstoqueMovimentacao saidaOriginal, Usuario usuario) {
        EstoqueMovimentacao mov = novaMovimentacao(saidaOriginal.getIngrediente(), TipoMovimentacao.ESTORNO,
                saidaOriginal.getQuantidade(), MotivoMovimentacao.ESTORNO, usuario);
        mov.setPedido(saidaOriginal.getPedido());
        mov.setCustoUnitario(saidaOriginal.getCustoUnitario());
        mov.setObservacao("Estorno do pedido #" + saidaOriginal.getPedido().getId() + " cancelado");
        movimentacaoRepository.save(mov);
    }

    @Transactional
    public void registrarEntradaCompra(Ingrediente ingrediente, BigDecimal quantidade, BigDecimal custoUnitario,
                                       String lote, LocalDate validade, PedidoCompra compra, Usuario usuario) {
        EstoqueMovimentacao mov = novaMovimentacao(ingrediente, TipoMovimentacao.ENTRADA, quantidade, MotivoMovimentacao.COMPRA, usuario);
        mov.setCustoUnitario(custoUnitario);
        mov.setLote(lote);
        mov.setValidade(validade);
        mov.setPedidoCompra(compra);
        mov.setObservacao("Recebimento da compra #" + compra.getId());
        movimentacaoRepository.save(mov);
    }

    // ---------------------------------- Apoio ----------------------------------

    private EstoqueMovimentacao novaMovimentacao(Ingrediente ingrediente, TipoMovimentacao tipo, BigDecimal quantidade,
                                                 MotivoMovimentacao motivo, Usuario usuario) {
        EstoqueMovimentacao mov = new EstoqueMovimentacao();
        mov.setIngrediente(ingrediente);
        mov.setTipo(tipo);
        mov.setQuantidade(quantidade.setScale(4, RoundingMode.HALF_UP));
        mov.setMotivo(motivo);
        mov.setUsuario(usuario);
        return mov;
    }

    private EstoqueDto.SaldoResponse toSaldo(Ingrediente i, BigDecimal saldo) {
        BigDecimal saldoArred = saldo.setScale(3, RoundingMode.HALF_UP);
        boolean abaixo = saldo.compareTo(i.getEstoqueMinimo()) < 0;
        BigDecimal valor = saldo.multiply(i.getCustoUnitario()).setScale(2, RoundingMode.HALF_UP);
        return new EstoqueDto.SaldoResponse(i.getId(), i.getNome(), i.getSku(), i.getUnidadePadrao(), saldoArred,
                i.getEstoqueMinimo(), abaixo, i.getCustoUnitario(), valor);
    }

    private static BigDecimal percentual(EstoqueDto.SaldoResponse s) {
        if (s.estoqueMinimo().signum() == 0) {
            return BigDecimal.ONE;
        }
        return s.saldo().divide(s.estoqueMinimo(), 4, RoundingMode.HALF_UP);
    }

    private EstoqueDto.MovimentacaoResponse toResponse(EstoqueMovimentacao m) {
        Ingrediente i = m.getIngrediente();
        return new EstoqueDto.MovimentacaoResponse(m.getId(), i.getId(), i.getNome(), i.getUnidadePadrao(), m.getTipo(),
                m.getQuantidade(), m.getMotivo(), m.getLote(), m.getValidade(), m.getCustoUnitario(), m.getObservacao(),
                m.getPedido() == null ? null : m.getPedido().getId(),
                m.getPedidoCompra() == null ? null : m.getPedidoCompra().getId(),
                m.getUsuario() == null ? null : m.getUsuario().getNome(),
                m.getCreatedAt());
    }

    static String formatar(BigDecimal valor) {
        return valor.setScale(3, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
    }

    private static BigDecimal toBigDecimal(Object valor) {
        if (valor == null) {
            return BigDecimal.ZERO;
        }
        return valor instanceof BigDecimal bd ? bd : new BigDecimal(valor.toString());
    }
}
