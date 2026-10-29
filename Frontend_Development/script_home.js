const API_BASE = 'http://localhost:8081';

let captcha = '';

function generateCaptcha() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*?';
    captcha = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    document.getElementById('captchaText').textContent = captcha;
}
generateCaptcha();
document.getElementById('refreshCaptcha').addEventListener('click', generateCaptcha);
document.getElementById('studentForm').addEventListener('submit', async e => {
    e.preventDefault();
    const collegeCode = document.getElementById('collegeCode').value.trim();
    const branch = document.getElementById('branch').value.trim();
    const usn = document.getElementById('usn').value.trim().toUpperCase();
    const cap = document.getElementById('captchaInput').value.trim();
    const msg = document.getElementById('message');

    if (cap !== captcha) {
        msg.textContent = 'Invalid CAPTCHA. Try again.';
        msg.style.color = '#dc2626';
        generateCaptcha();
        return
    }
    msg.textContent = 'Checking student...';
    msg.style.color = '#667085';
    try {
        const r = await fetch(`${API_BASE}/students/usn/${encodeURIComponent(usn)}?collegeCode=${encodeURIComponent(collegeCode)}&branch=${encodeURIComponent(branch)}`);

        if (!r.ok) throw new Error('Student not found');
        const student = await r.json();
        if (student.branch && branch && student.branch.toUpperCase() !== branch.toUpperCase()) {
            throw new Error('Branch does not match this USN.')
        }
        localStorage.setItem('collegeCode', collegeCode);
        localStorage.setItem('branch', branch);
        localStorage.setItem('usn', usn); msg.textContent = 'Student found. Opening dashboard...';
        msg.style.color = '#15803d';

        setTimeout(() => location.href = 'dashboard.html', 400)
    }

    catch (err) {
        msg.textContent = err.message.includes('fetch') ? 'Backend is not reachable. Start Spring Boot on port 8081.' : err.message;
        msg.style.color = '#dc2626'
    }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.clear();
    location.href = 'index.html'
});


// Only the HOD session sees the Excel import control.
const hodImportCard = document.getElementById('hodImportCard');
if (localStorage.getItem('userRole') === 'HOD' && localStorage.getItem('userId') === 'hodmam') {
    hodImportCard?.classList.remove('hidden');
}
const excelImportForm = document.getElementById('excelImportForm');
excelImportForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = document.getElementById('excelImportMessage');
    const file = document.getElementById('excelFile').files[0];
    if (localStorage.getItem('userRole') !== 'HOD' || localStorage.getItem('userId') !== 'hodmam') {
        message.textContent = 'Only the HOD account can import results.'; message.style.color = '#dc2626'; return;
    }
    if (!file) { message.textContent = 'Choose an Excel file.'; message.style.color = '#dc2626'; return; }
    const data = new FormData(); data.append('file', file);
    message.textContent = 'Importing Excel sheet...'; message.style.color = '#667085';
    try {
        const response = await fetch(`${API_BASE}/api/hod/import-excel`, { method: 'POST', body: data });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Excel import failed.');
        message.textContent = `${result.message} Rows imported: ${result.rowsImported}; students updated: ${result.studentsUpdated}.`;
        message.style.color = '#15803d';
    } catch (error) { message.textContent = error.message || 'Could not connect to backend.'; message.style.color = '#dc2626'; }
});
