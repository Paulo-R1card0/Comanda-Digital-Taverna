// Tipos que espelham os DTOs do back-end.

export type Perfil = 'ADMIN' | 'GERENTE' | 'COZINHEIRO' | 'CLIENTE';
export type StatusRegistro = 'ATIVO' | 'INATIVO';
export type StatusPrato = 'ATIVO' | 'INATIVO' | 'PAUSADO';
export type Unidade = 'G' | 'KG' | 'ML' | 'L' | 'UN';
export type StatusPedido =
  | 'RECEBIDO' | 'CONFIRMADO' | 'EM_PREPARO' | 'PRONTO' | 'SAIU_ENTREGA' | 'FINALIZADO' | 'CANCELADO';
export type CanalPedido = 'SITE' | 'TELEFONE' | 'WHATSAPP';
export type FormaPagamento = 'PIX' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'DINHEIRO';
export type StatusCompra = 'RASCUNHO' | 'ENVIADO' | 'RECEBIDO' | 'CANCELADO';
export type TipoMovimentacao = 'ENTRADA' | 'SAIDA' | 'ESTORNO';
export type MotivoMovimentacao =
  | 'COMPRA' | 'VENDA' | 'DESPERDICIO' | 'VENCIMENTO' | 'QUEBRA' | 'USO_INTERNO' | 'AJUSTE' | 'ESTORNO';
export type FaixaFoodCost = 'VERDE' | 'AMARELO' | 'VERMELHO';

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface ApiError {
  status: number;
  erro: string;
  mensagem: string;
  detalhes: string[];
}

// ---------- Auth ----------
export interface UsuarioLogado {
  id: number;
  nome: string;
  email: string;
  perfil: Perfil;
  telefone?: string;
  endereco?: string;
}

export interface TokenResponse {
  token: string;
  tipo: string;
  expiraEm: string;
  usuario: UsuarioLogado;
}

// ---------- Cardápio ----------
export interface Categoria {
  id: number;
  nome: string;
  descricao?: string;
  ordem: number;
  status: StatusRegistro;
}

export interface PratoPublico {
  id: number;
  categoriaId: number;
  categoriaNome: string;
  nome: string;
  descricao?: string;
  fotoUrl?: string;
  precoVenda: number;
  tempoPreparoMin: number;
}

export interface Prato extends PratoPublico {
  status: StatusPrato;
  possuiFicha: boolean;
  custo?: number;
  foodCost?: number;
  faixaFoodCost?: FaixaFoodCost;
}

export interface FichaItemRequest {
  ingredienteId: number;
  quantidade: number;
  unidade: Unidade;
  fatorCorrecao: number;
}

export interface FichaItem extends FichaItemRequest {
  id?: number;
  ingredienteNome: string;
  custoUnitario: number;
  unidadePadrao: Unidade;
  custoItem: number;
}

export interface Custo {
  precoVenda: number;
  rendimento: number;
  custoTotalReceita: number;
  custoPorcao: number;
  foodCost: number;
  faixa: FaixaFoodCost;
  aviso?: string;
  itens: FichaItem[];
}

export interface Ficha {
  id: number;
  pratoId: number;
  pratoNome: string;
  rendimento: number;
  modoPreparo?: string;
  custo: Custo;
}

// ---------- Pedidos ----------
export interface PedidoItem {
  id: number;
  pratoId: number;
  pratoNome: string;
  fotoUrl?: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
  observacoes?: string;
}

export interface HistoricoStatus {
  status: StatusPedido;
  data: string;
  usuarioNome?: string;
}

export interface Pedido {
  id: number;
  status: StatusPedido;
  canal: CanalPedido;
  formaPagamento: FormaPagamento;
  pago: boolean;
  valorTotal: number;
  enderecoEntrega: string;
  observacoes?: string;
  motivoCancelamento?: string;
  clienteId: number;
  clienteNome: string;
  clienteEmail: string;
  clienteTelefone?: string;
  createdAt: string;
  updatedAt: string;
  itens: PedidoItem[];
  historico: HistoricoStatus[];
}

// ---------- Estoque ----------
export interface Ingrediente {
  id: number;
  nome: string;
  sku: string;
  unidadePadrao: Unidade;
  estoqueMinimo: number;
  custoUnitario: number;
  status: StatusRegistro;
  saldo: number;
  abaixoMinimo: boolean;
}

export interface Saldo {
  ingredienteId: number;
  ingredienteNome: string;
  sku: string;
  unidade: Unidade;
  saldo: number;
  estoqueMinimo: number;
  abaixoMinimo: boolean;
  custoUnitario: number;
  valorEmEstoque: number;
}

export interface Movimentacao {
  id: number;
  ingredienteId: number;
  ingredienteNome: string;
  unidade: Unidade;
  tipo: TipoMovimentacao;
  quantidade: number;
  motivo: MotivoMovimentacao;
  lote?: string;
  validade?: string;
  custoUnitario?: number;
  observacao?: string;
  pedidoId?: number;
  pedidoCompraId?: number;
  usuarioNome?: string;
  createdAt: string;
}

// ---------- Fornecedores e compras ----------
export interface Fornecedor {
  id: number;
  razaoSocial: string;
  cnpj: string;
  telefone?: string;
  email?: string;
  categorias?: string;
  status: StatusRegistro;
}

export interface FornecedorProduto {
  id: number;
  fornecedorId: number;
  ingredienteId: number;
  ingredienteNome: string;
  unidadePadrao: Unidade;
  preco: number;
  unidadeVenda: Unidade;
  precoPorUnidadePadrao: number;
}

export interface Oferta {
  fornecedorId: number;
  fornecedorNome: string;
  preco: number;
  unidadeVenda: Unidade;
  precoPorUnidadePadrao: number;
  maisBarato: boolean;
}

export interface Cotacao {
  ingredienteId: number;
  ingredienteNome: string;
  unidadePadrao: Unidade;
  custoAtual: number;
  ofertas: Oferta[];
}

export interface HistoricoPreco {
  fornecedorId: number;
  fornecedorNome: string;
  precoUnitario: number;
  data: string;
}

export interface CompraItem {
  id: number;
  ingredienteId: number;
  ingredienteNome: string;
  unidade: Unidade;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
}

export interface Compra {
  id: number;
  fornecedorId: number;
  fornecedorNome: string;
  status: StatusCompra;
  valorTotal: number;
  observacoes?: string;
  usuarioNome: string;
  createdAt: string;
  recebidoEm?: string;
  itens: CompraItem[];
}

// ---------- Dashboard e usuários ----------
export interface Resumo {
  data: string;
  faturamento: number;
  totalPedidos: number;
  ticketMedio: number;
  foodCostMedio: number;
  pedidosEmAberto: number;
  alertasEstoque: number;
}

export interface TopPrato {
  pratoId: number;
  nome: string;
  quantidade: number;
  faturamento: number;
}

export interface VendaDia {
  data: string;
  faturamento: number;
  pedidos: number;
  ticketMedio: number;
}

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  perfil: Perfil;
  telefone?: string;
  endereco?: string;
  status: StatusRegistro;
  createdAt: string;
}
