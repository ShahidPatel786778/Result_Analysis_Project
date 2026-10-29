
'use strict';

const API_BASE = 'http://localhost:8081';
const PREVIOUS_KEY = 'resultAnalysisPreviousRanking';

let currentStudents = [];
let allStudents = [];
let previousRanking = [];

const $ = id => document.getElementById(id);

const normalize = value =>
    String(value ?? '').trim().toLowerCase();

const number = value => {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
};

function escapeHtml(value) {
    return String(value ?? '--')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function getUSN(s) {
    return s.usn ?? s.USN ?? '';
}

function getName(s) {
    return s.name ?? s.studentName ?? s.student_name ?? '--';
}

function getBranch(s) {
    return s.branch ?? s.department ?? s.branchName ?? '';
}

function getCollegeCode(s) {
    return s.collegeCode ?? s.collegecode ??
        s.college_code ?? '';
}

function getAcademicYear(s) {
    return String(
        s.academicyear ??
        s.academicYear ??
        s.academic_year ??
        s.batch ??
        'Unknown year'
    ).trim();
}

function getCGPA(s) {
    return number(s.cgpa ?? s.CGPA);
}

function getResults(s) {
    const results =
        s.results ??
        s.subjectResults ??
        s.subject_results;

    return Array.isArray(results) ? results : [];
}

function getResultCode(r) {
    return String(
        r.code ??
        r.subjectCode ??
        r.subject_code ??
        r.subjectcode ??
        r.subjectCodeName ??
        ''
    ).trim().toUpperCase();
}

function getMarks(r) {
    return number(
        r.marks ??
        r.totalMarks ??
        r.total_marks ??
        r.obtainedMarks ??
        r.obtained_marks
    );
}

// ---------------- PREVIOUS RANKING ----------------

function loadPrevious() {
    try {
        const value = JSON.parse(
            localStorage.getItem(PREVIOUS_KEY) || '[]'
        );

        return Array.isArray(value) ? value : [];
    } catch {
        return [];
    }
}

function savePrevious(students) {
    localStorage.setItem(
        PREVIOUS_KEY,
        JSON.stringify(
            students.map((s, i) => ({
                usn: getUSN(s),
                rank: i + 1
            }))
        )
    );
}

function getPreviousRank(usn) {
    const old = previousRanking.find(s =>
        normalize(s.usn) === normalize(usn)
    );

    return old ? old.rank : null;
}

function rankChangeText(rank, oldRank) {
    if (oldRank === null) {
        return '<span class="muted">New</span>';
    }

    const difference = oldRank - rank;

    if (difference > 0) {
        return `<span class="status-pass">↑ ${difference}</span>`;
    }

    if (difference < 0) {
        return `<span class="status-fail">↓ ${Math.abs(difference)}</span>`;
    }

    return '<span class="muted">— Same</span>';
}

// ---------------- CHARTS ----------------

function drawBarChart(canvas, labels, values, options = {}) {
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const width = Math.max(
        canvas.parentElement?.clientWidth || 0,
        320
    );

    const height = options.height || 300;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = '100%';
    canvas.style.height = `${height}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    if (!values.length) {
        ctx.fillStyle = '#667085';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
            options.emptyMessage || 'No data available',
            width / 2,
            height / 2
        );
        return;
    }

    const pad = {
        left: 48,
        right: 18,
        top: 28,
        bottom: 65
    };

    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;
    const max = Math.max(...values, 1);
    const step = plotW / values.length;
    const barW = Math.min(58, step * 0.58);

    for (let i = 0; i <= 4; i++) {
        const y = pad.top + plotH - plotH * i / 4;

        ctx.fillStyle = '#667085';
        ctx.font = '11px Arial';
        ctx.textAlign = 'right';

        ctx.fillText(
            (max * i / 4).toFixed(options.decimals ?? 1),
            pad.left - 8,
            y + 4
        );

        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(width - pad.right, y);
        ctx.strokeStyle = '#e6ebf2';
        ctx.stroke();
    }

    values.forEach((value, i) => {
        const x =
            pad.left + i * step + (step - barW) / 2;

        const h = value / max * plotH;
        const y = pad.top + plotH - h;

        ctx.fillStyle = i % 2 ? '#7c3aed' : '#2563eb';
        ctx.fillRect(x, y, barW, h);

        ctx.fillStyle = '#172033';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';

        ctx.fillText(
            options.valueLabels?.[i] ?? String(value),
            x + barW / 2,
            Math.max(y - 7, 14)
        );

        ctx.save();
        ctx.translate(x + barW / 2, height - 24);
        ctx.rotate(-0.3);
        ctx.fillStyle = '#667085';
        ctx.font = '11px Arial';
        ctx.fillText(String(labels[i]), 0, 0);
        ctx.restore();
    });
}

function drawGroupedChart(canvas, labels, previous, current) {
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const width = Math.max(
        canvas.parentElement?.clientWidth || 0,
        320
    );

    const height = 300;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = '100%';
    canvas.style.height = `${height}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    if (!labels.length) {
        ctx.fillStyle = '#667085';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
            'No ranking data available',
            width / 2,
            height / 2
        );
        return;
    }

    const pad = {
        left: 48,
        right: 18,
        top: 42,
        bottom: 75
    };

    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;

    const max = Math.max(...previous, ...current, 1);
    const step = plotW / labels.length;
    const barW = Math.min(22, step * 0.28);

    for (let i = 0; i <= 4; i++) {
        const y = pad.top + plotH - plotH * i / 4;

        ctx.fillStyle = '#667085';
        ctx.font = '11px Arial';
        ctx.textAlign = 'right';

        ctx.fillText(
            (max * i / 4).toFixed(0),
            pad.left - 8,
            y + 4
        );

        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(width - pad.right, y);
        ctx.strokeStyle = '#e6ebf2';
        ctx.stroke();
    }

    labels.forEach((label, i) => {
        const base = pad.left + i * step + step / 2;

        [previous[i], current[i]].forEach((value, j) => {
            const h = value / max * plotH;
            const x =
                base - barW - barW / 4 + j * barW * 1.5;
            const y = pad.top + plotH - h;

            ctx.fillStyle = j === 0 ? '#94a3b8' : '#2563eb';
            ctx.fillRect(x, y, barW, h);
        });

        ctx.save();
        ctx.translate(base, height - 25);
        ctx.rotate(-0.3);
        ctx.fillStyle = '#667085';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(String(label), 0, 0);
        ctx.restore();
    });

    ctx.font = '12px Arial';
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(pad.left, 15, 12, 12);

    ctx.fillStyle = '#667085';
    ctx.textAlign = 'left';
    ctx.fillText('Previous', pad.left + 18, 25);

    ctx.fillStyle = '#2563eb';
    ctx.fillRect(pad.left + 90, 15, 12, 12);

    ctx.fillStyle = '#667085';
    ctx.fillText('Current', pad.left + 108, 25);
}

