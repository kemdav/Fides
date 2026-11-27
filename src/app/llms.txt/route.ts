import { buildLlmsTxt } from "@/lib/landing-seo";
import { getPublicPlans } from "@/lib/plans/public";

export const dynamic = "force-static";
export const revalidate = 300;

export async function GET() {
  return new Response(buildLlmsTxt(await getPublicPlans()), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
