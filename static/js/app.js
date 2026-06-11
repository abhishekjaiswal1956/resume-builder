// ── STATE ────────────────────────────────────────────
const state = {
  personal: {},
  education: [],
  skills: [],
  experience: [],
  projects: [],
  certifications: [],
  completedSections: new Set()
};

// ── NAVIGATION ───────────────────────────────────────
function nextStep(sectionName) {
  showSection(sectionName);
}

function showSection(name) {
  document.querySelectorAll('.form-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.step-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('sec-' + name)?.classList.add('active');
  document.querySelector(`[data-step="${name}"]`)?.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.querySelectorAll('.step-btn').forEach(btn => {
  btn.addEventListener('click', () => showSection(btn.dataset.step));
});

// ── STATS UPDATE ──────────────────────────────────────
function updateStats() {
  let fields = 0;
  if (state.personal.name)      fields++;
  if (state.personal.email)     fields++;
  if (state.personal.phone)     fields++;
  if (state.personal.location)  fields++;
  if (state.personal.objective) fields++;
  fields += state.education.length;
  fields += state.experience.length;
  fields += state.projects.length;

  document.getElementById('statFields').textContent = fields;
  document.getElementById('statSections').textContent = state.completedSections.size;
  document.getElementById('statSkills').textContent = state.skills.length;
}

// ── TOAST ─────────────────────────────────────────────
function showToast(id, msg, type = 'success') {
  const el = document.getElementById('toast-' + id);
  if (!el) return;
  el.textContent = (type === 'success' ? '✓ ' : '✗ ') + msg;
  el.className = 'toast ' + type;
  setTimeout(() => { el.textContent = ''; el.className = 'toast'; }, 3000);
}

// ── PERSONAL ──────────────────────────────────────────
async function savePersonal() {
  const data = {
    name:      document.getElementById('p-name').value.trim(),
    email:     document.getElementById('p-email').value.trim(),
    phone:     document.getElementById('p-phone').value.trim(),
    location:  document.getElementById('p-location').value.trim(),
    linkedin:  document.getElementById('p-linkedin').value.trim(),
    objective: document.getElementById('p-objective').value.trim(),
  };
  if (!data.name || !data.email) {
    showToast('personal', 'Name and Email are required.', 'error'); return;
  }
  try {
    const res = await fetch('/api/save-personal', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (json.success) {
      state.personal = data;
      state.completedSections.add('personal');
      updateStats();
      showToast('personal', 'Personal info saved!');
      setTimeout(() => nextStep('education'), 800);
    }
  } catch (e) { showToast('personal', 'Error saving. Try again.', 'error'); }
}

// ── EDUCATION ─────────────────────────────────────────
async function addEducation() {
  const data = {
    degree:      document.getElementById('e-degree').value.trim(),
    institution: document.getElementById('e-institution').value.trim(),
    year:        document.getElementById('e-year').value.trim(),
    grade:       document.getElementById('e-grade').value.trim(),
  };
  if (!data.degree || !data.institution) {
    showToast('education', 'Degree and Institution are required.', 'error'); return;
  }
  try {
    const res = await fetch('/api/add-education', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (json.success) {
      state.education = json.data;
      state.completedSections.add('education');
      updateStats();
      renderEducationList();
      showToast('education', 'Education added!');
      // Clear fields
      ['e-degree','e-institution','e-year','e-grade'].forEach(id => document.getElementById(id).value = '');
    }
  } catch (e) { showToast('education', 'Error. Try again.', 'error'); }
}

function renderEducationList() {
  const list = document.getElementById('edu-list');
  list.innerHTML = state.education.map(e => `
    <div class="added-item">
      <strong>${e.degree}</strong><br/>
      <span>${e.institution} · ${e.year} · ${e.grade}</span>
    </div>
  `).join('');
}

// ── SKILLS ────────────────────────────────────────────
document.getElementById('skill-input')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); addSkill(); }
});

async function addSkill() {
  const input = document.getElementById('skill-input');
  const skill = input.value.trim();
  if (!skill) return;
  await pushSkill(skill);
  input.value = '';
}

async function quickSkill(skill) {
  await pushSkill(skill);
}

async function pushSkill(skill) {
  try {
    const res = await fetch('/api/add-skill', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skill })
    });
    const json = await res.json();
    if (json.success) {
      state.skills = json.skills;
      state.completedSections.add('skills');
      updateStats();
      renderSkillCloud();
    }
  } catch (e) { console.error(e); }
}

async function removeSkill(skill) {
  state.skills = state.skills.filter(s => s !== skill);
  // Sync via reset + re-add (simple approach)
  renderSkillCloud();
  updateStats();
}

function renderSkillCloud() {
  const cloud = document.getElementById('skills-cloud');
  cloud.innerHTML = state.skills.map(s => `
    <span class="skill-tag">
      ${s}
      <button onclick="removeSkill('${s.replace(/'/g, "\\'")}')" title="Remove">×</button>
    </span>
  `).join('');
}

