const $ = id => document.getElementById(id);
let token = "", reviewer = "", selectedCase = null, cases = [];

function setReviewView(view, updateUrl = true) {
  const queueView = view === "queue";
  $("statusFilter").value = queueView ? "pending_review" : "";
  $("navReviewQueue").classList.toggle("active", queueView);
  $("navReviewQueue").setAttribute("aria-current", queueView ? "page" : "false");
  $("navAllCases").classList.toggle("active", !queueView);
  $("navAllCases").setAttribute("aria-current", queueView ? "false" : "page");
  if (updateUrl) {
    const next = new URL(window.location.href);
    next.searchParams.set("view", queueView ? "queue" : "all");
    next.searchParams.delete("case_id");
    history.replaceState(null, "", next.pathname + next.search);
  }
  if (token && !$("workspace").hidden) {
    refreshQueue().catch(err => feedback("message", err.message));
  }
}

const ROW_FIELDS = {
  parties: [
    {key:"role", label:"Role", type:"select", options:["sender","recipient","petitioner","respondent","other"]},
    {key:"name", label:"Name"},
    {key:"source_quote", label:"Source quote", wide:true},
    {key:"page_number", label:"Page number", type:"number"}
  ],
  dates_and_periods: [
    {key:"label", label:"Date / period label"},
    {key:"original_text", label:"Exact wording in notice", wide:true},
    {key:"date_as_written_iso", label:"Date (YYYY-MM-DD)", type:"date"},
    {key:"duration_days_as_written", label:"Duration in days", type:"number"},
    {key:"duration_from_as_written", label:"Period starts from", type:"select", options:["receipt","notice_date","other"]},
    {key:"page_number", label:"Page number", type:"number"}
  ],
  legal_provisions_cited: [
    {key:"act", label:"Act / rule"},
    {key:"section", label:"Section / clause"},
    {key:"source_quote", label:"Source quote", wide:true},
    {key:"page_number", label:"Page number", type:"number"}
  ]
};

