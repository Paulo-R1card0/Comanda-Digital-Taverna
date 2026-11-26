-- =====================================================================
-- Comanda Digital - V1: criação das tabelas (MySQL 8)
-- Convenção: snake_case, soft delete via coluna status
-- =====================================================================

CREATE TABLE usuario (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    nome        VARCHAR(120) NOT NULL,
    email       VARCHAR(160) NOT NULL,
    senha_hash  VARCHAR(100) NOT NULL,
    perfil      VARCHAR(20)  NOT NULL,
    telefone    VARCHAR(20),
    endereco    VARCHAR(255),
    status      VARCHAR(10)  NOT NULL DEFAULT 'ATIVO',
    created_at  DATETIME     NOT NULL,
    updated_at  DATETIME     NOT NULL,
    CONSTRAINT uk_usuario_email UNIQUE (email)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE categoria (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    nome        VARCHAR(80)  NOT NULL,
    descricao   VARCHAR(255),
    ordem       INT          NOT NULL DEFAULT 0,
    status      VARCHAR(10)  NOT NULL DEFAULT 'ATIVO',
    created_at  DATETIME     NOT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE prato (
    id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
    categoria_id       BIGINT        NOT NULL,
    nome               VARCHAR(120)  NOT NULL,
    descricao          VARCHAR(1000),
    foto_url           VARCHAR(500),
    preco_venda        DECIMAL(10,2) NOT NULL,
    tempo_preparo_min  INT           NOT NULL DEFAULT 15,
    status             VARCHAR(10)   NOT NULL DEFAULT 'INATIVO',
    created_at         DATETIME      NOT NULL,
    CONSTRAINT fk_prato_categoria FOREIGN KEY (categoria_id) REFERENCES categoria (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE ingrediente (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    nome            VARCHAR(120)   NOT NULL,
    sku             VARCHAR(40)    NOT NULL,
    unidade_padrao  VARCHAR(5)     NOT NULL,
    estoque_minimo  DECIMAL(12,3)  NOT NULL DEFAULT 0,
    custo_unitario  DECIMAL(10,4)  NOT NULL DEFAULT 0,
    status          VARCHAR(10)    NOT NULL DEFAULT 'ATIVO',
    created_at      DATETIME       NOT NULL,
    CONSTRAINT uk_ingrediente_sku UNIQUE (sku)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE ficha_tecnica (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    prato_id      BIGINT   NOT NULL,
    rendimento    INT      NOT NULL DEFAULT 1,
    modo_preparo  TEXT,
    created_at    DATETIME NOT NULL,
    CONSTRAINT uk_ficha_prato UNIQUE (prato_id),
    CONSTRAINT fk_ficha_prato FOREIGN KEY (prato_id) REFERENCES prato (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE ficha_tecnica_item (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    ficha_tecnica_id  BIGINT        NOT NULL,
    ingrediente_id    BIGINT        NOT NULL,
    quantidade        DECIMAL(12,3) NOT NULL,
    unidade           VARCHAR(5)    NOT NULL,
    fator_correcao    DECIMAL(6,2)  NOT NULL DEFAULT 1.00,
    CONSTRAINT fk_fti_ficha FOREIGN KEY (ficha_tecnica_id) REFERENCES ficha_tecnica (id),
    CONSTRAINT fk_fti_ingrediente FOREIGN KEY (ingrediente_id) REFERENCES ingrediente (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE fornecedor (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    razao_social  VARCHAR(160) NOT NULL,
    cnpj          VARCHAR(14)  NOT NULL,
    telefone      VARCHAR(20),
    email         VARCHAR(160),
    categorias    VARCHAR(255),
    status        VARCHAR(10)  NOT NULL DEFAULT 'ATIVO',
    created_at    DATETIME     NOT NULL,
    CONSTRAINT uk_fornecedor_cnpj UNIQUE (cnpj)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE fornecedor_produto (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    fornecedor_id   BIGINT        NOT NULL,
    ingrediente_id  BIGINT        NOT NULL,
    preco           DECIMAL(10,4) NOT NULL,
    unidade_venda   VARCHAR(5)    NOT NULL,
    status          VARCHAR(10)   NOT NULL DEFAULT 'ATIVO',
    CONSTRAINT uk_fornecedor_ingrediente UNIQUE (fornecedor_id, ingrediente_id),
    CONSTRAINT fk_fp_fornecedor FOREIGN KEY (fornecedor_id) REFERENCES fornecedor (id),
    CONSTRAINT fk_fp_ingrediente FOREIGN KEY (ingrediente_id) REFERENCES ingrediente (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- Histórico de preço por ingrediente/fornecedor (RF-026).
-- preco_unitario sempre na unidade padrão do ingrediente.
CREATE TABLE preco_historico (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    fornecedor_id   BIGINT        NOT NULL,
    ingrediente_id  BIGINT        NOT NULL,
    preco_unitario  DECIMAL(12,6) NOT NULL,
    created_at      DATETIME      NOT NULL,
    CONSTRAINT fk_ph_fornecedor FOREIGN KEY (fornecedor_id) REFERENCES fornecedor (id),
    CONSTRAINT fk_ph_ingrediente FOREIGN KEY (ingrediente_id) REFERENCES ingrediente (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE pedido_compra (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    fornecedor_id BIGINT        NOT NULL,
    status        VARCHAR(12)   NOT NULL DEFAULT 'RASCUNHO',
    valor_total   DECIMAL(12,2) NOT NULL DEFAULT 0,
    observacoes   VARCHAR(500),
    usuario_id    BIGINT        NOT NULL,
    created_at    DATETIME      NOT NULL,
    recebido_em   DATETIME,
    CONSTRAINT fk_pc_fornecedor FOREIGN KEY (fornecedor_id) REFERENCES fornecedor (id),
    CONSTRAINT fk_pc_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE pedido_compra_item (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    pedido_compra_id  BIGINT        NOT NULL,
    ingrediente_id    BIGINT        NOT NULL,
    quantidade        DECIMAL(12,3) NOT NULL,
    preco_unitario    DECIMAL(10,4) NOT NULL,
    subtotal          DECIMAL(12,2) NOT NULL,
    CONSTRAINT fk_pci_compra FOREIGN KEY (pedido_compra_id) REFERENCES pedido_compra (id),
    CONSTRAINT fk_pci_ingrediente FOREIGN KEY (ingrediente_id) REFERENCES ingrediente (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE pedido (
    id                   BIGINT AUTO_INCREMENT PRIMARY KEY,
    cliente_id           BIGINT        NOT NULL,
    status               VARCHAR(15)   NOT NULL DEFAULT 'RECEBIDO',
    canal                VARCHAR(15)   NOT NULL DEFAULT 'SITE',
    forma_pagamento      VARCHAR(20)   NOT NULL DEFAULT 'PIX',
    pago                 BOOLEAN       NOT NULL DEFAULT FALSE,
    valor_total          DECIMAL(12,2) NOT NULL,
    endereco_entrega     VARCHAR(255)  NOT NULL,
    observacoes          VARCHAR(500),
    motivo_cancelamento  VARCHAR(500),
    created_at           DATETIME      NOT NULL,
    updated_at           DATETIME      NOT NULL,
    CONSTRAINT fk_pedido_cliente FOREIGN KEY (cliente_id) REFERENCES usuario (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE INDEX idx_pedido_created_at ON pedido (created_at);
CREATE INDEX idx_pedido_status ON pedido (status);

CREATE TABLE pedido_item (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    pedido_id       BIGINT        NOT NULL,
    prato_id        BIGINT        NOT NULL,
    quantidade      INT           NOT NULL,
    preco_unitario  DECIMAL(10,2) NOT NULL,
    observacoes     VARCHAR(255),
    CONSTRAINT fk_pi_pedido FOREIGN KEY (pedido_id) REFERENCES pedido (id),
    CONSTRAINT fk_pi_prato FOREIGN KEY (prato_id) REFERENCES prato (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- Linha do tempo de status do pedido (RF-007 / RF-020)
CREATE TABLE pedido_status_historico (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    pedido_id   BIGINT      NOT NULL,
    status      VARCHAR(15) NOT NULL,
    usuario_id  BIGINT,
    created_at  DATETIME    NOT NULL,
    CONSTRAINT fk_psh_pedido FOREIGN KEY (pedido_id) REFERENCES pedido (id),
    CONSTRAINT fk_psh_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- Quantidade sempre na unidade padrão do ingrediente
CREATE TABLE estoque_movimentacao (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    ingrediente_id    BIGINT        NOT NULL,
    tipo              VARCHAR(10)   NOT NULL,
    quantidade        DECIMAL(14,4) NOT NULL,
    motivo            VARCHAR(15)   NOT NULL,
    lote              VARCHAR(40),
    validade          DATE,
    custo_unitario    DECIMAL(10,4),
    observacao        VARCHAR(255),
    pedido_compra_id  BIGINT,
    pedido_id         BIGINT,
    usuario_id        BIGINT,
    created_at        DATETIME      NOT NULL,
    CONSTRAINT fk_em_ingrediente FOREIGN KEY (ingrediente_id) REFERENCES ingrediente (id),
    CONSTRAINT fk_em_compra FOREIGN KEY (pedido_compra_id) REFERENCES pedido_compra (id),
    CONSTRAINT fk_em_pedido FOREIGN KEY (pedido_id) REFERENCES pedido (id),
    CONSTRAINT fk_em_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE INDEX idx_em_ingrediente ON estoque_movimentacao (ingrediente_id);
