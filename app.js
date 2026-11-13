const KEY = 'fieldnotes.release-ledger.v1';
const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

const starterChecks = [
  { id: 'gate-build', label: 'Build and static analysis', scope: 'Release gate', owner: 'Engineering' },
  { id: 'gate-integration', label: 'Integration and contract checks', scope: 'Release gate', owner: 'Engineering' },
  { id: 'gate-security', label: 'Security review', scope: 'Release gate', owner: 'Security' },
  { id: 'gate-rollback', label: 'Rollback or recovery plan', scope: 'Release gate', owner: 'Operations' }
];
let record = null;
try {
  const stored = JSON.parse(localStorage.getItem(KEY));
  if (stored?.schema === 'release-ledger-record' && Array.isArray(stored.checks)) record = stored;
} catch {}

function makeRecord(report) {
  return {
    schema: 'release-ledger-record', version: 1,
    id: `RL-${Date.now().toString(36).slice(-6).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    change: {
      summary: report.summary || 'Unnamed change',
      startingItem: report.startingItem || 'Unspecified',
      sourceUpdatedAt: report.sourceUpdatedAt || null
    },
    decision: 'Draft',
    checks: [
      ...starterChecks.map(check => ({ ...check, status: 'Not run', evidence: '', required: true })),
      ...(report.items || []).map((item, index) => ({
        id: `impact-${item.id || index}`,
        label: `Verify ${item.title || 'impacted item'}`,
        scope: `${item.type || 'System item'} · depth ${item.depth || 0}`,
        owner: item.owner || 'Unassigned',
        status: 'Not run', evidence: '', required: true
      }))
    ]
  };
}

function save(keepDecision = false) {
  if (!record) return;
  if (record.decision === 'Ready' && !keepDecision) {
    record.decision = 'Draft';
    delete record.readyAt;
  }
  localStorage.setItem(KEY, JSON.stringify(record));
  render();
}

function render() {
  $('#export').disabled = !record;
  if (!record) {
    $('#releaseId').textContent = 'NO RECORD';
    $('#changeTitle').textContent = 'Your release record starts here';
    $('#changeMeta').textContent = 'Import an impact report or explore the sample release.';
    $('#counts').innerHTML = '';
    $('#checks').innerHTML = '<div class="empty">Bring in an impact report to create a release checklist, or explore the sample above.</div>';
    $('#progressText').textContent = '0 / 0 checks evidenced';
    $('#progressPercent').textContent = '—';
    $('#progressBar').style.width = '0%';
    $('#decisionTitle').textContent = 'A decision is waiting on proof.';
    $('#decisionHint').textContent = 'Resolve every check and attach its evidence before marking this record ready.';
    $('#decisionLock').textContent = '◈ REVIEW REQUIRED';
    $('#decisionLock').classList.remove('ready');
    $('#ready').disabled = true;
    $('#ready').innerHTML = 'Mark ready to release <span>→</span>';
    return;
  }

  const checks = record.checks;
  const complete = checks.filter(check => check.owner?.trim() && check.status !== 'Not run' && check.evidence?.trim()).length;
  const percent = checks.length ? Math.round(complete / checks.length * 100) : 0;
  const ready = checks.length > 0 && checks.every(check =>
    (check.status === 'Pass' || check.status === 'N/A') && check.owner?.trim() && check.evidence?.trim()
  );
  const isReady = record.decision === 'Ready';
  const id = record.id || `RL-${Date.parse(record.createdAt || Date.now()).toString(36).slice(-6).toUpperCase()}`;

  $('#releaseId').textContent = id;
  $('#changeTitle').textContent = record.change?.summary || 'Unnamed change';
  $('#changeMeta').textContent = `Starting item: ${record.change?.startingItem || 'Unspecified'} · Opened ${new Date(record.createdAt).toLocaleString()}`;
  $('#counts').innerHTML = [
    [checks.length, 'CHECKS'],
    [checks.filter(check => check.status === 'Pass').length, 'PASSED'],
    [checks.filter(check => check.status === 'Fail' || check.status === 'Blocked').length, 'ISSUES']
  ].map(([value, label]) => `<div class="count"><b>${value}</b><span>${label}</span></div>`).join('');
  $('#progressText').textContent = `${complete} / ${checks.length} checks evidenced`;
  $('#progressPercent').textContent = `${percent}%`;
  $('#progressBar').style.width = `${percent}%`;
  $('#checks').innerHTML = checks.map((check, index) => `
    <div class="check">
      <div class="check-label"><strong>${escapeHtml(check.label)}</strong><span>${escapeHtml(check.scope)}</span></div>
      <input data-owner="${index}" value="${escapeHtml(check.owner)}" aria-label="Owner for ${escapeHtml(check.label)}" placeholder="Assign owner">
      <select data-status="${index}" class="status ${escapeHtml(check.status.replace('/', ''))}" aria-label="Outcome for ${escapeHtml(check.label)}">
        ${['Not run', 'Pass', 'Fail', 'Blocked', 'N/A'].map(status => `<option ${check.status === status ? 'selected' : ''}>${status}</option>`).join('')}
      </select>
      <input class="evidence" data-evidence="${index}" value="${escapeHtml(check.evidence)}" aria-label="Evidence for ${escapeHtml(check.label)}" placeholder="Link, run ID, or review note">
      <button class="remove" data-remove="${index}" aria-label="Remove ${escapeHtml(check.label)}">×</button>
    </div>`).join('');

  $('#decisionTitle').textContent = isReady ? 'The release call is recorded.' : ready ? 'The proof is in. Ready for review.' : 'A decision is waiting on proof.';
  $('#decisionHint').textContent = isReady
    ? `Marked ready on ${new Date(record.readyAt || record.createdAt).toLocaleString()}. Export this record for the release review.`
    : ready
      ? 'Every check has an owner, an outcome, and an evidence note. You can record the decision now.'
      : 'Assign each check, resolve its outcome, and attach evidence before marking this record ready.';
  $('#decisionLock').textContent = isReady ? '✓ DECISION RECORDED' : ready ? '◈ READY FOR REVIEW' : '◈ REVIEW REQUIRED';
  $('#decisionLock').classList.toggle('ready', isReady || ready);
  $('#ready').disabled = !ready || isReady;
  $('#ready').innerHTML = isReady ? 'Decision recorded <span>✓</span>' : 'Mark ready to release <span>→</span>';
}

$('#importBtn').onclick = () => $('#file').click();
$('#file').onchange = async event => {
  try {
    const imported = JSON.parse(await event.target.files[0].text());
    if (imported?.schema !== 'change-radar-report' || !Array.isArray(imported.items) || !imported.startingItem) {
      throw new Error('That file is not a Change Radar impact report.');
    }
    record = makeRecord(imported);
    save();
  } catch (error) {
    alert(error.message || 'Could not read that report.');
  }
  event.target.value = '';
};

$('#demo').onclick = () => {
  record = makeRecord({
    summary: 'SAMPLE · Rotate session signing key', startingItem: 'src/auth/session.ts',
    items: [
      { id: 'auth-session', title: 'Session token verification', type: 'Component', depth: 0, owner: 'Identity Platform' },
      { id: 'profile-api', title: 'Profile API contract', type: 'Interface', depth: 1, owner: 'Accounts API' },
      { id: 'admin-console', title: 'Admin console sign-in', type: 'Component', depth: 1, owner: 'Admin Platform' },
      { id: 'web-session', title: 'Web session handoff', type: 'Component', depth: 2, owner: 'Web Experience' }
    ]
  });
  record.checks[0].status = 'Pass'; record.checks[0].evidence = 'SAMPLE · CI run #1842 passed';
  record.checks[1].status = 'Pass'; record.checks[1].evidence = 'SAMPLE · contract suite 214 / 214';
  record.checks[2].status = 'Blocked'; record.checks[2].evidence = 'SAMPLE · rotation review pending';
  record.checks[4].status = 'Pass'; record.checks[4].evidence = 'SAMPLE · auth integration run #602';
  save();
};

$('#checks').addEventListener('change', event => {
  for (const key of ['owner', 'status', 'evidence']) {
    const input = event.target.closest(`[data-${key}]`);
    if (input) {
      record.checks[Number(input.dataset[key])][key] = input.value;
      save();
      break;
    }
  }
});
$('#checks').addEventListener('click', event => {
  const button = event.target.closest('[data-remove]');
  if (button) { record.checks.splice(Number(button.dataset.remove), 1); save(); }
});
$('#addCheck').onclick = () => {
  if (!record) record = makeRecord({ summary: 'Custom release review', startingItem: 'Unlinked', items: [] });
  record.checks.push({ id: `custom-${crypto.randomUUID()}`, label: 'Custom verification', scope: 'Additional check', owner: '', status: 'Not run', evidence: '', required: true });
  save();
};
$('#ready').onclick = () => {
  if ($('#ready').disabled) return;
  record.decision = 'Ready';
  record.readyAt = new Date().toISOString();
  save(true);
};
$('#export').onclick = () => { if (record) download(record, 'release-ledger.json'); };
function download(data, filename) {
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}
render();
