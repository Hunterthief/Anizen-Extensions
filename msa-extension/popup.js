// popup.js — console controller + artifact viewer
const $ = id => document.getElementById(id);
const led = $('led'), statusEl = $('status'), progress = $('progress');
const exploreBtn = $('exploreBtn'), downloadFullBtn = $('downloadFullBtn');
const dashboard = $('dashboard'), output = $('output'), fileName = $('fileName');

const ALL_TYPES = ["Homepage","Search","Anime","Watch","Movie","Season","Genre","Catalog","Latest","Popular","Schedule","Profile","Authentication","Unknown"];

const A = { report: null, har: null, snapshots: null, json: null };
let activeView = 'report';
let domain = 'site';

function setLed(s) { led.className = 'led ' + s; }
function setStatus(t, cls) { statusEl.innerText = t; statusEl.className = 'status' + (cls ? ' ' + cls : ''); }

// ---------- artifact serialization ----------
function esc(s) { return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n'); }
function buildFullAnalysis() {
    return 'har="' + JSON.stringify(A.har) + '"\n\nsnapshots="' + JSON.stringify(A.snapshots) + '"\n\njson="' + JSON.stringify(A.json) + '"\n\nreport="' + JSON.stringify(A.report) + '"';
}
function viewContent(view) {
    switch (view) {
        case 'report': return JSON.stringify(A.report, null, 2);
        case 'har': return JSON.stringify(A.har, null, 2);
        case 'snapshots': return JSON.stringify(A.snapshots, null, 2);
        case 'json': return JSON.stringify(A.json, null, 2);
        case 'full': return buildFullAnalysis();
    }
    return '';
}
function viewFileName(view) {
    const d = domain.replace(/[^a-z0-9.]/gi, '_');
    const map = {
        report: [d + '_report.json', 'application/json'],
        har: [d + '_capture.har', 'application/json'],
        snapshots: [d + '_snapshots.json', 'application/json'],
        json: [d + '_raw.json', 'application/json'],
        full: [d + '_full_analysis.txt', 'text/plain']
    };
    return map[view];
}
function renderView(view) {
    activeView = view;
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === view));
    const content = viewContent(view);
    output.textContent = content || '(no data)';
    output.classList.add('show');
    const [fname] = viewFileName(view);
    fileName.textContent = fname + ' · ' + (content ? (content.length / 1024).toFixed(1) + ' KB' : '0 KB');
}
function downloadView(view) {
    const content = viewContent(view);
    const [fname, mime] = viewFileName(view);
    const dataUrl = 'data:' + mime + ';charset=utf-8,' + encodeURIComponent(content);
    browser.downloads.download({ url: dataUrl, filename: fname, saveAs: false })
    .then(() => setStatus('Download started: ' + fname))
    .catch(e => setStatus('Download failed: ' + e.message, 'error'));
}

