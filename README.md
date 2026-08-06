# Ingafert Orçamentos

Sistema de orçamentos, produtos e clientes para a Ingafert Peças Agrícolas.
Next.js 14 (App Router) + TypeScript + Tailwind + Supabase (Postgres + Auth) + PWA.

## ✅ O que já está pronto (Fase 1)

- Schema completo do banco de dados (`supabase/schema.sql`)
- Login com Supabase Auth + rotas protegidas (middleware)
- Dashboard com métricas (clientes, produtos, orçamentos, pedidos, vendas do mês, sem estoque)
- Clientes: cadastro, edição, exclusão, busca
- Produtos: listagem, busca instantânea (código Ingafert, código da indústria, nome), importação em massa via Excel
- Orçamentos: montagem completa (cliente + produtos + desconto + frete), geração de PDF, envio via WhatsApp
- PWA: instalável em Android, iPhone e Desktop (manifest + service worker)
- Identidade visual Ingafert (verde musgo `#2E5E3E` + amarelo ouro `#D4AF37`)

## 🔜 Próximas fases (ainda não incluídas neste pacote)

Vamos construir isso nas próximas mensagens/sessões, um módulo por vez:

- **Fase 2** — Pedidos (conversão de orçamento em pedido, status de separação/faturamento/envio/entrega)
- **Fase 3** — Estoque (entradas, saídas, ajustes, histórico) e Painel Admin (usuários, categorias, marcas, máquinas, transportadoras, logs, backup)
- **Fase 4** — Integração de frete (Melhor Envio / SuperFrete / Correios) — a tabela `fretes_cotacoes` já está preparada no schema
- **Fase 5** — Envio de orçamento por e-mail (SMTP) e refinamento do envio por WhatsApp (anexar PDF real, não só link)
- **Fase 6** — Dark mode, animações, polimento visual, QR Code PIX real no PDF

## 🚀 Como rodar

### 1. Criar o projeto no Supabase (gratuito)
1. Crie uma conta em https://supabase.com e um novo projeto.
2. Vá em **SQL Editor** e execute todo o conteúdo de `supabase/schema.sql`.
3. Vá em **Authentication > Users** e crie o primeiro usuário (você), ou habilite cadastro por e-mail/senha.
4. Depois de criar o usuário no Auth, insira a linha correspondente na tabela `usuarios`:
   ```sql
   insert into public.usuarios (id, nome, email, role)
   values ('UUID-DO-USUARIO-NO-AUTH', 'Seu Nome', 'seu@email.com', 'administrador');
   ```
5. Copie a **Project URL** e a **anon public key** em Project Settings > API.

### 2. Configurar o projeto local
```bash
cd ingafert-orcamentos
cp .env.example .env.local
# edite .env.local com a URL e a anon key do Supabase
npm install
npm run dev
```
Acesse http://localhost:3000 — você será redirecionado para `/login`.

### 3. Deploy gratuito (Cloudflare Pages)
1. Suba este projeto para um repositório no GitHub.
2. Em Cloudflare Pages, conecte o repositório.
3. Build command: `npm run build` — Output directory: `.next`
   (recomenda-se usar o adaptador `@cloudflare/next-on-pages` para rotas de servidor/middleware — adicionamos isso na Fase 2 junto com o deploy guiado).
4. Adicione as variáveis de ambiente (mesmas do `.env.local`) no painel da Cloudflare.

### 4. Formato da planilha de importação de produtos
A importação em `Produtos > Importar Excel` espera as colunas (primeira linha = cabeçalho):

```
Código Ingafert | Código da Indústria | Código ERP | SKU | Nome | Descrição |
Marca da Peça | Marca da Máquina | Modelo | Categoria | Subcategoria |
Preço de Custo | Preço de Venda | Peso | NCM | Estoque | Imagem | URL |
Meta Title | Meta Description | Palavras-chave | Alt da Imagem
```
Se o cabeçalho da sua planilha real usar nomes diferentes, ajuste o objeto `MAPA_COLUNAS` em
`app/(painel)/produtos/ImportarExcel.tsx`.

## 📁 Estrutura de pastas
```
ingafert-orcamentos/
├── app/
│   ├── login/                  # tela de login
│   ├── (painel)/                # área autenticada
│   │   ├── dashboard/
│   │   ├── clientes/
│   │   ├── produtos/
│   │   └── orcamentos/
│   │       └── novo/            # montagem do orçamento
│   └── globals.css
├── lib/
│   ├── supabase/                # clientes browser/server
│   └── pdf/                     # geração de PDF do orçamento
├── types/database.ts            # tipos TypeScript do banco
├── supabase/schema.sql          # schema completo do banco
├── middleware.ts                # proteção de rotas
└── public/manifest.json, sw.js  # PWA
```

## ⚠️ Itens que exigem suas próprias credenciais (não incluídos por segurança)
- Token da API do WhatsApp Business (para envio automático, hoje é via link `wa.me`)
- Tokens de Melhor Envio / SuperFrete (cotação de frete automática)
- SMTP para envio de e-mail
- Chave PIX real da empresa (para o QR Code no PDF)
- CNPJ e dados fiscais reais da empresa (hoje há um placeholder em `lib/pdf/gerarOrcamentoPdf.ts`)
