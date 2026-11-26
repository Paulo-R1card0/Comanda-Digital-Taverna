package br.unasp.comanda.service;

import br.unasp.comanda.dto.FichaDto;
import br.unasp.comanda.exception.RecursoNaoEncontradoException;
import br.unasp.comanda.exception.RegraNegocioException;
import br.unasp.comanda.model.FichaTecnica;
import br.unasp.comanda.model.FichaTecnicaItem;
import br.unasp.comanda.model.Ingrediente;
import br.unasp.comanda.model.Prato;
import br.unasp.comanda.model.enums.StatusPrato;
import br.unasp.comanda.model.enums.UnidadeMedida;
import br.unasp.comanda.repository.FichaTecnicaRepository;
import br.unasp.comanda.repository.IngredienteRepository;
import br.unasp.comanda.repository.PratoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Ficha técnica e cálculo de custo (RF-011 a RF-014, RN01, RN02, RN08).
 *
 * Fórmulas:
 *   custo do item   = quantidade (convertida p/ unidade padrão) × fator_correcao × custo_unitario
 *   custo da porção = SUM(custo dos itens) / rendimento
 *   food cost (%)   = custo da porção / preço de venda × 100
 */
@Service
@Transactional(readOnly = true)
public class FichaTecnicaService {

    public static final BigDecimal LIMITE_VERDE = new BigDecimal("30");
    public static final BigDecimal LIMITE_AMARELO = new BigDecimal("35");
    private static final BigDecimal CEM = new BigDecimal("100");

    private final FichaTecnicaRepository fichaRepository;
    private final PratoRepository pratoRepository;
    private final IngredienteRepository ingredienteRepository;

    public FichaTecnicaService(FichaTecnicaRepository fichaRepository, PratoRepository pratoRepository,
                               IngredienteRepository ingredienteRepository) {
        this.fichaRepository = fichaRepository;
        this.pratoRepository = pratoRepository;
        this.ingredienteRepository = ingredienteRepository;
    }

    public FichaDto.Response buscarPorPrato(Long pratoId) {
        Prato prato = obterPrato(pratoId);
        FichaTecnica ficha = fichaRepository.findByPratoId(pratoId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("O prato '" + prato.getNome() + "' ainda não tem ficha técnica"));
        return toResponse(ficha);
    }

    /** Cria ou substitui a ficha técnica do prato (POST e PUT usam o mesmo fluxo). */
    @Transactional
    public FichaDto.Response salvar(Long pratoId, FichaDto.Request req) {
        Prato prato = obterPrato(pratoId);
        // RN01: um prato ATIVO não pode ficar sem ingredientes
        if (req.itens().isEmpty() && prato.getStatus() == StatusPrato.ATIVO) {
            throw new RegraNegocioException("Um prato ATIVO precisa ter pelo menos 1 ingrediente na ficha técnica. "
                    + "Inative o prato antes de remover todos os ingredientes.");
        }
        FichaTecnica ficha = fichaRepository.findByPratoId(pratoId).orElseGet(() -> {
            FichaTecnica nova = new FichaTecnica();
            nova.setPrato(prato);
            return nova;
        });
        ficha.setRendimento(req.rendimento());
        ficha.setModoPreparo(req.modoPreparo());
        ficha.getItens().clear();
        for (FichaDto.ItemRequest itemReq : req.itens()) {
            Ingrediente ingrediente = obterIngrediente(itemReq.ingredienteId());
            validarUnidade(ingrediente, itemReq.unidade());
            FichaTecnicaItem item = new FichaTecnicaItem();
            item.setFichaTecnica(ficha);
            item.setIngrediente(ingrediente);
            item.setQuantidade(itemReq.quantidade());
            item.setUnidade(itemReq.unidade());
            item.setFatorCorrecao(itemReq.fatorCorrecao());
            ficha.getItens().add(item);
        }
        return toResponse(fichaRepository.save(ficha));
    }

    /** GET /api/admin/pratos/{id}/custo */
    public FichaDto.CustoResponse calcularCustoDoPrato(Long pratoId) {
        Prato prato = obterPrato(pratoId);
        return fichaRepository.findByPratoId(pratoId)
                .map(this::calcular)
                .orElseGet(() -> custoVazio(prato.getPrecoVenda()));
    }

    /** Cálculo em tempo real para a tela da ficha, sem salvar nada (RF-012). */
    public FichaDto.CustoResponse simular(FichaDto.SimulacaoRequest req) {
        List<Linha> linhas = new ArrayList<>();
        for (FichaDto.ItemRequest i : req.itens()) {
            Ingrediente ing = obterIngrediente(i.ingredienteId());
            validarUnidade(ing, i.unidade());
            linhas.add(new Linha(null, ing, i.quantidade(), i.unidade(), i.fatorCorrecao()));
        }
        return calcular(linhas, req.rendimento(), req.precoVenda());
    }

