import { StatusPedido } from './models';

// Textos amigáveis para exibir os enums do back-end na tela.

export const STATUS_PEDIDO: Record<StatusPedido, { label: string; icon: string; cor: string }> = {
  RECEBIDO: { label: 'Recebido', icon: 'receipt_long', cor: 'info' },
  CONFIRMADO: { label: 'Confirmado', icon: 'thumb_up', cor: 'info' },
  EM_PREPARO: { label: 'Em preparo', icon: 'skillet', cor: 'warn' },
  PRONTO: { label: 'Pronto', icon: 'check_circle', cor: 'ok' },
  SAIU_ENTREGA: { label: 'Saiu para entrega', icon: 'two_wheeler', cor: 'ok' },
  FINALIZADO: { label: 'Finalizado', icon: 'task_alt', cor: 'neutro' },
  CANCELADO: { label: 'Cancelado', icon: 'cancel', cor: 'erro' },
};

/** Ordem da linha do tempo exibida para o cliente (RF-007). */
export const FLUXO_PEDIDO: StatusPedido[] = ['RECEBIDO', 'CONFIRMADO', 'EM_PREPARO', 'PRONTO', 'SAIU_ENTREGA'];

export const PROXIMO_STATUS: Partial<Record<StatusPedido, StatusPedido>> = {
  RECEBIDO: 'CONFIRMADO',
  CONFIRMADO: 'EM_PREPARO',
  EM_PREPARO: 'PRONTO',
  PRONTO: 'SAIU_ENTREGA',
  SAIU_ENTREGA: 'FINALIZADO',
};

export const ACAO_PROXIMO_STATUS: Partial<Record<StatusPedido, string>> = {
  RECEBIDO: 'Confirmar pedido',
  CONFIRMADO: 'Iniciar preparo',
  EM_PREPARO: 'Marcar como pronto',
  PRONTO: 'Saiu para entrega',
  SAIU_ENTREGA: 'Finalizar',
};

export const FORMAS_PAGAMENTO = [
  { valor: 'PIX', label: 'PIX' },
  { valor: 'CARTAO_CREDITO', label: 'Cartão de crédito' },
  { valor: 'CARTAO_DEBITO', label: 'Cartão de débito' },
  { valor: 'DINHEIRO', label: 'Dinheiro na entrega' },
];

export const PERFIS = [
  { valor: 'ADMIN', label: 'Administrador' },
  { valor: 'GERENTE', label: 'Gerente' },
  { valor: 'COZINHEIRO', label: 'Cozinheiro' },
  { valor: 'CLIENTE', label: 'Cliente' },
];

export const UNIDADES = ['G', 'KG', 'ML', 'L', 'UN'] as const;

export const MOTIVOS_PERDA = [
  { valor: 'DESPERDICIO', label: 'Desperdício' },
  { valor: 'VENCIMENTO', label: 'Vencimento' },
  { valor: 'QUEBRA', label: 'Quebra' },
  { valor: 'USO_INTERNO', label: 'Uso interno' },
];

/** Unidades compatíveis entre si (mesmo grupo: massa, volume ou unidade). */
export function unidadesCompativeis(padrao: string): string[] {
  if (padrao === 'G' || padrao === 'KG') return ['G', 'KG'];
  if (padrao === 'ML' || padrao === 'L') return ['ML', 'L'];
  return ['UN'];
}

export function rotulo(valor: string | null | undefined): string {
  if (!valor) return '';
  return valor.charAt(0) + valor.slice(1).toLowerCase().replace(/_/g, ' ');
}
