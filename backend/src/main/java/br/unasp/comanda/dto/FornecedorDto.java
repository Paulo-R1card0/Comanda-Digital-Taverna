package br.unasp.comanda.dto;

import br.unasp.comanda.model.enums.StatusRegistro;
import br.unasp.comanda.model.enums.UnidadeMedida;
import br.unasp.comanda.validation.Cnpj;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/** DTOs de fornecedores, catálogo e cotação (RF-021 a RF-023, RF-026). */
public final class FornecedorDto {

    private FornecedorDto() {
    }

    public record Request(
            @NotBlank @Size(max = 160) String razaoSocial,
            @NotBlank @Cnpj String cnpj,
            @Size(max = 20) String telefone,
            @Email @Size(max = 160) String email,
            @Size(max = 255) String categorias,
            StatusRegistro status
    ) {
    }

    public record Response(
            Long id,
            String razaoSocial,
            String cnpj,
            String telefone,
            String email,
            String categorias,
            StatusRegistro status
    ) {
    }

    /** RF-022: "esse fornecedor vende alface a R$ 12,00 o KG". */
    public record ProdutoRequest(
            @NotNull Long ingredienteId,
            @NotNull @DecimalMin(value = "0.0001", message = "deve ser maior que zero") BigDecimal preco,
            @NotNull UnidadeMedida unidadeVenda
    ) {
    }

    public record ProdutoResponse(
            Long id,
            Long fornecedorId,
            Long ingredienteId,
            String ingredienteNome,
            UnidadeMedida unidadePadrao,
            BigDecimal preco,
            UnidadeMedida unidadeVenda,
            BigDecimal precoPorUnidadePadrao
    ) {
    }

    public record Oferta(
            Long fornecedorId,
            String fornecedorNome,
            BigDecimal preco,
            UnidadeMedida unidadeVenda,
            BigDecimal precoPorUnidadePadrao,
            boolean maisBarato
    ) {
    }

    /** RF-023: cotação comparativa, ordenada do menor para o maior preço. */
    public record CotacaoResponse(
            Long ingredienteId,
            String ingredienteNome,
            UnidadeMedida unidadePadrao,
            BigDecimal custoAtual,
            List<Oferta> ofertas
    ) {
    }

    /** RF-026: um ponto do histórico de preços (na unidade padrão do ingrediente). */
    public record HistoricoPreco(
            Long fornecedorId,
            String fornecedorNome,
            BigDecimal precoUnitario,
            LocalDateTime data
    ) {
    }
}