function drawRankComparison() {
    const top = currentStudents.slice(0, 8);

    const current = top.map((_, i) => i + 1);

    const previous = top.map((s, i) =>
        getPreviousRank(getUSN(s)) ?? current[i]
    );

    drawGroupedChart(
        $('rankComparisonChart'),
        top.map(s => getUSN(s) || getName(s)),
        previous,
        current
    );
}

function drawDepartmentChart() {
    const groups = {};

    currentStudents.forEach(s => {
        const branch = getBranch(s) || 'Unknown';
        const cgpa = getCGPA(s);

        if (!groups[branch]) {
            groups[branch] = { total: 0, count: 0 };
        }

        if (cgpa !== null) {
            groups[branch].total += cgpa;
            groups[branch].count++;
        }
    });

    const entries = Object.entries(groups).map(
        ([branch, data]) => ({
            branch,
            average: data.count
                ? data.total / data.count
                : 0
        })
    );

    drawBarChart(
        $('departmentChart'),
        entries.map(e => e.branch),
        entries.map(e => e.average),
        {
            decimals: 2,
            valueLabels: entries.map(e => e.average.toFixed(2))
        }
    );
}

// ---------------- TABLE AND STATS ----------------

function renderTable() {
    const table = $('rankTable');
    if (!table) return;

    if (!currentStudents.length) {
        table.innerHTML =
            '<tr><td colspan="8" class="empty">No students found.</td></tr>';
        return;
    }

    table.innerHTML = currentStudents.map((s, i) => {
        const rank = i + 1;
        const result = String(s.result ?? '--').toUpperCase();

        const cls = result === 'PASS'
            ? 'status-pass'
            : result === 'FAIL'
                ? 'status-fail'
                : '';

        const cgpa = getCGPA(s);

        return `
            <tr>
                <td><strong>${rank}</strong></td>
                <td>${escapeHtml(getUSN(s))}</td>
                <td>${escapeHtml(getName(s))}</td>
                <td>${escapeHtml(getBranch(s))}</td>
                <td>${cgpa === null ? '--' : cgpa.toFixed(2)}</td>
                <td class="${cls}">${escapeHtml(result)}</td>
                <td>${rankChangeText(
                    rank,
                    getPreviousRank(getUSN(s))
                )}</td>
                <td>
                    <button class="btn secondary detailsBtn"
                        type="button"
                        data-usn="${escapeHtml(getUSN(s))}">
                        Details
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    const topBox = $('topStudent');

    if (topBox && currentStudents.length) {
        const top = currentStudents[0];
        const cgpa = getCGPA(top);

        topBox.innerHTML = `
            <div class="topper-highlight">
                <div class="topper-medal">🏆</div>
                <div>
                    <small>Current Top Student</small>
                    <h3>${escapeHtml(getName(top))}</h3>
                    <p>
                        ${escapeHtml(getUSN(top))} •
                        ${escapeHtml(getBranch(top))} •
                        CGPA:
                        <strong>
                            ${cgpa === null ? '--' : cgpa.toFixed(2)}
                        </strong>
                    </p>
                </div>
                <div class="top-rank">Rank #1</div>
            </div>
        `;
    }
}

function renderStats() {
    const box = $('rankStats');
    if (!box) return;

    const values = currentStudents
        .map(getCGPA)
        .filter(v => v !== null);

    const average = values.length
        ? values.reduce((a, b) => a + b, 0) / values.length
        : null;

    box.innerHTML = `
        <div class="summary">
            <small>Total Students</small>
            <strong>${currentStudents.length}</strong>
        </div>
        <div class="summary">
            <small>Top CGPA</small>
            <strong>
                ${values.length ? Math.max(...values).toFixed(2) : '--'}
            </strong>
        </div>
        <div class="summary">
            <small>Average CGPA</small>
            <strong>${average === null ? '--' : average.toFixed(2)}</strong>
        </div>
        <div class="summary">
            <small>Departments</small>
            <strong>
                ${new Set(
                    currentStudents.map(getBranch).filter(Boolean)
                ).size}
            </strong>
        </div>
    `;
}

// ---------------- SUBJECT-WISE BATCH COMPARISON ----------------

function getComparisonCohort() {
    const branch = normalize(localStorage.getItem('branch'));
    const college = normalize(localStorage.getItem('collegeCode'));

    let cohort = [...allStudents];

    // Filter by college only if matching records exist.
    if (college) {
        const matchingCollege = cohort.filter(s =>
            normalize(getCollegeCode(s)) === college
        );

        if (matchingCollege.length) {
            cohort = matchingCollege;
        }
    }

    // Filter by branch only if matching records exist.
    if (branch) {
        const matchingBranch = cohort.filter(s =>
            normalize(getBranch(s)) === branch
        );

        if (matchingBranch.length) {
            cohort = matchingBranch;
        }
    }

    return cohort;
}

function setupSubjectComparison() {
    const select = $('subjectCompareSelect');
    const note = $('subjectCompareNote');

    if (!select || !note) {
        console.error(
            'Missing subjectCompareSelect or subjectCompareNote in HTML.'
        );
        return;
    }

    const oldValue = select.value;
    const cohort = getComparisonCohort();

    const codes = [
        ...new Set(
            cohort.flatMap(student =>
                getResults(student)
                    .map(result => getResultCode(result))
                    .filter(Boolean)
            )
        )
    ].sort();

    select.innerHTML =
        '<option value="">Select subject code</option>' +
        codes.map(code =>
            `<option value="${escapeHtml(code)}">${escapeHtml(code)}</option>`
        ).join('');

    if (codes.includes(oldValue)) {
        select.value = oldValue;
    }

    note.textContent = codes.length
        ? `${codes.length} subject code(s) found. Select one to compare academic years.`
        : `No subject codes found. Students loaded: ${cohort.length}. Check the results field in the API response.`;

    select.onchange = drawSubjectComparison;
}

function drawSubjectComparison() {
    const select = $('subjectCompareSelect');
    const note = $('subjectCompareNote');
    const canvas = $('subjectComparisonChart');

    if (!select || !note || !canvas) return;

    const code = select.value.trim().toUpperCase();

    if (!code) {
        note.textContent = 'Select a code to compare batch averages.';

        drawBarChart(canvas, [], [], {
            emptyMessage: 'Select a subject code'
        });

        return;
    }

    const groups = {};

    getComparisonCohort().forEach(student => {
        const year = getAcademicYear(student);

        getResults(student).forEach(result => {
            if (getResultCode(result) !== code) return;

            const marks = getMarks(result);
            if (marks === null) return;

            if (!groups[year]) {
                groups[year] = { total: 0, count: 0 };
            }

            groups[year].total += marks;
            groups[year].count++;
        });
    });

    const entries = Object.entries(groups)
        .filter(([, data]) => data.count > 0)
        .sort(([a], [b]) =>
            a.localeCompare(b, undefined, { numeric: true })
        );

    if (!entries.length) {
        note.textContent =
            `No marks found for subject ${code}. Check the subject marks field.`;

        drawBarChart(canvas, [], [], {
            emptyMessage: `No marks found for ${code}`
        });

        return;
    }

    const labels = entries.map(([year]) => year);

    const averages = entries.map(([, data]) =>
        Math.round(data.total / data.count * 100) / 100
    );

    drawBarChart(canvas, labels, averages, {
        decimals: 1,
        valueLabels: averages.map(v => v.toFixed(2))
    });

    note.textContent =
        `Average marks for ${code} across ${entries.length} academic year(s).`;
}

// ---------------- CSV DOWNLOAD ----------------

function downloadExcel() {
    if (!currentStudents.length) {
        alert('No student data available to download.');
        return;
    }

    const rows = [[
        'Rank',
        'USN',
        'Name',
        'Department',
        'CGPA',
        'Result',
        'Rank Change'
    ]];

    currentStudents.forEach((s, i) => {
        const old = getPreviousRank(getUSN(s));

        const change = old === null
            ? 'New'
            : old > i + 1
                ? `Up ${old - (i + 1)}`
                : old < i + 1
                    ? `Down ${(i + 1) - old}`
                    : 'Same';

        rows.push([
            i + 1,
            getUSN(s),
            getName(s),
            getBranch(s),
            getCGPA(s) ?? '',
            s.result ?? '',
            change
        ]);
    });

    const csv = rows.map(row =>
        row.map(value =>
            `"${String(value ?? '').replaceAll('"', '""')}"`
        ).join(',')
    ).join('\r\n');

    const blob = new Blob(['\uFEFF' + csv], {
        type: 'text/csv;charset=utf-8;'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'Student_Rank_Analysis.csv';

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------------- PANELS ----------------

function showPanel(id) {
    document.querySelectorAll('.analysis-panel').forEach(panel =>
        panel.classList.add('hidden')
    );

    const panel = $(id);
    if (!panel) {
        console.error(`Panel not found: #${id}`);
        return;
    }

    panel.classList.remove('hidden');

    if (id === 'topperPanel') renderTable();
    if (id === 'rankComparePanel') drawRankComparison();
    if (id === 'deptPanel') drawDepartmentChart();
    if (id === 'statsPanel') renderStats();

    if (id === 'subjectComparePanel') {
        setupSubjectComparison();
        drawSubjectComparison();
    }

    panel.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}

// ---------------- BUTTONS AND DETAILS ----------------

function initializeRankAnalysis() {
    const bind = (id, callback) => {
        const element = $(id);

        if (element) {
            element.addEventListener('click', callback);
        } else {
            console.error(`HTML element not found: #${id}`);
        }
    };

    bind('topperBtn', () => showPanel('topperPanel'));
    bind('rankCompareBtn', () => showPanel('rankComparePanel'));
    bind('deptBtn', () => showPanel('deptPanel'));
    bind('statsBtn', () => showPanel('statsPanel'));
    bind('subjectCompareBtn', () =>
        showPanel('subjectComparePanel')
    );
    bind('excelBtnMain', downloadExcel);

    bind('backBtn', () => {
        window.location.href = 'dashboard.html';
    });

    bind('logoutBtn', () => {
        localStorage.clear();
        window.location.href = 'index.html';
    });

    document.querySelectorAll('.closePanel').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.analysis-panel').forEach(panel =>
                panel.classList.add('hidden')
            );

            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    });

    document.addEventListener('click', event => {
        const button = event.target.closest('.detailsBtn');
        if (!button) return;

        const usn = button.dataset.usn;

        const student = currentStudents.find(s =>
            normalize(getUSN(s)) === normalize(usn)
        );

        if (!student) {
            alert('Student details not found.');
            return;
        }

        localStorage.setItem('selectedUSN', getUSN(student));
        localStorage.setItem('usn', getUSN(student));

        if (getCollegeCode(student)) {
            localStorage.setItem(
                'collegeCode',
                getCollegeCode(student)
            );
        }

        if (getBranch(student)) {
            localStorage.setItem('branch', getBranch(student));
        }

        window.location.href =
            `dashboard.html?usn=${encodeURIComponent(getUSN(student))}`;
    });

    window.addEventListener('resize', () => {
        if (!$('rankComparePanel')?.classList.contains('hidden')) {
            drawRankComparison();
        }

        if (!$('deptPanel')?.classList.contains('hidden')) {
            drawDepartmentChart();
        }

        if (!$('subjectComparePanel')?.classList.contains('hidden')) {
            drawSubjectComparison();
        }
    });

    loadRanks();
}

