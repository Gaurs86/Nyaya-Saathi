const $ = id => document.getElementById(id);
let token = "", reviewer = "", selectedCase = null, cases = [];
const EDITABLE_FIELDS = ["summary","parties","demands_or_claims","dates_and_periods","legal_provisions_cited","information_to_confirm"];

function feedback(target, message, kind="error") {
  $(target).innerHTML = "";
  if (!message) return;
  const node = document.createElement("div");
  node.className = kind;
  node.textContent = message;
  $(target).appendChild(node);
}
function esc(value) {
  return String(value ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
}
async function api(path, options={}) {
  const headers = new Headers(options.headers || {});
  headers.set("X-Reviewer-Token", token);
  headers.set("X-Reviewer-Label", reviewer || "reviewer");
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type","application/json");
  const response = await fetch(path, {...options, headers});
  if (!response.ok) {
    let detail = "Request failed (" + response.status + ").";
    try { detail = (await response.json()).detail || detail; } catch {}
    throw new Error(detail);
  }
  return response;
}
function statusLabel(status) { return String(status || "").replaceAll("_"," "); }
async function connect() {
  token = $("token").value.trim();
  reviewer = $("reviewer").value.trim() || "reviewer";
  if (!token) return feedback("authMessage","Enter the workspace token.");
  try {
    await refreshQueue();
    $("workspace").hidden = false;
    feedback("authMessage","Connected. Token remains only in this page's memory.","success");
    const caseId = new URLSearchParams(location.search).get("case_id");
    if (caseId) await openCase(caseId);
  } catch (err) {
    token = "";
    feedback("authMessage",err.message);
  }
}
async function refreshQueue() {
  const filter = $("statusFilter").value;
  const path = "/review/cases" + (filter ? "?status=" + encodeURIComponent(filter) : "");
  const data = await (await api(path)).json();
  cases = data.cases || [];
  $("queueCount").textContent = cases.length + " case(s)";
  const list = $("caseList"); list.replaceChildren();
  if (!cases.length) {
    const empty = document.createElement("div"); empty.className="empty"; empty.textContent="No cases in this queue."; list.appendChild(empty); return;
  }
  for (const item of cases) {
    const button=document.createElement("button"); button.type="button";
    button.className="case-item" + (selectedCase && selectedCase.case_id===item.case_id ? " active" : "");
    const title=document.createElement("strong"); title.textContent=item.title;
    const type=document.createElement("span"); type.className="muted"; type.textContent=(item.doc_type || "unknown").replaceAll("_"," ");
    const status=document.createElement("span"); status.className="status "+item.status; status.textContent=statusLabel(item.status);
    const meta=document.createElement("div"); meta.className="muted"; meta.textContent="Rev "+item.revision+" · "+new Date(item.updated_at).toLocaleString();
    button.append(title,type,status,meta); button.onclick=()=>openCase(item.case_id); list.appendChild(button);
  }
}
function editableFields(brief) {
  const result={};
  for(const field of EDITABLE_FIELDS) {
    if (field in brief) result[field]=brief[field];
    else result[field] = field==="summary" ? "" : [];
  }
  return result;
}
function renderCase(item) {
  selectedCase=item;
  const b=item.brief || {};
  $("details").hidden=false; $("noCase").hidden=true;
  $("caseTitle").textContent=item.title;
  $("caseMeta").textContent="Case "+item.case_id+" · Revision "+item.revision+" · Created "+new Date(item.created_at).toLocaleString();
  $("caseStatus").replaceChildren();
  const pill=document.createElement("span");pill.className="status "+item.status;pill.textContent=statusLabel(item.status);
  $("caseStatus").appendChild(pill);
  $("editor").value=JSON.stringify(editableFields(b),null,2);
  $("correctionNote").value="";
  $("decisionNote").value="";
  $("sourceChecked").checked=false;$("factsChecked").checked=false;$("deadlineChecked").checked=false;
  const approved=item.status==="approved";
  $("exportPdf").disabled=!approved;$("exportDocx").disabled=!approved;
  feedback("message","");
  renderAudit([]);
}
async function openCase(id) {
  try {
    const item=await (await api("/review/cases/"+encodeURIComponent(id))).json();
    renderCase(item);
    await loadAudit();
    await refreshQueue();
  } catch(err) { feedback("message",err.message); }
}
async function loadAudit() {
  if(!selectedCase)return;
  const data=await (await api("/review/cases/"+encodeURIComponent(selectedCase.case_id)+"/events")).json();
  renderAudit(data.events || []);
}
function renderAudit(events) {
  const target=$("audit");target.replaceChildren();
  if(!events.length) { const p=document.createElement("p");p.className="muted";p.textContent="No audit events loaded.";target.appendChild(p);return; }
  for(const event of events) {
    const div=document.createElement("div");div.className="audit";
    const strong=document.createElement("strong");strong.textContent=event.action.replaceAll("_"," ");
    const meta=document.createElement("div");meta.className="muted";meta.textContent=event.actor_label+" · "+new Date(event.event_at).toLocaleString();
    const detail=document.createElement("pre");detail.style.whiteSpace="pre-wrap";detail.style.fontSize="12px";detail.textContent=JSON.stringify(event.details,null,2);
    div.append(strong,meta,detail);target.appendChild(div);
  }
}
async function saveCorrections() {
  if(!selectedCase)return;
  let changes;
  try { changes=JSON.parse($("editor").value); }
  catch { return feedback("message","The editor is not valid JSON."); }
  if(!changes || typeof changes!=="object" || Array.isArray(changes))return feedback("message","The editor must contain a JSON object.");
  const unknown=Object.keys(changes).filter(key=>!EDITABLE_FIELDS.includes(key));
  if(unknown.length)return feedback("message","These fields cannot be edited: "+unknown.join(", "));
  try {
    const result=await (await api("/review/cases/"+selectedCase.case_id+"/brief",{
      method:"PUT",body:JSON.stringify({changes,expected_revision:selectedCase.revision,note:$("correctionNote").value})
    })).json();
    renderCase(result); await loadAudit(); await refreshQueue();
    feedback("message","Corrections saved. The brief returned to pending review; approval is required again.","success");
  } catch(err) {feedback("message",err.message);}
}
async function decide(decision) {
  if(!selectedCase)return;
  const note=$("decisionNote").value.trim();
  const confirmations={
    source_checked:$("sourceChecked").checked,
    facts_checked:$("factsChecked").checked,
    deadline_reviewed:$("deadlineChecked").checked
  };
  if(decision==="approved" && !Object.values(confirmations).every(Boolean)) {
    return feedback("message","Check all three review confirmations before approving.");
  }
  if(decision==="changes_requested" && !note) {
    return feedback("message","Add a note explaining which changes are needed.");
  }
  if(!confirm("Record decision: "+statusLabel(decision)+"? This action will be added to the case audit history."))return;
  try {
    const result=await (await api("/review/cases/"+selectedCase.case_id+"/decision",{
      method:"POST",body:JSON.stringify({decision,expected_revision:selectedCase.revision,note,confirmations})
    })).json();
    renderCase(result); await loadAudit(); await refreshQueue();
    feedback("message","Decision recorded: "+statusLabel(result.status)+".","success");
  } catch(err) {feedback("message",err.message);}
}
async function exportFile(format) {
  if(!selectedCase || selectedCase.status!=="approved")return;
  try {
    const response=await api("/review/cases/"+selectedCase.case_id+"/export?format="+format);
    const blob=await response.blob();const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;
    a.download="nyaya-saathi-"+selectedCase.case_id.slice(0,12)+"-reviewed."+format;
    document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
  } catch(err) {feedback("message",err.message);}
}
async function deleteCase() {
  if(!selectedCase)return;
  if(!confirm("Permanently delete this case and its audit history? This cannot be undone."))return;
  try {
    await api("/review/cases/"+selectedCase.case_id+"?confirm=true",{method:"DELETE"});
    const old=selectedCase.case_id;selectedCase=null;$("details").hidden=true;$("noCase").hidden=false;
    await refreshQueue();feedback("message","Deleted case "+old+".","success");
  } catch(err) {feedback("message",err.message);}
}
$("connect").onclick=connect;
$("refresh").onclick=()=>refreshQueue().catch(err=>feedback("message",err.message));
$("statusFilter").onchange=()=>refreshQueue().catch(err=>feedback("message",err.message));
$("saveChanges").onclick=saveCorrections;
$("reloadCase").onclick=()=>selectedCase && openCase(selectedCase.case_id);
$("approve").onclick=()=>decide("approved");
$("requestChanges").onclick=()=>decide("changes_requested");
$("reject").onclick=()=>decide("rejected");
$("exportPdf").onclick=()=>exportFile("pdf");
$("exportDocx").onclick=()=>exportFile("docx");
$("deleteCase").onclick=deleteCase;