    public FichaDto.CustoResponse calcular(FichaTecnica ficha) {
        List<Linha> linhas = ficha.getItens().stream()
                .map(i -> new Linha(i.getId(), i.getIngrediente(), i.getQuantidade(), i.getUnidade(), i.getFatorCorrecao()))
                .toList();
        return calcular(linhas, ficha.getRendimento(), ficha.getPrato().getPrecoVenda());
    }

    /**
     * Quanto de cada ingrediente (chave = id do ingrediente, valor na unidade padrão)
     * é consumido por UMA porção do prato. Usado na validação e na baixa de estoque (RN03, RF-017).
     */
    public Map<Long, BigDecimal> consumoPorPorcao(FichaTecnica ficha) {
        Map<Long, BigDecimal> consumo = new HashMap<>();
        BigDecimal rendimento = BigDecimal.valueOf(ficha.getRendimento());
        for (FichaTecnicaItem item : ficha.getItens()) {
            Ingrediente ing = item.getIngrediente();
            BigDecimal qtd = item.getUnidade().converter(item.getQuantidade(), ing.getUnidadePadrao())
                    .multiply(item.getFatorCorrecao())
                    .divide(rendimento, 6, RoundingMode.HALF_UP);
            consumo.merge(ing.getId(), qtd, BigDecimal::add);
        }
        return consumo;
    }

    public static String faixa(BigDecimal foodCost) {
        if (foodCost == null) {
            return null;
        }
        if (foodCost.compareTo(LIMITE_VERDE) <= 0) {
            return "VERDE";
        }
        return foodCost.compareTo(LIMITE_AMARELO) <= 0 ? "AMARELO" : "VERMELHO";
    }

    // ------------------------------------------------------------------------------------------

    private record Linha(Long id, Ingrediente ingrediente, BigDecimal quantidade, UnidadeMedida unidade,
                         BigDecimal fatorCorrecao) {
    }

    private FichaDto.CustoResponse calcular(List<Linha> linhas, Integer rendimento, BigDecimal precoVenda) {
        BigDecimal total = BigDecimal.ZERO;
        List<FichaDto.ItemResponse> itens = new ArrayList<>();
        for (Linha l : linhas) {
            Ingrediente ing = l.ingrediente();
            BigDecimal qtdPadrao = l.unidade().converter(l.quantidade(), ing.getUnidadePadrao());
            BigDecimal custoItem = qtdPadrao.multiply(l.fatorCorrecao()).multiply(ing.getCustoUnitario());
            total = total.add(custoItem);
            itens.add(new FichaDto.ItemResponse(l.id(), ing.getId(), ing.getNome(), l.quantidade(), l.unidade(),
                    l.fatorCorrecao(), ing.getCustoUnitario(), ing.getUnidadePadrao(),
                    custoItem.setScale(2, RoundingMode.HALF_UP)));
        }
        int rend = rendimento == null || rendimento < 1 ? 1 : rendimento;
        BigDecimal custoPorcao = total.divide(BigDecimal.valueOf(rend), 2, RoundingMode.HALF_UP);
        BigDecimal foodCost = precoVenda == null || precoVenda.signum() == 0
                ? BigDecimal.ZERO
                : custoPorcao.multiply(CEM).divide(precoVenda, 2, RoundingMode.HALF_UP);
        String faixa = faixa(foodCost);
        // RN02: acima de 35% não bloqueia, só avisa
        String aviso = foodCost.compareTo(LIMITE_AMARELO) > 0
                ? "Atenção: food cost de " + foodCost + "% está acima do limite de 35%. Revise o preço ou a ficha técnica."
                : null;
        return new FichaDto.CustoResponse(precoVenda, rend, total.setScale(2, RoundingMode.HALF_UP), custoPorcao,
                foodCost, faixa, aviso, itens);
    }

    private FichaDto.CustoResponse custoVazio(BigDecimal precoVenda) {
        return new FichaDto.CustoResponse(precoVenda, 1, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                "VERDE", "Prato sem ficha técnica: cadastre os ingredientes para calcular o custo.", List.of());
    }

    private void validarUnidade(Ingrediente ingrediente, UnidadeMedida unidade) {
        if (!unidade.compativelCom(ingrediente.getUnidadePadrao())) {
            throw new RegraNegocioException("Unidade " + unidade + " não é compatível com o ingrediente '"
                    + ingrediente.getNome() + "' (unidade padrão " + ingrediente.getUnidadePadrao() + ")");
        }
    }

    private FichaDto.Response toResponse(FichaTecnica f) {
        return new FichaDto.Response(f.getId(), f.getPrato().getId(), f.getPrato().getNome(), f.getRendimento(),
                f.getModoPreparo(), calcular(f));
    }

    private Prato obterPrato(Long id) {
        return pratoRepository.findById(id).orElseThrow(() -> RecursoNaoEncontradoException.de("Prato", id));
    }

    private Ingrediente obterIngrediente(Long id) {
        return ingredienteRepository.findById(id).orElseThrow(() -> RecursoNaoEncontradoException.de("Ingrediente", id));
    }
}
