require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env.local") });
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  const { data: personas } = await sb.from("writer_personas").select("id, name, writer_type, specialties, max_articles, is_active").order("created_at");
  console.log("=== 所有寫手 ===");
  personas.forEach(p => console.log(p.is_active ? "V" : "X", p.name, "|", p.writer_type, "| max:", p.max_articles, "| sports:", JSON.stringify(p.specialties?.sports), "| leagues:", JSON.stringify(p.specialties?.leagues), "| teams:", JSON.stringify(p.specialties?.teams)));

  console.log("\n=== 目前規劃 ===");
  const { data: plans } = await sb.from("rewrite_plans").select("title, plan_type, league, writer_persona_id, created_at");
  if (plans && plans.length > 0) {
    for (const plan of plans) {
      const writer = personas.find(p => p.id === plan.writer_persona_id);
      console.log(plan.created_at, "|", (writer ? writer.name : "?"), "|", plan.plan_type, "|", plan.league || "-", "|", plan.title);
    }
  } else {
    console.log("無規劃");
  }
  process.exit(0);
})();
