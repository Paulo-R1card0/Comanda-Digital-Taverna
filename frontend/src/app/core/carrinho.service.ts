import { Injectable, computed, effect, signal } from '@angular/core';
import { PratoPublico } from './models';

export interface ItemCarrinho {
  prato: PratoPublico;
  quantidade: number;
  observacoes: string;
}

const CHAVE = 'comanda.carrinho';

/**
 * Carrinho de compras (RF-003). Fica no navegador (signal + localStorage):
 * só vira pedido no back-end quando o cliente confirma no checkout.
 */
@Injectable({ providedIn: 'root' })
export class CarrinhoService {
  readonly itens = signal<ItemCarrinho[]>(this.carregar());

  readonly quantidadeTotal = computed(() => this.itens().reduce((s, i) => s + i.quantidade, 0));
  readonly total = computed(() =>
    this.itens().reduce((s, i) => s + i.quantidade * i.prato.precoVenda, 0),
  );
  readonly vazio = computed(() => this.itens().length === 0);

  constructor() {
    effect(() => {
      const itens = JSON.stringify(this.itens());
      try {
        localStorage.setItem(CHAVE, itens);
      } catch {
        /* armazenamento indisponível */
      }
    });
  }

  adicionar(prato: PratoPublico, quantidade: number, observacoes: string): void {
    const obs = observacoes.trim();
    this.itens.update((lista) => {
      // Mesmo prato com a mesma observação: soma a quantidade
      const existente = lista.find((i) => i.prato.id === prato.id && i.observacoes === obs);
      if (existente) {
        return lista.map((i) =>
          i === existente ? { ...i, quantidade: Math.min(50, i.quantidade + quantidade) } : i,
        );
      }
      return [...lista, { prato, quantidade, observacoes: obs }];
    });
  }

  alterarQuantidade(index: number, quantidade: number): void {
    if (quantidade < 1) {
      this.remover(index);
      return;
    }
    this.itens.update((l) => l.map((i, idx) => (idx === index ? { ...i, quantidade: Math.min(50, quantidade) } : i)));
  }

  alterarObservacoes(index: number, observacoes: string): void {
    this.itens.update((l) => l.map((i, idx) => (idx === index ? { ...i, observacoes } : i)));
  }

  remover(index: number): void {
    this.itens.update((l) => l.filter((_, idx) => idx !== index));
  }

  limpar(): void {
    this.itens.set([]);
  }

  private carregar(): ItemCarrinho[] {
    try {
      return JSON.parse(localStorage.getItem(CHAVE) ?? '[]');
    } catch {
      return [];
    }
  }
}
