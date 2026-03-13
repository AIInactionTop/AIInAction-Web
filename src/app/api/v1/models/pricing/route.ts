import { jsonSuccess } from "@/lib/api-auth";
import { listAiModelPricing } from "@/lib/billing/service";

export async function GET() {
  const pricing = await listAiModelPricing(true);
  return jsonSuccess({ pricing });
}
