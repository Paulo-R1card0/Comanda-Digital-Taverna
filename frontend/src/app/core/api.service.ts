import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Categoria, Compra, Cotacao, Custo, Ficha, FichaItemRequest, Fornecedor, FornecedorProduto, HistoricoPreco,
  Ingrediente, Movimentacao, Page, Pedido, Prato, PratoPublico, Resumo, Saldo, StatusPedido, StatusPrato,
  TopPrato, Usuario, VendaDia,
} from './models';
import { SEM_LOADING, SEM_TOAST_ERRO } from './interceptors';

type Params = Record<string, string | number | boolean | null | undefined>;

/** Converte um objeto em HttpParams ignorando valores vazios. */
export function params(p: Params = {}): HttpParams {
  let hp = new HttpParams();
  Object.entries(p).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== '') hp = hp.set(k, String(v));
  });
  return hp;
}

/** CRUD genérico para os cadastros do painel (GET paginado, GET id, POST, PUT, DELETE = desativar). */
export class CrudApi<T, R = Partial<T>> {
  constructor(protected http: HttpClient, protected url: string) {}

  listar(p: Params = {}): Observable<Page<T>> {
    return this.http.get<Page<T>>(this.url, { params: params(p) });
  }
  buscar(id: number): Observable<T> {
    return this.http.get<T>(`${this.url}/${id}`);
  }
  criar(dados: R): Observable<T> {
    return this.http.post<T>(this.url, dados);
  }
  atualizar(id: number, dados: R): Observable<T> {
    return this.http.put<T>(`${this.url}/${id}`, dados);
  }
  desativar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}

const API = environment.apiUrl;
/** Requisições de fundo (atualização automática, cálculo em tempo real): sem barra de loading e sem toast de erro. */
const silencioso = () => ({ context: new HttpContext().set(SEM_LOADING, true).set(SEM_TOAST_ERRO, true) });

