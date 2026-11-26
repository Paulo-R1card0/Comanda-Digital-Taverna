-- =====================================================================
-- Comanda Digital - V3: identidade "Taverna da Brasa" nos dados de demonstração
--
-- Reaproveita os 8 pratos e as 8 fichas técnicas cadastrados pela V2.
-- NÃO altera IDs, preços, categorias, ingredientes, quantidades,
-- rendimentos, pedidos nem histórico: só nome, descrição, foto e modo de preparo.
--
-- Estratégia (igual para base nova e para base que já rodou a V2):
--   cada campo só é atualizado se o registro ainda for o do seed, ou seja,
--   se o ID bater E o valor atual ainda for o valor ORIGINAL da V2.
--   Qualquer campo personalizado pelo restaurante é preservado.
--
--   * nome        -> id + nome original exato
--   * descricao   -> id + descrição original exata (aplica mesmo se o nome foi personalizado)
--   * foto_url    -> id + foto ainda vazia (NULL na V2) + categoria original do seed
--                    (aplica mesmo se o nome foi personalizado)
--   * modo_preparo-> id da ficha + prato_id + texto original exato
--
-- As comparações usam utf8mb4_bin (exatas, sensíveis a acento e caixa) e
-- ignoram \r, para funcionar mesmo se a V2 foi aplicada a partir de um
-- checkout com quebras de linha do Windows (CRLF). Os textos novos são
-- montados com CHAR(10), então ficam com \n independentemente do checkout.
-- =====================================================================

SET @nl = CHAR(10 USING utf8mb4);

-- ---------------------------------------------------------------------
-- 1) Descrição pública (composição + tom de taverna)
-- ---------------------------------------------------------------------
UPDATE prato SET descricao = 'O clássico da taverna: blend bovino de 180 g no brioche tostado, com cheddar derretido, alface, tomate e molho da casa.'
 WHERE id = 1 AND descricao COLLATE utf8mb4_bin = 'Blend bovino de 180g, pão brioche, cheddar, alface, tomate e molho especial da casa.';

UPDATE prato SET descricao = 'Forjado na chapa: blend bovino de 180 g, cheddar derretido e bacon crocante no brioche tostado.'
 WHERE id = 2 AND descricao COLLATE utf8mb4_bin = 'Blend bovino de 180g com cheddar e bacon crocante no pão brioche.';

UPDATE prato SET descricao = 'Colhido no bosque: copo de 500 ml de açaí cremoso com banana, granola e leite condensado.'
 WHERE id = 3 AND descricao COLLATE utf8mb4_bin = 'Açaí cremoso com banana, granola e leite condensado.';

UPDATE prato SET descricao = 'Refeição completa de quem chega da estrada: frango grelhado, arroz, feijão e salada de alface e tomate.'
 WHERE id = 4 AND descricao COLLATE utf8mb4_bin = 'Peito de frango grelhado com arroz, feijão e salada.';

UPDATE prato SET descricao = 'Ouro da mina: porção de 300 g de batatas fritas crocantes, salgadas na hora.'
 WHERE id = 5 AND descricao COLLATE utf8mb4_bin = 'Porção de 300g de batata frita sequinha.';

UPDATE prato SET descricao = 'Poção refrescante: limonada natural de 500 ml, espremida na hora e servida gelada.'
 WHERE id = 6 AND descricao COLLATE utf8mb4_bin = 'Limonada natural feita na hora (500ml).';

UPDATE prato SET descricao = 'Direto da adega: refrigerante em lata de 350 ml, entregue fechado e gelado.'
 WHERE id = 7 AND descricao COLLATE utf8mb4_bin = 'Refrigerante lata 350ml.';

UPDATE prato SET descricao = 'Saído do forno da forja: 1 porção individual de brownie de chocolate meio amargo.'
 WHERE id = 8 AND descricao COLLATE utf8mb4_bin = 'Brownie de chocolate meio amargo.';

