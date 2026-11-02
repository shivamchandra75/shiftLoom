// Called by the on_notification_created trigger (pg_net). Sends the notification row to every
// Expo push token of its user and drops tokens Expo reports as no longer registered.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type NotificationRow = { user_id: string; title: string; message: string; metadata: Record<string, unknown> | null };
type Ticket = { status: "ok" | "error"; details?: { error?: string } };

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

Deno.serve(async (req) => {
  // verify_jwt is off; the shared secret from Vault is the auth
  const secret = Deno.env.get("PUSH_WEBHOOK_SECRET");
  if (!secret || req.headers.get("x-push-secret") !== secret) return new Response("Unauthorized", { status: 401 });

  const { record } = (await req.json()) as { record?: NotificationRow };
  if (!record?.user_id) return new Response("Missing record", { status: 400 });

  const { data: rows, error } = await supabase.from("push_tokens").select("token").eq("user_id", record.user_id);
  if (error) return new Response(error.message, { status: 500 });
  if (!rows.length) return Response.json({ sent: 0 });

  const tokens = rows.map((r) => r.token);
  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(
      tokens.map((to) => ({ to, title: record.title, body: record.message, data: record.metadata ?? {}, sound: "default", channelId: "default" })),
    ),
  });
  if (!res.ok) return new Response(`Expo push failed: ${await res.text()}`, { status: 502 });

  // Tickets come back in the same order as the messages
  const { data: tickets } = (await res.json()) as { data: Ticket[] };
  const dead = tokens.filter((_, i) => tickets[i]?.details?.error === "DeviceNotRegistered");
  if (dead.length) await supabase.from("push_tokens").delete().in("token", dead);

  return Response.json({ sent: tokens.length - dead.length });
});
