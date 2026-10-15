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

const VALID_TYPES = ["taak", "afspraak", "later"];

const MONTHS = {
  januari: 1,
  februari: 2,
  maart: 3,
  april: 4,
  mei: 5,
  juni: 6,
  juli: 7,
  augustus: 8,
  september: 9,
  oktober: 10,
  november: 11,
  december: 12,
};

// Alleen ondubbelzinnige datums: "vandaag", "morgen", "overmorgen", of een
// datum die letterlijk in de tekst staat ("12 november", "12-11"). Dingen
// als een weekdag-naam of "volgende week" rekenen we bewust NIET uit — daar
// maken taalmodellen (en bugs) te vaak fouten in; dan liever geen datum dan
// een foute.
function detectDutchDate(text, today) {
  const lower = text.toLowerCase();
  const todayDate = new Date(`${today}T00:00:00Z`);

  const addDays = (n) => {
    const d = new Date(todayDate);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };

  if (/\bvandaag\b/.test(lower)) return today;
  if (/\bovermorgen\b/.test(lower)) return addDays(2);
  if (/\bmorgen\b/.test(lower)) return addDays(1);

  const monthNameMatch = lower.match(
    /\b(\d{1,2})\s+(januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)\b/
  );
  if (monthNameMatch) {
    const day = parseInt(monthNameMatch[1], 10);
    const month = MONTHS[monthNameMatch[2]];
    const year = todayDate.getUTCFullYear();
    let candidate = new Date(Date.UTC(year, month - 1, day));
    if (candidate < todayDate) candidate = new Date(Date.UTC(year + 1, month - 1, day));
    return candidate.toISOString().slice(0, 10);
  }

  const numericMatch = lower.match(/\b(\d{1,2})[-/](\d{1,2})(?:[-/](\d{2,4}))?\b/);
  if (numericMatch) {
    const day = parseInt(numericMatch[1], 10);
    const month = parseInt(numericMatch[2], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      let year = numericMatch[3] ? parseInt(numericMatch[3], 10) : todayDate.getUTCFullYear();
      if (year < 100) year += 2000;
      let candidate = new Date(Date.UTC(year, month - 1, day));
      if (!numericMatch[3] && candidate < todayDate) {
        candidate = new Date(Date.UTC(year + 1, month - 1, day));
      }
      return candidate.toISOString().slice(0, 10);
    }
  }

  return null;
}

async function classifyText(env, text, today) {
  const due = detectDutchDate(text, today);

  const systemPrompt = `Je bent een assistent die korte Nederlandse notities classificeert voor een to-do app.
Geef ALLEEN geldige JSON terug, niets anders, in dit exacte formaat: {"type":"taak"}

Kies "type" uit precies deze drie opties:
- "afspraak": iets met een vaste tijd/datum, vaak met iemand anders (bv. "tandarts om 14u", "koffie met Anna")
- "taak": een actie die je zelf moet doen, geen vaste afspraak
- "later": iets vaags, geen concrete actie, om ooit nog te overwegen`;

  const response = await env.AI.run("@cf/meta/llama-3.2-3b-instruct", {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: text },
    ],
    max_tokens: 30,
  });

  let parsed = null;

  if (response && typeof response.response === "object" && response.response !== null) {
    // Sommige modellen geven het antwoord al als kant-en-klaar object terug.
    parsed = response.response;
  } else {
    const raw =
      typeof response?.response === "string"
        ? response.response
        : response?.choices?.[0]?.message?.content || "";
    const match = String(raw).match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        parsed = null;
      }
    }
  }

  const type = parsed && VALID_TYPES.includes(parsed.type) ? parsed.type : "taak";
  return { type, due };
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

    if (url.pathname === "/classify" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const text = typeof body.text === "string" ? body.text.slice(0, 500).trim() : "";
      const today =
        typeof body.today === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.today)
          ? body.today
          : new Date().toISOString().slice(0, 10);

      if (!text) {
        return new Response(JSON.stringify({ type: "taak", due: null }), {
          status: 200,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      }

      try {
        const result = await classifyText(env, text, today);
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      } catch (err) {
        console.error("Classificeren mislukt", err);
        return new Response(JSON.stringify({ type: "taak", due: null }), {
          status: 200,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      }
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
