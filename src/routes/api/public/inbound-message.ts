import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const schema = z.object({
  sender_name: z.string().trim().min(1).max(200),
  sender_email: z.string().trim().email().max(320),
  channel: z.enum(["Email", "Facebook", "Website form"]),
  subject: z.string().trim().min(1).max(300),
  body: z.string().trim().min(1).max(5000, "body must be 5,000 characters or fewer"),
});

export const Route = createFileRoute("/api/public/inbound-message")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        const raw = await request.text();
        if (raw.length > 12000) return Response.json({ error: "Payload too large" }, { status: 413, headers: cors });
        let json: unknown;
        try {
          json = JSON.parse(raw);
        } catch {
          return Response.json({ error: "Body must be JSON" }, { status: 400, headers: cors });
        }
        const parsed = schema.safeParse(json);
        if (!parsed.success)
          return Response.json({ error: "Invalid fields", issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, { status: 400, headers: cors });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.from("messages").insert({ ...parsed.data, status: "New" }).select("id").single();
        if (error) return Response.json({ error: "Could not store message" }, { status: 500, headers: cors });
        await supabaseAdmin.from("audit_log").insert({ message_id: data.id, message_subject: parsed.data.subject, actor: "system", event: "webhook_received", details: { channel: parsed.data.channel } });
        return Response.json({ id: data.id, status: "New" }, { status: 201, headers: cors });
      },
    },
  },
});
