import { listCreditProducts } from "@/lib/billing/service";
import { jsonSuccess } from "@/lib/api-auth";

export async function GET() {
  const products = await listCreditProducts({ activeOnly: true });
  return jsonSuccess({ products });
}