-- ---------------------------------------------------------------------
-- 2) Foto (servida pelo front-end em /imagens/taverna/)
-- ---------------------------------------------------------------------
UPDATE prato SET foto_url = '/imagens/taverna/brasao-da-casa.webp'
 WHERE id = 1 AND foto_url IS NULL AND categoria_id = 1;
UPDATE prato SET foto_url = '/imagens/taverna/bacon-do-ferreiro.webp'
 WHERE id = 2 AND foto_url IS NULL AND categoria_id = 1;
UPDATE prato SET foto_url = '/imagens/taverna/acai-do-bosque.webp'
 WHERE id = 3 AND foto_url IS NULL AND categoria_id = 2;
UPDATE prato SET foto_url = '/imagens/taverna/banquete-do-viajante.webp'
 WHERE id = 4 AND foto_url IS NULL AND categoria_id = 3;
UPDATE prato SET foto_url = '/imagens/taverna/batatas-da-mina.webp'
 WHERE id = 5 AND foto_url IS NULL AND categoria_id = 4;
UPDATE prato SET foto_url = '/imagens/taverna/elixir-de-limao.webp'
 WHERE id = 6 AND foto_url IS NULL AND categoria_id = 5;
UPDATE prato SET foto_url = '/imagens/taverna/refrigerante-da-taverna.webp'
 WHERE id = 7 AND foto_url IS NULL AND categoria_id = 5;
UPDATE prato SET foto_url = '/imagens/taverna/brownie-da-forja.webp'
 WHERE id = 8 AND foto_url IS NULL AND categoria_id = 6;

-- ---------------------------------------------------------------------
-- 3) Nome temático
-- ---------------------------------------------------------------------
UPDATE prato SET nome = 'Brasão da Casa'          WHERE id = 1 AND nome COLLATE utf8mb4_bin = 'Hambúrguer Artesanal';
UPDATE prato SET nome = 'Bacon do Ferreiro'       WHERE id = 2 AND nome COLLATE utf8mb4_bin = 'Cheese Bacon';
UPDATE prato SET nome = 'Açaí do Bosque'          WHERE id = 3 AND nome COLLATE utf8mb4_bin = 'Açaí 500ml';
UPDATE prato SET nome = 'Banquete do Viajante'    WHERE id = 4 AND nome COLLATE utf8mb4_bin = 'Frango Grelhado Executivo';
UPDATE prato SET nome = 'Batatas da Mina'         WHERE id = 5 AND nome COLLATE utf8mb4_bin = 'Batata Frita';
UPDATE prato SET nome = 'Elixir de Limão'         WHERE id = 6 AND nome COLLATE utf8mb4_bin = 'Limonada';
UPDATE prato SET nome = 'Refrigerante da Taverna' WHERE id = 7 AND nome COLLATE utf8mb4_bin = 'Refrigerante Lata';
UPDATE prato SET nome = 'Brownie da Forja'        WHERE id = 8 AND nome COLLATE utf8mb4_bin = 'Brownie';

-- ---------------------------------------------------------------------
-- 4) Modo de preparo revisado, coerente com os itens já cadastrados na V2
--    (quantidades líquidas; o fator de correção da ficha cobre as perdas)
-- ---------------------------------------------------------------------

-- Ficha 1 - Brasão da Casa (rende 1): blend 180 g, brioche 1 un, cheddar 40 g,
-- alface 30 g (FC 1,40), tomate 50 g (FC 1,25), molho especial 25 ml
UPDATE ficha_tecnica SET modo_preparo = CONCAT_WS(@nl,
  'Rendimento: 1 porção (1 lanche).',
  '1. Modele 180 g de blend bovino em um disco de cerca de 1,5 cm de altura.',
  '2. Higienize e seque a alface; separe 30 g de folhas limpas.',
  '3. Lave o tomate e corte 50 g em rodelas.',
  '4. Grelhe o disco em chapa bem quente por 4 minutos de cada lado.',
  '5. No último minuto, cubra a carne com 40 g de queijo cheddar e abafe até derreter.',
  '6. Abra 1 pão brioche ao meio e toste as faces internas na chapa.',
  '7. Monte: base do pão, 25 ml de molho da casa, carne com cheddar, tomate, alface e tampa.',
  '8. Embale imediatamente para manter a temperatura na entrega.')
 WHERE id = 1 AND prato_id = 1
   AND REPLACE(modo_preparo, CHAR(13), '') COLLATE utf8mb4_bin = CONCAT_WS(@nl,
  '1. Modelar o blend em disco de 180g.',
  '2. Grelhar 4 min de cada lado.',
  '3. Derreter o cheddar sobre a carne.',
  '4. Tostar o pão e montar com alface, tomate e molho.');

