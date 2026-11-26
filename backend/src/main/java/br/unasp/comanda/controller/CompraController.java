package br.unasp.comanda.controller;

import br.unasp.comanda.dto.CompraDto;
import br.unasp.comanda.dto.PageResponse;
import br.unasp.comanda.model.enums.StatusCompra;
import br.unasp.comanda.service.CompraService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/** Pedidos de compra e recebimento (RF-024, RF-025). */
@RestController
@RequestMapping("/api/admin/compras")
@PreAuthorize("hasAnyRole('ADMIN','GERENTE')")
@Tag(name = "11. Compras")
public class CompraController {

    private final CompraService compraService;

    public CompraController(CompraService compraService) {
        this.compraService = compraService;
    }

    @GetMapping
    public PageResponse<CompraDto.Response> listar(@RequestParam(required = false) StatusCompra status,
                                                   @RequestParam(required = false) Long fornecedorId,
                                                   @ParameterObject Pageable pageable) {
        return compraService.listar(status, fornecedorId, pageable);
    }

    @GetMapping("/{id}")
    public CompraDto.Response buscar(@PathVariable Long id) {
        return compraService.buscar(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Cria um pedido de compra em RASCUNHO (preço do catálogo se não for informado)")
    public CompraDto.Response criar(@Valid @RequestBody CompraDto.Request req) {
        return compraService.criar(req);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Edita a compra (somente em RASCUNHO)")
    public CompraDto.Response atualizar(@PathVariable Long id, @Valid @RequestBody CompraDto.Request req) {
        return compraService.atualizar(id, req);
    }

    @PatchMapping("/{id}/enviar")
    @Operation(summary = "RASCUNHO > ENVIADO")
    public CompraDto.Response enviar(@PathVariable Long id) {
        return compraService.enviar(id);
    }

    @PostMapping("/{id}/receber")
    @Operation(summary = "ENVIADO > RECEBIDO: entrada no estoque e atualização do custo dos ingredientes")
    public CompraDto.Response receber(@PathVariable Long id,
                                      @Valid @RequestBody(required = false) CompraDto.RecebimentoRequest req) {
        return compraService.receber(id, req);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Cancela a compra (exclusão lógica)")
    public CompraDto.Response cancelar(@PathVariable Long id) {
        return compraService.cancelar(id);
    }
}
