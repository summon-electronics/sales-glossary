// Only custom terms are editable. The team passcode is never stored in this file.
const ENDPOINT = "/api/kv?key=glossary-custom-terms";
let sharedTerms = [];
let pendingTerms = new Map();
let deletedTerms = new Set();
let saving = false;
const customSection = {id:"custom", name:"✍️ Team Terms", intro:"Shared terms added by the team.", items:[]};
ALL.push(customSection);
const originalRender = render;
render = function() {
  for (const section of ALL) {
    if (!section.items) continue;
    section.items = section.items.filter(item=>!item[4]);
  }
  for (const term of sharedTerms) {
    const section = ALL.find(s=>s.id===term.category && s.items) || customSection;
    section.items.push([term.term,term.definition,term.use,0,term.id]);
  }
  originalRender();
};
function notify(message, error=false) {
  const status=document.querySelector("#sharedStatus");
  status.textContent=message; status.classList.toggle("error",error);
}
async function api(method, passcode, terms) {
  const response=await fetch(ENDPOINT, {
    method, cache:"no-store",
    headers:{"content-type":"application/json",...(passcode?{"x-glossary-key":passcode}:{})},
    ...(terms?{body:JSON.stringify(terms)}:{})
  });
  if(!response.ok) {
    const errors={401:"Incorrect team passcode.",413:"The shared term list is too large.",400:"Invalid shared term data."};
    throw new Error(errors[response.status] || "Shared editing is unavailable. Please check the deployment.");
  }
  if(method==="GET") {
    const result=await response.json();
    if(!Array.isArray(result)) throw new Error("Invalid shared term list.");
    return result;
  }
  return response.text();
}
async function latestTerms() {
  const terms=await api("GET");
  const merged=new Map(terms.filter(t=>t && !deletedTerms.has(t.id)).map(t=>[t.id,t]));
  for(const [id,term] of pendingTerms) if(!deletedTerms.has(id)) merged.set(id,term);
  return [...merged.values()];
}
async function refreshShared() {
  try {
    const terms=await api("GET");
    if(!Array.isArray(terms)) throw new Error("Shared editing is unavailable on this host.");
    const valid=terms.filter(t=>t&&/^[0-9a-f-]{36}$/i.test(t.id)&&typeof t.term==="string"&&typeof t.definition==="string"&&typeof t.use==="string");
    const ids=new Set(valid.map(t=>t.id));
    for(const [id] of pendingTerms) if(ids.has(id)) pendingTerms.delete(id);
    sharedTerms=[...valid.filter(t=>!deletedTerms.has(t.id)),...pendingTerms.values()];
    render();
    if(!saving && !pendingTerms.size && !document.querySelector("#termDialog").open) notify("Team terms are shared. Updates may take about a minute to appear on other devices.");
  } catch(error) { if(!saving) notify(error.message+" The original glossary remains available.",true); }
}
const dialog=document.querySelector("#termDialog");
const form=document.querySelector("#termForm");
const category=document.querySelector("#termCategory");
for(const section of ALL.filter(s=>s.items)) {
  const option=document.createElement("option");option.value=section.id;option.textContent=section.name;category.append(option);
}
document.querySelector("#addTermBtn").onclick=()=>{
  form.reset();document.querySelector("#formError").textContent="";dialog.showModal();document.querySelector("#termName").focus();
};
document.querySelector("#cancelTerm").onclick=()=>{if(!saving){form.reset();dialog.close();}};
dialog.addEventListener("cancel",event=>{if(saving)event.preventDefault();else form.reset();});
form.addEventListener("submit",async event=>{
  event.preventDefault(); if(saving || !form.reportValidity())return;
  const passcode=document.querySelector("#termPasscode");
  const submit=document.querySelector("#saveTerm");
  const term={term:document.querySelector("#termName").value.trim(),definition:document.querySelector("#termDefinition").value.trim(),use:document.querySelector("#termUse").value.trim(),category:category.value};
  if(!term.term || !term.definition){document.querySelector("#formError").textContent="Enter a term and definition.";return;}
  saving=true;submit.disabled=true;submit.textContent="Saving…";document.querySelector("#formError").textContent="";
  try {
    const saved={...term,id:crypto.randomUUID(),createdAt:new Date().toISOString()};
    const latest=await latestTerms();
    const updated=[...latest,saved];
    await api("PUT",passcode.value,updated);
    sharedTerms=updated.filter(t=>t.id!==saved.id);
    pendingTerms.set(saved.id,saved);sharedTerms.push(saved);
    active="all";document.querySelector("#search").value="";chips();render();
    form.reset();dialog.close();notify("Term saved. Other devices may need about a minute to see it.");
  } catch(error){document.querySelector("#formError").textContent=error.message;passcode.value="";passcode.focus();}
  finally {saving=false;submit.disabled=false;submit.textContent="Save term";}
});
document.querySelector("#main").addEventListener("click",async event=>{
  const button=event.target.closest("[data-delete-term]");if(!button || saving)return;
  const id=button.dataset.deleteTerm;const term=sharedTerms.find(t=>t.id===id);if(!term)return;
  if(!confirm('Delete the shared term "'+term.term+'"?'))return;
  const passcode=prompt("Enter the team passcode to delete this term:");if(!passcode)return;
  saving=true;button.disabled=true;
  try {
    const latest=await latestTerms();
    await api("PUT",passcode,latest.filter(t=>t.id!==id));deletedTerms.add(id);pendingTerms.delete(id);sharedTerms=sharedTerms.filter(t=>t.id!==id);render();notify("Term deleted. Other devices may need about a minute to update.");
  }catch(error){notify(error.message,true);button.disabled=false;}
  finally{saving=false;}
});
chips();render();refreshShared();
setInterval(()=>{if(!document.hidden&&!saving)refreshShared();},30000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&!saving)refreshShared();});