/** Ponto único de acesso à API REST do back-end. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  // ----- Público -----
  cardapio(categoriaId?: number | null) {
    return this.http.get<Page<PratoPublico>>(`${API}/cardapio`, { params: params({ categoriaId, size: 100 }) });
  }
  pratoPublico(id: number) {
    return this.http.get<PratoPublico>(`${API}/cardapio/${id}`);
  }
  categoriasPublicas() {
    return this.http.get<Page<Categoria>>(`${API}/cardapio/categorias`);
  }

  // ----- Cliente -----
  criarPedido(dados: unknown) {
    return this.http.post<Pedido>(`${API}/pedidos`, dados);
  }
  meusPedidos(page: number, size: number) {
    return this.http.get<Page<Pedido>>(`${API}/pedidos/meus`, { params: params({ page, size }) });
  }
  meuPedido(id: number, semLoading = false) {
    return this.http.get<Pedido>(`${API}/pedidos/${id}`, semLoading ? silencioso() : {});
  }
  cancelarMeuPedido(id: number, motivo: string) {
    return this.http.patch<Pedido>(`${API}/pedidos/${id}/cancelar`, { motivo });
  }

  // ----- Pedidos (cozinha) -----
  pedidos(p: Params, semLoading = false) {
    return this.http.get<Page<Pedido>>(`${API}/admin/pedidos`, { params: params(p), ...(semLoading ? silencioso() : {}) });
  }
  pedido(id: number) {
    return this.http.get<Pedido>(`${API}/admin/pedidos/${id}`);
  }
  alterarStatusPedido(id: number, status: StatusPedido) {
    return this.http.patch<Pedido>(`${API}/admin/pedidos/${id}/status`, { status });
  }
  cancelarPedido(id: number, motivo: string) {
    return this.http.patch<Pedido>(`${API}/admin/pedidos/${id}/cancelar`, { motivo });
  }

  // ----- Cadastros -----
  readonly categorias = new CrudApi<Categoria>(this.http, `${API}/admin/categorias`);
  readonly pratos = new CrudApi<Prato, unknown>(this.http, `${API}/admin/pratos`);
  readonly ingredientes = new CrudApi<Ingrediente, unknown>(this.http, `${API}/admin/ingredientes`);
  readonly fornecedores = new CrudApi<Fornecedor, unknown>(this.http, `${API}/admin/fornecedores`);
  readonly usuarios = new CrudApi<Usuario, unknown>(this.http, `${API}/admin/usuarios`);
  readonly compras = new CrudApi<Compra, unknown>(this.http, `${API}/admin/compras`);

  // ----- Pratos e fichas -----
  alterarStatusPrato(id: number, status: StatusPrato) {
    return this.http.patch<Prato>(`${API}/admin/pratos/${id}/status`, { status });
  }
  ficha(pratoId: number) {
    // 404 aqui é normal (prato ainda sem ficha), então não mostra toast de erro
    return this.http.get<Ficha>(`${API}/admin/pratos/${pratoId}/ficha`, { context: new HttpContext().set(SEM_TOAST_ERRO, true) });
  }
  salvarFicha(pratoId: number, dados: { rendimento: number; modoPreparo: string; itens: FichaItemRequest[] }) {
    return this.http.put<Ficha>(`${API}/admin/pratos/${pratoId}/ficha`, dados);
  }
  custoPrato(pratoId: number) {
    return this.http.get<Custo>(`${API}/admin/pratos/${pratoId}/custo`);
  }
  simularCusto(dados: { precoVenda: number; rendimento: number; itens: FichaItemRequest[] }) {
    return this.http.post<Custo>(`${API}/admin/pratos/simular-custo`, dados, silencioso());
  }

  // ----- Estoque -----
  saldos(p: Params) {
    return this.http.get<Page<Saldo>>(`${API}/admin/estoque/saldo`, { params: params(p) });
  }
  alertas(p: Params = {}, semLoading = false) {
    return this.http.get<Page<Saldo>>(`${API}/admin/estoque/alertas`, { params: params(p), ...(semLoading ? silencioso() : {}) });
  }
  movimentacoes(p: Params) {
    return this.http.get<Page<Movimentacao>>(`${API}/admin/estoque/movimentacoes`, { params: params(p) });
  }
  registrarMovimentacao(dados: unknown) {
    return this.http.post<Movimentacao>(`${API}/admin/estoque/movimentacao`, dados);
  }

  // ----- Fornecedores, cotação e compras -----
  catalogo(fornecedorId: number) {
    return this.http.get<Page<FornecedorProduto>>(`${API}/admin/fornecedores/${fornecedorId}/produtos`, { params: params({ size: 200 }) });
  }
  salvarProduto(fornecedorId: number, dados: unknown) {
    return this.http.post<FornecedorProduto>(`${API}/admin/fornecedores/${fornecedorId}/produtos`, dados);
  }
  removerProduto(fornecedorId: number, produtoId: number) {
    return this.http.delete<void>(`${API}/admin/fornecedores/${fornecedorId}/produtos/${produtoId}`);
  }
  cotacao(ingredienteId: number) {
    return this.http.get<Cotacao>(`${API}/admin/cotacao/${ingredienteId}`);
  }
  historicoPrecos(ingredienteId: number) {
    return this.http.get<HistoricoPreco[]>(`${API}/admin/cotacao/${ingredienteId}/historico`);
  }
  enviarCompra(id: number) {
    return this.http.patch<Compra>(`${API}/admin/compras/${id}/enviar`, {});
  }
  receberCompra(id: number, itens: { itemId: number; lote?: string; validade?: string }[]) {
    return this.http.post<Compra>(`${API}/admin/compras/${id}/receber`, { itens });
  }

  // ----- Dashboard -----
  resumo(data?: string) {
    return this.http.get<Resumo>(`${API}/admin/dashboard/resumo`, { params: params({ data }) });
  }
  topPratos(inicio: string, fim: string) {
    return this.http.get<TopPrato[]>(`${API}/admin/dashboard/top-pratos`, { params: params({ inicio, fim }) });
  }
  vendas(inicio: string, fim: string) {
    return this.http.get<VendaDia[]>(`${API}/admin/dashboard/vendas`, { params: params({ inicio, fim }) });
  }
}

/** Data local no formato yyyy-MM-dd (usado nos filtros de período). */
export function dataISO(d: Date): string {
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
