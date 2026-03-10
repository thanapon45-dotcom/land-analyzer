import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLANS: Record<string, { deals_limit: number; amount: number; label: string }> = {
  prepaid5:  { deals_limit: 5,   amount: 99000,  label: "Prepaid 5 ดีล" },
  prepaid20: { deals_limit: 20,  amount: 290000, label: "Prepaid 20 ดีล" },
  unlimited: { deals_limit: 999, amount: 199000, label: "Unlimited" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { planId, token, userId } = await req.json();

    const plan = PLANS[planId];
    if (!plan) return new Response(JSON.stringify({ error: "Invalid plan" }), { status: 400, headers: corsHeaders });

    // Charge via Omise
    const omiseSecret = Deno.env.get("OMISE_SECRET_KEY")!;
    const credentials = btoa(omiseSecret + ":");

    const chargeRes = await fetch("https://api.omise.co/charges", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        amount: String(plan.amount),
        currency: "thb",
        card: token,
        description: `Land Analyzer - ${plan.label}`,
      }),
    });

    const charge = await chargeRes.json();

    if (!charge.paid) {
      return new Response(JSON.stringify({ error: charge.failure_message || "Payment failed" }), { status: 400, headers: corsHeaders });
    }

    // Update subscription in Supabase
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    await supabase.from("subscriptions").upsert({
      user_id: userId,
      plan: planId,
      deals_used: 0,
      deals_limit: plan.deals_limit,
      pdf_exports_used: 0,
      expires_at: expiresAt.toISOString(),
    }, { onConflict: "user_id" });

    return new Response(JSON.stringify({ success: true, plan: planId }), { headers: corsHeaders });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
