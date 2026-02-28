// ── Auth guard ──────────────────────────────────────────────
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || 'null');
if (!token && !window.location.pathname.includes('portal')) {
  window.location.href = '/login';
}
if (user) {
  document.getElementById('userName').textContent = user.name;
  document.getElementById('userRole').textContent = user.role;
}

function logout() {
  localStorage.clear();
  window.location.href = '/login';
}

// ── API helper ───────────────────────────────────────────────
async function api(path, options = {}) {
  const res = await fetch('/api' + path, {
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token, ...options.headers },
    ...options
  });
  if (res.status === 401) { logout(); return; }
  return res.json();
}

// ── Toast ────────────────────────────────────────────────────
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast show ${type}`;
  setTimeout(() => el.className = 'toast', 3000);
}

// ── Navigation ───────────────────────────────────────────────
document.querySelectorAll('.nav-links li').forEach(li => {
  li.addEventListener('click', () => {
    document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    li.classList.add('active');
    const page = li.dataset.page;
    const pageEl = document.getElementById('page-' + page);
    if (pageEl) pageEl.classList.add('active');
    if (page !== 'messages' && typeof _msgPoll !== 'undefined' && _msgPoll) {
      clearInterval(_msgPoll); _msgPoll = null; _msgSel = null;
    }
    loadPage(page);
  });
});

function loadPage(page) {
  if (page === 'dashboard') loadDashboard();
  if (page === 'patients') loadPatients();
  if (page === 'appointments') loadAppointments();
  if (page === 'reports') loadReports();
  if (page === 'bills') loadBills();
  if (page === 'messages') loadMessages();
}

// ── Modal helpers ────────────────────────────────────────────
function showModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('.modal').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
});

// ── Dashboard ────────────────────────────────────────────────
async function loadDashboard() {
  const [patients, appts, reports, bills] = await Promise.all([
    api('/patients?limit=5'), api('/appointments?limit=5'),
    api('/reports?status=pending&limit=1'), api('/bills?status=pending&limit=1')
  ]);
  document.getElementById('stat-patients').textContent = patients?.total || 0;
  document.getElementById('stat-appts').textContent = appts?.total || 0;
  document.getElementById('stat-reports').textContent = reports?.total || 0;
  document.getElementById('stat-bills').textContent = bills?.total || 0;

  const tbody = document.querySelector('#recent-patients-table tbody');
  tbody.innerHTML = (patients?.rows || []).map(p => `
    <tr>
      <td><b>${p.patient_id}</b></td>
      <td>${p.name}</td>
      <td>${p.phone}</td>
      <td>${new Date(p.created_at).toLocaleDateString()}</td>
      <td><button class="btn-primary btn-sm" onclick="navigate('patients')">View</button></td>
    </tr>`).join('');
}

// ── Patients ─────────────────────────────────────────────────
let patientSearch = '', patientPage = 1;
function searchPatients() { patientSearch = document.getElementById('patient-search').value; patientPage = 1; loadPatients(); }

async function loadPatients() {
  const data = await api(`/patients?search=${encodeURIComponent(patientSearch)}&page=${patientPage}&limit=15`);
  const tbody = document.querySelector('#patients-table tbody');
  tbody.innerHTML = (data?.rows || []).map(p => `
    <tr>
      <td><b>${p.patient_id}</b></td>
      <td>${p.name}</td>
      <td>${p.phone}</td>
      <td>${p.gender || '–'}</td>
      <td>${p.blood_group || '–'}</td>
      <td><span class="badge ${p.is_active ? 'badge-green' : 'badge-grey'}">${p.is_active ? 'Active' : 'Inactive'}</span></td>
      <td>
        <button class="btn-primary btn-sm" onclick="viewPatient(${p.id})">View</button>
        <button class="btn-danger btn-sm" onclick="deletePatient(${p.id}, '${p.name}')">Deactivate</button>
      </td>
    </tr>`).join('');
  buildPagination('patients-pagination', data?.pages || 1, patientPage, p => { patientPage = p; loadPatients(); });
}

async function createPatient() {
  const body = {
    name: document.getElementById('p-name').value,
    phone: document.getElementById('p-phone').value,
    email: document.getElementById('p-email').value,
    date_of_birth: document.getElementById('p-dob').value,
    gender: document.getElementById('p-gender').value,
    blood_group: document.getElementById('p-blood').value,
    address: document.getElementById('p-address').value,
    emergency_contact_name: document.getElementById('p-ec-name').value,
    emergency_contact_phone: document.getElementById('p-ec-phone').value,
    portal_password: document.getElementById('p-password').value,
  };
  if (!body.name || !body.phone) return toast('Name and phone are required', 'error');
  const data = await api('/patients', { method: 'POST', body: JSON.stringify(body) });
  if (data?.success) {
    toast(`Patient registered! ID: ${data.patient_id}`);
    closeModal('patient-modal');
    loadPatients();
  } else { toast(data?.error || 'Error creating patient', 'error'); }
}

async function viewPatient(id) {
  const p = await api(`/patients/${id}`);
  alert(`Patient: ${p.name}\nID: ${p.patient_id}\nPhone: ${p.phone}\nEmail: ${p.email || 'N/A'}\nDOB: ${p.date_of_birth || 'N/A'}\nBlood: ${p.blood_group || 'N/A'}`);
}

async function deletePatient(id, name) {
  if (!confirm(`Deactivate patient "${name}"?`)) return;
  const data = await api(`/patients/${id}`, { method: 'DELETE' });
  if (data?.success) { toast('Patient deactivated'); loadPatients(); }
}

// ── Appointments ─────────────────────────────────────────────

async function loadApptRequests() {
  const data = await api('/appointments/requests');
  const section = document.getElementById('appt-requests-section');
  const tbody = document.querySelector('#appt-requests-table tbody');
  if (!Array.isArray(data) || !data.length) { if(section) section.style.display='none'; return; }
  if(section) section.style.display='block';
  tbody.innerHTML = data.map(r => `
    <tr>
      <td><b>${r.patient_code}</b> ${r.patient_name}</td>
      <td>${r.doctor_name || 'Any'} ${r.doctor_spec ? '('+r.doctor_spec+')' : ''}</td>
      <td>${r.requested_date}</td>
      <td>${r.requested_time}</td>
      <td>${r.reason || '–'}</td>
      <td>
        <button class="btn-success btn-sm" onclick="confirmApptRequest(${r.id})">Confirm</button>
        <button class="btn-danger btn-sm" onclick="rejectApptRequest(${r.id})">Reject</button>
      </td>
    </tr>`).join('');
}

async function confirmApptRequest(id) {
  if (!confirm('Confirm this appointment request? Patient will be notified by email.')) return;
  const data = await api('/appointments/requests/'+id+'/confirm', {method:'POST'});
  if (data?.success) { toast('Appointment confirmed! Patient notified.'); loadApptRequests(); loadAppointments(); }
  else toast(data?.error || 'Error', 'error');
}

async function rejectApptRequest(id) {
  const reason = prompt('Reason for rejection (optional):', 'No slot available at requested time');
  if (reason === null) return;
  const data = await api('/appointments/requests/'+id+'/reject', {method:'POST', body:JSON.stringify({reason})});
  if (data?.success) { toast('Request rejected. Patient notified.'); loadApptRequests(); }
  else toast(data?.error || 'Error', 'error');
}

async function loadAppointments() {
  loadApptRequests();
  const data = await api('/appointments?limit=30');
  const tbody = document.querySelector('#appts-table tbody');
  tbody.innerHTML = (data?.rows || []).map(a => `
    <tr>
      <td><b>${a.patient_code}</b> ${a.patient_name}</td>
      <td>${a.doctor_name || '–'}</td>
      <td>${a.appointment_date}</td>
      <td>${a.appointment_time}</td>
      <td>${a.type}</td>
      <td><span class="badge ${statusBadge(a.status)}">${a.status}</span></td>
      <td>
        <select onchange="updateApptStatus(${a.id}, this.value)" class="btn-secondary btn-sm">
          <option value="">Change…</option>
          <option>confirmed</option><option>completed</option><option>cancelled</option><option>no-show</option>
        </select>
      </td>
    </tr>`).join('');
}

async function createAppointment() {
  const patientCode = document.getElementById('a-pid').value.trim();
  const pData = await api(`/patients?search=${encodeURIComponent(patientCode)}&limit=1`);
  const patient = pData?.rows?.[0];
  if (!patient) return toast('Patient not found', 'error');
  const body = {
    patient_id: patient.id,
    appointment_date: document.getElementById('a-date').value,
    appointment_time: document.getElementById('a-time').value,
    type: document.getElementById('a-type').value,
    notes: document.getElementById('a-notes').value,
  };
  if (!body.appointment_date || !body.appointment_time) return toast('Date and time required', 'error');
  const data = await api('/appointments', { method: 'POST', body: JSON.stringify(body) });
  if (data?.success) { toast('Appointment scheduled!'); closeModal('appt-modal'); loadAppointments(); }
  else toast(data?.error || 'Error', 'error');
}

async function updateApptStatus(id, status) {
  if (!status) return;
  const data = await api(`/appointments/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
  if (data?.success) { toast(`Status updated to ${status}`); loadAppointments(); }
}