// ---------- provider intelligence renderers ----------
function renderSignature(pi) {
    const sig = pi.providerSignature || {};
    const yn = (v) => v ? '<span class="val bad">YES</span>' : '<span class="val good">NO</span>';
    const diffCls = sig.difficulty <= 3 ? 'good' : sig.difficulty <= 6 ? 'mid' : 'bad';
    const stabCls = sig.stability >= 7 ? 'good' : sig.stability >= 4 ? 'mid' : 'bad';
    $('signatureBox').innerHTML =
    '<div class="sig-cell"><div class="lab">Provider Type</div><div class="val">' + (sig.providerType || '—') + '</div></div>' +
    '<div class="sig-cell"><div class="lab">Difficulty</div><div class="val ' + diffCls + '">' + (sig.difficulty != null ? sig.difficulty + '/10' : '—') + '</div></div>' +
    '<div class="sig-cell"><div class="lab">Stability</div><div class="val ' + stabCls + '">' + (sig.stability != null ? sig.stability + '/10' : '—') + '</div></div>' +
    '<div class="sig-cell"><div class="lab">Final Output</div><div class="val">' + (sig.finalOutput || '—') + '</div></div>' +
    '<div class="sig-cell"><div class="lab">Replayable</div>' + yn(!sig.replayable) + '</div>' +
    '<div class="sig-cell"><div class="lab">Cloudflare</div>' + yn(sig.usesCloudflare) + '</div>' +
    '<div class="sig-cell"><div class="lab">JWT</div>' + yn(sig.usesJWT) + '</div>' +
    '<div class="sig-cell"><div class="lab">AES</div>' + yn(sig.usesAES) + '</div>';
}
function renderReplay(pi) {
    const rt = pi.replayTest || {};
    let html = '<div class="verdict-head ' + (rt.replayable ? '' : '') + '" style="color:' + (rt.replayable ? 'var(--green)' : 'var(--red)') + '">' + (rt.verdict || '—') + '</div>';
    if (rt.requiredHeaders && rt.requiredHeaders.length) html += '<div class="verdict-sum">Required headers: <b style="color:var(--amber)">' + rt.requiredHeaders.join(', ') + '</b></div>';
    if (rt.requiredCookies && rt.requiredCookies.length) html += '<div class="verdict-sum">Required cookies: <b style="color:var(--amber)">' + rt.requiredCookies.join(', ') + '</b></div>';
    if (rt.blockers && rt.blockers.length) html += '<div class="verdict-sum" style="color:var(--red)">Blockers:<br>• ' + rt.blockers.join('<br>• ') + '</div>';
    $('replayBox').innerHTML = html;
}
function renderChain(pi) {
    const box = $('chainBox'); box.innerHTML = '';
    const chain = (pi.dependencyGraph && pi.dependencyGraph.chain) || [];
    if (!chain.length) { box.innerHTML = '<div class="empty">No dependency chain captured.</div>'; return; }
    chain.forEach(n => {
        const d = document.createElement('div');
        d.className = 'chain-step';
        d.innerHTML = '<span class="lvl">' + String(n.step).padStart(2, '0') + '</span>' +
        '<span class="cat">' + n.category + '</span>' +
        '<span class="u">' + n.method + ' ' + n.template + '</span>' +
        (n.feeds === 'Video()' ? '<span class="play">▸ Video()</span>' : '');
        box.appendChild(d);
    });
}
function renderRecipe(pi) {
    $('recipeBox').textContent = (pi.kotlinRecipe && pi.kotlinRecipe.ascii) || '(no recipe)';
}
function renderStability(pi) {
    const st = pi.stabilityReport || {};
    const yn = (v) => v ? '<span class="val bad">YES</span>' : '<span class="val good">NO</span>';
    const mCls = st.likelyMaintenance === 'Low' ? 'good' : st.likelyMaintenance === 'Medium' ? 'mid' : 'bad';
    $('stabilityBox').innerHTML =
    '<div class="sig-cell"><div class="lab">Cloudflare</div>' + yn(st.usesCloudflare) + '</div>' +
    '<div class="sig-cell"><div class="lab">JWT</div>' + yn(st.usesJWT) + '</div>' +
    '<div class="sig-cell"><div class="lab">AES</div>' + yn(st.usesAES) + '</div>' +
    '<div class="sig-cell"><div class="lab">Cookies</div>' + yn(st.usesCookies) + '</div>' +
    '<div class="sig-cell"><div class="lab">Referer</div>' + yn(st.usesReferer) + '</div>' +
    '<div class="sig-cell"><div class="lab">Origin</div>' + yn(st.usesOrigin) + '</div>' +
    '<div class="sig-cell"><div class="lab">WASM</div>' + yn(st.usesWASM) + '</div>' +
    '<div class="sig-cell"><div class="lab">Maintenance</div><div class="val ' + mCls + '">' + (st.likelyMaintenance || '—') + '</div></div>';
}
function renderJsDeps(pi) {
    const box = $('jsDeps'); box.innerHTML = '';
    const deps = pi.jsDependencyReport || [];
    if (!deps.length) { box.innerHTML = '<div class="empty">No relevant scripts detected.</div>'; return; }
    deps.forEach(d => {
        const d2 = document.createElement('div');
        d2.className = 'flag-item';
        d2.style.borderLeftColor = 'var(--violet)';
        d2.innerHTML = '<b>' + d.file + ' <span style="color:var(--ink-faint);font-weight:400">[' + d.classification + ']</span></b><span>' + d.contains.join(', ') + '</span><br><span style="color:var(--violet)">' + d.verdict + '</span>';
        box.appendChild(d2);
    });
}

