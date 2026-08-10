import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Cliente, OrcamentoItem, ConfiguracaoEmpresa } from "@/types/database";
import { formaPagamentoLabel } from "@/lib/constants/formaPagamento";

interface DadosOrcamento {
  numero: number;
  cliente: Cliente;
  itens: OrcamentoItem[];
  subtotal: number;
  descontoValor: number;
  freteValor: number;
  outrosCustos?: number;
  garantia?: string;
  formaPagamento?: string;
  total: number;
  observacoes?: string;
  empresa?: ConfiguracaoEmpresa | null;
}

const EMPRESA = {
  nome: "Ingafert Peças Agrícolas",
  cnpj: "00.000.000/0001-00", // TODO: substituir pelo CNPJ real da empresa
  endereco: "Maringá - PR",
  telefone: "(44) 0000-0000",
  site: "www.ingafert.com.br",
};

export function gerarOrcamentoPdf(dados: DadosOrcamento): jsPDF {
  const doc = new jsPDF();
  const verde: [number, number, number] = [46, 94, 62];
  const ouro: [number, number, number] = [212, 175, 55];

  // Cabeçalho
  doc.setFillColor(...verde);
  doc.rect(0, 0, 210, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(EMPRESA.nome, 14, 15);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`${EMPRESA.endereco} • ${EMPRESA.telefone} • ${EMPRESA.site}`, 14, 22);

  doc.setTextColor(...ouro);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`ORÇAMENTO Nº ${String(dados.numero).padStart(6, "0")}`, 140, 15);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text(new Date().toLocaleDateString("pt-BR"), 140, 22);

  // Dados do cliente
  let y = 40;
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

  // Totais (coluna direita)
  let yTotais = finalY;
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Subtotal: ${dados.subtotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`, 140, yTotais);
  yTotais += 5;
  doc.text(`Desconto: ${dados.descontoValor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`, 140, yTotais);
  yTotais += 5;
  doc.text(`Frete: ${dados.freteValor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`, 140, yTotais);
  yTotais += 5;
  if (dados.outrosCustos && dados.outrosCustos > 0) {
    doc.text(
      `Outros custos: ${dados.outrosCustos.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
      140,
      yTotais
    );
    yTotais += 5;
  }
  if (dados.formaPagamento) {
    doc.text(`Pagamento: ${formaPagamentoLabel(dados.formaPagamento)}`, 140, yTotais);
    yTotais += 5;
  }
  yTotais += 3;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...verde);
  doc.text(`TOTAL: ${dados.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`, 140, yTotais);

  // Garantia e observações (coluna esquerda)
  let yEsquerda = finalY;
  if (dados.garantia) {
    doc.setTextColor(80, 80, 80);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Garantia:", 14, yEsquerda);
    doc.setFont("helvetica", "normal");
    const linhasGarantia = doc.splitTextToSize(dados.garantia, 110);
    doc.text(linhasGarantia, 14, yEsquerda + 5);
    yEsquerda += 5 + linhasGarantia.length * 4 + 3;
  }
  if (dados.observacoes) {
    doc.setTextColor(80, 80, 80);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Observações:", 14, yEsquerda);
    doc.setFont("helvetica", "normal");
    doc.text(doc.splitTextToSize(dados.observacoes, 110), 14, yEsquerda + 5);
  }

  // Rodapé
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text("Orçamento válido por 7 dias. Sujeito a alteração de preço sem aviso prévio.", 14, 285);

  return doc;
}