// ── EXPERIENCE ────────────────────────────────────────
async function addExperience() {
  const data = {
    role:        document.getElementById('ex-role').value.trim(),
    company:     document.getElementById('ex-company').value.trim(),
    duration:    document.getElementById('ex-duration').value.trim(),
    location:    document.getElementById('ex-location').value.trim(),
    description: document.getElementById('ex-desc').value.trim(),
  };
  if (!data.role) { showToast('experience', 'Job title is required.', 'error'); return; }
  try {
    const res = await fetch('/api/add-experience', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (json.success) {
      state.experience = json.data;
      state.completedSections.add('experience');
      updateStats();
      renderExpList();
      showToast('experience', 'Experience added!');
      ['ex-role','ex-company','ex-duration','ex-location','ex-desc'].forEach(id => document.getElementById(id).value = '');
    }
  } catch (e) { showToast('experience', 'Error. Try again.', 'error'); }
}

function renderExpList() {
  const list = document.getElementById('exp-list');
  list.innerHTML = state.experience.map(e => `
    <div class="added-item">
      <strong>${e.role}</strong> at <strong>${e.company}</strong><br/>
      <span>${e.duration} · ${e.location}</span>
    </div>
  `).join('');
}

// ── PROJECTS ──────────────────────────────────────────
async function addProject() {
  const data = {
    name:  document.getElementById('pr-name').value.trim(),
    tech:  document.getElementById('pr-tech').value.trim(),
    description: document.getElementById('pr-desc').value.trim(),
  };
  if (!data.name) { showToast('projects', 'Project name is required.', 'error'); return; }
  try {
    const res = await fetch('/api/add-project', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (json.success) {
      state.projects = json.data;
      state.completedSections.add('projects');
      updateStats();
      renderProjList();
      showToast('projects', 'Project added!');
      ['pr-name','pr-tech','pr-desc'].forEach(id => document.getElementById(id).value = '');
    }
  } catch (e) { showToast('projects', 'Error. Try again.', 'error'); }
}

function renderProjList() {
  const list = document.getElementById('proj-list');
  list.innerHTML = state.projects.map(p => `
    <div class="added-item">
      <strong>${p.name}</strong><br/>
      <span>${p.tech}</span>
    </div>
  `).join('');
}

// ── CERTIFICATIONS ────────────────────────────────────
async function addCertification() {
  const data = {
    name:   document.getElementById('cert-name').value.trim(),
    issuer: document.getElementById('cert-issuer').value.trim(),
    year:   document.getElementById('cert-year').value.trim(),
  };
  if (!data.name) { showToast('projects', 'Certification name is required.', 'error'); return; }
  try {
    const res = await fetch('/api/add-certification', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (json.success) {
      state.certifications = json.data;
      renderCertList();
      showToast('projects', 'Certification added!');
      ['cert-name','cert-issuer','cert-year'].forEach(id => document.getElementById(id).value = '');
    }
  } catch (e) { console.error(e); }
}

function renderCertList() {
  const list = document.getElementById('cert-list');
  list.innerHTML = state.certifications.map(c => `
    <div class="added-item">
      <strong>${c.name}</strong><br/>
      <span>${c.issuer} · ${c.year}</span>
    </div>
  `).join('');
}

// ── GENERATE ──────────────────────────────────────────
async function generateResume() {
  showToast('projects', 'Generating your resume...', 'success');
  try {
    const res = await fetch('/api/generate', { method: 'POST' });
    const json = await res.json();
    if (json.success) {
      state.completedSections.add('preview');
      updateStats();
      document.getElementById('resume-output').textContent = json.text;
      setTimeout(() => nextStep('preview'), 400);
    } else {
      showToast('projects', json.message || 'Error generating.', 'error');
    }
  } catch (e) { showToast('projects', 'Error. Try again.', 'error'); }
}

// ── DOWNLOAD ──────────────────────────────────────────
async function downloadResume() {
  try {
    const res = await fetch('/api/download', { method: 'POST' });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resume.txt';
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) { alert('Download failed. Please try again.'); }
}

// ── COPY ──────────────────────────────────────────────
function copyResume() {
  const text = document.getElementById('resume-output').textContent;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.querySelector('.preview-toolbar .btn-secondary');
    const orig = btn.textContent;
    btn.textContent = '✓ Copied!';
    setTimeout(() => btn.textContent = orig, 2000);
  });
}

// ── RESET ─────────────────────────────────────────────
document.getElementById('resetBtn')?.addEventListener('click', async () => {
  if (!confirm('Clear all resume data and start over?')) return;
  await fetch('/api/reset', { method: 'POST' });
  Object.assign(state, { personal: {}, education: [], skills: [], experience: [], projects: [], certifications: [], completedSections: new Set() });
  document.querySelectorAll('input, textarea').forEach(el => el.value = '');
  document.getElementById('edu-list').innerHTML = '';
  document.getElementById('exp-list').innerHTML = '';
  document.getElementById('proj-list').innerHTML = '';
  document.getElementById('cert-list').innerHTML = '';
  document.getElementById('skills-cloud').innerHTML = '';
  document.getElementById('resume-output').innerHTML = `
    <div class="empty-state">
      <span class="empty-icon">📄</span>
      <p>Fill in your details and click <strong>Generate Resume</strong></p>
    </div>`;
  updateStats();
  showSection('personal');
});

// ── INIT ──────────────────────────────────────────────
updateStats();
