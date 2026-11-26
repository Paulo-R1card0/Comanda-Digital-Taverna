package br.unasp.comanda.dto;

import br.unasp.comanda.model.enums.StatusCompra;
import br.unasp.comanda.model.enums.UnidadeMedida;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** DTOs de pedido de compra e recebimento (RF-024, RF-025). */
public final class CompraDto {

    private CompraDto() {
    }

    /**
     * Quantidade e preço na unidade padrão do ingrediente.
     * Se o preço não for enviado, usa o preço do catálogo do fornecedor.
     */
    public record ItemRequest(
            @NotNull Long ingredienteId,
            @NotNull @DecimalMin(value = "0.001", message = "deve ser maior que zero") BigDecimal quantidade,
            @DecimalMin("0") BigDecimal precoUnitario
    ) {
    }

    public record Request(
            @NotNull Long fornecedorId,
            @Size(max = 500) String observacoes,
            @NotEmpty(message = "informe ao menos um item") @Valid List<ItemRequest> itens
    ) {
    }

    public record ItemResponse(
            Long id,
            Long ingredienteId,
            String ingredienteNome,
            UnidadeMedida unidade,
            BigDecimal quantidade,
            BigDecimal precoUnitario,
            BigDecimal subtotal
    ) {
    }

    public record Response(
            Long id,
            Long fornecedorId,
            String fornecedorNome,
            StatusCompra status,
            BigDecimal valorTotal,
            String observacoes,
            String usuarioNome,
            LocalDateTime createdAt,
            LocalDateTime recebidoEm,
            List<ItemResponse> itens
    ) {
    }

    /** Lote e validade por item no recebimento (opcionais). */
    public record RecebimentoItem(
            @NotNull Long itemId,
            @Size(max = 40) String lote,
            LocalDate validade
    ) {
    }

    public record RecebimentoRequest(@Valid List<RecebimentoItem> itens) {
    }
}