-- Ficha 2 - Bacon do Ferreiro (rende 1): blend 180 g, brioche 1 un, cheddar 40 g, bacon 50 g
UPDATE ficha_tecnica SET modo_preparo = CONCAT_WS(@nl,
  'Rendimento: 1 porção (1 lanche).',
  '1. Frite 50 g de bacon fatiado na chapa, sem óleo, até ficar crocante; escorra em papel absorvente.',
  '2. Modele 180 g de blend bovino em um disco de cerca de 1,5 cm de altura.',
  '3. Grelhe o disco em chapa bem quente por 4 minutos de cada lado.',
  '4. No último minuto, cubra a carne com 40 g de queijo cheddar e abafe até derreter.',
  '5. Abra 1 pão brioche ao meio e toste as faces internas na chapa.',
  '6. Monte: base do pão, carne com cheddar, bacon crocante e tampa.',
  '7. Embale imediatamente para manter a temperatura e a crocância.')
 WHERE id = 2 AND prato_id = 2
   AND REPLACE(modo_preparo, CHAR(13), '') COLLATE utf8mb4_bin = CONCAT_WS(@nl,
  '1. Fritar o bacon até ficar crocante.',
  '2. Grelhar o blend e derreter o cheddar.',
  '3. Montar no pão brioche tostado.');

-- Ficha 3 - Açaí do Bosque (rende 1): polpa 400 ml, banana 1 un, granola 40 g, leite condensado 30 ml
UPDATE ficha_tecnica SET modo_preparo = CONCAT_WS(@nl,
  'Rendimento: 1 porção (copo de 500 ml).',
  '1. Bata 400 ml de polpa de açaí congelada até ficar cremosa e firme.',
  '2. Transfira para o copo de 500 ml, deixando espaço para as coberturas.',
  '3. Descasque 1 banana e distribua em rodelas sobre o açaí.',
  '4. Cubra com 40 g de granola.',
  '5. Finalize com 30 ml de leite condensado em fio, tampe e envie imediatamente.')
 WHERE id = 3 AND prato_id = 3
   AND REPLACE(modo_preparo, CHAR(13), '') COLLATE utf8mb4_bin = CONCAT_WS(@nl,
  '1. Bater a polpa até ficar cremosa.',
  '2. Servir no copo de 500ml.',
  '3. Finalizar com banana, granola e leite condensado.');

-- Ficha 4 - Banquete do Viajante (rende 1): frango 200 g (FC 1,10), arroz 150 g, feijão 120 g,
-- alface 30 g (FC 1,40), tomate 40 g (FC 1,25)
UPDATE ficha_tecnica SET modo_preparo = CONCAT_WS(@nl,
  'Rendimento: 1 porção (1 refeição).',
  '1. Limpe o peito de frango, retirando aparas, e separe 200 g.',
  '2. Grelhe em chapa quente por cerca de 6 minutos de cada lado, até o centro atingir 74 °C.',
  '3. Aqueça e porcione 150 g de arroz e 120 g de feijão.',
  '4. Higienize e seque a alface (30 g de folhas limpas) e corte 40 g de tomate em rodelas.',
  '5. Monte a embalagem: arroz, feijão e frango fatiado; a salada vai em compartimento separado.',
  '6. Feche e envie imediatamente.')
 WHERE id = 4 AND prato_id = 4
   AND REPLACE(modo_preparo, CHAR(13), '') COLLATE utf8mb4_bin = CONCAT_WS(@nl,
  '1. Temperar e grelhar o frango.',
  '2. Servir com arroz, feijão e salada de alface e tomate.');

