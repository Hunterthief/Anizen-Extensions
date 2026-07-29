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
    const ynGood = (v) => v ? '<span class="val good">YES</span>' : '<span class="val bad">NO</span>';
    const diffCls = sig.difficulty <= 3 ? 'good' : sig.difficulty <= 6 ? 'mid' : 'bad';
    const stabCls = sig.stability >= 7 ? 'good' : sig.stability >= 4 ? 'mid' : 'bad';
    $('signatureBox').innerHTML =
    '<div class="sig-cell"><div class="lab">Provider Type</div><div class="val">' + (sig.providerType || '—') + '</div></div>' +
    '<div class="sig-cell"><div class="lab">Difficulty</div><div class="val ' + diffCls + '">' + (sig.difficulty != null ? sig.difficulty + '/10' : '—') + '</div></div>' +
    '<div class="sig-cell"><div class="lab">Stability</div><div class="val ' + stabCls + '">' + (sig.stability != null ? sig.stability + '/10' : '—') + '</div></div>' +
    '<div class="sig-cell"><div class="lab">Final Output</div><div class="val">' + (sig.finalOutput || '—') + '</div></div>' +
    '<div class="sig-cell"><div class="lab">Playable Stream Found</div>' + ynGood(sig.playableStreamFound) + '</div>' +
    '<div class="sig-cell"><div class="lab">Provider Replayable</div>' + ynGood(sig.providerReplayable) + '</div>' +
    '<div class="sig-cell"><div class="lab">Cloudflare</div>' + yn(sig.usesCloudflare) + '</div>' +
    '<div class="sig-cell"><div class="lab">JWT</div>' + yn(sig.usesJWT) + '</div>' +
    '<div class="sig-cell"><div class="lab">AES</div>' + yn(sig.usesAES) + '</div>';
}

// ---------- Priority 1 + 7: Dimensional Scores renderer ----------
function renderDimensionalScores(pi) {
    const box = $('dimensionalScoresBox');
    const dims = pi.dimensionalScores || {};
    if (!dims.reverseEngineering) {
        box.innerHTML = '<div class="empty">No dimensional scores available.</div>';
        return;
    }

    const scoreCls = (v) => v <= 3 ? 'good' : v <= 6 ? 'mid' : 'bad';
    const barColor = (v) => v <= 3 ? 'var(--green)' : v <= 6 ? 'var(--amber)' : 'var(--red)';

    let html = '';
    // Score cards
    html += '<div class="dim-grid">';
    const dimsList = [
        { key: 'reverseEngineering', label: 'Reverse Eng.' },
        { key: 'implementation', label: 'Implementation' },
        { key: 'maintenance', label: 'Maintenance' },
        { key: 'replayability', label: 'Replayability' }
    ];
    dimsList.forEach(d => {
        const obj = dims[d.key] || {};
        const score = obj.score != null ? obj.score : 0;
        html += '<div class="dim-cell">';
        html += '<div class="dim-lab">' + d.label + '</div>';
        html += '<div class="dim-val ' + scoreCls(score) + '">' + score + '/10</div>';
        html += '<div class="dim-bar"><div class="dim-fill" style="width:' + (score * 10) + '%;background:' + barColor(score) + '"></div></div>';
        html += '</div>';
    });
    // Confidence + Overall
    html += '<div class="dim-cell">';
    html += '<div class="dim-lab">Confidence</div>';
    html += '<div class="dim-val ' + (dims.confidence >= 80 ? 'good' : dims.confidence >= 50 ? 'mid' : 'bad') + '">' + (dims.confidence || 0) + '%</div>';
    html += '<div class="dim-bar"><div class="dim-fill" style="width:' + (dims.confidence || 0) + '%;background:var(--cyan)"></div></div>';
    html += '</div>';
    html += '</div>';

    // Overall score
    html += '<div style="text-align:center;margin-bottom:10px;">';
    html += '<span style="font-family:var(--display);font-weight:700;font-size:13px;color:var(--ink-dim);text-transform:uppercase;letter-spacing:.08em;">Overall: </span>';
    html += '<span style="font-family:var(--display);font-weight:700;font-size:18px;color:' + barColor(dims.overall || 0) + '">' + (dims.overall || 0) + '/10</span>';
    html += '</div>';

    // Reasons (Priority 7 — Why Scores)
    html += '<div class="dim-reasons">';
    dimsList.forEach(d => {
        const obj = dims[d.key] || {};
        const reasons = obj.reasons || [];
        if (!reasons.length) return;
        html += '<div class="dim-reason-group">';
        html += '<div class="group-title">' + d.label + ' — ' + (obj.score || 0) + '/10</div>';
        reasons.forEach(r => {
            const isEasy = r.easy === true;
            html += '<div class="dim-reason-item">';
            html += '<span class="reason-icon ' + (isEasy ? 'easy' : 'hard') + '">' + (isEasy ? '✓' : '+' + r.points) + '</span>';
            html += '<span class="reason-text">' + r.factor + '</span>';
            if (!isEasy) html += '<span class="reason-pts">+' + r.points + '</span>';
            html += '</div>';
        });
        html += '</div>';
    });
    html += '</div>';

    box.innerHTML = html;
}

