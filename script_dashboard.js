
const API_BASE = 'http://localhost:8081';

const params = new URLSearchParams(window.location.search);

const usn =
    params.get('usn') ||
    localStorage.getItem('selectedUSN') ||
    localStorage.getItem('usn');

const collegeCode = localStorage.getItem('collegeCode');
const branch = localStorage.getItem('branch');

let studentData = null;

const $ = id => document.getElementById(id);


// ------------------------------------------
// SEMESTER DETECTION
// ------------------------------------------

function getSemesterNumber(value) {
    if (value === null || value === undefined) {
        return '';
    }

    const text = String(value).trim().toLowerCase();

    // Accept values such as:
    // 3, 3rd, 3rd SEM, Semester 3, 3rd Semester

    const match = text.match(/\b([1-8])(?:st|nd|rd|th)?\b/);

    return match ? match[1] : '';
}


// Infer semester from subject codes such as:
// BEC301, BEC302, BECL305, BEC401, BEC402.
// This is a fallback when semester data is missing or incorrect.
function getSemesterFromCode(code) {
    if (!code) return '';

    const normalized = String(code)
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '');

    // Matches a semester digit followed by two digits:
    // BEC301 -> 3
    // BECL305 -> 3
    // BEC401 -> 4
    // BEC358A -> 3
    const match = normalized.match(/([1-8])\d{2}[A-Z]?/);

    return match ? match[1] : '';
}


// IMPORTANT:
// Prefer the subject-code semester when the code identifies
// the semester clearly. This prevents a BEC301 subject from
// appearing in Semester 4 just because its semester field
// was incorrectly imported as "4th SEM".
function getResultSemester(result) {
    const codeSemester = getSemesterFromCode(result.code);

    if (codeSemester) {
        return codeSemester;
    }

    return getSemesterNumber(result.semester);
}


function getSelectedResults() {
    if (!studentData || !Array.isArray(studentData.results)) {
        return [];
    }

    const selectedSemester = $('semesterSelect').value;

    return studentData.results.filter(result => {
        return getResultSemester(result) === selectedSemester;
    });
}


// ------------------------------------------
// LOAD STUDENT
// ------------------------------------------

async function loadStudent() {
    if (!usn || !collegeCode || !branch) {
        showError('Student details not found. Go back to Home.');
        return;
    }

    try {
        const url =
            `${API_BASE}/students/usn/${encodeURIComponent(usn)}` +
            `?collegeCode=${encodeURIComponent(collegeCode)}` +
            `&branch=${encodeURIComponent(branch)}`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(
                'Student details not found. Check USN, college code and branch.'
            );
        }

        const data = await response.json();

        studentData = data;

        console.log('Loaded student:', studentData);

        $('studentName').textContent = data.name ?? '--';
        $('studentUSN').textContent = data.usn ?? '--';
        $('branch').textContent = data.branch ?? '--';
        $('semester').textContent = data.semester ?? '--';
        $('year').textContent = data.academicYear ?? '--';
        $('profileEmail').textContent = data.email ?? '--';

        $('sgpa').textContent = data.sgpa ?? '--';
        $('cgpa').textContent = data.cgpa ?? '--';

        $('percentage').textContent =
            data.percentage != null
                ? `${data.percentage}%`
                : '--';

        $('backlog').textContent = data.backlog ?? 0;
        $('result').textContent = data.result ?? '--';

        // Start on the semester selected in the dropdown.
        renderSelectedSemester();

    } catch (error) {
        console.error('Error loading student:', error);
        showError(error.message);
    }
}


function showError(message) {
    $('studentName').textContent = 'Data unavailable';

    $('resultTable').innerHTML = `
        <tr>
            <td colspan="5" class="empty">
                ${escapeHtml(message)}
            </td>
        </tr>
    `;
}


function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);
}


// ------------------------------------------
// DISPLAY RESULTS
// ------------------------------------------

function displayResults(items) {
    const table = $('resultTable');

    if (!items.length) {
        table.innerHTML = `
            <tr>
                <td colspan="5" class="empty">
                    No subject results found for this semester.
                </td>
            </tr>
        `;
        return;
    }

    table.innerHTML = items.map(item => {
        const status = String(item.status ?? '').toUpperCase();
        const statusClass = status === 'PASS'
            ? 'status-pass'
            : 'status-fail';

        return `
            <tr>
                <td>${escapeHtml(item.code ?? '--')}</td>
                <td>${escapeHtml(item.credits ?? '--')}</td>
                <td>${escapeHtml(item.marks ?? '--')}</td>
                <td>${escapeHtml(item.grade ?? '--')}</td>
                <td class="${statusClass}">
                    ${escapeHtml(item.status ?? '--')}
                </td>
            </tr>
        `;
    }).join('');
}


function renderSelectedSemester() {
    displayResults(getSelectedResults());
}