// ── Reports ──────────────────────────────────────────────────
async function loadReports() {
  const data = await api('/reports?limit=30');
  const tbody = document.querySelector('#reports-table tbody');
  tbody.innerHTML = (data?.rows || []).map(r => `
    <tr>
      <td><b>${r.patient_code}</b> ${r.patient_name}</td>
      <td>${r.report_type}</td>
      <td>${r.title}</td>
      <td>${r.doctor_name || '–'}</td>
      <td><span class="badge ${statusBadge(r.status)}">${r.status}</span></td>
      <td>${new Date(r.created_at).toLocaleDateString()}</td>
      <td><a href="/api/reports/${r.id}/pdf?token=${token}" target="_blank" class="btn-primary btn-sm">PDF</a></td>
    </tr>`).join('');
}

async function createReport() {
  const patientCode = document.getElementById('r-pid').value.trim();
  const pData = await api(`/patients?search=${encodeURIComponent(patientCode)}&limit=1`);
  const patient = pData?.rows?.[0];
  if (!patient) return toast('Patient not found', 'error');
  const body = {
    patient_id: patient.id,
    report_type: document.getElementById('r-type').value,
    title: document.getElementById('r-title').value,
    description: document.getElementById('r-desc').value,
    findings: document.getElementById('r-findings').value,
    recommendations: document.getElementById('r-recs').value,
  };
  if (!body.report_type || !body.title) return toast('Type and title required', 'error');
  const data = await api('/reports', { method: 'POST', body: JSON.stringify(body) });
  if (data?.success) { toast('Report created!'); closeModal('report-modal'); loadReports(); }
  else toast(data?.error || 'Error', 'error');
}

