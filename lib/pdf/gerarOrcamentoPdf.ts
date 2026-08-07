import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Cliente, OrcamentoItem, ConfiguracaoEmpresa } from "@/types/database";

interface DadosOrcamento {
  numero: number;
  cliente: Cliente;
  itens: OrcamentoItem[];
  subtotal: number;
  descontoValor: number;
  freteValor: number;
  total: number;
  observacoes?: string;
  empresa?: Partial<ConfiguracaoEmpresa> | null;
}

const EMPRESA_PADRAO = {
  nome: "Ingafert Peças Agrícolas",
  cnpj: "",
  endereco: "",
  cidade: "Maringá",
  estado: "PR",
  telefone: "",
  email: "",
  pix_chave: "",
};

export function gerarOrcamentoPdf(dados: DadosOrcamento): jsPDF {
  const doc = new jsPDF();
  const verde: [number, number, number] = [46, 94, 62];
  const ouro: [number, number, number] = [212, 175, 55];
  const empresa = { ...EMPRESA_PADRAO, ...dados.empresa };
  const localizacao = [empresa.cidade, empresa.estado].filter(Boolean).join(" - ");

  // Linha 2: endereço completo + cidade/UF + telefone
  const linhaEndereco = [empresa.endereco, localizacao, empresa.telefone].filter(Boolean).join(" • ");
  // Linha 3: CNPJ + e-mail — os dados que mais passam credibilidade, sempre visíveis no cabeçalho
  const linhaFiscal = [empresa.cnpj ? `CNPJ: ${empresa.cnpj}` : null, empresa.email].filter(Boolean).join(" • ");

  const alturaCabecalho = linhaFiscal ? 36 : 30;

  // Cabeçalho
  doc.setFillColor(...verde);
  doc.rect(0, 0, 210, alturaCabecalho, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(empresa.nome, 14, 15);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  if (linhaEndereco) doc.text(linhaEndereco, 14, 22);
  if (linhaFiscal) doc.text(linhaFiscal, 14, 28);

  doc.setTextColor(...ouro);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`ORÇAMENTO Nº ${String(dados.numero).padStart(6, "0")}`, 140, 15);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text(new Date().toLocaleDateString("pt-BR"), 140, 22);

  // Dados do cliente
  let y = alturaCabecalho + 10;
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Cliente", 14, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  y += 6;
  doc.text(`${dados.cliente.nome}${dados.cliente.empresa ? " — " + dados.cliente.empresa : ""}`, 14, y);
  y += 5;
  if (dados.cliente.cpf_cnpj) {
    doc.text(`CPF/CNPJ: ${dados.cliente.cpf_cnpj}`, 14, y);
    y += 5;
  }
  if (dados.cliente.telefone || dados.cliente.whatsapp) {
    doc.text(`Contato: ${dados.cliente.whatsapp ?? dados.cliente.telefone}`, 14, y);
    y += 5;
  }
  if (dados.cliente.cidade) {
    doc.text(`${dados.cliente.cidade}/${dados.cliente.estado ?? ""}`, 14, y);
    y += 5;
  }

  // Tabela de itens
  autoTable(doc, {
    startY: y + 6,
    head: [["Código", "Produto", "Qtd", "Preço Unit.", "Desc.%", "Total"]],
    body: dados.itens.map((item) => [
      item.produto?.codigo_ingafert ?? "-",
      item.produto?.nome ?? "-",
      String(item.quantidade),
      Number(item.preco_unitario).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      `${item.desconto_percentual}%`,
      Number(item.total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
    ]),
    headStyles: { fillColor: verde, textColor: 255 },
    styles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [247, 250, 248] },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;

  // Totais
  doc.setFontSize(9);
  doc.text(`Subtotal: ${dados.subtotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`, 140, finalY);
  doc.text(
    `Desconto: ${dados.descontoValor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
    140,
    finalY + 5
  );
  doc.text(`Frete: ${dados.freteValor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`, 140, finalY + 10);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...verde);
  doc.text(`TOTAL: ${dados.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`, 140, finalY + 18);

  // Observações
  if (dados.observacoes) {
    doc.setTextColor(80, 80, 80);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Observações:", 14, finalY + 5);
    doc.text(doc.splitTextToSize(dados.observacoes, 110), 14, finalY + 10);
  }

  // Rodapé
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  if (empresa.pix_chave) doc.text(`Chave PIX para pagamento: ${empresa.pix_chave}`, 14, 280);
  doc.text("Orçamento válido por 7 dias. Sujeito a alteração de preço sem aviso prévio.", 14, 285);

  return doc;
}
