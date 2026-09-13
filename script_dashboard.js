const API_BASE = 'http://localhost:8081';

const usn = localStorage.getItem('selectedUSN') || localStorage.getItem('usn');
const collegeCode = localStorage.getItem('collegeCode');
const branch = localStorage.getItem('branch');
let studentData = null;
const $ = (id) => document.getElementById(id);

async function loadStudent() {
    if (!usn || !collegeCode || !branch) {
        showError('Student details not found. Go back to Home.');
        return
    }
    try {
        const r = await fetch(`${API_BASE}/students/usn/${encodeURIComponent(usn)}?collegeCode=${encodeURIComponent(collegeCode)}&branch=${encodeURIComponent(branch)}`);

        if (!r.ok) throw new Error('Student details not found');
        const d = await r.json();
        console.log("Student data" ,d);
        
        studentData = d;
        set('studentName', d.name);
        set('studentUSN', d.usn);
        set('branch', d.branch);
        set('semester', d.semester);
        set('year', d.academicYear);
        set('profileEmail', d.email);
        set('sgpa', d.sgpa);
        set('cgpa', d.cgpa);
        set('percentage', d.percentage != null ? `${d.percentage}%` : null);
        set('backlog', d.backlog ?? 0);
        set('result', d.result);
        
        const semesterSelect = document.getElementById("semesterSelected");
        const selectedSemester = semesterSelect ? semesterSelect.value : "Semester 1st";
        const filteredResults = studentData.results.filter(function(result){
            return getSemesterNumber(result.semester) === getSemesterNumber(selectedSemester);
        });
        displayResults(filteredResults);
    }
    catch (e) {
        showError(e.message)
    }

}
function set(id, v) {
    document.getElementById(id).textContent = v ?? '--'
}
function showError(m) {
    set('studentName', 'Data unavailable');
    document.getElementById('resultTable').innerHTML = `<tr><td colspan="6" class="empty">${m}</td></tr>`
}
function displayResults(items) {
    const t = document.getElementById('resultTable');
    if (!items.length) {
        t.innerHTML = '<tr><td colspan="6" class="empty">No subject result data available yet.</td></tr>';
        return
    }
    t.innerHTML = items.map(x => `<tr><td>${x.code ?? '--'}</td><td>${x.subject ?? '--'}</td><td>${x.credits ?? '--'}</td><td>${x.marks ?? '--'}</td><td>${x.grade ?? '--'}</td><td 
        class="${x.status === 'PASS' ? 'status-pass' : 'status-fail'}">${x.status ?? '--'}</td></tr>`).join('')
}

document.getElementById('dashboardBtn').addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));
document.getElementById('resultBtn').addEventListener('click', () => document.getElementById('resultSection').scrollIntoView({ behavior: 'smooth' }));
document.getElementById('rankBtn').addEventListener('click', () => location.href = 'rank_analysis.html');
document.getElementById('profileBtn').addEventListener('click', () => alert(`Name: ${document.getElementById('studentName').textContent}\nUSN: ${usn}\nEmail: ${document.getElementById('profileEmail').textContent}`));
document.getElementById('logoutBtn').addEventListener('click', () => { localStorage.clear(); location.href = 'index.html' });

function getSemesterNumber(value){
    if(value == null){
        return '';
    }
    const text = String(value).trim().toLowerCase();

    if(text.includes('1st') || text === '1') return '1';
    if(text.includes('2nd') || text === '2') return '2';
    if(text.includes('3rd') || text === '3') return '3';
    if(text.includes('4th') || text === '4') return '4';
    if(text.includes('5th') || text === '5') return '5';
    if(text.includes('6th') || text === '6') return '6';
    if(text.includes('7th') || text === '7') return '7';
    if(text.includes('8th') || text === '8') return '8';
    return '';
}

const semesterSelect = document.getElementById('semesterSelect');
if(semesterSelect){
    semesterSelect.addEventListener("change" ,function(){
    if (!studentData || !studentData.results) {
        return;
    }
    const selectedSemester = this.value;
    const selectedNumber = getSemesterNumber(selectedSemester);
    const filteredResults = studentData.results.filter(function(result){
            return getSemesterNumber(result.semester) === selectedNumber;
        }
    );
    displayResults(filteredResults)
});
}

document.addEventListener('DOMContentLoaded', loadStudent);

