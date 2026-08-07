export type Role = "administrador" | "vendedor" | "financeiro";
export type StatusOrcamento = "aberto" | "enviado" | "aprovado" | "recusado" | "expirado" | "convertido";
export type StatusPedido = "separacao" | "faturado" | "enviado" | "entregue" | "cancelado";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  role: Role;
  ativo: boolean;
  created_at: string;
}

export interface Cliente {
  id: string;
  nome: string;
  empresa: string | null;
  cpf_cnpj: string | null;
  inscricao_estadual: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  cidade: string | null;
  estado: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Produto {
  id: string;
  codigo_ingafert: string;
  codigo_industria: string | null;
  codigo_erp: string | null;
  sku: string | null;
  nome: string;
  descricao: string | null;
  marca_peca_id: string | null;
  marca_maquina_id: string | null;
  modelo: string | null;
  categoria_id: string | null;
  subcategoria_id: string | null;
  preco_custo: number;
  preco_venda: number;
  peso: number;
  ncm: string | null;
  estoque: number;
  imagem_url: string | null;
  seo_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  palavras_chave: string | null;
  alt_imagem: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrcamentoItem {
  id: string;
  orcamento_id: string;
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
  desconto_percentual: number;
  total: number;
  produto?: Produto;
}

export interface Orcamento {
  id: string;
  numero: number;
  cliente_id: string;
  vendedor_id: string | null;
  subtotal: number;
  desconto_percentual: number;
  desconto_valor: number;
  frete_valor: number;
  total: number;
  observacoes: string | null;
  status: StatusOrcamento;
  created_at: string;
  updated_at: string;
  cliente?: Cliente;
  itens?: OrcamentoItem[];
}

export interface ConfiguracaoEmpresa {
  id: true;
  nome: string;
  cnpj: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  telefone: string | null;
  email: string | null;
  pix_chave: string | null;
  logo_url: string | null;
  updated_at: string;
}

// Placeholder mínimo para o tipo Database exigido pelo cliente Supabase tipado.
// Gere o tipo completo depois com: npx supabase gen types typescript --project-id SEU_ID
export type Database = any;
