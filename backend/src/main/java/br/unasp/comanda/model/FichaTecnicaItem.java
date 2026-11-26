package br.unasp.comanda.model;

import br.unasp.comanda.model.enums.*;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "ficha_tecnica_item")
public class FichaTecnicaItem {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "ficha_tecnica_id")
    private FichaTecnica fichaTecnica;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "ingrediente_id")
    private Ingrediente ingrediente;
    @Column(nullable = false, precision = 12, scale = 3)
    private BigDecimal quantidade;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 5)
    private UnidadeMedida unidade;
    @Column(name = "fator_correcao", nullable = false, precision = 6, scale = 2)
    private BigDecimal fatorCorrecao = BigDecimal.ONE;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public FichaTecnica getFichaTecnica() { return fichaTecnica; }
    public void setFichaTecnica(FichaTecnica fichaTecnica) { this.fichaTecnica = fichaTecnica; }
    public Ingrediente getIngrediente() { return ingrediente; }
    public void setIngrediente(Ingrediente ingrediente) { this.ingrediente = ingrediente; }
    public BigDecimal getQuantidade() { return quantidade; }
    public void setQuantidade(BigDecimal quantidade) { this.quantidade = quantidade; }
    public UnidadeMedida getUnidade() { return unidade; }
    public void setUnidade(UnidadeMedida unidade) { this.unidade = unidade; }
    public BigDecimal getFatorCorrecao() { return fatorCorrecao; }
    public void setFatorCorrecao(BigDecimal fatorCorrecao) { this.fatorCorrecao = fatorCorrecao; }
}
