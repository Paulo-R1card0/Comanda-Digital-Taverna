package br.unasp.comanda.controller;

import br.unasp.comanda.dto.DashboardDto;
import br.unasp.comanda.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/** Dashboard (RF-034 a RF-037). */
@RestController
@RequestMapping("/api/admin/dashboard")
@PreAuthorize("hasAnyRole('ADMIN','GERENTE')")
@Tag(name = "12. Dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/resumo")
    @Operation(summary = "KPIs do dia: faturamento, pedidos, ticket médio e food cost médio")
    public DashboardDto.Resumo resumo(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate data) {
        return dashboardService.resumo(data);
    }

    @GetMapping("/top-pratos")
    @Operation(summary = "Top 5 pratos mais vendidos no período (padrão: últimos 30 dias)")
    public List<DashboardDto.TopPrato> topPratos(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim) {
        return dashboardService.topPratos(inicio, fim);
    }

    @GetMapping("/vendas")
    @Operation(summary = "Faturamento diário no período (padrão: últimos 7 dias)")
    public List<DashboardDto.VendaDia> vendas(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim) {
        return dashboardService.vendasPorPeriodo(inicio, fim);
    }
}