// ---------- dashboard renderers ----------
function renderChecklist(found) {
    const box = $('typeChecklist'); box.innerHTML = '';
    ALL_TYPES.forEach(t => {
        const on = found.includes(t);
        const c = document.createElement('div');
        c.className = 'chip' + (on ? ' found' : '');
        c.innerHTML = '<span class="dot"></span>' + (on ? '' : '✕ ') + t;
        box.appendChild(c);
    });
}
function animateScore(target) {
    const el = $('scoreNum'); let cur = 0;
    const step = Math.max(1, Math.round(target / 30));
    const iv = setInterval(() => { cur += step; if (cur >= target) { cur = target; clearInterval(iv); } el.textContent = cur; }, 24);
}
function renderFlags(list, el, isRed) {
    el.innerHTML = '';
    if (!list || !list.length) { el.innerHTML = '<div class="empty">none detected</div>'; return; }
    list.forEach(f => {
        const d = document.createElement('div');
        d.className = 'flag-item';
        d.innerHTML = isRed
        ? '<b>' + f.flag + ' <span class="sev ' + f.severity + '">' + f.severity + '</span></b><span>' + (f.evidence || '') + '</span>'
        : '<b>' + f.flag + '</b><span>' + (f.evidence || '') + '</span>';
        el.appendChild(d);
    });
}
function renderApis(report) {
    const box = $('apiBox'); box.innerHTML = '';
    let count = 0;
    const groups = report.apiGroups || {};
    for (const cat in groups) {
        groups[cat].forEach(api => {
            if (count >= 12) return;
            const d = document.createElement('div');
            d.className = 'api';
            d.innerHTML = '<div class="cat">' + cat + '</div><div class="tpl">' + api.method + ' ' + api.template + '</div><div class="meta">' + (api.purpose || '') + ' · ' + (api.pagesUsing ? api.pagesUsing.length : 0) + ' page(s)</div>';
            box.appendChild(d);
            count++;
        });
    }
    if (!count) box.innerHTML = '<div class="empty">No APIs captured.</div>';
}

function showComplete(report) {
    A.report = report;
    domain = (report.meta && report.meta.domain) || 'site';
    setLed('ok'); setStatus('Analysis complete. Provider signature emitted.');
    exploreBtn.disabled = false;
    downloadFullBtn.style.display = 'inline-block';
    dashboard.style.display = 'block';
    $('domainReadout').textContent = domain;

    const pi = report.providerIntelligence || {};
    renderSignature(pi);
    renderReplay(pi);
    renderChain(pi);
    renderRecipe(pi);
    renderStability(pi);
    renderJsDeps(pi);

    const s = report.summary || {};
    animateScore(s.compatibilityScore || 0);
    const v = (pi.providerSignature) || {};
    $('verdictHead').textContent = (v.providerType || 'Analyzed');
    $('verdictDiff').textContent = v.difficulty != null ? '· difficulty ' + v.difficulty + '/10' : '';
    $('verdictSum').textContent = (s.compatibilityReasons || []).join('\n');
    const kv = $('kvRow'); kv.innerHTML = '';
    const addKV = (label, val, cls) => {
        const sp = document.createElement('span');
        sp.className = 'kv' + (cls ? ' ' + cls : '');
        sp.innerHTML = label + ' <b>' + val + '</b>';
        kv.appendChild(sp);
    };
    addKV('final', v.finalOutput || '—');
    addKV('replay', v.replayable ? 'YES' : 'NO', v.replayable ? 'good' : 'warn');
    addKV('headers', (v.requiredHeaders || []).length ? v.requiredHeaders.join(', ') : 'none');
    addKV('CDNs', (report.thirdPartyCDNs || []).length);

    renderChecklist(Object.keys(report.representativePages || {}));
    $('statPages').textContent = s.pagesAnalyzed || 0;
    $('statReqs').textContent = (report.networkAnalysis && report.networkAnalysis.totalRequests) || 0;
    $('statApis').textContent = s.detectedApis || 0;
    $('statStreams').textContent = (report.networkAnalysis && report.networkAnalysis.playableUrls ? report.networkAnalysis.playableUrls.length : 0);
    $('statDur').textContent = (report.meta && report.meta.analysisDurationMs) ? (report.meta.analysisDurationMs / 1000).toFixed(1) + 's' : '0s';
    $('statCov').textContent = (s.coveragePercentage || 0) + '%';

    renderFlags((report.networkAnalysis && report.networkAnalysis.redFlags), $('redFlags'), true);
    renderFlags((report.networkAnalysis && report.networkAnalysis.greenFlags), $('greenFlags'), false);
    renderApis(report);

    $('cntHar').textContent = (A.har && A.har.log && A.har.log.entries) ? '·' + A.har.log.entries.length : '';
    $('cntSnap').textContent = A.snapshots ? '·' + Object.keys(A.snapshots).length : '';
    $('cntJson').textContent = (A.json && A.json.rawRequests) ? '·' + A.json.rawRequests.length : '';

    renderView(activeView);
}