function feedback(target, message, kind="error") {
  $(target).replaceChildren();
  if (!message) return;
  const node = document.createElement("div");
  node.className = kind;
  node.textContent = message;
  $(target).appendChild(node);
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
    $("auth").hidden = true;
    $("disconnect").hidden = false;
    $("token").value = "";
    $("reviewer").value = "";
    feedback("message","Connected. Token remains only in this page's memory.","success");
    const caseId = new URLSearchParams(location.search).get("case_id");
    if (caseId) await openCase(caseId);
  } catch (err) {
    token = "";
    $("auth").hidden = false;
    $("workspace").hidden = true;
    $("disconnect").hidden = true;
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

function makeField(spec, value) {
  const wrapper = document.createElement("div");
  if (spec.wide) wrapper.className = "wide";
  const label = document.createElement("label");
  label.textContent = spec.label;
  const input = spec.type === "select" ? document.createElement("select") : document.createElement("input");
  if (spec.type === "select") {
    const empty = document.createElement("option"); empty.value=""; empty.textContent="Select…"; input.appendChild(empty);
    for (const optionValue of (spec.options || [])) {
      const opt=document.createElement("option"); opt.value=optionValue; opt.textContent=optionValue.replaceAll("_"," "); input.appendChild(opt);
    }
  } else if (spec.type) {
    input.type = spec.type;
  } else {
    input.type = "text";
  }
  input.dataset.field = spec.key;
  input.value = value == null ? "" : String(value);
  if (spec.type === "number") input.min = "1";
  label.htmlFor = "field-" + spec.key + "-" + Math.random().toString(36).slice(2,9);
  input.id = label.htmlFor;
  wrapper.append(label,input);
  return wrapper;
}

function addRow(containerId, kind, item={}) {
  const container = $(containerId);
  container.querySelectorAll(".empty-list-message").forEach(node => node.remove());
  const card = document.createElement("div");
  card.className = "field-card";
  card.dataset.kind = kind;
  card.dataset.original = JSON.stringify(item);
  const grid = document.createElement("div");
  grid.className = "field-grid";
  for (const spec of ROW_FIELDS[kind]) {
    grid.appendChild(makeField(spec, item[spec.key]));
  }
  card.appendChild(grid);

  if (kind === "dates_and_periods" && item.preliminary_assessment) {
    const assessment = item.preliminary_assessment;
    const p = document.createElement("p");
    p.className = "muted date-assessment";
    const dateText = assessment.due_date || "No date calculated";
    p.textContent = "Existing preliminary calculation: " + dateText + ". Status: " +
      (assessment.status || "not specified") + ". Basis: " + (assessment.basis || "not recorded") +
      ". Any date-period edit invalidates this calculation.";
    card.appendChild(p);
  }

  const actions = document.createElement("div");
  actions.className = "actions";
  const remove = document.createElement("button");
  remove.type = "button"; remove.className = "secondary"; remove.textContent = "Remove row";
  remove.onclick = () => card.remove();
  actions.appendChild(remove); card.appendChild(actions);
  container.appendChild(card);
}

function renderRows(containerId, kind, items) {
  const container = $(containerId); container.replaceChildren();
  if (!items || items.length === 0) {
    const p=document.createElement("p");p.className="muted empty-list-message";p.textContent="No entries extracted. Add one if the source document supports it.";
    container.appendChild(p);
    return;
  }
  items.forEach(item => addRow(containerId, kind, item));
}
function renderEvidence(items) {
  const container=$("evidenceList");container.replaceChildren();
  if (!items || !items.length) {
    const p=document.createElement("p");p.className="muted";p.textContent="No evidence passages were extracted. Verify important facts manually.";
    container.appendChild(p);return;
  }
  for(const item of items) {
    const block=document.createElement("div");block.className="evidence-item";
    const title=document.createElement("strong");title.textContent=(item.field || "Evidence") + (item.page_number ? " · page "+item.page_number : "");
    const quote=document.createElement("p");quote.textContent="“"+(item.quote || "")+"”";
    const status=document.createElement("p");status.className="muted";
    status.textContent="Quote match: "+(item.quote_match_status || "not verified")+" · "+(item.verification_status || "requires human review");
    block.append(title,quote,status);container.appendChild(block);
  }
}
function renderFields(brief) {
  $("summaryEdit").value = brief.summary || "";
  $("demandsEdit").value = (brief.demands_or_claims || []).join("\n");
  $("informationEdit").value = (brief.information_to_confirm || []).join("\n");
  renderRows("partiesEditor","parties",brief.parties || []);
  renderRows("datesEditor","dates_and_periods",brief.dates_and_periods || []);
  renderRows("provisionsEditor","legal_provisions_cited",brief.legal_provisions_cited || []);
  renderEvidence(brief.supporting_evidence || []);
}
function integerOrNull(value) {
  if (value === "") return null;
  const parsed = Number.parseInt(value,10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
function rowValues(containerId, kind) {
  return [...$(containerId).querySelectorAll(".field-card")].map(card => {
    const values={};
    for(const input of card.querySelectorAll("[data-field]")) {
      const key=input.dataset.field;
      if (input.type === "number") values[key]=integerOrNull(input.value);
      else values[key]=input.value.trim() || null;
    }
    return {card, values};
  }).filter(({values}) => Object.values(values).some(v => v !== null && v !== ""));
}
function collectChanges() {
  const parties = rowValues("partiesEditor","parties").map(({values}) => ({
    role: values.role || "other",
    name: values.name,
    source_quote: values.source_quote,
    page_number: values.page_number
  }));
  const provisions = rowValues("provisionsEditor","legal_provisions_cited").map(({values}) => ({
    act: values.act,
    section: values.section,
    source_quote: values.source_quote,
    page_number: values.page_number
  }));
  const dates = rowValues("datesEditor","dates_and_periods").map(({card,values}) => {
    const item = {
      label: values.label || "Date / period",
      original_text: values.original_text,
      date_as_written_iso: values.date_as_written_iso,
      duration_days_as_written: values.duration_days_as_written,
      duration_from_as_written: values.duration_from_as_written,
      page_number: values.page_number
    };
    let original = {};
    try { original=JSON.parse(card.dataset.original || "{}"); } catch {}
    const originalComparable = {
      label: original.label || "Date / period",
      original_text: original.original_text || null,
      date_as_written_iso: original.date_as_written_iso || null,
      duration_days_as_written: original.duration_days_as_written ?? null,
      duration_from_as_written: original.duration_from_as_written || null,
      page_number: original.page_number ?? null
    };
    // Keep the old calculation only if the editable source fields are unchanged.
    item.preliminary_assessment = JSON.stringify(item) === JSON.stringify(originalComparable)
      ? (original.preliminary_assessment ?? null)
      : null;
    return item;
  });
  return {
    summary: $("summaryEdit").value.trim(),
    parties,
    demands_or_claims: $("demandsEdit").value.split("\n").map(v=>v.trim()).filter(Boolean),
    dates_and_periods: dates,
    legal_provisions_cited: provisions,
    information_to_confirm: $("informationEdit").value.split("\n").map(v=>v.trim()).filter(Boolean)
  };
}

function renderCase(item) {
  selectedCase=item;
  const b=item.brief || {};
  $("details").hidden=false; $("noCase").hidden=true;
  $("caseTitle").textContent=item.title;
  $("caseMeta").textContent="Case "+item.case_id+" · Document: "+((b.document || {}).type || "unknown").replaceAll("_"," ")+" · Revision "+item.revision+" · Created "+new Date(item.created_at).toLocaleString();
  $("caseStatus").replaceChildren();
  const pill=document.createElement("span");pill.className="status "+item.status;pill.textContent=statusLabel(item.status);
  $("caseStatus").appendChild(pill);
  renderFields(b);
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
  try {
    const changes=collectChanges();
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
$("addParty").onclick=()=>addRow("partiesEditor","parties",{role:"other"});
$("addDate").onclick=()=>addRow("datesEditor","dates_and_periods",{label:"",original_text:""});
$("addProvision").onclick=()=>addRow("provisionsEditor","legal_provisions_cited",{act:"",section:""});
$("connect").onclick=connect;
$("disconnect").onclick=()=>{
  token = "";
  reviewer = "";
  selectedCase = null;
  cases = [];
  $("workspace").hidden = true;
  $("auth").hidden = false;
  $("disconnect").hidden = true;
  $("token").value = "";
  $("reviewer").value = "";
  $("details").hidden = true;
  $("noCase").hidden = false;
  feedback("authMessage","");
  feedback("message","");
};
$("refresh").onclick=()=>refreshQueue().catch(err=>feedback("message",err.message));
$("statusFilter").onchange=()=>{
  const queueView = $("statusFilter").value === "pending_review";
  $("navReviewQueue").classList.toggle("active", queueView);
  $("navAllCases").classList.toggle("active", !queueView);
  refreshQueue().catch(err=>feedback("message",err.message));
};
$("navReviewQueue").onclick=()=>setReviewView("queue");
$("navAllCases").onclick=()=>setReviewView("all");
$("saveChanges").onclick=saveCorrections;
$("reloadCase").onclick=()=>selectedCase && openCase(selectedCase.case_id);
$("approve").onclick=()=>decide("approved");
$("requestChanges").onclick=()=>decide("changes_requested");
$("reject").onclick=()=>decide("rejected");
$("exportPdf").onclick=()=>exportFile("pdf");
$("exportDocx").onclick=()=>exportFile("docx");
$("deleteCase").onclick=deleteCase;

const initialReviewView = new URLSearchParams(window.location.search).get("view") === "queue" ? "queue" : "all";
setReviewView(initialReviewView, false);