// ---------- Priority 3: Provider Family renderer (enhanced) ----------
function renderProviderFamily(pi) {
    const box = $('providerFamilyBox');
    const fam = pi.providerFamily || {};
    const primary = fam.primary || { name: 'Unknown', extractor: null, confidence: 0, evidence: [], player: null };
    const all = fam.all || [];
    const playerDetected = fam.playerDetected || null;

    let html = '';
    html += '<div class="family-primary">';
    html += '<div class="family-name">' + primary.name + '</div>';
    if (primary.extractor) {
        html += '<div class="family-extractor">Known extractor: <b>' + primary.extractor + '</b></div>';
    } else {
        html += '<div class="family-extractor" style="color:var(--amber)">No known extractor — build new</div>';
    }
    if (primary.player || playerDetected) {
        html += '<div class="family-extractor" style="margin-top:3px">Player: <b style="color:var(--cyan)">' + (primary.player || playerDetected) + '</b></div>';
    }
    html += '<div class="family-confidence">';
    html += '<div class="conf-bar"><div class="conf-fill" style="width:' + primary.confidence + '%"></div></div>';
    html += '<div class="conf-label">Confidence: ' + primary.confidence + '%</div>';
    html += '</div>';
    html += '</div>';

    html += '<div class="family-alt">';
    if (all.length > 0) {
        all.forEach(f => {
            html += '<div class="family-alt-item">';
            html += '<span class="fname">' + f.name + '</span>';
            html += '<span class="fconf">' + f.confidence + '%</span>';
            if (f.extractor) html += '<span class="fext">' + f.extractor + '</span>';
            html += '</div>';
        });
    } else {
        html += '<div class="family-alt-item"><span class="fname" style="color:var(--ink-faint)">No known provider signatures matched</span></div>';
    }
    if (primary.evidence && primary.evidence.length) {
        html += '<div class="family-evidence">Evidence: ' + primary.evidence.join(' · ') + '</div>';
    }
    html += '</div>';

    box.innerHTML = html;
}

// ---------- Priority 2: Split Replayability renderer ----------
function renderSplitReplayability(pi) {
    const box = $('splitReplayBox');
    const sr = pi.splitReplayability || {};
    if (!sr.mediaType) {
        box.innerHTML = '<div class="empty">No replayability data available.</div>';
        return;
    }

    const ynCls = (v) => v ? 'good' : 'bad';
    let html = '<div class="split-replay-grid">';
    html += '<div class="sr-cell"><div class="sr-lab">Playable Stream</div><div class="sr-val ' + ynCls(sr.playableStream) + '">' + (sr.playableStream ? 'YES' : 'NO') + '</div></div>';
    html += '<div class="sr-cell"><div class="sr-lab">Media Type</div><div class="sr-val" style="color:var(--cyan)">' + (sr.mediaType || '—') + '</div></div>';
    html += '<div class="sr-cell"><div class="sr-lab">Replay Method</div><div class="sr-val ' + (sr.replayMethod === 'Native HTTP' ? 'good' : 'mid') + '">' + (sr.replayMethod || '—') + '</div></div>';
    html += '<div class="sr-cell"><div class="sr-lab">Native HTTP Replay</div><div class="sr-val ' + ynCls(sr.nativeHttpReplay) + '">' + (sr.nativeHttpReplay ? 'YES' : 'NO') + '</div></div>';
    html += '<div class="sr-cell"><div class="sr-lab">Reason</div><div class="sr-val" style="font-size:10px;color:var(--ink-dim)">' + (sr.reason || '—') + '</div></div>';
    html += '</div>';

    if (sr.reason && !sr.nativeHttpReplay) {
        html += '<div class="sr-reason">⚠ ' + sr.reason + '</div>';
    }

    box.innerHTML = html;
}

