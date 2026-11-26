package br.unasp.comanda.model;

import br.unasp.comanda.model.enums.*;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "fornecedor_produto")
public class FornecedorProduto {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "fornecedor_id")
    private Fornecedor fornecedor;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "ingrediente_id")
    private Ingrediente ingrediente;
    @Column(nullable = false, precision = 10, scale = 4)
    private BigDecimal preco;
    @Enumerated(EnumType.STRING) @Column(name = "unidade_venda", nullable = false, length = 5)
    private UnidadeMedida unidadeVenda;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 10)
    private StatusRegistro status = StatusRegistro.ATIVO;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Fornecedor getFornecedor() { return fornecedor; }
    public void setFornecedor(Fornecedor fornecedor) { this.fornecedor = fornecedor; }
    public Ingrediente getIngrediente() { return ingrediente; }
    public void setIngrediente(Ingrediente ingrediente) { this.ingrediente = ingrediente; }
    public BigDecimal getPreco() { return preco; }
    public void setPreco(BigDecimal preco) { this.preco = preco; }
    public UnidadeMedida getUnidadeVenda() { return unidadeVenda; }
    public void setUnidadeVenda(UnidadeMedida unidadeVenda) { this.unidadeVenda = unidadeVenda; }
    public StatusRegistro getStatus() { return status; }
    public void setStatus(StatusRegistro status) { this.status = status; }
}
