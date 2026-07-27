// background.js — Media Site Analyzer v3.0.0 (network-first engine + provider intelligence)

const MAX_BODY = 51200;
const CANONICAL_SEARCH_PARAMS = ['q', 'query', 'search', 'keyword', 's', 'k', 'text'];
const VARIANT_CAPABLE_TYPES = ['Catalog', 'Genre', 'Latest', 'Popular', 'Schedule'];
const MAX_VARIANTS = 3;

function normalizeUrl(rawUrl) {
    try {
        const u = new URL(rawUrl);
        u.hash = '';
        ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'gclid', 'exp', 'sig', 'token'].forEach(p => u.searchParams.delete(p));
        return u.href;
    } catch (e) { return null; }
}
function getRouteTemplate(urlStr) {
    try {
        const u = new URL(normalizeUrl(urlStr));
        const segments = u.pathname.split('/').filter(Boolean);
        const templated = segments.map((seg, i) => {
            const isLast = i === segments.length - 1;
            const known = ['watch', 'anime', 'title', 'search', 'catalog', 'browse', 'genre', 'latest', 'popular', 'schedule', 'movie', 'season', 'manga', 'novel'];
            if (/^\d+$/.test(seg)) return '{id}';
            if (/^\d+:\d+$/.test(seg)) return '{animeId}:{episode}';
            if (/^[a-f0-9]{16,}$/i.test(seg)) return '{hash}';
            if (isLast && !known.includes(seg) && seg.length > 3) return '{slug}';
            if (/\d/.test(seg) && seg.length > 3) return '{slug}';
            return seg;
        });
        return '/' + templated.join('/');
    } catch (e) { return urlStr; }
}
function getQueryParams(urlStr) {
    try {
        const u = new URL(normalizeUrl(urlStr));
        const params = {};
        u.searchParams.forEach((val, key) => { params[key] = '{value}'; });
        return params;
    } catch (e) { return {}; }
}
function tryDecodeProxy(normUrl) {
    try {
        const u = new URL(normUrl);
        const payload = u.searchParams.get('e') || u.searchParams.get('data');
        if (!payload) return null;
        return JSON.parse(atob(payload));
    } catch (e) { return null; }
}
function extractRequestBody(rb) {
    try {
        if (!rb) return null;
        if (rb.formData) {
            const o = {};
            for (const k in rb.formData) o[k] = rb.formData[k];
            return JSON.stringify(o);
        }
        if (rb.raw && rb.raw[0] && rb.raw[0].bytes) {
            return new TextDecoder('utf-8').decode(rb.raw[0].bytes).slice(0, MAX_BODY);
        }
    } catch (e) {}
    return null;
}

class SiteExplorer {
    constructor(startUrl) {
        this.startUrl = startUrl;
        this.domain = new URL(startUrl).hostname;
        this.visitedUrls = new Set();
        this.visitedTypes = new Set();
        this.queue = [];
        this.results = [];
        this.repPages = {};
        this.rejectedLinks = [];
        this.crawlGraph = [];
        this.startTime = 0;
        this.networkDb = {};
        this.apiGroups = {};
        this.thirdPartyCDNs = [];
        this.rawRequests = [];
        this.pendingById = {};
        this.htmlSnapshots = {};
        this.jsInventory = [];
        this.activeTabId = null;
        this.currentPageUrl = null;
        this.openedPredictedCounts = {};
    }

    // ---------- network lifecycle ----------
    onRequestStarted(details) {
        const normUrl = normalizeUrl(details.url);
        if (!normUrl) return;
        this.pendingById[details.requestId] = {
            requestId: details.requestId,
            url: normUrl,
            rawUrl: details.url,
            method: details.method,
            resourceType: details.type,
            pageUrl: this.currentPageUrl,
            startTime: details.timeStamp,
            requestBody: extractRequestBody(details.requestBody),
            requestHeaders: {},
            responseHeaders: {},
            status: null,
            redirectURL: null,
            body: null,
            durationMs: null,
            error: null
        };
    }
    onRequestHeaders(details) {
        const e = this.pendingById[details.requestId];
        if (!e) return;
        (details.requestHeaders || []).forEach(h => { e.requestHeaders[h.name.toLowerCase()] = h.value; });
    }
    onResponseHeaders(details) {
        const e = this.pendingById[details.requestId];
        if (!e) return;
        e.status = details.statusCode;
        (details.responseHeaders || []).forEach(h => { e.responseHeaders[h.name.toLowerCase()] = h.value; });
        if (details.statusCode >= 300 && details.statusCode < 400 && e.responseHeaders['location']) {
            e.redirectURL = e.responseHeaders['location'];
        }
    }
    onRequestCompleted(details) {
        const e = this.pendingById[details.requestId];
        if (!e) return;
        e.durationMs = Math.round(details.timeStamp - e.startTime);
        delete this.pendingById[details.requestId];
        this.finalizeRequest(e);
    }
    onRequestError(details) {
        const e = this.pendingById[details.requestId];
        if (!e) return;
        e.error = details.error || 'error';
        e.durationMs = Math.round(details.timeStamp - e.startTime);
        delete this.pendingById[details.requestId];
        this.finalizeRequest(e);
    }
    finalizeRequest(e) {
        this.rawRequests.push(e);
        const cls = this.classifyRequest(e);
        e.category = cls.category;
        e.playable = cls.playable || null;

        const key = `${e.method}:${e.url}`;
        if (!this.networkDb[key]) {
            this.networkDb[key] = { url: e.url, template: getRouteTemplate(e.url), method: e.method, type: e.resourceType, category: cls.category, purpose: cls.purpose, firstSeen: e.startTime, pages: [] };
        }
        if (e.pageUrl && !this.networkDb[key].pages.includes(e.pageUrl)) this.networkDb[key].pages.push(e.pageUrl);

        let host = ''; try { host = new URL(e.url).hostname; } catch (err) {}
        const isThirdParty = host && host !== this.domain && !host.endsWith('.' + this.domain);
        if (isThirdParty && (e.url.includes('.m3u8') || e.url.includes('.mp4') || e.url.includes('/api/') || cls.category === 'Manifest' || cls.category === 'Video')) {
            let cdn = this.thirdPartyCDNs.find(c => c.domain === host);
            if (!cdn) { cdn = { domain: host, endpoints: [], type: cls.category }; this.thirdPartyCDNs.push(cdn); }
            if (!cdn.endpoints.includes(e.url)) cdn.endpoints.push(e.url);
        }

        if (cls.apiGroup) {
            if (!this.apiGroups[cls.apiGroup]) this.apiGroups[cls.apiGroup] = [];
            const template = (cls.decoded && cls.decoded.path) ? '/' + cls.decoded.path : getRouteTemplate(e.url);
            let api = this.apiGroups[cls.apiGroup].find(a => a.template === template);
            if (!api) {
                this.apiGroups[cls.apiGroup].push({
                    template, method: e.method, purpose: cls.purpose, confidence: 85,
                    evidence: [`Detected on ${e.pageUrl}`, e.resourceType, (cls.decoded && cls.decoded.path) ? `Decoded path: /${cls.decoded.path}` : null].filter(Boolean),
                                                  pagesUsing: e.pageUrl ? [e.pageUrl] : []
                });
            } else {
                if (e.pageUrl && !api.pagesUsing.includes(e.pageUrl)) api.pagesUsing.push(e.pageUrl);
                api.evidence.push(`Seen again on ${e.pageUrl}`);
            }
        }
    }
    mergeIntercepted(intercepted) {
        (intercepted || []).forEach(ic => {
            const norm = normalizeUrl(ic.url);
            if (!norm) return;
            for (let i = this.rawRequests.length - 1; i >= 0; i--) {
                const r = this.rawRequests[i];
                if (r.url === norm && r.method === ic.method && !r.body) {
                    r.body = ic.body;
                    r.truncated = ic.truncated;
                    if (ic.responseHeaders && Object.keys(ic.responseHeaders).length) r.responseHeaders = { ...r.responseHeaders, ...ic.responseHeaders };
                    if (ic.status) r.status = ic.status;
                    if (ic.durationMs) r.durationMs = ic.durationMs;
                    const cls = this.classifyRequest(r);
                    if (cls.category !== r.category) { r.category = cls.category; r.playable = cls.playable || r.playable; }
                    break;
                }
            }
        });
    }

