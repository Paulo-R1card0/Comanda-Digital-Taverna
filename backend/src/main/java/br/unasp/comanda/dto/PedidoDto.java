package br.unasp.comanda.dto;

import br.unasp.comanda.model.enums.CanalPedido;
import br.unasp.comanda.model.enums.FormaPagamento;
import br.unasp.comanda.model.enums.StatusPedido;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/** DTOs de pedido do cliente e da cozinha (RF-006 a RF-008, RF-015 a RF-020). */
public final class PedidoDto {

    private PedidoDto() {
    }

    public record ItemRequest(
            @NotNull Long pratoId,
            @NotNull @Min(1) @Max(50) Integer quantidade,
            @Size(max = 255) String observacoes
    ) {
    }

    /** Carrinho > pedido. Os preços são sempre lidos do banco, nunca do front. */
    public record CriarRequest(
            @NotEmpty(message = "o carrinho está vazio") @Valid List<ItemRequest> itens,
            @Size(max = 255) String enderecoEntrega,
            @Size(max = 500) String observacoes,
            FormaPagamento formaPagamento
    ) {
    }

    public record StatusRequest(@NotNull StatusPedido status) {
    }

    public record CancelarRequest(
            @NotBlank(message = "informe o motivo do cancelamento") @Size(max = 500) String motivo
    ) {
    }

    public record ItemResponse(
            Long id,
            Long pratoId,
            String pratoNome,
            String fotoUrl,
            Integer quantidade,
            BigDecimal precoUnitario,
            BigDecimal subtotal,
            String observacoes
    ) {
    }

    public record HistoricoResponse(
            StatusPedido status,
            LocalDateTime data,
            String usuarioNome
    ) {
    }

    public record Response(
            Long id,
            StatusPedido status,
            CanalPedido canal,
            FormaPagamento formaPagamento,
            boolean pago,
            BigDecimal valorTotal,
            String enderecoEntrega,
            String observacoes,
            String motivoCancelamento,
            Long clienteId,
            String clienteNome,
            String clienteEmail,
            String clienteTelefone,
            LocalDateTime createdAt,
            LocalDateTime updatedAt,
            List<ItemResponse> itens,
            List<HistoricoResponse> historico
    ) {
    }

    public record StatusResponse(
            Long id,
            StatusPedido status,
            String motivoCancelamento,
            List<HistoricoResponse> historico
    ) {
    }
}
