package br.unasp.comanda.controller;

import io.swagger.v3.oas.annotations.Hidden;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** Página inicial da API: útil para "acordar" o servidor e achar o Swagger. */
@Hidden
@RestController
public class HomeController {

    @GetMapping("/")
    public Map<String, String> home() {
        return Map.of(
                "sistema", "Comanda Digital API",
                "status", "online",
                "swagger", "/swagger-ui.html"
        );
    }
}