// ---------- lifecycle ----------
async function initUI() {
    const data = await browser.storage.local.get(['msaStatus', 'msaReport', 'msaHAR', 'msaSnapshots', 'msaRaw', 'msaError', 'msaProgress']);
    A.har = data.msaHAR || null;
    A.snapshots = data.msaSnapshots || null;
    A.json = data.msaRaw || null;
    renderChecklist([]);
    if (data.msaStatus === 'running') {
        setLed('run'); progress.style.display = 'block';
        const p = data.msaProgress || {};
        setStatus('Running: ' + (p.step || '...') + '\n' + (p.currentUrl || ''), 'running');
        exploreBtn.disabled = true;
    } else if (data.msaStatus === 'complete' && data.msaReport) {
        showComplete(data.msaReport);
    } else if (data.msaStatus === 'error') {
        setLed('err'); setStatus('Error:\n' + (data.msaError || 'Unknown'), 'error');
    } else {
        setLed('idle'); setStatus('Ready to analyze site protocol.');
    }
}

browser.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.msaProgress) {
        const p = changes.msaProgress.newValue;
        if (p) {
            setLed('run'); progress.style.display = 'block';
            setStatus('Running: ' + p.step + '\n' + (p.currentUrl || ''), 'running');
            exploreBtn.disabled = true;
        }
    }
    if (changes.msaStatus) {
        const s = changes.msaStatus.newValue;
        if (s === 'complete') {
            browser.storage.local.get(['msaReport', 'msaHAR', 'msaSnapshots', 'msaRaw']).then(d => {
                A.har = d.msaHAR || null; A.snapshots = d.msaSnapshots || null; A.json = d.msaRaw || null;
                if (d.msaReport) showComplete(d.msaReport);
            });
        } else if (s === 'error') {
            browser.storage.local.get('msaError').then(d => {
                setLed('err'); setStatus('Error:\n' + (d.msaError || 'Unknown'), 'error');
                exploreBtn.disabled = false; progress.style.display = 'none';
            });
        }
    }
});

// ---------- actions ----------
$('tabs').addEventListener('click', e => {
    const tab = e.target.closest('.tab');
    if (tab) renderView(tab.dataset.view);
});
$('copyBtn').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(output.textContent); setStatus('Copied to clipboard.'); }
    catch (e) { setStatus('Copy failed: ' + e.message, 'error'); }
});
$('downloadViewBtn').addEventListener('click', () => downloadView(activeView));
downloadFullBtn.addEventListener('click', async () => {
    const r = await browser.runtime.sendMessage({ action: "DOWNLOAD_FULL" });
    setStatus(r.status === 'success' ? 'Full analysis download started.' : ('Download failed: ' + (r.errorMessage || '')), r.status === 'success' ? '' : 'error');
});
exploreBtn.addEventListener('click', async () => {
    setLed('run'); progress.style.display = 'block';
    setStatus('Starting analysis...', 'running');
    exploreBtn.disabled = true;
    dashboard.style.display = 'none';
    downloadFullBtn.style.display = 'none';
    try {
        const r = await browser.runtime.sendMessage({ action: "START_EXPLORATION" });
        if (r.status === "error") { setLed('err'); setStatus('Error: ' + r.errorMessage, 'error'); exploreBtn.disabled = false; progress.style.display = 'none'; }
    } catch (e) { setLed('err'); setStatus('Fatal: ' + e.message, 'error'); exploreBtn.disabled = false; progress.style.display = 'none'; }
});

initUI();