-- Ficha 5 - Batatas da Mina (rende 1): batata palito 300 g, óleo 50 ml, sal 3 g
UPDATE ficha_tecnica SET modo_preparo = CONCAT_WS(@nl,
  'Rendimento: 1 porção de 300 g.',
  '1. Aqueça o óleo da fritadeira a 180 °C (consumo previsto: 50 ml de óleo de soja por porção).',
  '2. Frite 300 g de batata palito congelada, sem descongelar, por 6 minutos, até dourar.',
  '3. Escorra bem e tempere com 3 g de sal.',
  '4. Embale em recipiente ventilado para manter a crocância.')
 WHERE id = 5 AND prato_id = 5
   AND REPLACE(modo_preparo, CHAR(13), '') COLLATE utf8mb4_bin = CONCAT_WS(@nl,
  '1. Fritar a batata em óleo a 180°C por 6 minutos.',
  '2. Escorrer e salgar.');

-- Ficha 6 - Elixir de Limão (rende 1): limão 2 un, açúcar 30 g
UPDATE ficha_tecnica SET modo_preparo = CONCAT_WS(@nl,
  'Rendimento: 1 porção (copo de 500 ml).',
  '1. Lave 2 limões, corte ao meio e esprema o suco.',
  '2. Bata o suco com 30 g de açúcar, água filtrada e gelo até completar 500 ml.',
  '3. Coe, envase no copo de 500 ml com tampa e envie gelado.')
 WHERE id = 6 AND prato_id = 6
   AND REPLACE(modo_preparo, CHAR(13), '') COLLATE utf8mb4_bin = CONCAT_WS(@nl,
  '1. Espremer os limões.',
  '2. Bater com água, gelo e açúcar.');

-- Ficha 7 - Refrigerante da Taverna (rende 1): refrigerante lata 1 un (produto de revenda)
UPDATE ficha_tecnica SET modo_preparo = CONCAT_WS(@nl,
  'Rendimento: 1 porção (1 lata de 350 ml). Produto pronto: não há preparo.',
  'Instrução de serviço:',
  '1. Mantenha as latas refrigeradas entre 2 °C e 5 °C.',
  '2. Separe 1 lata de 350 ml gelada, confira a validade e higienize a parte externa.',
  '3. Envie a lata fechada, junto ao pedido, na embalagem térmica.')
 WHERE id = 7 AND prato_id = 7
   AND REPLACE(modo_preparo, CHAR(13), '') COLLATE utf8mb4_bin = 'Servir gelado.';

-- Ficha 8 - Brownie da Forja (rende 12): chocolate 400 g, açúcar 300 g, ovo 4 un, farinha 200 g
UPDATE ficha_tecnica SET modo_preparo = CONCAT_WS(@nl,
  'Rendimento: 12 porções por fornada. O preço do cardápio corresponde a 1 porção (1/12 da fornada).',
  '1. Preaqueça o forno a 180 °C e unte uma assadeira média.',
  '2. Derreta 400 g de chocolate meio amargo em banho-maria.',
  '3. Bata 4 ovos com 300 g de açúcar até formar um creme claro.',
  '4. Junte o chocolate derretido e misture.',
  '5. Incorpore 200 g de farinha de trigo peneirada, sem bater demais.',
  '6. Espalhe na assadeira e asse por 30 minutos.',
  '7. Deixe esfriar e corte em 12 porções iguais.',
  '8. Embale 1 porção por unidade vendida.')
 WHERE id = 8 AND prato_id = 8
   AND REPLACE(modo_preparo, CHAR(13), '') COLLATE utf8mb4_bin = CONCAT_WS(@nl,
  '1. Derreter o chocolate.',
  '2. Misturar ovos, açúcar e farinha.',
  '3. Assar a 180°C por 30 min.',
  '4. Cortar em 12 porções.');