    // ---------- request classifier ----------
    classifyRequest(e) {
        let u; try { u = new URL(e.url); } catch (err) { return { category: 'Other', purpose: 'unknown' }; }
        const path = u.pathname.toLowerCase();
        const host = u.hostname;
        const isThirdParty = host !== this.domain && !host.endsWith('.' + this.domain);
        const body = e.body || '';

        if (e.url.includes('.m3u8')) return { category: 'Manifest', playable: 'hls', purpose: 'HLS manifest' };
        if (e.url.includes('.mpd')) return { category: 'Manifest', playable: 'dash', purpose: 'DASH manifest' };
        if (/\.(mp4|webm)(\?|$)/.test(e.url)) return { category: 'Video', playable: 'mp4', purpose: 'Direct video' };
        if (/\.(ass|srt|vtt)(\?|$)/.test(e.url)) return { category: 'Subtitle', purpose: 'Subtitle file' };
        if (body.includes('#EXTM3U')) return { category: 'Manifest', playable: 'hls', purpose: 'HLS manifest (body)' };
        if (body.includes('<MPD')) return { category: 'Manifest', playable: 'dash', purpose: 'DASH manifest (body)' };
        if (e.resourceType === 'sub_frame') return { category: 'Embed', playable: 'iframe', purpose: 'Embedded player frame' };
        if (e.resourceType === 'script') return { category: isThirdParty ? 'Third-party Script' : 'Script', purpose: 'script' };
        if (e.resourceType !== 'xmlhttprequest' && e.resourceType !== 'fetch') {
            return { category: isThirdParty ? 'Third-party Asset' : 'Asset', purpose: 'asset' };
        }

        if (path.includes('cloudflare') || path.includes('cdn-cgi') || host.includes('challenges.cloudflare')) {
            return { category: 'Cloudflare', purpose: 'Bot challenge' };
        }
        const hasSearchParam = Array.from(u.searchParams.keys()).some(k => CANONICAL_SEARCH_PARAMS.includes(k.toLowerCase()));
        const decoded = tryDecodeProxy(e.url);

        if (isThirdParty) return { category: 'Third-party API', purpose: 'Third-party API' };
        if (hasSearchParam || path.includes('search')) return { category: 'Search API', apiGroup: 'Search', purpose: hasSearchParam ? 'Search results (via query param)' : 'Search results', decoded };
        if (decoded && decoded.path) {
            const dp = String(decoded.path).toLowerCase();
            if (dp.includes('search')) return { category: 'Search API', apiGroup: 'Search', purpose: 'Search (proxied)', decoded };
            if (dp.includes('episode')) return { category: 'Episodes API', apiGroup: 'Episodes', purpose: 'Episode list (proxied)', decoded };
            if (dp.includes('source') || dp.includes('server')) return { category: 'Servers API', apiGroup: 'Video Resolver', purpose: 'Stream resolution (proxied)', decoded };
            if (dp.includes('info') || dp.includes('detail')) return { category: 'Anime Details API', apiGroup: 'Anime Detail', purpose: 'Metadata (proxied)', decoded };
            return { category: 'Proxy API', apiGroup: 'Proxy', purpose: 'Encoded proxy', decoded };
        }
        if (path.match(/\/(pipe|proxy|secure|gateway)\b/)) return { category: 'Proxy API', apiGroup: 'Proxy', purpose: 'Encoded/Base64 proxy' };
        if (path.includes('episode')) return { category: 'Episodes API', apiGroup: 'Episodes', purpose: 'Episode list' };
        if (path.match(/\/(servers|sources|resolve|stream|embed|player|video)\b/) || path.includes('/video/')) return { category: 'Servers API', apiGroup: 'Video Resolver', purpose: 'Stream resolution / server list' };
        if (path.includes('subtitle') || path.includes('caption')) return { category: 'Subtitle API', apiGroup: 'Subtitles', purpose: 'Subtitles' };
        if (path.match(/\/(auth|login|session|bootstrap|token)\b/)) return { category: 'Authentication', apiGroup: 'Authentication', purpose: 'Auth/session' };
        if (path.includes('comment')) return { category: 'Comments', apiGroup: 'Comments', purpose: 'Comments' };
        if (path.includes('anime') || path.includes('title') || path.includes('detail') || path.includes('info')) return { category: 'Anime Details API', apiGroup: 'Anime Detail', purpose: 'Metadata' };
        if (path.includes('analytics') || path.includes('tracking') || path.includes('metric')) return { category: 'Analytics', purpose: 'Analytics' };
        if (path.match(/\/(ads?|adservice|doubleclick)\b/)) return { category: 'Advertisement', purpose: 'Ads' };
        return { category: 'General API', apiGroup: 'General', purpose: 'Unknown/fallback' };
    }

    // ============================================================
    // PROVIDER INTELLIGENCE LAYER
    // ============================================================
    NOISE_CATEGORIES = ['Analytics', 'Advertisement', 'Asset', 'Third-party Asset', 'Script', 'Third-party Script', 'Cloudflare', 'Subtitle', 'Subtitle API', 'Comments', 'Authentication', 'Other'];

    // 1. Required requests — strip noise, keep the protocol
    getRequiredRequests() {
        const required = [];
        const seen = new Set();
        for (const r of this.rawRequests) {
            if (this.NOISE_CATEGORIES.includes(r.category)) continue;
            if (/\.(ts|aac|m4s|woff2?|ttf|png|jpe?g|webp|gif|ico|css)(\?|$)/i.test(r.url)) continue;
            const key = r.method + ' ' + getRouteTemplate(r.url);
            if (seen.has(key)) continue;
            seen.add(key);
            required.push({ method: r.method, template: getRouteTemplate(r.url), category: r.category, url: r.url });
        }
        return required;
    }

