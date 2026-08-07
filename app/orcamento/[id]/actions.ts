"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

export async function responderOrcamento(id: string, resposta: "aprovado" | "recusado") {
  const supabase = createServiceClient();
  await supabase.from("orcamentos").update({ status: resposta }).eq("id", id);
  revalidatePath(`/orcamento/${id}`);
}
