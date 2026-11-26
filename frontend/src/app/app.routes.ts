import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards';
import { Perfil } from './core/models';

const GESTAO: Perfil[] = ['ADMIN', 'GERENTE'];
const COZINHA: Perfil[] = ['ADMIN', 'GERENTE', 'COZINHEIRO'];

export const routes: Routes = [
  // ===================== Área do cliente (loja) =====================
  {
    path: '',
    loadComponent: () => import('./loja/loja-layout').then((m) => m.LojaLayout),
    children: [
      { path: '', title: 'Taverna da Brasa · Cardápio', loadComponent: () => import('./loja/cardapio').then((m) => m.Cardapio) },
      { path: 'prato/:id', title: 'Prato · Taverna da Brasa', loadComponent: () => import('./loja/prato-detalhe').then((m) => m.PratoDetalhe) },
      { path: 'carrinho', title: 'Carrinho · Taverna da Brasa', loadComponent: () => import('./loja/carrinho').then((m) => m.Carrinho) },
      { path: 'login', title: 'Entrar · Taverna da Brasa', loadComponent: () => import('./loja/login').then((m) => m.Login) },
      { path: 'cadastro', title: 'Criar conta · Taverna da Brasa', loadComponent: () => import('./loja/cadastro').then((m) => m.Cadastro) },
      {
        path: 'checkout',
        title: 'Finalizar pedido · Taverna da Brasa',
        canActivate: [authGuard, roleGuard],
        data: { perfis: ['CLIENTE'] },
        loadComponent: () => import('./loja/checkout').then((m) => m.Checkout),
      },
      {
        path: 'meus-pedidos',
        title: 'Meus pedidos · Taverna da Brasa',
        canActivate: [authGuard, roleGuard],
        data: { perfis: ['CLIENTE'] },
        loadComponent: () => import('./loja/meus-pedidos').then((m) => m.MeusPedidos),
      },
      {
        path: 'meus-pedidos/:id',
        title: 'Acompanhar pedido · Taverna da Brasa',
        canActivate: [authGuard, roleGuard],
        data: { perfis: ['CLIENTE'] },
        loadComponent: () => import('./loja/acompanhar-pedido').then((m) => m.AcompanharPedido),
      },
    ],
  },

  // ===================== Painel administrativo =====================
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    data: { perfis: COZINHA },
    loadComponent: () => import('./admin/admin-layout').then((m) => m.AdminLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'pedidos' },
      { path: 'dashboard', title: 'Dashboard', canActivate: [roleGuard], data: { perfis: GESTAO }, loadComponent: () => import('./admin/dashboard').then((m) => m.Dashboard) },
      { path: 'pedidos', title: 'Pedidos', loadComponent: () => import('./admin/pedidos').then((m) => m.Pedidos) },
      { path: 'pedidos/:id', title: 'Pedido', loadComponent: () => import('./admin/pedido-detalhe').then((m) => m.PedidoDetalhe) },
      { path: 'categorias', title: 'Categorias', canActivate: [roleGuard], data: { perfis: GESTAO }, loadComponent: () => import('./admin/categorias').then((m) => m.Categorias) },
      { path: 'pratos', title: 'Pratos', canActivate: [roleGuard], data: { perfis: GESTAO }, loadComponent: () => import('./admin/pratos').then((m) => m.Pratos) },
      { path: 'pratos/novo', title: 'Novo prato', canActivate: [roleGuard], data: { perfis: GESTAO }, loadComponent: () => import('./admin/prato-form').then((m) => m.PratoForm) },
      { path: 'pratos/:id', title: 'Prato e ficha técnica', canActivate: [roleGuard], data: { perfis: GESTAO }, loadComponent: () => import('./admin/prato-form').then((m) => m.PratoForm) },
      { path: 'ingredientes', title: 'Ingredientes', canActivate: [roleGuard], data: { perfis: GESTAO }, loadComponent: () => import('./admin/ingredientes').then((m) => m.Ingredientes) },
      { path: 'estoque', title: 'Estoque', canActivate: [roleGuard], data: { perfis: GESTAO }, loadComponent: () => import('./admin/estoque').then((m) => m.Estoque) },
      { path: 'fornecedores', title: 'Fornecedores', canActivate: [roleGuard], data: { perfis: GESTAO }, loadComponent: () => import('./admin/fornecedores').then((m) => m.Fornecedores) },
      { path: 'fornecedores/:id', title: 'Catálogo do fornecedor', canActivate: [roleGuard], data: { perfis: GESTAO }, loadComponent: () => import('./admin/fornecedor-catalogo').then((m) => m.FornecedorCatalogo) },
      { path: 'cotacao', title: 'Cotação', canActivate: [roleGuard], data: { perfis: GESTAO }, loadComponent: () => import('./admin/cotacao').then((m) => m.CotacaoPage) },
      { path: 'compras', title: 'Compras', canActivate: [roleGuard], data: { perfis: GESTAO }, loadComponent: () => import('./admin/compras').then((m) => m.Compras) },
      { path: 'compras/nova', title: 'Nova compra', canActivate: [roleGuard], data: { perfis: GESTAO }, loadComponent: () => import('./admin/compra-form').then((m) => m.CompraForm) },
      { path: 'compras/:id', title: 'Compra', canActivate: [roleGuard], data: { perfis: GESTAO }, loadComponent: () => import('./admin/compra-form').then((m) => m.CompraForm) },
      { path: 'usuarios', title: 'Usuários', canActivate: [roleGuard], data: { perfis: ['ADMIN'] }, loadComponent: () => import('./admin/usuarios').then((m) => m.Usuarios) },
    ],
  },

  { path: '**', redirectTo: '' },
];
