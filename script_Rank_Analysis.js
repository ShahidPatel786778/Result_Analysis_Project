const API_BASE = 'http://localhost:8081';

const PREVIOUS_KEY = 'resultAnalysisPreviousRanking';
let currentStudents = [];
let previousRanking = [];

const $ = (id) => document.getElementById(id);

function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function escapeHtml(value) {
  return String(value ?? '--')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function rankStudents(data) {
  const enteredUSN = localStorage.getItem('usn');
  if(!enteredUSN){
    return [];
  }
  
  const prefix = enteredUSN.substring(0,7).toUpperCase();
  const filteredStudents = data.filter(student => student.usn && String(student.usn).toUpperCase().startsWith(prefix));

  return filteredStudents.sort((a, b) => {
    const cgpaA = number(a.cgpa) ?? -1;
    const cgpaB = number(b.cgpa) ?? -1;
    if (cgpaB !== cgpaA) return cgpaB - cgpaA;
    return String(a.usn ?? '').localeCompare(String(b.usn ?? ''));
  });
}

function loadPrevious() {
  try {
    const saved = JSON.parse(localStorage.getItem(PREVIOUS_KEY) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch (_) { return []; }
}

function savePrevious(ranked) {
  const snapshot = ranked.map((s, i) => ({ usn: s.usn, rank: i + 1 }));
  localStorage.setItem(PREVIOUS_KEY, JSON.stringify(snapshot));
}

function getPreviousRank(usn) {
  const found = previousRanking.find(x => String(x.usn).toLowerCase() === String(usn).toLowerCase());
  return found ? found.rank : null;
}

function rankChangeText(currentRank, oldRank) {
  if (oldRank === null) return '<span class="muted">New</span>';
  const change = oldRank - currentRank;
  if (change > 0) return `<span class="status-pass">↑ ${change}</span>`;
  if (change < 0) return `<span class="status-fail">↓ ${Math.abs(change)}</span>`;
  return '<span class="muted">— Same</span>';
}

function drawBarChart(canvas, labels, values, options = {}) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(canvas.parentElement.clientWidth, 320);
  const height = options.height || 300;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const pad = { left: 48, right: 18, top: 28, bottom: 62 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const max = Math.max(...values, 1);
  const step = plotW / Math.max(values.length, 1);
  const barW = Math.min(58, step * 0.58);

  ctx.font = '12px Segoe UI, Arial';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#667085';
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + plotH - (plotH * i / 4);
    const value = (max * i / 4).toFixed(options.decimals ?? 1);
    ctx.fillText(value, pad.left - 8, y + 4);
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(width - pad.right, y); ctx.strokeStyle = '#e6ebf2'; ctx.stroke();
  }

  values.forEach((value, i) => {
    const x = pad.left + step * i + (step - barW) / 2;
    const h = (value / max) * plotH;
    const y = pad.top + plotH - h;
    ctx.fillStyle = i % 2 ? '#7c3aed' : '#2563eb';
    ctx.fillRect(x, y, barW, h);
    ctx.fillStyle = '#172033'; ctx.textAlign = 'center';
    ctx.font = 'bold 12px Segoe UI, Arial';
    ctx.fillText(options.valueLabels?.[i] ?? String(value), x + barW / 2, Math.max(y - 7, 14));
    ctx.font = '11px Segoe UI, Arial'; ctx.fillStyle = '#667085';
    const label = String(labels[i]);
    ctx.save(); ctx.translate(x + barW / 2, height - 25); ctx.rotate(-0.28); ctx.fillText(label, 0, 0); ctx.restore();
  });
}

function drawComparisonChart(current) {
  const top = current.slice(0, 8);
  const labels = top.map(s => s.usn || s.name || '--');
  const currentRanks = top.map((_, i) => i + 1);
  const previousRanks = top.map(s => getPreviousRank(s.usn) ?? currentRanks[top.indexOf(s)]);
  const canvas = $('rankComparisonChart');
  drawGroupedChart(canvas, labels, previousRanks, currentRanks);
}

function drawGroupedChart(canvas, labels, previous, current) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(canvas.parentElement.clientWidth, 320);
  const height = 300;
  canvas.width = width * dpr; canvas.height = height * dpr;
  canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  const pad = { left: 48, right: 18, top: 42, bottom: 72 }; const plotW = width - pad.left - pad.right; const plotH = height - pad.top - pad.bottom;
  const max = Math.max(...previous, ...current, 1); const step = plotW / Math.max(labels.length, 1); const barW = Math.min(22, step * 0.28);
  ctx.font = '11px Segoe UI,Arial'; ctx.textAlign = 'right'; ctx.fillStyle = '#667085';
  for (let i = 0; i <= max; i++) { if (max > 12 && i % 2) continue; const y = pad.top + plotH - (i / max) * plotH; ctx.fillText(String(i), pad.left - 8, y + 4); ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(width - pad.right, y); ctx.strokeStyle = '#e6ebf2'; ctx.stroke(); }
  labels.forEach((label, i) => {
    const base = pad.left + i * step + (step / 2); const vals = [previous[i], current[i]];
    vals.forEach((v, j) => { const h = (v / max) * plotH; const x = base - barW - (barW / 4) + j * (barW + barW / 2); const y = pad.top + plotH - h; ctx.fillStyle = j === 0 ? '#94a3b8' : '#2563eb'; ctx.fillRect(x, y, barW, h); });
    ctx.fillStyle = '#667085'; ctx.textAlign = 'center'; ctx.save(); ctx.translate(base, height - 28); ctx.rotate(-0.35); ctx.fillText(String(label), 0, 0); ctx.restore();
  });
  ctx.textAlign = 'left'; ctx.fillStyle = '#667085'; ctx.fillRect(pad.left, 15, 12, 12); ctx.fillText('Previous', pad.left + 18, 25); ctx.fillStyle = '#2563eb'; ctx.fillRect(pad.left + 90, 15, 12, 12); ctx.fillStyle = '#667085'; ctx.fillText('Current', pad.left + 108, 25);
}

function drawDepartmentChart(ranked) {
  const groups = {};
  ranked.forEach(s => {
    const dept = s.branch || 'Unknown';
    const cgpa = number(s.cgpa);
    if (!groups[dept]) groups[dept] = { total: 0, count: 0, students: 0 };
    groups[dept].students++;
    if (cgpa !== null) { groups[dept].total += cgpa; groups[dept].count++; }
  });
  const entries = Object.entries(groups).map(([dept, v]) => ({ dept, avg: v.count ? v.total / v.count : 0, students: v.students })).sort((a, b) => b.avg - a.avg);
  const labels = entries.map(x => x.dept); const values = entries.map(x => x.avg);
  drawBarChart($('departmentChart'), labels, values, { height: 300, decimals: 1, valueLabels: values.map(v => v.toFixed(2)) });
}

function renderStats(ranked) {
  const valid = ranked.map(s => number(s.cgpa)).filter(v => v !== null);
  const avg = valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
  const departments = new Set(ranked.map(s => s.branch).filter(Boolean)).size;
  $('rankStats').innerHTML = `
    <div class="summary"><small>Total Students</small><strong>${ranked.length}</strong></div>
    <div class="summary"><small>Top CGPA</small><strong>${valid.length ? Math.max(...valid).toFixed(2) : '--'}</strong></div>
    <div class="summary"><small>Average CGPA</small><strong>${avg !== null ? avg.toFixed(2) : '--'}</strong></div>
    <div class="summary"><small>Departments</small><strong>${departments}</strong></div>`;
}

function renderTable(ranked) {
  const table = $('rankTable');
  if (!ranked.length) { table.innerHTML = '<tr><td colspan="8" class="empty">No students found.</td></tr>'; return; }
  table.innerHTML = ranked.map((s, i) => {
    const rank = i + 1; const old = getPreviousRank(s.usn);
    const result = String(s.result ?? '--').toUpperCase();
    const resultClass = result === 'PASS' ? 'status-pass' : result === 'FAIL' ? 'status-fail' : '';
    return `<tr>
    <td><strong>${rank}</strong></td>
    <td>${escapeHtml(s.usn)}</td>
    <td>${escapeHtml(s.name)}</td>
    <td>${escapeHtml(s.branch)}</td>
    <td>${number(s.cgpa)?.toFixed(2) ?? '--'}</td>
    <td class="${resultClass}">${escapeHtml(result)}</td>
    <td>${rankChangeText(rank, old)}</td>
    <td> 
      <button class="btn secondary detailsBtn" type="button" 
       onclick="viewStudentDetails('${escapeHtml(s.usn)}')">Details</button>
    </td>
    </tr>`;
  }).join('');
}

window.viewStudentDetails = function(usn){
  console.log("Selected USN:",usn);
  localStorage.setItem('selectedUSN',usn);
  window.location.href='./dashboard.html';
};

async function loadRanks() {
  const status = $('resultStatus'); const table = $('rankTable');
  status.textContent = 'Loading student ranking from the backend...';
  table.innerHTML = '<tr><td colspan="8" class="empty">Loading...</td></tr>';
  previousRanking = loadPrevious();
  try {
    const response = await fetch(`${API_BASE}/students`);
    if (!response.ok) throw new Error('Backend request failed');
    const data = await response.json();
    currentStudents = rankStudents(Array.isArray(data) ? data : []);
    renderTable(currentStudents); renderStats(currentStudents); renderTopStudent(currentStudents); drawComparisonChart(currentStudents); drawDepartmentChart(currentStudents);
    status.textContent = `${currentStudents.length} student(s) ranked successfully.`;
    $('previousNote').textContent = previousRanking.length ? 'Comparison uses the ranking saved from the previous successful load.' : 'No previous ranking was saved yet. Refresh after data changes to compare ranks.';
    // Save AFTER rendering so the current load can be compared with the previous load.
    savePrevious(currentStudents);
  } catch (error) {
    console.error("Rank Analysis Error: " ,error);
    status.textContent=`Error: ${error.message}`;
    table.innerHTML = `<tr><td colspan="8" class="empty">${error.message}</td></tr>`;
  }
}

function showPanel(panelId) {
  document.querySelectorAll('.analysis-panel').forEach(panel => panel.classList.add('hidden'));
  const panel = $(panelId);
  if (panel) panel.classList.remove('hidden');
  if (panelId === 'rankComparePanel' && currentStudents.length) drawComparisonChart(currentStudents);
  if (panelId === 'deptPanel' && currentStudents.length) drawDepartmentChart(currentStudents);
  panel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderTopStudent(ranked) {
  const box = $('topStudent');
  if (!ranked.length) { box.innerHTML = ''; return; }
  const top = ranked[0];
  const cgpa = number(top.cgpa);
  box.innerHTML = `
    <div class="topper-highlight">
      <div class="topper-medal">🏆</div>
      <div>
        <small>Current Top Student</small>
        <h3>${escapeHtml(top.name)}</h3>
        <p>${escapeHtml(top.usn)} • ${escapeHtml(top.branch)} • CGPA: <strong>${cgpa !== null ? cgpa.toFixed(2) : '--'}</strong></p>
      </div>
      <div class="top-rank">Rank #1</div>
    </div>`;
}

function downloadExcel() {
  if (!currentStudents.length) {
    alert("No student data available to downloade");
    return;
  }

  let csv = 'Rank,Usn,Name,Department,CGPA,Result,RankChange\n';

  currentStudents.forEach(function(student, index){
    const rank = index + 1;
    const oldRank = getPreviousRank(student.usn);
    let rankChange = "New";
    if (oldRank != null) {
      const change = oldRank - rank;
      if (change > 0) {
        rankChange = "up" + change;
      }
      else if (change < 0) {
        rankChange = "Down" + Math.abs(change);
      }
      else {
        rankChange = "Same";
      }
    }

    csv +=
      rank + "," +
      student.usn +"," +
      student.name +"," +
      student.branch +"," +
      student.cgpa +"," +
      student.result +"," +
      rankChange + "\n" ;
    });

  const blob = new Blob([csv], {
    type: 'text/csv;charset=utf-8;'
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = 'Student_Rank_Analysis.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

$('backBtn').addEventListener('click', () => location.href = 'dashboard.html');
$('logoutBtn').addEventListener('click', () => { localStorage.clear(); location.href = 'index.html'; });
$('topperBtn').addEventListener('click', () => showPanel('topperPanel'));
$('rankCompareBtn').addEventListener('click', () => showPanel('rankComparePanel'));
$('deptBtn').addEventListener('click', () => showPanel('deptPanel'));
$('statsBtn').addEventListener('click', () => showPanel('statsPanel'));
$('excelBtnMain')?.addEventListener('click', () => downloadExcel());
document.querySelectorAll('.closePanel').forEach(btn => btn.addEventListener('click', () => { 
  document.querySelectorAll('.analysis-panel').forEach(panel => panel.classList.add('hidden')); window.scrollTo({ top: 0, behavior: 'smooth' });
}));
window.addEventListener('resize', () => {
  if (currentStudents.length) {
    if (!$('rankComparePanel').classList.contains('hidden')) drawComparisonChart(currentStudents);
    if (!$('deptPanel').classList.contains('hidden')) drawDepartmentChart(currentStudents);
  }
});
loadRanks();
