package br.unasp.comanda.controller;

import br.unasp.comanda.dto.PageResponse;
import br.unasp.comanda.dto.PedidoDto;
import br.unasp.comanda.model.enums.CanalPedido;
import br.unasp.comanda.model.enums.StatusPedido;
import br.unasp.comanda.service.PedidoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

/** Painel da cozinha (RF-015 a RF-020). */
@RestController
@RequestMapping("/api/admin/pedidos")
@Tag(name = "4. Pedidos (cozinha)")
public class PedidoAdminController {

    private final PedidoService pedidoService;

    public PedidoAdminController(PedidoService pedidoService) {
        this.pedidoService = pedidoService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','GERENTE','COZINHEIRO')")
    @Operation(summary = "Lista pedidos com filtros de status, canal e período (paginado, mais recentes primeiro)")
    public PageResponse<PedidoDto.Response> listar(
            @RequestParam(required = false) StatusPedido status,
            @RequestParam(required = false) CanalPedido canal,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataFim,
            @ParameterObject Pageable pageable) {
        return pedidoService.listar(status, canal, dataInicio, dataFim, pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','GERENTE','COZINHEIRO')")
    @Operation(summary = "Detalhe do pedido: itens, cliente, valores e linha do tempo")
    public PedidoDto.Response detalhe(@PathVariable Long id) {
        return pedidoService.buscar(id);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','GERENTE','COZINHEIRO')")
    @Operation(summary = "Avança o status. Ao CONFIRMAR, dá baixa automática no estoque")
    public PedidoDto.Response alterarStatus(@PathVariable Long id, @Valid @RequestBody PedidoDto.StatusRequest req) {
        return pedidoService.alterarStatus(id, req.status());
    }

    @PatchMapping("/{id}/cancelar")
    @PreAuthorize("hasAnyRole('ADMIN','GERENTE')")
    @Operation(summary = "Cancela com motivo e estorna o estoque (se já tinha sido baixado)")
    public PedidoDto.Response cancelar(@PathVariable Long id, @Valid @RequestBody PedidoDto.CancelarRequest req) {
        return pedidoService.cancelarPeloPainel(id, req.motivo());
    }
}
