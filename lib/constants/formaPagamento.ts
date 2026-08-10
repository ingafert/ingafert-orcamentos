export const FORMAS_PAGAMENTO = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "Pix" },
  { value: "debito", label: "Cartão de Débito" },
  { value: "credito", label: "Cartão de Crédito" },
  { value: "boleto", label: "Boleto" },
] as const;

export function formaPagamentoLabel(value?: string | null): string {
  return FORMAS_PAGAMENTO.find((f) => f.value === value)?.label ?? "";
}