// ---------- Priority 4: Token Source Chain renderer (enhanced with provenance) ----------
function renderTokenChain(pi) {
    const box = $('tokenChainBox');
    const chains = pi.tokenSourceChain || [];

    if (!chains.length) {
        box.innerHTML = '<div class="empty">No token source chain captured.</div>';
        return;
    }

    let html = '';
    chains.forEach(group => {
        html += '<div class="token-chain-group">';
        html += '<div class="token-chain-title">';
        html += '<span class="badge">' + (group.playableType || 'unknown').toUpperCase() + '</span>';
        if (group.pageUrl) html += ' <span style="color:var(--ink-faint);font-size:9.5px">' + group.pageUrl.slice(0, 60) + (group.pageUrl.length > 60 ? '…' : '') + '</span>';
        html += '</div>';
        (group.chain || []).forEach(step => {
            html += '<div class="token-step">';
            html += '<span class="step-num">' + String(step.step).padStart(2, '0') + '</span>';
            html += '<div><div class="step-desc">' + step.description + '</div>';
            html += '<div class="step-detail">' + (step.detail || '') + '</div></div>';
            html += '</div>';
        });
        // Provenance metadata (Priority 4 enhancement)
        if (group.provenance) {
            const p = group.provenance;
            html += '<div class="token-provenance">';
            html += '<div class="token-prov-item"><div class="prov-lab">Token Source</div><div class="prov-val" style="color:var(--cyan)">' + (p.tokenSource || '—') + '</div></div>';
            html += '<div class="token-prov-item"><div class="prov-lab">Lifetime</div><div class="prov-val" style="color:var(--amber)">' + (p.lifetime || '—') + '</div></div>';
            html += '<div class="token-prov-item"><div class="prov-lab">Generated By</div><div class="prov-val" style="color:var(--violet)">' + (p.generatedBy || '—') + '</div></div>';
            html += '<div class="token-prov-item"><div class="prov-lab">Replay</div><div class="prov-val" style="color:' + (p.replay === 'YES' ? 'var(--green)' : 'var(--red)') + '">' + (p.replay || '—') + '</div></div>';
            html += '</div>';
        }
        html += '</div>';
    });

    box.innerHTML = html;
}

// ---------- Priority 5: Request Importance renderer ----------
function renderRequestImportance(pi) {
    const box = $('requestImportanceBox');
    const ri = pi.requestImportance || {};
    const critical = ri.critical || [];
    const ignored = ri.ignored || [];

    let html = '';
    // Critical requests
    html += '<div class="ri-critical">';
    html += '<h4>Critical Requests (' + critical.length + ' of ' + (ri.totalRequests || 0) + ')</h4>';
    if (critical.length) {
        critical.forEach(c => {
            html += '<div class="ri-item">';
            html += '<span class="ri-num">' + c.num + '</span>';
            html += '<span class="ri-method">' + c.method + '</span>';
            html += '<span class="ri-path">' + c.template + '</span>';
            html += '</div>';
        });
    } else {
        html += '<div class="empty">No critical requests identified.</div>';
    }
    html += '</div>';

    // Ignored categories
    html += '<div class="ri-ignored">';
    html += '<h4>Ignored (' + (ri.totalRequests - ri.criticalCount) + ' requests)</h4>';
    if (ignored.length) {
        html += '<div class="ri-ignored-tags">';
        ignored.forEach(ig => {
            html += '<span class="ri-tag">' + ig.category + '<span class="ri-count">×' + ig.count + '</span></span>';
        });
        html += '</div>';
    } else {
        html += '<div class="empty">No noise detected.</div>';
    }
    html += '</div>';

    box.innerHTML = html;
}

