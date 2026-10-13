const KEY = "glossary-custom-terms";
const PREFIX = KEY + ":";
const categories = new Set(["acronyms","parts","orders","supply","people","channels","quality","verticals","sales","components","objections","custom"]);
const headers = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
function reply(value, status = 200) { return new Response(JSON.stringify(value), { status, headers }); }
function check(request, env, write = false) {
  if (new URL(request.url).searchParams.get("key") !== KEY) return reply({error:"Bad key"},400);
  if (write && (!env.ADD_PASSCODE || request.headers.get("x-glossary-key") !== env.ADD_PASSCODE)) return reply({error:"Incorrect team passcode."},401);
  if (!env.GLOSSARY) return reply({error:"Shared storage is not configured. Ask the administrator to check the GLOSSARY binding and redeploy."},503);
}
export async function onRequestGet({request,env}) {
  const error = check(request,env); if (error) return error;
  try {
    let cursor; const terms = [];
    do {
      const page = await env.GLOSSARY.list({prefix:PREFIX, ...(cursor?{cursor}:{})});
      for (let offset=0;offset<page.keys.length;offset+=25) {
        const values = await Promise.all(page.keys.slice(offset,offset+25).map(k=>env.GLOSSARY.get(k.name,"json")));
        terms.push(...values.filter(Boolean));
      }
      if (page.list_complete) break;
      cursor = page.cursor;
    } while (cursor);
    return reply(terms.sort((a,b)=>a.term.localeCompare(b.term)));
  } catch { return reply({error:"Unable to load shared terms. Please retry."},503); }
}
export async function onRequestPost({request,env}) {
  const error = check(request,env,true); if (error) return error;
  const body = await request.text();
  if (new TextEncoder().encode(body).length>12000) return reply({error:"Term is too large."},413);
  let value; try { value=JSON.parse(body); } catch { return reply({error:"Invalid term."},400); }
  if (!value || typeof value!=="object" || Array.isArray(value) ||
      typeof value.term!=="string" || !value.term.trim() || value.term.length>160 ||
      typeof value.definition!=="string" || !value.definition.trim() || value.definition.length>2000 ||
      typeof value.use!=="string" || value.use.length>2000 ||
      !categories.has(value.category)) return reply({error:"Check the term, definition, and category."},400);
  const term = {id:crypto.randomUUID(),term:value.term.trim(),definition:value.definition.trim(),use:value.use.trim(),category:value.category,createdAt:new Date().toISOString()};
  try { await env.GLOSSARY.put(PREFIX+term.id,JSON.stringify(term)); return reply(term,201); }
  catch { return reply({error:"Unable to save the term. Please retry."},503); }
}
export async function onRequestDelete({request,env}) {
  const error=check(request,env,true); if(error) return error;
  const id=new URL(request.url).searchParams.get("id");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id||"")) return reply({error:"Invalid term ID."},400);
  try { await env.GLOSSARY.delete(PREFIX+id); return reply({ok:true}); }
  catch { return reply({error:"Unable to delete the term. Please retry."},503); }
}
