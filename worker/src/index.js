const PACKAGES = Object.freeze({
  "500":  { credits: 500,  amount: "2.99" },
  "1200": { credits: 1200, amount: "5.99" },
  "3000": { credits: 3000, amount: "11.99" },
  "7500": { credits: 7500, amount: "24.99" }
});

const GAME_URL = "https://ohets.github.io/3D-Flightsimulator/";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type"
    }
  });
}

function normalizePlayerId(value) {
  return String(value || "").trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
}

async function paypalToken(env) {
  const basic = btoa(env.PAYPAL_CLIENT_ID + ":" + env.PAYPAL_CLIENT_SECRET);
  const response = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
    method: "POST",
    headers: {
      "Authorization": "Basic " + basic,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });
  if (!response.ok) throw new Error("PayPal authentication failed");
  const data = await response.json();
  return data.access_token;
}

async function paypalRequest(env, path, options = {}) {
  const token = await paypalToken(env);
  const response = await fetch("https://api-m.paypal.com" + path, {
    ...options,
    headers: {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!response.ok) throw new Error(data?.message || "PayPal API error");
  return data;
}

async function ensurePlayer(env, playerId) {
  await env.DB.prepare(
    "INSERT INTO players (player_id) VALUES (?) ON CONFLICT(player_id) DO NOTHING"
  ).bind(playerId).run();
}

async function handleCreateOrder(request, env) {
  const body = await request.json();
  const playerId = normalizePlayerId(body.playerId);
  const pkg = PACKAGES[String(body.package || "")];
  if (!playerId || !pkg) return json({ error: "Ungültiger Spieler oder Paket." }, 400);

  await ensurePlayer(env, playerId);

  const order = await paypalRequest(env, "/v2/checkout/orders", {
    method: "POST",
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{
        reference_id: "credits_" + pkg.credits,
        custom_id: playerId,
        amount: { currency_code: "EUR", value: pkg.amount },
        description: pkg.credits + " Credits - 3D Flight Simulator"
      }],
      application_context: {
        brand_name: "3D Flight Simulator",
        user_action: "PAY_NOW",
        return_url: GAME_URL,
        cancel_url: GAME_URL
      }
    })
  });

  await env.DB.prepare(
    "INSERT INTO orders (order_id, player_id, credits, amount_cents, currency, status) VALUES (?, ?, ?, ?, 'EUR', 'CREATED')"
  ).bind(order.id, playerId, pkg.credits, Math.round(Number(pkg.amount) * 100)).run();

  const approval = order.links?.find(x => x.rel === "approve");
  return json({ orderId: order.id, approvalUrl: approval?.href || null });
}

async function handleCaptureOrder(request, env) {
  const body = await request.json();
  const orderId = String(body.orderId || "").trim();
  const playerId = normalizePlayerId(body.playerId);
  if (!orderId || !playerId) return json({ error: "Fehlende Zahlungsdaten." }, 400);

  const stored = await env.DB.prepare(
    "SELECT * FROM orders WHERE order_id = ? AND player_id = ?"
  ).bind(orderId, playerId).first();

  if (!stored) return json({ error: "Bestellung nicht gefunden." }, 404);

  if (stored.status === "CAPTURED") {
    const p = await env.DB.prepare("SELECT credits FROM players WHERE player_id = ?").bind(playerId).first();
    return json({ ok: true, captured: true, credits: p?.credits || 0 });
  }

  const result = await paypalRequest(env, "/v2/checkout/orders/" + encodeURIComponent(orderId) + "/capture", {
    method: "POST",
    body: "{}"
  });

  const capture = result.purchase_units?.[0]?.payments?.captures?.[0];
  if (result.status !== "COMPLETED" || !capture || capture.status !== "COMPLETED") {
    return json({ error: "PayPal-Zahlung wurde noch nicht abgeschlossen." }, 409);
  }

  const actualValue = Number(capture.amount?.value || 0);
  const actualCurrency = capture.amount?.currency_code;
  if (actualCurrency !== stored.currency || Math.round(actualValue * 100) !== stored.amount_cents) {
    return json({ error: "Zahlungsbetrag stimmt nicht mit der Bestellung überein." }, 400);
  }

  await env.DB.prepare(
    "UPDATE players SET credits = credits + ?, updated_at = CURRENT_TIMESTAMP WHERE player_id = ?"
  ).bind(stored.credits, playerId).run();

  await env.DB.prepare(
    "UPDATE orders SET status = 'CAPTURED', captured_at = CURRENT_TIMESTAMP WHERE order_id = ? AND status = 'CREATED'"
  ).bind(orderId).run();

  const p = await env.DB.prepare("SELECT credits FROM players WHERE player_id = ?").bind(playerId).first();
  return json({ ok: true, captured: true, credits: p?.credits || 0 });
}

async function handleBalance(url, env) {
  const playerId = normalizePlayerId(url.searchParams.get("player"));
  if (!playerId) return json({ error: "Fehlender Spieler." }, 400);
  await ensurePlayer(env, playerId);
  const p = await env.DB.prepare("SELECT credits FROM players WHERE player_id = ?").bind(playerId).first();
  return json({ credits: p?.credits || 0 });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return json({ ok: true });
    const url = new URL(request.url);
    try {
      if (url.pathname === "/api/create-order" && request.method === "POST") return await handleCreateOrder(request, env);
      if (url.pathname === "/api/capture-order" && request.method === "POST") return await handleCaptureOrder(request, env);
      if (url.pathname === "/api/balance" && request.method === "GET") return await handleBalance(url, env);
      return json({ error: "Not found" }, 404);
    } catch (e) {
      console.error(e);
      return json({ error: "Serverfehler bei der Zahlungsabwicklung." }, 500);
    }
  }
};