// ---------- Priority 6: Request Templates renderer ----------
function renderRequestTemplates(pi) {
    const box = $('requestTemplatesBox');
    const templates = pi.requestTemplates || [];

    if (!templates.length) {
        box.innerHTML = '<div class="empty">No reusable request templates extracted.</div>';
        return;
    }

    let html = '';
    templates.forEach((tpl, idx) => {
        const methodCls = tpl.method.toLowerCase();
        html += '<div class="req-tpl" data-idx="' + idx + '">';
        html += '<div class="req-tpl-head">';
        html += '<span class="method ' + methodCls + '">' + tpl.method + '</span>';
        html += '<span class="tpl-path">' + tpl.template + '</span>';
        html += '<span class="tpl-cat">' + (tpl.category || '') + '</span>';
        html += '<span class="tpl-toggle">▸</span>';
        html += '</div>';
        html += '<div class="req-tpl-body">';
        if (tpl.headers && Object.keys(tpl.headers).length) {
            html += '<div class="req-tpl-section"><div class="sec-title">Headers</div>';
            for (const hk in tpl.headers) {
                html += '<div class="req-tpl-kv"><b>' + hk + ':</b> ' + tpl.headers[hk] + '</div>';
            }
            html += '</div>';
        }
        if (tpl.requestBody) {
            html += '<div class="req-tpl-section"><div class="sec-title">Request Body</div>';
            html += '<div class="req-tpl-response">' + tpl.requestBody + '</div>';
            html += '</div>';
        }
        if (tpl.responseSummary) {
            html += '<div class="req-tpl-section"><div class="sec-title">Returns (status ' + (tpl.responseStatus || '?') + ')</div>';
            html += '<div class="req-tpl-response">' + tpl.responseSummary + '</div>';
            html += '</div>';
        }
        if (tpl.pagesObserved && tpl.pagesObserved.length) {
            html += '<div class="req-tpl-section"><div class="sec-title">Observed on</div>';
            html += '<div class="req-tpl-kv">' + tpl.pagesObserved.slice(0, 3).join('<br>') + (tpl.pagesObserved.length > 3 ? '<br>… +' + (tpl.pagesObserved.length - 3) + ' more' : '') + '</div>';
            html += '</div>';
        }
        html += '</div>';
        html += '</div>';
    });

    box.innerHTML = html;

    box.querySelectorAll('.req-tpl-head').forEach(head => {
        head.addEventListener('click', () => {
            head.parentElement.classList.toggle('open');
        });
    });
}

// ---------- Priority 8: Confidence Scores renderer ----------
function renderConfidenceScores(pi) {
    const box = $('confidenceScoresBox');
    const scores = pi.confidenceScores || {};
    const keys = Object.keys(scores);

    if (!keys.length) {
        box.innerHTML = '<div class="empty">No confidence data available.</div>';
        return;
    }

    let html = '<div class="conf-grid">';
    keys.forEach(key => {
        const val = scores[key];
        const cls = val >= 80 ? 'high' : val >= 40 ? 'med' : 'low';
        const barCol = val >= 80 ? 'var(--green)' : val >= 40 ? 'var(--amber)' : 'var(--red)';
        html += '<div class="conf-item">';
        html += '<div class="conf-lab">' + key + '</div>';
        html += '<div class="conf-val ' + cls + '">' + val + '%</div>';
        html += '<div class="conf-bar"><div class="conf-fill" style="width:' + val + '%;background:' + barCol + '"></div></div>';
        html += '</div>';
    });
    html += '</div>';

    box.innerHTML = html;
}

// ---------- Priority 10: Implementation Estimate renderer ----------
function renderImplEstimate(pi) {
    const box = $('implEstimateBox');
    const est = pi.implementationEstimate || {};
    if (!est.lines) {
        box.innerHTML = '<div class="empty">No implementation estimate available.</div>';
        return;
    }

    let html = '';
    // Lines card
    html += '<div class="impl-card">';
    html += '<div class="impl-num">' + est.lines + '</div>';
    html += '<div class="impl-lab">Est. Lines</div>';
    html += '</div>';
    // Time card
    html += '<div class="impl-card">';
    html += '<div class="impl-num" style="font-size:18px">' + (est.timeStr || '—') + '</div>';
    html += '<div class="impl-lab">Est. Build Time</div>';
    html += '</div>';
    // Dependencies
    html += '<div class="impl-deps">';
    html += '<h4>Dependencies</h4>';
    (est.dependencies || []).forEach(dep => {
        html += '<span class="impl-dep-item">' + dep + '</span>';
    });
    html += '</div>';

    box.innerHTML = html;
}

