package br.unasp.comanda.controller;

import br.unasp.comanda.dto.FichaDto;
import br.unasp.comanda.dto.PageResponse;
import br.unasp.comanda.dto.PratoDto;
import br.unasp.comanda.model.enums.StatusPrato;
import br.unasp.comanda.service.FichaTecnicaService;
import br.unasp.comanda.service.PratoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/** Pratos, ficha técnica e custos (RF-010 a RF-014). */
@RestController
@RequestMapping("/api/admin/pratos")
@PreAuthorize("hasAnyRole('ADMIN','GERENTE')")
@Tag(name = "6. Pratos e fichas técnicas")
public class PratoController {

    private final PratoService pratoService;
    private final FichaTecnicaService fichaService;

    public PratoController(PratoService pratoService, FichaTecnicaService fichaService) {
        this.pratoService = pratoService;
        this.fichaService = fichaService;
    }

    @GetMapping
    @Operation(summary = "Lista pratos com custo e food cost (paginado)")
    public PageResponse<PratoDto.Response> listar(@RequestParam(required = false) String busca,
                                                  @RequestParam(required = false) Long categoriaId,
                                                  @RequestParam(required = false) StatusPrato status,
                                                  @ParameterObject @PageableDefault(sort = "nome") Pageable pageable) {
        return pratoService.listar(busca, categoriaId, status, pageable);
    }

    @GetMapping("/{id}")
    public PratoDto.Response buscar(@PathVariable Long id) {
        return pratoService.buscar(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Cria um prato (nasce INATIVO até ter ficha técnica - RN01)")
    public PratoDto.Response criar(@Valid @RequestBody PratoDto.Request req) {
        return pratoService.criar(req);
    }

    @PutMapping("/{id}")
    public PratoDto.Response atualizar(@PathVariable Long id, @Valid @RequestBody PratoDto.Request req) {
        return pratoService.atualizar(id, req);
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Ativa, pausa ou inativa o prato (ativar exige ficha técnica - RN01)")
    public PratoDto.Response alterarStatus(@PathVariable Long id, @Valid @RequestBody PratoDto.StatusRequest req) {
        return pratoService.atualizarStatus(id, req.status());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Desativa o prato (exclusão lógica)")
    public void desativar(@PathVariable Long id) {
        pratoService.desativar(id);
    }

    // ------------------------------ Custo ------------------------------

    @GetMapping("/{id}/custo")
    @Operation(summary = "Custo calculado e food cost do prato (com aviso se passar de 35%)")
    public FichaDto.CustoResponse custo(@PathVariable Long id) {
        return fichaService.calcularCustoDoPrato(id);
    }

    @PostMapping("/simular-custo")
    @Operation(summary = "Calcula o custo de uma ficha sem salvar (usado em tempo real na tela)")
    public FichaDto.CustoResponse simular(@Valid @RequestBody FichaDto.SimulacaoRequest req) {
        return fichaService.simular(req);
    }

    // ------------------------------ Ficha técnica ------------------------------

    @GetMapping("/{id}/ficha")
    public FichaDto.Response ficha(@PathVariable Long id) {
        return fichaService.buscarPorPrato(id);
    }

    @PostMapping("/{id}/ficha")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Cria a ficha técnica do prato")
    public FichaDto.Response criarFicha(@PathVariable Long id, @Valid @RequestBody FichaDto.Request req) {
        return fichaService.salvar(id, req);
    }

    @PutMapping("/{id}/ficha")
    @Operation(summary = "Substitui a ficha técnica do prato")
    public FichaDto.Response atualizarFicha(@PathVariable Long id, @Valid @RequestBody FichaDto.Request req) {
        return fichaService.salvar(id, req);
    }
}
