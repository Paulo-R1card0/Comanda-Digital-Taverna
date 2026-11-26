package br.unasp.comanda.service;

import br.unasp.comanda.dto.DashboardDto;
import br.unasp.comanda.model.FichaTecnica;
import br.unasp.comanda.model.enums.StatusPedido;
import br.unasp.comanda.repository.FichaTecnicaRepository;
import br.unasp.comanda.repository.PedidoItemRepository;
import br.unasp.comanda.repository.PedidoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Indicadores do dashboard (RF-034 a RF-037). As agregações são feitas por queries no repository. */
@Service
@Transactional(readOnly = true)
public class DashboardService {

    private static final List<StatusPedido> EM_ABERTO = List.of(StatusPedido.RECEBIDO, StatusPedido.CONFIRMADO,
            StatusPedido.EM_PREPARO, StatusPedido.PRONTO, StatusPedido.SAIU_ENTREGA);

    private final PedidoRepository pedidoRepository;
    private final PedidoItemRepository pedidoItemRepository;
    private final FichaTecnicaRepository fichaRepository;
    private final FichaTecnicaService fichaService;
    private final EstoqueService estoqueService;

    public DashboardService(PedidoRepository pedidoRepository, PedidoItemRepository pedidoItemRepository,
                            FichaTecnicaRepository fichaRepository, FichaTecnicaService fichaService,
                            EstoqueService estoqueService) {
        this.pedidoRepository = pedidoRepository;
        this.pedidoItemRepository = pedidoItemRepository;
        this.fichaRepository = fichaRepository;
        this.fichaService = fichaService;
        this.estoqueService = estoqueService;
    }

    /** RF-034: faturamento, total de pedidos, ticket médio e food cost médio do dia. */
    public DashboardDto.Resumo resumo(LocalDate data) {
        LocalDate dia = data == null ? LocalDate.now() : data;
        LocalDateTime inicio = dia.atStartOfDay();
        LocalDateTime fim = dia.plusDays(1).atStartOfDay();

        BigDecimal faturamento = pedidoRepository.somarFaturamento(StatusPedido.CANCELADO, inicio, fim);
        long totalPedidos = pedidoRepository.contarPedidos(StatusPedido.CANCELADO, inicio, fim);
        BigDecimal ticket = totalPedidos == 0 ? BigDecimal.ZERO
                : faturamento.divide(BigDecimal.valueOf(totalPedidos), 2, RoundingMode.HALF_UP);

        return new DashboardDto.Resumo(dia, faturamento.setScale(2, RoundingMode.HALF_UP), totalPedidos, ticket,
                foodCostMedio(inicio, fim), pedidoRepository.countByStatusIn(EM_ABERTO), estoqueService.contarAlertas());
    }

    /** RF-035: top 5 pratos mais vendidos no período. */
    public List<DashboardDto.TopPrato> topPratos(LocalDate inicio, LocalDate fim) {
        return ranking(inicio, fim).stream().limit(5).toList();
    }

    /** RF-037: faturamento diário no período (dias sem venda aparecem com zero). */
    public List<DashboardDto.VendaDia> vendasPorPeriodo(LocalDate inicio, LocalDate fim) {
        LocalDate de = inicio == null ? LocalDate.now().minusDays(6) : inicio;
        LocalDate ate = fim == null ? LocalDate.now() : fim;
        Map<LocalDate, BigDecimal[]> porDia = new TreeMap<>();
        for (LocalDate d = de; !d.isAfter(ate); d = d.plusDays(1)) {
            porDia.put(d, new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});
        }
        for (Object[] linha : pedidoRepository.buscarVendas(StatusPedido.CANCELADO, de.atStartOfDay(),
                ate.plusDays(1).atStartOfDay())) {
            LocalDate dia = ((LocalDateTime) linha[0]).toLocalDate();
            BigDecimal[] acc = porDia.get(dia);
            if (acc != null) {
                acc[0] = acc[0].add(toBigDecimal(linha[1]));
                acc[1] = acc[1].add(BigDecimal.ONE);
            }
        }
        List<DashboardDto.VendaDia> resultado = new ArrayList<>();
        porDia.forEach((dia, acc) -> {
            long pedidos = acc[1].longValue();
            BigDecimal ticket = pedidos == 0 ? BigDecimal.ZERO
                    : acc[0].divide(BigDecimal.valueOf(pedidos), 2, RoundingMode.HALF_UP);
            resultado.add(new DashboardDto.VendaDia(dia, acc[0].setScale(2, RoundingMode.HALF_UP), pedidos, ticket));
        });
        return resultado;
    }

    // ------------------------------ Apoio ------------------------------

    private List<DashboardDto.TopPrato> ranking(LocalDate inicio, LocalDate fim) {
        LocalDate de = inicio == null ? LocalDate.now().minusDays(29) : inicio;
        LocalDate ate = fim == null ? LocalDate.now() : fim;
        return pedidoItemRepository.rankingPratos(StatusPedido.CANCELADO, de.atStartOfDay(), ate.plusDays(1).atStartOfDay())
                .stream()
                .map(l -> new DashboardDto.TopPrato((Long) l[0], (String) l[1], ((Number) l[2]).longValue(),
                        toBigDecimal(l[3]).setScale(2, RoundingMode.HALF_UP)))
                .toList();
    }

    /**
     * Food cost médio ponderado pelas vendas do período:
     * SUM(qtd vendida × custo atual da porção) / faturamento × 100.
     */
    private BigDecimal foodCostMedio(LocalDateTime inicio, LocalDateTime fim) {
        List<Object[]> vendas = pedidoItemRepository.rankingPratos(StatusPedido.CANCELADO, inicio, fim);
        if (vendas.isEmpty()) {
            return BigDecimal.ZERO;
        }
        List<Long> pratoIds = vendas.stream().map(l -> (Long) l[0]).toList();
        Map<Long, FichaTecnica> fichas = fichaRepository.buscarComItens(pratoIds).stream()
                .collect(Collectors.toMap(f -> f.getPrato().getId(), Function.identity()));
        BigDecimal custo = BigDecimal.ZERO;
        BigDecimal receita = BigDecimal.ZERO;
        for (Object[] l : vendas) {
            FichaTecnica ficha = fichas.get((Long) l[0]);
            BigDecimal qtd = BigDecimal.valueOf(((Number) l[2]).longValue());
            receita = receita.add(toBigDecimal(l[3]));
            if (ficha != null) {
                custo = custo.add(fichaService.calcular(ficha).custoPorcao().multiply(qtd));
            }
        }
        return receita.signum() == 0 ? BigDecimal.ZERO
                : custo.multiply(BigDecimal.valueOf(100)).divide(receita, 2, RoundingMode.HALF_UP);
    }

    private static BigDecimal toBigDecimal(Object valor) {
        if (valor == null) {
            return BigDecimal.ZERO;
        }
        return valor instanceof BigDecimal bd ? bd : new BigDecimal(valor.toString());
    }
}
