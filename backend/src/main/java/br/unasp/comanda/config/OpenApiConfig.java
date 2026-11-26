package br.unasp.comanda.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Swagger (RNF11), disponível em /swagger-ui.html.
 * Para testar rotas protegidas: faça POST /api/auth/login, copie o token e clique em "Authorize".
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI openAPI() {
        String esquema = "bearerAuth";
        return new OpenAPI()
                .info(new Info()
                        .title("Comanda Digital API")
                        .version("1.0.0")
                        .description("Sistema de pedidos para Dark Kitchen - UNASP SP. "
                                + "Login de teste: admin@email.com / senha123"))
                .addSecurityItem(new SecurityRequirement().addList(esquema))
                .components(new Components().addSecuritySchemes(esquema, new SecurityScheme()
                        .name(esquema)
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")));
    }
}
