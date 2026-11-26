package br.unasp.comanda.controller;

import br.unasp.comanda.dto.PageResponse;
import br.unasp.comanda.dto.PedidoDto;
import br.unasp.comanda.service.PedidoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/** Pedidos do cliente logado (RF-006 a RF-008). */
@RestController
@RequestMapping("/api/pedidos")
@PreAuthorize("hasRole('CLIENTE')")
@Tag(name = "3. Pedidos do cliente")
public class PedidoController {

    private final PedidoService pedidoService;

    public PedidoController(PedidoService pedidoService) {
        this.pedidoService = pedidoService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Cria o pedido a partir do carrinho (valida estoque: 422 se faltar ingrediente)")
    public PedidoDto.Response criar(@Valid @RequestBody PedidoDto.CriarRequest req) {
        return pedidoService.criar(req);
    }

    @GetMapping("/meus")
    @Operation(summary = "Histórico de pedidos do cliente logado (mais recente primeiro)")
    public PageResponse<PedidoDto.Response> meus(@ParameterObject Pageable pageable) {
        return pedidoService.meusPedidos(pageable);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Detalhe de um pedido do cliente logado")
    public PedidoDto.Response detalhe(@PathVariable Long id) {
        return pedidoService.meuPedido(id);
    }

    @GetMapping("/{id}/status")
    @Operation(summary = "Status atual e linha do tempo do pedido")
    public PedidoDto.StatusResponse status(@PathVariable Long id) {
        return pedidoService.statusDoMeuPedido(id);
    }

    @PatchMapping("/{id}/cancelar")
    @Operation(summary = "Cliente cancela o próprio pedido (só antes de entrar em preparo)")
    public PedidoDto.Response cancelar(@PathVariable Long id, @Valid @RequestBody PedidoDto.CancelarRequest req) {
        return pedidoService.cancelarMeuPedido(id, req.motivo());
    }
}
