# Roteiro do vídeo pitch (5 minutos)

Antes de gravar: abra a URL do back-end e espere responder (cold start, ~1 min no Render), confira se o MySQL do Aiven está ligado (*Power on*), abra o site no Firebase (`https://SEU-PROJETO.web.app`), deixe duas abas abertas (loja como cliente e painel como admin, em janela anônima) e ensaie com cronômetro.

## Parte 1 · Pitch com o sistema funcionando (3min30s)

| Tempo | Fala (resumo) | Na tela |
|---|---|---|
| 0:00–0:25 | **O problema.** A Taverna da Brasa é uma dark kitchen: não tem salão, vive de delivery e tem margem apertada. Sem saber o custo de cada prato e sem controlar estoque, o dono perde dinheiro sem perceber. O Comanda Digital resolve isso. | Cardápio público da Taverna da Brasa |
| 0:25–1:15 | **Jornada do cliente.** Filtra por categoria, abre o Brasão da Casa, coloca 2 com "sem cebola", adiciona um Elixir de Limão. No carrinho, ajusta a quantidade. Ao finalizar, faz login e confirma (pagamento simulado). | Cardápio → prato → carrinho → login → checkout |
| 1:15–1:45 | **Cozinha em tempo real.** No painel, o pedido chega como RECEBIDO. O gerente confirma e o estoque é baixado automaticamente pela ficha técnica. O cozinheiro avança para EM PREPARO e PRONTO. Volta na aba do cliente: a linha do tempo atualiza sozinha (a cada 10 s). | Painel → Pedidos → aba do cliente |
| 1:45–2:30 | **Ficha técnica e custo (o diferencial).** Abre o Brasão da Casa (o hambúrguer do exemplo do SRS): ingredientes com fator de correção, custo de R$ 15,30 e food cost de 38% em vermelho com aviso. Muda o preço para R$ 52,90 e o food cost fica verde (29%) na hora — **sem salvar**, para não mudar o preço real. Mostra também o Brownie da Forja: rende 12 porções, o preço vale 1 porção. | Pratos → Brasão da Casa |
| 2:30–3:10 | **Estoque e compras.** Badge vermelho de alerta no menu (alface e refrigerante). Abre a cotação: compara fornecedores, mostra o mais barato e o gráfico de preços. Cria a compra, envia, recebe: o estoque sobe e o custo do ingrediente atualiza. | Estoque → Cotação → Compras |
| 3:10–3:30 | **Dashboard.** Faturamento do dia, ticket médio, food cost médio, top 5 pratos e vendas por dia. Fechamento: "o dono sabe quanto ganha em cada prato". | Dashboard |

## Parte 2 · Código e deploy (1min30s)

| Tempo | Fala (resumo) | Na tela |
|---|---|---|
| 3:30–4:10 | **Back-end Spring Boot.** Camadas controller → service → repository, DTOs, regras de negócio no service (mostrar `PedidoService.darBaixaNoEstoque` com `@Transactional` e `FichaTecnicaService` com a fórmula do custo), Flyway com V1 (tabelas), V2 (seed) e V3 (identidade da Taverna, sem apagar personalizações), segurança com JWT e `@PreAuthorize`. | GitHub: `backend/src/...` |
| 4:10–4:35 | **Front-end Angular.** Pastas `loja`, `admin` e `core` (interceptor do JWT, guards por perfil, carrinho com signals), Angular Material e Chart.js. | GitHub: `frontend/src/app` |
| 4:35–5:00 | **Deploy.** MySQL gerenciado no Aiven, back-end em Docker no Render com variáveis de ambiente (mostrar a tela de Environment com os valores ocultos), front no Firebase Hosting (plano gratuito) com `environment.prod.ts` e `firebase.json`, CORS liberado para o domínio `.web.app`. Swagger no ar. | Painéis do Aiven/Render/Firebase e Swagger |

Se for dupla, dividam: uma pessoa narra a Parte 1 e a outra a Parte 2.