// ── Bills ─────────────────────────────────────────────────────
let billItemCount = 0;
function addBillItem() {
  const i = billItemCount++;
  const div = document.createElement('div');
  div.className = 'bill-item-row';
  div.innerHTML = `
    <input placeholder="Description" id="bi-desc-${i}">
    <input type="number" placeholder="Qty" value="1" id="bi-qty-${i}" min="1">
    <input type="number" placeholder="Price ₹" id="bi-price-${i}" min="0">
    <button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;font-size:18px;color:#ef4444">✕</button>`;
  document.getElementById('bill-items').appendChild(div);
}

async function createBill() {
  const patientCode = document.getElementById('b-pid').value.trim();
  const pData = await api(`/patients?search=${encodeURIComponent(patientCode)}&limit=1`);
  const patient = pData?.rows?.[0];
  if (!patient) return toast('Patient not found', 'error');

  const items = [];
  document.querySelectorAll('.bill-item-row').forEach(row => {
    const inputs = row.querySelectorAll('input');
    const desc = inputs[0].value, qty = inputs[1].value, price = inputs[2].value;
    if (desc && price) items.push({ description: desc, quantity: parseInt(qty) || 1, unit_price: parseFloat(price) });
  });
  if (!items.length) return toast('Add at least one item', 'error');

  const body = {
    patient_id: patient.id,
    items,
    tax: parseFloat(document.getElementById('b-tax').value) || 0,
    discount: parseFloat(document.getElementById('b-discount').value) || 0,
    due_date: document.getElementById('b-due').value,
    notes: document.getElementById('b-notes').value,
  };
  const data = await api('/bills', { method: 'POST', body: JSON.stringify(body) });
  if (data?.success) { toast(`Bill ${data.bill_number} created! Total: ₹${data.total}`); closeModal('bill-modal'); loadBills(); }
  else toast(data?.error || 'Error', 'error');
}