// ---------- Priority 11: Provider Comparison renderer ----------
function renderProviderComparison(pi) {
    const box = $('providerCompareBox');
    const comp = pi.providerComparison || {};
    if (!comp.closestMatch) {
        box.innerHTML = '<div class="empty">No provider comparison available.</div>';
        return;
    }

    let html = '';
    // Match card
    html += '<div class="pc-match">';
    html += '<div class="pc-name">' + comp.closestMatch + '</div>';
    html += '<div class="pc-sim">' + comp.similarity + '%</div>';
    html += '<div class="pc-sim-lab">Similarity</div>';
    html += '<div style="margin-top:6px;font-size:9px;color:var(--ink-faint);position:relative">Shared: ' + (comp.sharedApis || '—') + '</div>';
    html += '</div>';

    // Details
    html += '<div class="pc-details">';
    html += '<div class="pc-rec"><b>Recommendation:</b> ' + (comp.recommendation || '—') + '</div>';
    if (comp.reuse && comp.reuse.length) {
        html += '<div style="font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:var(--ink-faint);margin-bottom:4px">Reuse</div>';
        html += '<div class="pc-tags">';
        comp.reuse.forEach(r => { html += '<span class="pc-tag reuse">' + r + '</span>'; });
        html += '</div>';
    }
    if (comp.rewrite && comp.rewrite.length) {
        html += '<div style="font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:var(--ink-faint);margin:6px 0 4px">Rewrite</div>';
        html += '<div class="pc-tags">';
        comp.rewrite.forEach(r => { html += '<span class="pc-tag rewrite">' + r + '</span>'; });
        html += '</div>';
    }
    html += '</div>';

    box.innerHTML = html;
}

// ---------- Priority 12: Final Recommendation renderer ----------
function renderFinalRecommendation(pi) {
    const box = $('finalRecBox');
    const rec = pi.finalRecommendation || {};
    if (!rec.stars) {
        box.innerHTML = '<div class="empty">No recommendation available.</div>';
        return;
    }

    let html = '';
    // Stars
    html += '<div class="fr-stars">';
    for (let i = 1; i <= 5; i++) {
        html += '<span class="' + (i <= rec.stars ? 'star-on' : 'star-off') + '">★</span>';
    }
    html += '</div>';

    // Grid
    const diffCls = rec.difficulty <= 3 ? 'good' : rec.difficulty <= 6 ? 'mid' : 'bad';
    const maintCls = rec.maintenance <= 3 ? 'good' : rec.maintenance <= 6 ? 'mid' : 'bad';
    html += '<div class="fr-grid">';
    html += '<div class="fr-item"><div class="fr-lab">Difficulty</div><div class="fr-val ' + diffCls + '">' + rec.difficulty + '/10</div></div>';
    html += '<div class="fr-item"><div class="fr-lab">Maintenance</div><div class="fr-val ' + maintCls + '">' + rec.maintenance + '/10</div></div>';
    html += '<div class="fr-item"><div class="fr-lab">Build Time</div><div class="fr-val" style="color:var(--cyan)">' + (rec.estimatedBuildTime || '—') + '</div></div>';
    html += '<div class="fr-item"><div class="fr-lab">Reusable Code</div><div class="fr-val" style="color:var(--violet)">' + (rec.reusableCode || '—') + '</div></div>';
    html += '<div class="fr-item"><div class="fr-lab">Extractor</div><div class="fr-val" style="font-size:11px;color:' + (rec.existingExtractor !== 'None' ? 'var(--green)' : 'var(--amber)') + '">' + (rec.existingExtractor || 'None') + '</div></div>';
    html += '<div class="fr-item"><div class="fr-lab">Recommended</div><div class="fr-val ' + (rec.recommended ? 'good' : 'bad') + '">' + (rec.recommended ? 'YES' : 'NO') + '</div></div>';
    html += '</div>';

    // Reason
    html += '<div class="fr-reason">' + (rec.reason || '') + '</div>';

    // Recommended banner
    html += '<div class="fr-recommended ' + (rec.recommended ? 'yes' : 'no') + '">' + (rec.recommended ? '✓ RECOMMENDED — Worth implementing' : '✘ NOT RECOMMENDED — High complexity') + '</div>';

    box.innerHTML = html;
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

    // Render all sections in order
    renderSignature(pi);
    renderDimensionalScores(pi);
    renderProviderFamily(pi);
    renderSplitReplayability(pi);
    renderReplay(pi);
    renderTokenChain(pi);
    renderRequestImportance(pi);
    renderChain(pi);
    renderRequestTemplates(pi);
    renderRecipe(pi);
    renderConfidenceScores(pi);
    renderImplEstimate(pi);
    renderProviderComparison(pi);
    renderFinalRecommendation(pi);
    renderStability(pi);
    renderJsDeps(pi);

    const s = report.summary || {};
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
