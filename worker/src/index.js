import { buildPushPayload } from "@block65/webcrypto-web-push";

const SUBJECT = "mailto:diarraxo@gmail.com";

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

async function hashEndpoint(endpoint) {
  const encoded = new TextEncoder().encode(endpoint);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    if (url.pathname === "/subscribe" && request.method === "POST") {
      const subscription = await request.json();
      if (!subscription || !subscription.endpoint) {
        return new Response("Ongeldige subscriptie", {
          status: 400,
          headers: corsHeaders(origin),
        });
      }
      const key = await hashEndpoint(subscription.endpoint);
      await env.SUBSCRIPTIONS.put(key, JSON.stringify(subscription));
      return new Response("OK", { status: 200, headers: corsHeaders(origin) });
    }

    if (url.pathname === "/unsubscribe" && request.method === "POST") {
      const { endpoint } = await request.json();
      if (endpoint) {
        const key = await hashEndpoint(endpoint);
        await env.SUBSCRIPTIONS.delete(key);
      }
      return new Response("OK", { status: 200, headers: corsHeaders(origin) });
    }

    return new Response("Not found", { status: 404, headers: corsHeaders(origin) });
  },

  async scheduled(event, env) {
    const vapid = {
      subject: SUBJECT,
      publicKey: env.VAPID_PUBLIC_KEY,
      privateKey: env.VAPID_PRIVATE_KEY,
    };

    const message = {
      data: JSON.stringify({
        title: "Tweede brein",
        body: "Tijd om je lijst te checken 🌱",
      }),
      options: { ttl: 60 * 60 },
    };

    const list = await env.SUBSCRIPTIONS.list();

    for (const item of list.keys) {
      const raw = await env.SUBSCRIPTIONS.get(item.name);
      if (!raw) continue;

      const subscription = JSON.parse(raw);
      try {
        const payload = await buildPushPayload(message, subscription, vapid);
        const res = await fetch(subscription.endpoint, payload);
        if (res.status === 404 || res.status === 410) {
          await env.SUBSCRIPTIONS.delete(item.name);
        }
      } catch (err) {
        console.error("Push mislukt voor", item.name, err);
      }
    }
  },
};