// ---------------- LOAD BACKEND DATA ----------------

async function loadRanks() {
    const status = $('resultStatus');
    const table = $('rankTable');

    if (status) {
        status.textContent = 'Loading student data...';
    }

    if (table) {
        table.innerHTML =
            '<tr><td colspan="8" class="empty">Loading...</td></tr>';
    }

    previousRanking = loadPrevious();

    try {
        const response = await fetch(`${API_BASE}/students`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error('/students did not return a JSON array');
        }

        allStudents = data;

        console.log('Students loaded:', allStudents.length);
        console.log('First student:', allStudents[0]);
        console.log(
            'First student results:',
            allStudents[0] ? getResults(allStudents[0]) : []
        );

        const enteredUSN =
            (localStorage.getItem('usn') || '').trim();

        if (enteredUSN) {
            const prefix = enteredUSN.substring(0, 7).toUpperCase();

            currentStudents = allStudents.filter(s =>
                getUSN(s) &&
                String(getUSN(s)).toUpperCase().startsWith(prefix)
            );
        } else {
            currentStudents = [...allStudents];
        }

        currentStudents.sort((a, b) => {
            const ca = getCGPA(a) ?? -1;
            const cb = getCGPA(b) ?? -1;

            return cb - ca ||
                String(getUSN(a)).localeCompare(String(getUSN(b)));
        });

        renderTable();
        renderStats();
        drawRankComparison();
        drawDepartmentChart();
        setupSubjectComparison();

        if (status) {
            status.textContent =
                `${currentStudents.length} student(s) loaded successfully.`;
        }

        const previousNote = $('previousNote');

        if (previousNote) {
            previousNote.textContent = previousRanking.length
                ? 'Comparison uses the previously saved ranking.'
                : 'No previous ranking was saved.';
        }

        savePrevious(currentStudents);

    } catch (error) {
        console.error('Rank Analysis error:', error);

        if (status) {
            status.textContent =
                'Unable to load data. Check Spring Boot on port 8081 and the /students endpoint.';
        }

        if (table) {
            table.innerHTML =
                '<tr><td colspan="8" class="empty">Could not load students. Check the backend.</td></tr>';
        }

        if ($('subjectCompareNote')) {
            $('subjectCompareNote').textContent =
                'Could not load subject codes because the backend request failed.';
        }

        drawBarChart(
            $('subjectComparisonChart'),
            [],
            [],
            { emptyMessage: 'Backend data unavailable' }
        );
    }
}

// Initialize once, after the document is ready.
if (document.readyState === 'loading') {
    document.addEventListener(
        'DOMContentLoaded',
        initializeRankAnalysis,
        { once: true }
    );
} else {
    initializeRankAnalysis();
}