// Update the table when the user changes semesters.
$('semesterSelect').addEventListener('change', () => {
    renderSelectedSemester();
});


// ------------------------------------------
// NAVIGATION
// ------------------------------------------

$('dashboardBtn').addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

$('resultBtn').addEventListener('click', () => {
    $('resultSection').scrollIntoView({
        behavior: 'smooth'
    });
});

$('rankBtn').addEventListener('click', () => {
    window.location.href = 'rank_analysis.html';
});

$('profileBtn').addEventListener('click', () => {
    alert(
        `Name: ${$('studentName').textContent}\n` +
        `USN: ${usn}\n` +
        `Email: ${$('profileEmail').textContent}`
    );
});

$('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('selectedUSN');
    localStorage.removeItem('usn');
    localStorage.removeItem('collegeCode');
    localStorage.removeItem('branch');

    window.location.href = 'index.html';
});


// ------------------------------------------
// CSV / EXCEL DOWNLOAD
// ------------------------------------------

$('downloadResultsBtn').addEventListener('click', () => {
    if (!studentData) {
        alert('Student results are not loaded yet.');
        return;
    }

    const rows = getSelectedResults();
    const selectedSemester = $('semesterSelect').value;

    const quote = value =>
        '"' + String(value ?? '').replaceAll('"', '""') + '"';

    const csvRows = [
        ['USN', studentData.usn],
        ['Name', studentData.name],
        ['Branch', studentData.branch],
        ['Semester', `Semester ${selectedSemester}`],
        [],
        ['Code', 'Credits', 'Marks', 'Grade', 'Status'],

        ...rows.map(row => [
            row.code,
            row.credits,
            row.marks,
            row.grade,
            row.status
        ])
    ];

    const csv = csvRows
        .map(row => row.map(quote).join(','))
        .join('\r\n');

    const blob = new Blob(
        ['\ufeff' + csv],
        { type: 'text/csv;charset=utf-8;' }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download =
        `Result_${studentData.usn}_Semester${selectedSemester}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
});


// ------------------------------------------
// PDF DOWNLOAD
// ------------------------------------------

$('downloadPdfBtn').addEventListener('click', () => {
    if (!studentData) {
        alert('Student results are not loaded yet.');
        return;
    }

    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert(
            'PDF library could not be loaded. ' +
            'Check your internet connection and try again.'
        );
        return;
    }

    const rows = getSelectedResults();
    const selectedSemester = $('semesterSelect').value;

    const { jsPDF } = window.jspdf;

    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const startX = 14;
    const widths = [45, 30, 30, 30, 35];
    const headers = [
        'Code',
        'Credits',
        'Marks',
        'Grade',
        'Status'
    ];

    let y = 18;

    pdf.setFontSize(16);
    pdf.text('College Result Analysis', startX, y);

    y += 10;
    pdf.setFontSize(11);

    pdf.text(`Student Name: ${studentData.name || '--'}`, startX, y);
    y += 7;

    pdf.text(`USN: ${studentData.usn || '--'}`, startX, y);
    y += 7;

    pdf.text(`Branch: ${studentData.branch || '--'}`, startX, y);
    y += 7;

    pdf.text(`Semester: ${selectedSemester}`, startX, y);
    y += 10;

    function drawHeader() {
        let x = startX;

        pdf.setFont(undefined, 'bold');

        headers.forEach((header, index) => {
            pdf.text(header, x, y);
            x += widths[index];
        });

        y += 3;
        pdf.line(startX, y, 196, y);
        y += 7;

        pdf.setFont(undefined, 'normal');
    }

    drawHeader();

    if (!rows.length) {
        pdf.text(
            'No subject results found for this semester.',
            startX,
            y
        );
    } else {
        rows.forEach(row => {
            const cells = [
                row.code,
                row.credits,
                row.marks,
                row.grade,
                row.status
            ].map(value => String(value ?? '--'));

            const rowHeight = 8;

            if (y + rowHeight > 275) {
                pdf.addPage();
                y = 18;
                drawHeader();
            }

            let x = startX;

            cells.forEach((cell, index) => {
                pdf.text(
                    cell.length > 20
                        ? cell.substring(0, 20)
                        : cell,
                    x,
                    y
                );

                x += widths[index];
            });

            y += rowHeight;
        });
    }

    y += 8;

    if (y > 280) {
        pdf.addPage();
        y = 18;
    }

    pdf.setFont(undefined, 'bold');

    pdf.text(
        `SGPA: ${studentData.sgpa ?? '--'}    ` +
        `CGPA: ${studentData.cgpa ?? '--'}    ` +
        `Percentage: ${studentData.percentage ?? '--'}%`,
        startX,
        y
    );

    pdf.save(
        `Result_${studentData.usn || 'Student'}_Semester${selectedSemester}.pdf`
    );
});


// ------------------------------------------
// START
// ------------------------------------------

document.addEventListener('DOMContentLoaded', loadStudent);
