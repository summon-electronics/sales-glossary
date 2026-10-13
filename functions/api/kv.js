const KEY = "glossary-custom-terms";

export async function onRequestGet({ request, env }) {
  if (new URL(request.url).searchParams.get("key") !== KEY) return new Response("Bad key", { status: 400 });
  const value = await env.GLOSSARY.get(KEY);
  return new Response(value ?? "[]", { headers: { "content-type": "application/json" } });
}

export async function onRequestPut({ request, env }) {
  if (new URL(request.url).searchParams.get("key") !== KEY) return new Response("Bad key", { status: 400 });
  if (!env.ADD_PASSCODE || request.headers.get("x-glossary-key") !== env.ADD_PASSCODE) return new Response("Unauthorized", { status: 401 });
  const body = await request.text();
  if (body.length > 200000) return new Response("Too large", { status: 413 });
  try { if (!Array.isArray(JSON.parse(body))) throw 0; } catch { return new Response("Invalid", { status: 400 }); }
  await env.GLOSSARY.put(KEY, body);
  return new Response("ok");
}
