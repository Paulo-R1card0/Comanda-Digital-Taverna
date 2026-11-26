package br.unasp.comanda;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Testes de integração: sobem a aplicação inteira contra um MySQL real
 * (no GitHub Actions o MySQL roda como serviço; veja .github/workflows/ci.yml).
 * Rodam as migrations do Flyway, o seed e os principais fluxos do sistema.
 */
@SpringBootTest
@AutoConfigureMockMvc
class ComandaApplicationTests {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper mapper;

    private String login(String email) throws Exception {
        String body = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"senha\":\"senha123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.usuario.senhaHash").doesNotExist())
                .andReturn().getResponse().getContentAsString();
        return "Bearer " + mapper.readTree(body).get("token").asText();
    }

    @Test
    void cardapioPublicoNaoExigeLogin() throws Exception {
        mvc.perform(get("/api/cardapio"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(8));
        mvc.perform(get("/api/cardapio/categorias")).andExpect(status().isOk());
    }

    /** V3: os 8 pratos do seed ganham nome, foto e descrição da Taverna da Brasa, sem mudar ID nem preço. */
    @Test
    void cardapioTematizadoDaTavernaDaBrasa() throws Exception {
        String[][] esperados = {
                {"1", "Brasão da Casa", "brasao-da-casa", "39.9"},
                {"2", "Bacon do Ferreiro", "bacon-do-ferreiro", "52.9"},
                {"3", "Açaí do Bosque", "acai-do-bosque", "32.9"},
                {"4", "Banquete do Viajante", "banquete-do-viajante", "34.9"},
                {"5", "Batatas da Mina", "batatas-da-mina", "22.9"},
                {"6", "Elixir de Limão", "elixir-de-limao", "9.9"},
                {"7", "Refrigerante da Taverna", "refrigerante-da-taverna", "7.0"},
                {"8", "Brownie da Forja", "brownie-da-forja", "14.9"},
        };
        for (String[] e : esperados) {
            mvc.perform(get("/api/cardapio/" + e[0]))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.nome").value(e[1]))
                    .andExpect(jsonPath("$.fotoUrl").value("/imagens/taverna/" + e[2] + ".webp"))
                    .andExpect(jsonPath("$.precoVenda").value(Double.parseDouble(e[3])))
                    .andExpect(jsonPath("$.descricao").isNotEmpty());
        }
        // A ficha completa continua só no painel (ADMIN/GERENTE) e com os mesmos itens/rendimento da V2
        String gerente = login("gerente@email.com");
        mvc.perform(get("/api/admin/pratos/8/ficha").header("Authorization", gerente))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rendimento").value(12))
                .andExpect(jsonPath("$.custo.itens.length()").value(4))
                .andExpect(jsonPath("$.modoPreparo").value(org.hamcrest.Matchers.containsString("12 porções")))
                .andExpect(jsonPath("$.modoPreparo").value(org.hamcrest.Matchers.containsString("corresponde a 1 porção")));
        mvc.perform(get("/api/admin/pratos/7/ficha").header("Authorization", gerente))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.modoPreparo").value(org.hamcrest.Matchers.containsString("Instrução de serviço")));
        String cliente = login("cliente@email.com");
        mvc.perform(get("/api/admin/pratos/8/ficha").header("Authorization", cliente)).andExpect(status().isForbidden());
    }

    @Test
    void loginInvalidoRetorna401() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin@email.com\",\"senha\":\"errada\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void rotasProtegidasExigemPerfil() throws Exception {
        mvc.perform(get("/api/admin/pratos")).andExpect(status().isUnauthorized());
        String cliente = login("cliente@email.com");
        mvc.perform(get("/api/admin/pratos").header("Authorization", cliente)).andExpect(status().isForbidden());
        String cozinheiro = login("cozinheiro@email.com");
        mvc.perform(get("/api/admin/fornecedores").header("Authorization", cozinheiro)).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/pedidos").header("Authorization", cozinheiro)).andExpect(status().isOk());
    }

    @Test
    void custoDoHamburguerBateComOExemploDaEspecificacao() throws Exception {
        String admin = login("admin@email.com");
        mvc.perform(get("/api/admin/pratos/1/custo").header("Authorization", admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.custoPorcao").value(15.30))
                .andExpect(jsonPath("$.faixa").value("VERMELHO"))
                .andExpect(jsonPath("$.aviso").exists());
        mvc.perform(get("/api/admin/pratos").header("Authorization", admin)).andExpect(status().isOk());
        mvc.perform(get("/api/admin/estoque/saldo").header("Authorization", admin)).andExpect(status().isOk());
        mvc.perform(get("/api/admin/estoque/alertas").header("Authorization", admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2));
        mvc.perform(get("/api/admin/estoque/movimentacoes").header("Authorization", admin)).andExpect(status().isOk());
        mvc.perform(get("/api/admin/dashboard/resumo").header("Authorization", admin)).andExpect(status().isOk());
        mvc.perform(get("/api/admin/dashboard/top-pratos").header("Authorization", admin)).andExpect(status().isOk());
        mvc.perform(get("/api/admin/dashboard/vendas").header("Authorization", admin)).andExpect(status().isOk());
        mvc.perform(get("/api/admin/cotacao/1").header("Authorization", admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ofertas[0].maisBarato").value(true));
        mvc.perform(get("/api/admin/cotacao/1/historico").header("Authorization", admin)).andExpect(status().isOk());
        mvc.perform(get("/api/admin/fornecedores/1/produtos").header("Authorization", admin)).andExpect(status().isOk());
        mvc.perform(get("/api/admin/usuarios").header("Authorization", admin)).andExpect(status().isOk());
        mvc.perform(get("/api/admin/categorias").header("Authorization", admin)).andExpect(status().isOk());
        mvc.perform(get("/api/admin/ingredientes").header("Authorization", admin)).andExpect(status().isOk());
        mvc.perform(get("/api/admin/compras").header("Authorization", admin)).andExpect(status().isOk());
    }

    @Test
    void fluxoCompletoDoPedidoComBaixaEEstorno() throws Exception {
        String cliente = login("cliente@email.com");
        String gerente = login("gerente@email.com");

        String criado = mvc.perform(post("/api/pedidos").header("Authorization", cliente)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"itens\":[{\"pratoId\":5,\"quantidade\":2,\"observacoes\":\"bem sequinha\"}],\"formaPagamento\":\"PIX\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("RECEBIDO"))
                .andReturn().getResponse().getContentAsString();
        long id = mapper.readTree(criado).get("id").asLong();

        mvc.perform(patch("/api/admin/pedidos/" + id + "/status").header("Authorization", gerente)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"CONFIRMADO\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMADO"));

        JsonNode movs = mapper.readTree(mvc.perform(get("/api/admin/estoque/movimentacoes?tipo=SAIDA")
                        .header("Authorization", gerente))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        org.junit.jupiter.api.Assertions.assertTrue(movs.get("totalElements").asInt() >= 3);

        mvc.perform(patch("/api/admin/pedidos/" + id + "/cancelar").header("Authorization", gerente)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"motivo\":\"Cliente desistiu\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELADO"));

        mvc.perform(get("/api/admin/estoque/movimentacoes?tipo=ESTORNO").header("Authorization", gerente))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(3));

        mvc.perform(get("/api/pedidos/meus").header("Authorization", cliente)).andExpect(status().isOk());
        mvc.perform(get("/api/pedidos/" + id + "/status").header("Authorization", cliente))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.historico.length()").value(3));
    }

    @Test
    void pedidoSemEstoqueRetorna422() throws Exception {
        String cliente = login("cliente@email.com");
        // Refrigerante começa com 10 latas no seed
        mvc.perform(post("/api/pedidos").header("Authorization", cliente).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"itens\":[{\"pratoId\":7,\"quantidade\":20}]}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.detalhes[0]").exists());
    }

    @Test
    void emailDuplicadoRetorna409ECnpjInvalido400() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":\"X\",\"email\":\"admin@email.com\",\"senha\":\"123456\",\"telefone\":\"1\",\"endereco\":\"Rua\"}"))
                .andExpect(status().isConflict());
        String admin = login("admin@email.com");
        mvc.perform(post("/api/admin/fornecedores").header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"razaoSocial\":\"Teste\",\"cnpj\":\"11.111.111/1111-11\"}"))
                .andExpect(status().isBadRequest());
    }
}