async function loadBills() {
  const data = await api('/bills?limit=30');
  const tbody = document.querySelector('#bills-table tbody');
  tbody.innerHTML = (data?.rows || []).map(b => `
    <tr>
      <td><b>${b.bill_number}</b></td>
      <td>${b.patient_name} (${b.patient_code})</td>
      <td>₹${parseFloat(b.total).toFixed(2)}</td>
      <td>₹${parseFloat(b.paid_amount).toFixed(2)}</td>
      <td><span class="badge ${statusBadge(b.status)}">${b.status}</span></td>
      <td>${new Date(b.created_at).toLocaleDateString()}</td>
      <td>
        <a href="/api/bills/${b.id}/pdf?token=${token}" target="_blank" class="btn-primary btn-sm">PDF</a>
        ${b.status !== 'paid' ? `<button class="btn-success btn-sm" onclick="recordPayment(${b.id}, ${b.total})">Pay</button>` : ''}
      </td>
    </tr>`).join('');
}

async function recordPayment(id, total) {
  const amount = prompt(`Enter payment amount (Total: ₹${total}):`, total);
  if (!amount) return;
  const method = prompt('Payment method (cash/card/upi/other):', 'cash');
  const data = await api(`/bills/${id}/payment`, {
    method: 'POST', body: JSON.stringify({ paid_amount: parseFloat(amount), payment_method: method })
  });
  if (data?.success) { toast(`Payment recorded. Status: ${data.status}`); loadBills(); }
  else toast(data?.error || 'Error', 'error');
}