    // 2. Dependency graph — ordered chain of what must be reproduced
    buildDependencyGraph() {
        const ORDER = { 'Search API': 1, 'Anime Details API': 2, 'Episodes API': 3, 'Servers API': 4, 'Proxy API': 4, 'Embed': 5, 'Manifest': 6, 'Video': 7, 'General API': 8 };
        const required = this.getRequiredRequests();
        const nodes = required
        .map(r => ({ ...r, stage: ORDER[r.category] !== undefined ? ORDER[r.category] : 8 }))
        .sort((a, b) => a.stage - b.stage);
        const chain = nodes.map((n, i) => ({
            step: i + 1,
            category: n.category,
            method: n.method,
            template: n.template,
            dependsOn: i > 0 ? nodes[i - 1].template : null,
            feeds: i < nodes.length - 1 ? nodes[i + 1].template : 'Video()'
        }));
        const ascii = chain.map(n => `${n.method} ${n.template}   [${n.category}]`).join('\n    ↓\n');
        return { chain, ascii, totalCaptured: this.rawRequests.length, requiredCount: chain.length };
    }

    // 3. Token analysis
    analyzeTokens() {
        const tokens = [];
        const seen = new Set();
        const jwtRegex = /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
        const classifyValue = (val) => {
            if (!val) return { encoding: 'opaque', expires: null };
            if (jwtRegex.test(val)) {
                let expires = null;
                try {
                    const payload = JSON.parse(atob(val.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
                    if (payload.exp) {
                        const secs = payload.exp - Math.floor(Date.now() / 1000);
                        expires = secs > 0 ? `~${Math.round(secs / 60)} min` : 'expired';
                    }
                } catch (e) {}
                return { encoding: 'JWT', expires };
            }
            if (/^[A-Za-z0-9+/=]{20,}$/.test(val)) return { encoding: 'base64/opaque', expires: null };
            if (/^[a-f0-9]{32,}$/i.test(val)) return { encoding: 'hex/hash', expires: null };
            return { encoding: 'opaque', expires: null };
        };
        const inferSource = (val) => {
            if (jwtRegex.test(val)) return 'JWT (likely server-issued)';
            if (/^[A-Za-z0-9+/=]{20,}$/.test(val)) return 'base64 (possibly JS-generated)';
            return 'opaque (source unknown — likely JS-generated or server-issued)';
        };
        for (const r of this.rawRequests) {
            const auth = r.requestHeaders && r.requestHeaders['authorization'];
            if (auth) {
                const val = auth.replace(/^Bearer\s+/i, '');
                const c = classifyValue(val);
                const key = 'auth:' + c.encoding;
                if (!seen.has(key)) { seen.add(key); tokens.push({ location: 'Authorization header', example: auth.slice(0, 30) + '…', ...c, source: inferSource(val) }); }
            }
            const cookie = r.requestHeaders && r.requestHeaders['cookie'];
            if (cookie) {
                const names = cookie.split(';').map(c => c.trim().split('=')[0]).filter(Boolean);
                const sessionish = names.filter(n => /session|token|auth|sid|cf_clearance/i.test(n));
                if (sessionish.length && !seen.has('cookie:' + sessionish.join(','))) {
                    seen.add('cookie:' + sessionish.join(','));
                    tokens.push({ location: 'Cookie', example: sessionish.join(', '), encoding: 'opaque', expires: null, source: 'Set-Cookie from server' });
                }
            }
            try {
                const u = new URL(r.url);
                for (const [k, v] of u.searchParams) {
                    if (/^(token|key|sig|signature|auth|access_token|hash)$/i.test(k)) {
                        const c = classifyValue(v);
                        const key = 'param:' + k;
                        if (!seen.has(key)) { seen.add(key); tokens.push({ location: `query param "${k}"`, example: v.slice(0, 24) + '…', ...c, source: inferSource(v) }); }
                    }
                }
            } catch (e) {}
        }
        return tokens;
    }

    // 4. JS dependency report — only the files that matter
    buildJsDependencyReport() {
        const RELEVANT = ['m3u8', 'manifest', '.mpd', 'jwt', 'token', 'bearer', 'aes', 'cryptojs', 'decrypt', 'encrypt', 'fetch(', 'xmlhttprequest', 'websocket', 'atob(', 'btoa(', 'eval(', 'webassembly', 'hls'];
        const report = [];
        for (const js of this.jsInventory) {
            const hits = (js.patterns || []).filter(p => RELEVANT.includes(p));
            if (hits.length === 0) continue;
            let verdict = 'Relevant but low signal';
            if (hits.includes('aes') || hits.includes('cryptojs') || hits.includes('decrypt')) verdict = '⚠ Decrypts streams in JS — must reproduce crypto';
            else if (hits.includes('webassembly')) verdict = '⚠ Uses WASM — hard to reproduce';
            else if (hits.includes('hls') || hits.includes('m3u8') || hits.includes('manifest')) verdict = 'Player builds manifest — inspect for token assembly';
            else if (hits.includes('jwt')) verdict = 'Handles JWT — check token refresh';
            else if (hits.includes('fetch(') || hits.includes('xmlhttprequest')) verdict = 'Makes API calls — inspect endpoints';
            report.push({ file: js.name, url: js.url, classification: js.classification, contains: hits, verdict });
        }
        return report;
    }

    // 5. Replay test — "Can I replay this with OkHttp?"
    buildReplayTest() {
        const apiRequests = this.rawRequests.filter(r => (r.resourceType === 'xmlhttprequest' || r.resourceType === 'fetch') && !this.NOISE_CATEGORIES.includes(r.category));
        const requiredHeaders = new Set();
        let needsCookies = false;
        for (const r of apiRequests) {
            const h = r.requestHeaders || {};
            if (h['referer']) requiredHeaders.add('Referer');
            if (h['origin']) requiredHeaders.add('Origin');
            if (h['cookie']) { needsCookies = true; requiredHeaders.add('Cookie'); }
        }
        const tokens = this.analyzeTokens();
        const jsReport = this.buildJsDependencyReport();
        const usesAES = jsReport.some(j => j.contains.some(p => ['aes', 'cryptojs', 'decrypt'].includes(p)));
        const usesWASM = jsReport.some(j => j.contains.includes('webassembly'));
        const jsGeneratedToken = tokens.some(t => (t.source || '').includes('JS-generated'));
        const usesCloudflare = this.detectRedFlags().some(f => f.flag === 'Cloudflare');

        const blockers = [];
        if (usesAES) blockers.push('Requires JS crypto (AES/CryptoJS) — reproduce decryption');
        if (usesWASM) blockers.push('Requires WASM — hard to reproduce outside a browser');
        if (jsGeneratedToken) blockers.push('Token is JS-generated — must reverse-engineer token generation');
        if (usesCloudflare) blockers.push('Cloudflare challenge — may need browser cookies/fingerprint');

        const replayable = blockers.length === 0;
        return {
            replayable,
            verdict: replayable ? 'YES — replayable with OkHttp' : 'NO — requires browser-level work',
            requiredHeaders: Array.from(requiredHeaders),
            requiredCookies: needsCookies ? ['session (see token analysis)'] : [],
            blockers
        };
    }

    // 6. Stability report
    buildStabilityReport() {
        const red = this.detectRedFlags();
        const has = (flag) => red.some(f => f.flag === flag);
        const tokens = this.analyzeTokens();
        const usesCookies = tokens.some(t => t.location === 'Cookie');
        const apiRequests = this.rawRequests.filter(r => (r.resourceType === 'xmlhttprequest' || r.resourceType === 'fetch'));
        const usesReferer = apiRequests.some(r => r.requestHeaders && r.requestHeaders['referer']);
        const usesOrigin = apiRequests.some(r => r.requestHeaders && r.requestHeaders['origin']);
        const usesJWT = tokens.some(t => t.encoding === 'JWT');

        let maintenanceScore = 0;
        if (has('Cloudflare')) maintenanceScore += 3;
        if (usesJWT) maintenanceScore += 1;
        if (has('AES / Crypto')) maintenanceScore += 2;
        if (has('WASM')) maintenanceScore += 3;
        if (has('Browser fingerprinting')) maintenanceScore += 2;
        if (usesCookies) maintenanceScore += 1;
        const maintenance = maintenanceScore >= 5 ? 'High' : maintenanceScore >= 2 ? 'Medium' : 'Low';

        return {
            usesCloudflare: has('Cloudflare'),
            usesJWT,
            usesAES: has('AES / Crypto'),
            usesCookies,
            usesReferer,
            usesOrigin,
            usesWASM: has('WASM'),
            usesBrowserFingerprint: has('Browser fingerprinting'),
            likelyMaintenance: maintenance
        };
    }

    // 7. Kotlin extraction recipe
    buildKotlinRecipe() {
        const graph = this.buildDependencyGraph();
        const steps = [];
        let stepNum = 1;
        const extractionHint = (category) => {
            switch (category) {
                case 'Search API': return 'Extract anime slug / id from results';
                case 'Anime Details API': return 'Extract episode list / episode id';
                case 'Episodes API': return 'Extract episode id for target episode';
                case 'Servers API': case 'Proxy API': return 'Extract server / embed URL';
                case 'Embed': return 'Extract player / manifest URL from embed HTML';
                case 'Manifest': return 'Return Video(manifestUrl)';
                default: return 'Extract next value';
            }
        };
        for (const node of graph.chain) {
            if (['Comments', 'Subtitle', 'Subtitle API', 'Authentication', 'General API'].includes(node.category)) continue;
            steps.push({ step: stepNum++, action: `${node.method} ${node.template}`, category: node.category, extract: extractionHint(node.category) });
        }
        const ascii = steps.map(s => `Step ${s.step}\n  ${s.action}\n    ↓ ${s.extract}`).join('\n\n');
        return { steps, ascii };
    }

    // 8. Provider Signature
    buildProviderSignature() {
        const replay = this.buildReplayTest();
        const stability = this.buildStabilityReport();
        const graph = this.buildDependencyGraph();
        const playable = this.detectPlayableUrls();

        const categories = graph.chain.map(n => n.category);
        const usesIframe = categories.includes('Embed');
        const finalOutput = playable.some(p => p.type === 'hls') ? 'm3u8'
        : playable.some(p => p.type === 'dash') ? 'mpd'
        : playable.some(p => p.type === 'mp4') ? 'mp4' : 'unknown';
        const providerType = usesIframe ? `Iframe → ${finalOutput.toUpperCase()}` : `Direct → ${finalOutput.toUpperCase()}`;

        let difficulty = 2;
        if (!replay.replayable) difficulty += 3;
        if (stability.usesCloudflare) difficulty += 2;
        if (stability.usesAES) difficulty += 2;
        if (stability.usesWASM) difficulty += 2;
        if (stability.usesJWT) difficulty += 1;
        if (stability.usesCookies) difficulty += 1;
        difficulty = Math.min(10, difficulty);

        let stabilityScore = 10;
        if (stability.usesCloudflare) stabilityScore -= 3;
        if (stability.usesAES) stabilityScore -= 2;
        if (stability.usesWASM) stabilityScore -= 3;
        if (stability.usesJWT) stabilityScore -= 1;
        if (stability.usesCookies) stabilityScore -= 1;
        if (stability.usesBrowserFingerprint) stabilityScore -= 2;
        stabilityScore = Math.max(1, stabilityScore);

        return {
            providerType,
            difficulty,
            stability: stabilityScore,
            requiredHeaders: replay.requiredHeaders,
            requiredCookies: replay.requiredCookies,
            usesCloudflare: stability.usesCloudflare,
            usesJWT: stability.usesJWT,
            usesAES: stability.usesAES,
            finalOutput,
            replayable: replay.replayable
        };
    }

    // ---------- red / green flags ----------
    detectRedFlags() {
        const flags = [];
        const all = this.rawRequests;
        const has = fn => all.some(fn);
        if (has(r => r.url.includes('cdn-cgi/challenge-platform') || r.url.includes('challenges.cloudflare.com') || (r.responseHeaders && (r.responseHeaders['cf-ray'] || r.responseHeaders['cf-mitigated'])))) {
            flags.push({ flag: 'Cloudflare', severity: 'high', evidence: 'cdn-cgi challenge request or cf-ray/cf-mitigated header', impact: 'Bot challenge may block automated requests' });
        }
        if (has(r => r.requestHeaders && r.requestHeaders['authorization'])) {
            flags.push({ flag: 'JWT / Bearer auth', severity: 'high', evidence: 'Authorization header present on requests', impact: 'Extension must obtain/refresh a token' });
        }
        if (has(r => r.url.endsWith('.wasm') || r.url.includes('.wasm?'))) {
            flags.push({ flag: 'WASM', severity: 'medium', evidence: '.wasm module requested', impact: 'Decryption/verification may run in WASM' });
        }
        const cryptoScripts = this.jsInventory.filter(s => (s.patterns || []).some(p => ['aes', 'cryptojs', 'decrypt', 'encrypt'].includes(p)));
        if (cryptoScripts.length) flags.push({ flag: 'AES / Crypto', severity: 'medium', evidence: `Crypto patterns in: ${cryptoScripts.map(s => s.name).join(', ')}`, impact: 'Stream URLs or payloads may be encrypted' });
        const obf = this.jsInventory.filter(s => s.size && s.size > 50000 && s.avgLineLength && s.avgLineLength > 500);
        if (obf.length) flags.push({ flag: 'Obfuscated JS', severity: 'medium', evidence: `Very long lines in: ${obf.map(s => s.name).join(', ')}`, impact: 'Logic is minified/obfuscated' });
        if (has(r => r.requestHeaders && r.requestHeaders['cookie'] && (r.resourceType === 'xmlhttprequest' || r.resourceType === 'fetch'))) {
            flags.push({ flag: 'Cookies on APIs', severity: 'low', evidence: 'API requests carry Cookie header', impact: 'Session cookies may be required' });
        }
        if (has(r => r.requestHeaders && r.requestHeaders['referer'] && (r.resourceType === 'xmlhttprequest' || r.resourceType === 'fetch'))) {
            flags.push({ flag: 'Referer may be enforced', severity: 'low', evidence: 'API requests carry Referer', impact: 'Referer may be validated server-side' });
        }
        const fpScripts = this.jsInventory.filter(s => (s.patterns || []).some(p => ['fingerprint', 'webgl', 'getcontext'].includes(p)));
        if (fpScripts.length) flags.push({ flag: 'Browser fingerprinting', severity: 'low', evidence: `Fingerprint patterns in: ${fpScripts.map(s => s.name).join(', ')}`, impact: 'May gate access on fingerprint' });
        return flags;
    }
    detectGreenFlags() {
        const flags = [];
        let sameOriginApi = [];
        try { sameOriginApi = this.rawRequests.filter(r => (r.resourceType === 'xmlhttprequest' || r.resourceType === 'fetch') && new URL(r.url).hostname === this.domain); } catch (e) {}
        if (sameOriginApi.some(r => r.url.includes('/api/') && !(r.requestHeaders && r.requestHeaders['authorization']))) {
            flags.push({ flag: 'Public REST API', evidence: 'Same-origin /api/ endpoints respond without auth header' });
        }
        if (sameOriginApi.some(r => r.responseHeaders && (r.responseHeaders['content-type'] || '').includes('application/json'))) {
            flags.push({ flag: 'JSON responses', evidence: 'APIs return application/json' });
        }
        if (sameOriginApi.length && !sameOriginApi.some(r => r.requestHeaders && r.requestHeaders['authorization'])) {
            flags.push({ flag: 'No authentication', evidence: 'No Authorization header observed on same-origin APIs' });
        }
        const manifests = this.rawRequests.filter(r => r.category === 'Manifest');
        if (manifests.some(r => !/token|exp|sig|signature/i.test(r.url))) {
            flags.push({ flag: 'Direct HLS/DASH', evidence: 'Manifest fetched without token/exp/sig params' });
        }
        if (this.rawRequests.some(r => /anilist|anilistid/i.test(r.url) || (r.body && /anilist/i.test(r.body)))) {
            flags.push({ flag: 'Uses AniList IDs', evidence: 'AniList identifiers present in requests/responses' });
        }
        if (this.rawRequests.some(r => /mal_id|myanimelist/i.test(r.url) || (r.body && /mal_id/i.test(r.body)))) {
            flags.push({ flag: 'Uses MAL IDs', evidence: 'MyAnimeList identifiers present' });
        }
        return flags;
    }
    detectPlayableUrls() {
        const out = [];
        this.rawRequests.forEach(r => {
            if (!r.playable) return;
            let params = [];
            try { params = Array.from(new URL(r.url).searchParams.keys()).map(k => k.toLowerCase()); } catch (e) {}
            const hasTokenish = params.some(k => ['token', 'exp', 'sig', 'signature', 'auth', 'key'].includes(k));
            out.push({
                url: r.url, type: r.playable, pageUrl: r.pageUrl,
                requiresAuth: !!(r.requestHeaders['authorization'] || r.requestHeaders['cookie']),
                     requiresReferer: !!r.requestHeaders['referer'],
                     staticUrl: !hasTokenish
            });
        });
        return out;
    }

    // ---------- crawl ----------
    predictLink(url, text = "") {
        try {
            const u = new URL(url);
            if (u.hostname !== this.domain) return { score: -9999, type: "External", reason: "External domain" };
            const path = u.pathname.toLowerCase();
            const query = u.search.toLowerCase();
            const combined = (path + " " + text).toLowerCase();
            let type = "Other", score = 10, reason = "Default low priority";
            if (combined.includes("login") || combined.includes("signin")) { type = "Authentication"; score = -1000; reason = "Utility: Auth"; }
            else if (combined.includes("register")) { type = "Authentication"; score = -1000; reason = "Utility: Auth"; }
            else if (combined.includes("logout")) { type = "Utility"; score = -1000; reason = "Utility: Logout"; }
            else if (combined.includes("settings") || combined.includes("dashboard")) { type = "Utility"; score = -900; reason = "Utility: Settings"; }
            else if (combined.includes("profile")) { type = "Profile"; score = -700; reason = "Utility: Profile"; }
            else if (path === "/" || path === "") { type = "Homepage"; score = 1000; reason = "Path is root"; }
            else if (combined.includes("search") || query.includes("q=")) { type = "Search"; score = 900; reason = "URL contains search"; }
            else if (combined.includes("watch") || combined.includes("episode")) { type = "Watch"; score = 850; reason = "URL contains watch/episode"; }
            else if (combined.includes("anime") || combined.includes("title")) { type = "Anime"; score = 800; reason = "URL contains anime/title"; }
            else if (combined.includes("catalog") || combined.includes("browse")) { type = "Catalog"; score = 650; reason = "URL contains catalog/browse"; }
            else if (combined.includes("genre")) { type = "Genre"; score = 600; reason = "URL contains genre"; }
            return { score, type, reason };
        } catch (e) { return { score: -9999, type: "Error", reason: "Invalid URL" }; }
    }
    addToQueue(url, score, predictedType, parentUrl, parentType, depth, selector, text) {
        if (depth > 4) { this.rejectedLinks.push({ url, reason: "Exceeded depth", parentUrl }); return; }
        const norm = normalizeUrl(url);
        if (!norm) return;
        if (score <= 0) { this.rejectedLinks.push({ url: norm, reason: `Low priority (${predictedType})`, parentUrl }); return; }
        if (this.visitedUrls.has(norm)) { this.rejectedLinks.push({ url: norm, reason: "Already visited", parentUrl }); return; }
        const existing = this.queue.find(q => q.url === norm);
        if (existing) { if (score > existing.score) { existing.score = score; existing.predictedType = predictedType; } return; }
        this.queue.push({ url: norm, score, predictedType, parentUrl, parentType, depth, selector, text });
        this.queue.sort((a, b) => b.score - a.score);
    }
    async updateProgress(step, currentUrl = "") {
        const stats = {
            pagesAnalyzed: this.results.length,
            queueLength: this.queue.length,
            detectedApis: Object.values(this.apiGroups).flat().length,
            networkRequests: this.rawRequests.length,
            foundTypes: Array.from(this.visitedTypes),
            rejectedLinks: this.rejectedLinks.length
        };
        await browser.storage.local.set({ msaProgress: { step, currentUrl, stats } });
    }
    async explore() {
        this.startTime = Date.now();
        this.addToQueue(this.startUrl, 1000, "Homepage", null, "N/A", 0, "user_input", "Start URL");
        await browser.storage.local.set({ msaStatus: "running", msaError: null, msaActive: true });
        try {
            while (this.queue.length > 0 && this.results.length < 20) {
                const item = this.queue.shift();
                if (this.visitedUrls.has(item.url)) continue;
                const isVariantCapable = VARIANT_CAPABLE_TYPES.includes(item.predictedType);
                const openedCount = this.openedPredictedCounts[item.predictedType] || 0;
                if (isVariantCapable) {
                    if (openedCount >= MAX_VARIANTS) { this.rejectedLinks.push({ url: item.url, reason: `Max variants (${MAX_VARIANTS}) reached for ${item.predictedType}`, parentUrl: item.parentUrl }); continue; }
                } else {
                    if (openedCount > 0) { this.rejectedLinks.push({ url: item.url, reason: `Already opened a ${item.predictedType} page`, parentUrl: item.parentUrl }); continue; }
                }
                this.openedPredictedCounts[item.predictedType] = openedCount + 1;

                await this.updateProgress("Opening tab", item.url);
                const tab = await browser.tabs.create({ url: item.url, active: false });
                this.activeTabId = tab.id;
                this.currentPageUrl = item.url;
                this.visitedUrls.add(item.url);

                await this.updateProgress("Waiting for load", item.url);
                await new Promise((resolve) => {
                    let resolved = false;
                    const listener = (tabId, changeInfo) => {
                        if (tabId === tab.id && changeInfo.status === "complete" && !resolved) {
                            browser.tabs.onUpdated.removeListener(listener); resolved = true; resolve();
                        }
                    };
                    browser.tabs.onUpdated.addListener(listener);
                    setTimeout(() => { if (!resolved) { resolved = true; resolve(); } }, 20000);
                });
                await this.updateProgress("Waiting for network", item.url);
                await new Promise(r => setTimeout(r, 6000));

                await this.updateProgress("Running detectors", item.url);
                let pageData = {};
                try {
                    const results = await browser.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
                    pageData = results[0].result || {};
                } catch (e) { await browser.storage.local.set({ msaError: `Injection failed: ${e.message}` }); }

                this.mergeIntercepted(pageData.intercepted || []);
                if (pageData.htmlSnapshot) this.htmlSnapshots[item.url] = pageData.htmlSnapshot;
                if (pageData.detectors && pageData.detectors.jsInventory) this.jsInventory.push(...pageData.detectors.jsInventory);

                await this.updateProgress("Classifying page", item.url);
                const classification = this.classifyPage(item.url, pageData, item.predictedType);
                if (!this.visitedTypes.has(classification.type)) this.visitedTypes.add(classification.type);
                this.crawlGraph.push({ from: item.parentUrl, to: item.url, type: classification.type, selector: item.selector, text: item.text, depth: item.depth });

                const pageRecord = {
                    url: item.url,
                    routeTemplate: getRouteTemplate(item.url),
                    queryParams: getQueryParams(item.url),
                    type: classification.type,
                    family: classification.family,
                    variant: classification.variant,
                    activeFilters: classification.activeFilters,
                    confidence: classification.confidence,
                    reasons: classification.reasons,
                    title: pageData.site ? pageData.site.title : null,
                    frameworks: pageData.detectors ? pageData.detectors.frameworks : {},
                    metadata: pageData.detectors ? pageData.detectors.metadata : {},
                    domHints: pageData.detectors ? pageData.detectors.domHints : {},
                    fingerprint: pageData.detectors ? pageData.detectors.fingerprint : "unknown",
                    links: pageData.links || [],
                    embeddedJSON: pageData.detectors ? pageData.detectors.embeddedJSON : [],
                    networkRequests: Object.keys(this.networkDb).filter(k => this.networkDb[k].pages.includes(item.url)),
                    discovery: { parentUrl: item.parentUrl, parentType: item.parentType, selector: item.selector, text: item.text, depth: item.depth }
                };
                this.results.push(pageRecord);
                if (classification.type !== "Unknown" && classification.type !== "Utility" && classification.type !== "Authentication") {
                    if (!this.repPages[classification.type] || this.repPages[classification.type].confidence < classification.confidence) {
                        this.repPages[classification.type] = pageRecord;
                    }
                }
                if (pageData.searchViewAllLink) {
                    this.addToQueue(pageData.searchViewAllLink, 950, "Search", item.url, classification.type, item.depth + 1, "ajax_dropdown", "View All Results");
                }
                await this.updateProgress("Scoring links", item.url);
                for (const link of pageData.links || []) {
                    const prediction = this.predictLink(link.url, link.text);
                    this.addToQueue(link.url, prediction.score, prediction.type, item.url, classification.type, item.depth + 1, link.selector, link.text);
                }
                await browser.tabs.remove(tab.id);
                this.activeTabId = null;
                this.currentPageUrl = null;
            }
            await this.updateProgress("Generating report", this.startUrl);
            const report = this.generateReport();
            const har = this.generateHAR();
            await browser.storage.local.set({
                msaStatus: "complete",
                msaReport: report,
                msaHAR: har,
                msaSnapshots: this.htmlSnapshots,
                msaRaw: { networkDb: this.networkDb, rawRequests: this.rawRequests, apiGroups: this.apiGroups, thirdPartyCDNs: this.thirdPartyCDNs },
                msaActive: false
            });
        } catch (err) {
            await browser.storage.local.set({ msaStatus: "error", msaError: `FATAL: ${err.message}\n${err.stack}`, msaActive: false });
        }
    }
    classifyPage(url, pageData, predictedType) {
        const u = new URL(url);
        const path = u.pathname.toLowerCase();
        const params = Array.from(u.searchParams.keys());
        const domHints = (pageData.detectors && pageData.detectors.domHints && pageData.detectors.domHints.result) || {};
        const metadata = (pageData.detectors && pageData.detectors.metadata && pageData.detectors.metadata.result) || {};
        let type = predictedType || "Unknown";
        let family = type;
        let variant = null;
        let activeFilters = {};
        let reasons = [];
        let confidence = 0;

        if (url === this.startUrl) { type = "Homepage"; family = "Homepage"; confidence = 100; reasons.push("✔ URL is the designated start page (root of crawl)"); }
        if (path.includes("catalog") || path.includes("browse")) { family = "Catalog"; type = "Catalog"; confidence += 40; reasons.push("✔ URL route matches catalog/browse"); }
        if (path === "/" || path === "") { type = "Homepage"; family = "Homepage"; confidence += 40; reasons.push("✔ URL route is root"); }
        if (path.includes("watch") || path.includes("episode")) { type = "Watch"; family = "Watch"; confidence += 40; reasons.push("✔ URL route matches watch/episode"); }
        if (path.includes("anime") || path.includes("title")) { type = "Anime"; family = "Anime"; confidence += 40; reasons.push("✔ URL route matches anime/title"); }
        if (path.includes("search")) { type = "Search"; family = "Catalog"; variant = "Search"; confidence += 40; reasons.push("✔ URL route matches search"); }

        if (domHints.hasVideoPlayer) { type = "Watch"; family = "Watch"; confidence += 30; reasons.push("✔ Video player detected (DOM/Metadata)"); }
        if (domHints.hasEpisodeList && type !== "Watch" && type !== "Search" && family !== "Catalog") {
            type = "Anime"; family = "Anime"; confidence += 30; reasons.push("✔ Episode list detected (Link Cluster/DOM)");
        }
        if (domHints.isHomepage) { type = "Homepage"; family = "Homepage"; confidence += 30; reasons.push("✔ DOM confirms homepage"); }
        const isWatchPath = path.includes('watch/') || path.includes('episode/');
        if (metadata.ogType === 'video.episode' || (metadata.ogType === 'video.tv_show' && isWatchPath)) {
            confidence += 20; reasons.push("✔ og:type confirms video episode/show");
        }
        if (params.length > 0) {
            params.forEach(p => {
                activeFilters[p] = u.searchParams.get(p);
                if (['genre', 'category', 'studio', 'season', 'status', 'year', 'sort', 'letter', 'type'].includes(p)) {
                    if (family === "Unknown" || family === "Catalog") { family = "Catalog"; type = "Catalog"; confidence += 20; }
                    variant = p.charAt(0).toUpperCase() + p.slice(1);
                    reasons.push(`✔ Catalog variant detected: ${variant}`);
                }
                if (CANONICAL_SEARCH_PARAMS.includes(p.toLowerCase())) {
                    family = "Catalog"; type = "Search"; variant = "Search";
                    reasons.push(`✔ Canonical search param detected: ${p}`);
                }
            });
        }
        if (path.includes("login")) { type = "Authentication"; family = "Auth"; confidence = 100; reasons = ["✔ Path includes login"]; }

        const pageNetworkRequests = Object.keys(this.networkDb).filter(k => this.networkDb[k].pages.includes(url));
        const hasSearchAPI = pageNetworkRequests.some(k => {
            try {
                const nu = new URL(this.networkDb[k].url);
                return Array.from(nu.searchParams.keys()).some(p => CANONICAL_SEARCH_PARAMS.includes(p.toLowerCase()));
            } catch (e) { return false; }
        });
        if (pageData.searchSimulated || hasSearchAPI) {
            if (type !== "Homepage") { type = "Search"; family = "Catalog"; variant = "Search"; confidence = 90; reasons.push("✔ Active search trigger/API succeeded"); }
            else { reasons.push("✔ Search functionality discovered via simulation/API on Homepage"); }
        }
        if (confidence < 40 && type !== "Homepage") { type = "Unknown"; family = "Unknown"; reasons.push("✘ Confidence too low"); }
        if (confidence > 100) confidence = 100;
        return { type, family, variant, activeFilters, confidence, reasons };
    }

    // ---------- HAR ----------
    generateHAR() {
        const entries = this.rawRequests.map(r => {
            let qs = [];
            try { qs = Array.from(new URL(r.url).searchParams).map(([name, value]) => ({ name, value })); } catch (e) {}
            const req = {
                method: r.method, url: r.rawUrl || r.url, httpVersion: 'HTTP/1.1',
                cookies: [], headers: Object.entries(r.requestHeaders || {}).map(([name, value]) => ({ name, value })),
                                             queryString: qs, headersSize: -1, bodySize: -1
            };
            if (r.requestBody) req.postData = { mimeType: 'application/octet-stream', text: r.requestBody };
            return {
                startedDateTime: new Date(r.startTime).toISOString(),
                                             time: r.durationMs || 0,
                                             request: req,
                                             response: {
                                                 status: r.status || 0, statusText: '', httpVersion: 'HTTP/1.1',
                                                 cookies: [], headers: Object.entries(r.responseHeaders || {}).map(([name, value]) => ({ name, value })),
                                             content: { size: (r.body || '').length, mimeType: (r.responseHeaders || {})['content-type'] || '', text: r.body || '' },
                                             redirectURL: r.redirectURL || '', headersSize: -1, bodySize: -1
                                             },
                                             cache: {},
                                             timings: { send: 0, wait: r.durationMs || 0, receive: 0 },
                                             pageref: 'page_0'
            };
        });
        return {
            log: {
                version: '1.2',
                creator: { name: 'Media Site Analyzer', version: '3.0.0' },
                pages: [{ id: 'page_0', startedDateTime: new Date(this.startTime).toISOString(), title: this.domain, pageTimings: { onLoad: -1 } }],
                entries
            }
        };
    }

    generateReport() {
        const duration = Date.now() - this.startTime;
        const now = new Date();
        const safeDomain = this.domain.replace(/[^a-z0-9.]/gi, '_');
        const pad = (n) => String(n).padStart(2, '0');
        const filename = `${safeDomain}_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}.json`;

        const equivalentGroups = {};
        for (const res of this.results) {
            if (!equivalentGroups[res.fingerprint]) equivalentGroups[res.fingerprint] = { fingerprint: res.fingerprint, similarity: 99, shared: [], different: [], pages: [] };
            equivalentGroups[res.fingerprint].pages.push(res.url);
            equivalentGroups[res.fingerprint].different.push(res.title || res.url);
        }
        Object.values(equivalentGroups).forEach(group => {
            if (group.pages.length > 1) { group.shared = ["DOM Structure", "Selectors", "Layout", "APIs Used"]; group.different = ["Title", "URL", "Metadata"]; }
            else { group.shared = ["N/A (Unique page)"]; group.different = []; group.similarity = 0; }
        });

        const playableUrls = this.detectPlayableUrls();
        const redFlags = this.detectRedFlags();
        const greenFlags = this.detectGreenFlags();
        const byCategory = {};
        this.rawRequests.forEach(r => { byCategory[r.category] = (byCategory[r.category] || 0) + 1; });

        let compatScore = 0; const compatReasons = [];
        if (this.repPages["Homepage"]) { compatScore += 10; compatReasons.push("✔ Homepage detected"); }
        if (this.repPages["Search"]) { compatScore += 15; compatReasons.push("✔ Search page detected"); } else { compatReasons.push("✘ Search page not found"); }
        if (this.repPages["Anime"]) { compatScore += 15; compatReasons.push("✔ Anime/Detail page detected"); } else { compatReasons.push("✘ Anime/Detail page not found"); }
        if (this.repPages["Watch"]) { compatScore += 15; compatReasons.push("✔ Watch/Video page detected"); } else { compatReasons.push("✘ Watch/Video page not found"); }
        if (this.apiGroups["Search"]) { compatScore += 10; compatReasons.push("✔ Search API discovered"); } else { compatReasons.push("✘ No Search API found"); }
        if (this.apiGroups["Video Resolver"] || this.apiGroups["Proxy"]) { compatScore += 10; compatReasons.push("✔ Video Resolver/Proxy discovered"); } else { compatReasons.push("✘ No Video Resolver API found"); }
        if (playableUrls.length) { compatScore += 15; compatReasons.push("✔ Playable stream URL captured"); }
        else if (this.thirdPartyCDNs.length) { compatScore += 10; compatReasons.push("✔ Third-party CDN stream observed"); }
        if (compatScore === 0) compatReasons.push("✘ Critical pages missing");

        const snapshotIndex = {};
        Object.keys(this.htmlSnapshots).forEach(u => {
            const s = this.htmlSnapshots[u];
            snapshotIndex[u] = { size: s.length, preview: s.slice(0, 2000) };
        });

        const providerIntelligence = {
            providerSignature: this.buildProviderSignature(),
            dependencyGraph: this.buildDependencyGraph(),
            requiredRequests: this.getRequiredRequests(),
            tokenAnalysis: this.analyzeTokens(),
            jsDependencyReport: this.buildJsDependencyReport(),
            replayTest: this.buildReplayTest(),
            stabilityReport: this.buildStabilityReport(),
            kotlinRecipe: this.buildKotlinRecipe()
        };

        const blueprint = this.generateBlueprint(providerIntelligence);

        return {
            meta: {
                tool: "Media Site Analyzer", version: "3.0.0", schemaVersion: 7,
                generatedAt: now.toISOString(), analysisDurationMs: duration,
                domain: this.domain, startUrl: this.startUrl, filename,
                detectorsUsed: [
                    { name: "Framework Detector", version: "1.1" },
                    { name: "Metadata Detector", version: "1.3" },
                    { name: "DOM Detector", version: "1.9" },
                    { name: "Route Detector", version: "1.3" },
                    { name: "API Detector", version: "1.7" },
                    { name: "Network Recorder", version: "1.0" },
                    { name: "JS Inventory", version: "1.0" },
                    { name: "Flag Detector", version: "1.0" },
                    { name: "Provider Intelligence", version: "1.0" },
                    { name: "Active Search Simulator", version: "1.7" }
                ]
            },
            summary: {
                compatibilityScore: compatScore, compatibilityReasons: compatReasons,
                pagesAnalyzed: this.results.length, typesDiscovered: this.visitedTypes.size,
                detectedApis: Object.values(this.apiGroups).flat().length,
                routesDiscovered: Object.keys(equivalentGroups).length,
                coveragePercentage: Math.round((this.visitedTypes.size / 12) * 100)
            },
            providerIntelligence,
            networkAnalysis: {
                totalRequests: this.rawRequests.length,
                byCategory,
                playableUrls,
                redFlags,
                greenFlags,
                jsInventory: this.jsInventory,
                harAvailable: true
            },
            representativePages: this.repPages,
            equivalentPages: Object.values(equivalentGroups),
            crawlGraph: this.crawlGraph,
            apiGroups: this.apiGroups,
            thirdPartyCDNs: this.thirdPartyCDNs,
            htmlSnapshots: snapshotIndex,
            implementationBlueprint: blueprint,
            allPages: this.results
        };
    }
    generateBlueprint(pi) {
        const order = [];
        if (this.repPages["Search"] || this.apiGroups["Search"]) order.push("1. Search");
        if (this.repPages["Anime"]) order.push("2. Anime Details");
        if (this.repPages["Watch"]) order.push("3. Episode List / Watch");
        if (this.apiGroups["Video Resolver"] || this.apiGroups["Proxy"] || this.thirdPartyCDNs.length) order.push("4. Stream Resolver");
        const limitations = [];
        if (!this.repPages["Search"] && !this.apiGroups["Search"]) limitations.push("Search not easily discovered");
        if (this.apiGroups["Proxy"]) limitations.push("Site uses encoded Base64 proxy for APIs; decode payload");
        if (this.thirdPartyCDNs.length) limitations.push(`Relies on third-party CDNs (${this.thirdPartyCDNs.map(c => c.domain).join(', ')}) for streams`);
        if (pi && pi.replayTest && !pi.replayTest.replayable) limitations.push(...pi.replayTest.blockers);
        let strategy = "Extract data from embedded JSON where possible, fallback to DOM selectors.";
        if (this.apiGroups["Video Resolver"]) strategy += " Use Video Resolver API to fetch stream URLs.";
        if (this.apiGroups["Proxy"]) strategy += " Decode Base64 proxy payload to access internal routes.";
        if (this.thirdPartyCDNs.length) strategy += " Query third-party CDNs directly for streams.";
        return {
            estimatedDifficulty: pi ? (pi.providerSignature.difficulty <= 3 ? 'Easy' : pi.providerSignature.difficulty <= 6 ? 'Medium' : 'Hard') : 'Medium',
            recommendedOrder: order,
            knownLimitations: limitations,
            recommendedStrategy: strategy
        };
    }
}

// ---------- wiring ----------
let explorer = null;

browser.webRequest.onBeforeRequest.addListener(d => {
    if (!explorer || d.tabId !== explorer.activeTabId) return;
    explorer.onRequestStarted(d);
}, { urls: ["<all_urls>"] }, ["requestBody"]);

browser.webRequest.onBeforeSendHeaders.addListener(d => {
    if (!explorer || d.tabId !== explorer.activeTabId) return;
    explorer.onRequestHeaders(d);
}, { urls: ["<all_urls>"] }, ["requestHeaders"]);

browser.webRequest.onHeadersReceived.addListener(d => {
    if (!explorer || d.tabId !== explorer.activeTabId) return;
    explorer.onResponseHeaders(d);
}, { urls: ["<all_urls>"] }, ["responseHeaders"]);

browser.webRequest.onCompleted.addListener(d => {
    if (!explorer || d.tabId !== explorer.activeTabId) return;
    explorer.onRequestCompleted(d);
}, { urls: ["<all_urls>"] });

browser.webRequest.onErrorOccurred.addListener(d => {
    if (!explorer || d.tabId !== explorer.activeTabId) return;
    explorer.onRequestError(d);
}, { urls: ["<all_urls>"] });

function downloadText(text, filename, mime) {
    const dataUrl = 'data:' + mime + ';charset=utf-8,' + encodeURIComponent(text);
    return browser.downloads.download({ url: dataUrl, filename, saveAs: false });
}

browser.runtime.onMessage.addListener((message) => {
    if (message.action === "START_EXPLORATION") {
        if (explorer) return Promise.resolve({ status: "error", errorMessage: "Analysis already running." });
        browser.tabs.query({ active: true, currentWindow: true }).then(async (tabs) => {
            if (!tabs.length) return;
            await browser.storage.local.remove(['msaStatus', 'msaReport', 'msaHAR', 'msaSnapshots', 'msaRaw', 'msaError', 'msaProgress']);
            explorer = new SiteExplorer(tabs[0].url);
            explorer.explore().finally(() => { explorer = null; });
        });
        return Promise.resolve({ status: "success", message: "Analysis started." });
    }
    if (message.action === "DOWNLOAD_FULL") {
        return browser.storage.local.get(['msaReport', 'msaHAR', 'msaSnapshots', 'msaRaw']).then(d => {
            const domain = (d.msaReport && d.msaReport.meta && d.msaReport.meta.domain) || 'site';
            const full = 'har="' + JSON.stringify(d.msaHAR) + '"\n\nsnapshots="' + JSON.stringify(d.msaSnapshots) + '"\n\njson="' + JSON.stringify(d.msaRaw) + '"\n\nreport="' + JSON.stringify(d.msaReport) + '"';
            return downloadText(full, domain + '_full_analysis.txt', 'text/plain').then(() => ({ status: "success" }));
        });
    }
});

browser.storage.local.set({ msaStatus: "ready", msaActive: false });
