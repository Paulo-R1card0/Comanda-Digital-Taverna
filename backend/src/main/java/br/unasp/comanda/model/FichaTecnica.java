package br.unasp.comanda.model;

import br.unasp.comanda.model.enums.*;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "ficha_tecnica")
public class FichaTecnica {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @OneToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "prato_id", unique = true)
    private Prato prato;
    @Column(nullable = false)
    private Integer rendimento = 1;
    @Column(name = "modo_preparo", columnDefinition = "TEXT")
    private String modoPreparo;
    @OneToMany(mappedBy = "fichaTecnica", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<FichaTecnicaItem> itens = new ArrayList<>();
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void aoCriar() {
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Prato getPrato() { return prato; }
    public void setPrato(Prato prato) { this.prato = prato; }
    public Integer getRendimento() { return rendimento; }
    public void setRendimento(Integer rendimento) { this.rendimento = rendimento; }
    public String getModoPreparo() { return modoPreparo; }
    public void setModoPreparo(String modoPreparo) { this.modoPreparo = modoPreparo; }
    public List<FichaTecnicaItem> getItens() { return itens; }
    public void setItens(List<FichaTecnicaItem> itens) { this.itens = itens; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