async function loadMessages() {
  await _refreshMsgList();
  if (!_msgPoll) _msgPoll = setInterval(function(){ _refreshMsgList(); if(_msgSel)_loadMsgs(_msgSel.id); }, 8000);
}
var _msgSel=null,_msgPrio="normal",_msgPoll=null;
async function _refreshMsgList(){
  var pts=await api("/chat/patients");
  var box=document.getElementById("msg-patient-items");
  if(!box){clearInterval(_msgPoll);_msgPoll=null;return;}
  var total=Array.isArray(pts)?pts.reduce(function(s,p){return s+(p.unread_count||0);},0):0;
  var badge=document.getElementById("nav-msg-badge");
  if(badge){badge.textContent=total;badge.style.display=total>0?"inline":"none";}
  if(!Array.isArray(pts)||!pts.length){box.innerHTML="<div class=msg-loading>No messages yet</div>";return;}
  box.innerHTML=pts.map(function(p){
    var active=_msgSel&&_msgSel.id===p.id?" active":"";
    var last=p.last_message?p.last_message.substring(0,38):"No messages";
    var col=p.highest_priority==="urgent"?"#ef4444":p.highest_priority==="high"?"#f97316":"#1a73e8";
    var time=p.last_message_at?new Date(p.last_message_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):"";
    var unread=p.unread_count>0?"<span class=msg-unread-dot>"+p.unread_count+"</span>":"";
    return "<div class=\"msg-pt-item"+active+"\" onclick=\"_selectMsgPt("+p.id+",'"+p.name+"','"+p.patient_id+"')\">"
      +"<div class=msg-pt-avatar style=\"background:"+col+"22;color:"+col+"\">"+p.name.charAt(0).toUpperCase()+"</div>"
      +"<div class=msg-pt-info>"
      +"<div class=msg-pt-top><span class=msg-pt-name>"+p.name+"</span><span class=msg-pt-time>"+time+"</span></div>"
      +"<div class=msg-pt-sub><span class=msg-pt-last>"+last+"</span>"+unread+"</div>"
      +"</div></div>";
  }).join("");
}
async function _selectMsgPt(id,name,pid){
  _msgSel={id:id,name:name,pid:pid};_msgPrio="normal";
  await api("/chat/read/"+id,{method:"PUT"});
  _refreshMsgList();
  var area=document.getElementById("msg-chat-area");
  area.innerHTML="<div class=msg-chat-topbar>"
    +"<div class=msg-chat-avatar>"+name.charAt(0).toUpperCase()+"</div>"
    +"<div><div class=msg-chat-name>"+name+"</div><div class=msg-chat-pid>"+pid+"</div></div>"
    +"</div>"
    +"<div class=msg-bubbles id=msg-bubbles></div>"
    +"<div class=msg-composer>"
    +"<div class=msg-prio-row><span>Priority:</span>"
    +"<button class=\"mpb sel\" id=mpb-normal onclick=\"_setPrio('normal')\">Normal</button>"
    +"<button class=mpb id=mpb-high onclick=\"_setPrio('high')\">High</button>"
    +"<button class=mpb id=mpb-urgent onclick=\"_setPrio('urgent')\">Urgent</button>"
    +"</div>"
    +"<div class=msg-input-row>"
    +"<textarea id=msg-inp placeholder=\"Type reply...\" onkeydown=\"_msgEnter(event)\"></textarea>"
    +"<button class=msg-send onclick=\"_sendMsg()\">send</button>"
    +"</div></div>";
  _loadMsgs(id);
}
function _setPrio(p){
  _msgPrio=p;
  ["normal","high","urgent"].forEach(function(x){var b=document.getElementById("mpb-"+x);if(b)b.className="mpb"+(p===x?" sel sel-"+p:"");});
}
async function _loadMsgs(pid){
  var msgs=await api("/chat/patients/"+pid);
  var box=document.getElementById("msg-bubbles");
  if(!box)return;
  if(!Array.isArray(msgs)||!msgs.length){box.innerHTML="<div class=msg-no-msgs>No messages yet</div>";return;}
  box.innerHTML=msgs.map(function(m){
    var ip=m.sender_role==="patient";
    var t=new Date(m.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
    var sender=ip?"Patient":(m.staff_name||"Staff");
    return "<div class=\"msg-row "+(ip?"from-patient":"from-staff")+"\">"
      +"<div class=\"msg-bubble "+(ip?"bub-patient":"bub-staff")+"\">"
      +"<div class=bub-text>"+m.message.replace(/\n/g,"<br>")+"</div>"
      +"<div class=bub-time>"+sender+" - "+t+"</div>"
      +"</div></div>";
  }).join("");
  box.scrollTop=box.scrollHeight;
}
async function _sendMsg(){
  var inp=document.getElementById("msg-inp");
  if(!inp||!_msgSel)return;
  var msg=inp.value.trim();if(!msg)return;
  inp.value="";
  await api("/chat/send",{method:"POST",body:JSON.stringify({patient_id:_msgSel.id,message:msg,priority:_msgPrio})});
  _loadMsgs(_msgSel.id);_refreshMsgList();
}
function _msgEnter(e){if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();_sendMsg();}}
setInterval(async function(){var d=await api("/chat/unread-total").catch(function(){return null;});if(!d)return;var b=document.getElementById("nav-msg-badge");if(b){b.textContent=d.total;b.style.display=d.total>0?"inline":"none";}},15000);


// ── Helpers ──────────────────────────────────────────────────
function statusBadge(status) {
  const map = { active: 'badge-green', paid: 'badge-green', completed: 'badge-green', reviewed: 'badge-green',
                scheduled: 'badge-blue', confirmed: 'badge-blue', partial: 'badge-yellow', pending: 'badge-yellow',
                cancelled: 'badge-red', 'no-show': 'badge-red', failed: 'badge-red', inactive: 'badge-grey' };
  return map[status] || 'badge-grey';
}

function buildPagination(containerId, pages, current, onPage) {
  const el = document.getElementById(containerId);
  if (!el || pages <= 1) { if (el) el.innerHTML = ''; return; }
  let html = '';
  for (let i = 1; i <= pages; i++) {
    html += `<button class="${i === current ? 'active' : ''}" onclick="(${onPage.toString()})(${i})">${i}</button>`;
  }
  el.innerHTML = html;
}

function navigate(page) {
  document.querySelectorAll('.nav-links li').forEach(li => {
    li.classList.toggle('active', li.dataset.page === page);
  });
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  loadPage(page);
}

// Initial load
loadDashboard();
