// background.js — Media Site Analyzer v3.0.0 (network-first engine + provider intelligence)
const MAX_BODY = 204800;
const CANONICAL_SEARCH_PARAMS = ['q', 'query', 'search', 'keyword', 's', 'k', 'text'];
const VARIANT_CAPABLE_TYPES = ['Catalog', 'Genre', 'Latest', 'Popular', 'Schedule'];
const MAX_VARIANTS = 3;
// --- Request Layer Classification ---
const LAYER_1_DISCOVERY = ['Search API', 'Anime Details API', 'Episodes API'];
const LAYER_2_RESOLUTION = ['Servers API', 'Proxy API', 'Embed'];
const LAYER_3_PLAYBACK = ['Manifest', 'Video'];
const LAYER_4_METADATA = ['Comments', 'Subtitle API', 'Authentication', 'General API'];
const LAYER_5_ASSETS = ['Analytics', 'Advertisement', 'Asset', 'Third-party Asset', 'Script', 'Third-party Script', 'Cloudflare', 'Subtitle', 'Other'];
const MEDIA_PIPELINE = [...LAYER_1_DISCOVERY, ...LAYER_2_RESOLUTION, ...LAYER_3_PLAYBACK];
// --- Granular sub-layer classification ---
const SUB_LAYERS = {
    'Search API': 'Application API',
    'Anime Details API': 'Application API',
    'Episodes API': 'Application API',
    'Servers API': 'Player API',
    'Proxy API': 'Player API',
    'Embed': 'Player API',
    'Manifest': 'Media API',
    'Video': 'Media API',
    'Comments': 'Third-party Metadata',
    'Subtitle API': 'Third-party Metadata',
    'Authentication': 'Application API',
    'General API': 'Application API',
    'Analytics': 'Analytics',
    'Advertisement': 'Analytics',
    'Asset': 'CSS/Fonts/Images',
    'Third-party Asset': 'CSS/Fonts/Images',
    'Script': 'Framework Assets',
    'Third-party Script': 'Framework Assets',
    'Cloudflare': 'Security',
    'Subtitle': 'Media API',
    'Other': 'Other'
};
// --- Provider Family Signatures ---
const PROVIDER_FAMILIES = [
    {
        id: 'megacloud',
        name: 'Megacloud',
        extractor: 'MegacloudExtractor.kt',
        confidence: 0,
        signals: {
            domains: ['megacloud', 'megacloud.tv', 'megacloud.to', 'rapid-cloud', 'rapidrame'],
            urlPatterns: [/megacloud/i, /rapid-cloud/i, /rapidrame/i, /embed[-\d]/i, /\/e\//i],
            jsPatterns: ['megacloud', 'rapid-cloud'],
            responsePatterns: [/sources.*file.*type.*hls/i, /"sources"\s*:\s*\[/i],
            headers: [],
            player: null
        }
    },
{
    id: 'rabbitstream',
    name: 'Rabbitstream',
    extractor: 'RabbitstreamExtractor.kt',
    confidence: 0,
    signals: {
        domains: ['rabbitstream', 'rabbitstream.net', 'rabbitstream.to'],
        urlPatterns: [/rabbitstream/i, /embed[-\d]/i],
        jsPatterns: ['rabbitstream'],
        responsePatterns: [/sources.*file/i],
        headers: [],
        player: null
    }
},
{
    id: 'filemoon',
    name: 'Filemoon',
    extractor: 'FilemoonExtractor.kt',
    confidence: 0,
    signals: {
        domains: ['filemoon', 'filemoon.sx', 'filemoon.to', 'filemoon.in'],
        urlPatterns: [/filemoon/i, /\/e\//i, /\/d\//i],
        jsPatterns: ['filemoon', 'fmplayer'],
        responsePatterns: [/filemoon/i],
        headers: [],
        player: null
    }
},
{
    id: 'vidstack',
    name: 'Vidstack',
    extractor: null ,
    confidence: 0,
    signals: {
        domains: ['vidstack', 'vidstack.io'],
        urlPatterns: [/vidstack/i],
        jsPatterns: ['vidstack', '@vidstack'],
        responsePatterns: [],
        headers: [],
        player: 'HLS.js'
    }
},
{
    id: 'streamwish',
    name: 'StreamWish',
    extractor: 'StreamWishExtractor.kt',
    confidence: 0,
    signals: {
        domains: ['streamwish', 'streamwish.to', 'streamwish.com'],
        urlPatterns: [/streamwish/i, /\/e\//i],
        jsPatterns: ['streamwish'],
        responsePatterns: [/streamwish/i],
        headers: [],
        player: null
    }
},
{
    id: 'vidstreaming',
    name: 'VidStreaming',
    extractor:  'VidStreamingExtractor.kt',
    confidence: 0,
    signals: {
        domains: ['vidstreaming', 'vidstreaming.io'],
        urlPatterns: [/vidstreaming/i, /streaming.php/i],
        jsPatterns: ['vidstreaming'],
        responsePatterns: [],
        headers: [],
        player: null
    }
},
{
    id: 'gogoembed',
    name: 'GogoEmbed (GogoCDN)',
    extractor: 'GogoExtractor.kt',
    confidence: 0,
    signals: {
        domains: ['gogocdn', 'gogoanime', 'gogo-load', 'playgo', 'anihdplay'],
        urlPatterns: [/gogocdn/i, /gogoanime/i, /streaming.php/i, /loadserver.php/i],
        jsPatterns: ['gogocdn', 'gogo'],
        responsePatterns: [/gogocdn/i],
        headers: [],
        player: null
    }
},
{
    id: 'mp4upload',
    name: 'Mp4Upload',
    extractor: 'Mp4UploadExtractor.kt',
    confidence: 0,
    signals: {
        domains: ['mp4upload', 'mp4upload.com'],
        urlPatterns: [/mp4upload/i, /embed-/i],
        jsPatterns: ['mp4upload'],
        responsePatterns: [/mp4upload/i],
        headers: [],
        player: null
    }
},
{
    id: 'doodstream',
    name: 'DoodStream',
    extractor: 'DoodStreamExtractor.kt',
    confidence: 0,
    signals: {
        domains: ['doodstream', 'dood.to', 'dood.so', 'dood.ws', 'dood.pm'],
        urlPatterns: [/dood/i, /\/e\//i, /\/d\//i],
        jsPatterns:  ['dood', 'doodstream'],
        responsePatterns: [/dood/i],
        headers: [],
        player: null
    }
},
{
    id: 'streamtape',
    name: 'StreamTape',
    extractor: 'StreamTapeExtractor.kt',
    confidence: 0,
    signals: {
        domains: ['streamtape', 'streamtape.com', 'streamtape.to'],
        urlPatterns: [/streamtape/i, /\/e\//i],
        jsPatterns: ['streamtape'],
        responsePatterns: [/streamtape/i],
        headers: [],
        player: null
    }
},
{
    id: 'jwplayer',
    name: 'JW Player',
    extractor: 'PlaylistUtils',
    confidence: 0,
    signals: {
        domains: ['jwplatform', 'jwpcdn', 'jwplayer'],
        urlPatterns: [/jwplatform/i, /jwpcdn/i, /jwplayer/i],
        jsPatterns: ['jwplayer', 'jw-platform'],
        responsePatterns: [/jwplayer/i],
        headers: [],
        player: 'JW Player'
    }
},
{
    id: 'hlsjs_direct',
    name: 'HLS.js Direct',
    extractor: 'Direct M3U8',
    confidence: 0,
    signals: {
        domains: [],
        urlPatterns: [],
        jsPatterns: ['hls.js', 'hls.min.js', 'new Hls('],
        responsePatterns: [],
        headers: [],
        player: 'HLS.js'
    }
},
{
    id: 'custom_nextjs',
    name: 'Custom Next.js API',
    extractor: null,
    confidence: 0,
    signals: {
        domains: [],
        urlPatterns: [/_next\//i, /api\/trpc\//i],
        jsPatterns: ['NEXT_DATA', 'next/router'],
        responsePatterns: [/"pageProps"/i],
        headers: [],
        player: null
    }
},
{
    id: 'custom_nuxt',
    name: 'Custom Nuxt.js API',
    extractor: null,
    confidence: 0,
    signals: {
        domains: [],
        urlPatterns: [/_nuxt\//i, /__nuxt/i],
        jsPatterns: ['NUXT', 'nuxt'],
        responsePatterns: [/"NUXT"/i],
        headers: [],
        player: null
    }
}
            ];
            // --- Known Providers for Comparison ---
            const KNOWN_PROVIDERS = [
                {
                    id: 'animepahe',
                    name: 'AnimePahe',
                    features: { search: true, episodes: true, servers: true, manifest: true, proxy: false, cloudflare: false, jwt: false, aes: false, cookies: false, referer: true, origin: false, iframe: false, hls: true, dash: false },
                    apis: ['Search', 'Anime Detail', 'Episodes', 'Video Resolver'],
                    lines: 85
                },
{
    id: 'hianime',
    name: 'HiAnime',
    features: { search: true, episodes: true, servers: true, manifest: true, proxy: true, cloudflare: true, jwt: false, aes: true, cookies: true, referer: true, origin: true, iframe: true, hls: true, dash: false },
    apis: ['Search', 'Anime Detail', 'Episodes', 'Video Resolver', 'Proxy'],
    lines: 220
},
{
    id: 'gogoanime',
    name: 'GogoAnime',
    features: { search: true, episodes: true, servers: true, manifest: true, proxy: false, cloudflare: false, jwt: false, aes: true, cookies: false, referer: true, origin: false, iframe: true, hls: true, dash: false },
    apis: ['Search', 'Anime Detail', 'Episodes', 'Video Resolver'],
    lines: 150
},
{
    id: 'aniwave',
    name: 'AniWave',
    features: { search: true, episodes: true, servers: true, manifest: true, proxy: true, cloudflare: true, jwt: false, aes: true, cookies: true, referer: true, origin: true, iframe: true, hls: true, dash: false },
    apis: ['Search', 'Anime Detail', 'Episodes', 'Video Resolver', 'Proxy'],
    lines: 280
},
{
    id: 'allanime',
    name: 'AllAnime',
    features: { search: true, episodes: true, servers: true, manifest: true, proxy: false, cloudflare: false, jwt: false, aes: false, cookies: false, referer: false, origin: false, iframe: false, hls: true, dash: false },
    apis: ['Search', 'Anime Detail', 'Episodes', 'Video Resolver'],
    lines: 120
},
{
    id: 'zoro',
    name: 'Zoro',
    features: { search: true, episodes: true, servers: true, manifest: true, proxy: true, cloudflare: true, jwt: false, aes: true, cookies: true, referer: true, origin: true, iframe: true, hls: true, dash: false },
    apis: ['Search', 'Anime Detail', 'Episodes', 'Video Resolver', 'Proxy'],
    lines: 240
}
            ];
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
                    this.bodyCaptureErrors = [];
                    this.bodyCaptureCount = 0;
                    this.allIntercepted = []; // <-- ADDED: Accumulator for final reconciliation pass
                }
                CAPTURE_MIMES = [
                    'application/json', 'application/vnd.apple.mpegurl', 'application/x-mpegurl',
                    'audio/x-mpegurl', 'application/dash+xml', 'text/html', 'text/plain'
                ];
                CAPTURE_URL_PATTERNS = [
                    '/api/', '.m3u8', '.mpd', '.mp4', '/stream', '/video', '/source', '/server', '/embed', '/resolve', '/proxy', '/pipe'
                ];
                shouldCaptureBody(url, mimeType) {
                    const lowerUrl = (url || '').toLowerCase();
                    const lowerMime = (mimeType || '').toLowerCase();
                    if (this.CAPTURE_MIMES.some(m => lowerMime.includes(m))) return true;
                    if (this.CAPTURE_URL_PATTERNS.some(p => lowerUrl.includes(p))) return true;
                    return false;
                }
                attachBodyFilter(requestId, url, mimeType) {
                    if (!this.shouldCaptureBody(url, mimeType)) return;
                    if (!browser.webRequest || typeof browser.webRequest.filterResponseData !== 'function') return;
                    try {
                        const filter = browser.webRequest.filterResponseData(requestId);
                        const chunks = [];
                        let totalSize = 0;
                        let aborted = false; // Flag to stop saving to memory if it exceeds 1MB
                        filter.ondata = (event) => {
                            totalSize += event.data.byteLength;
                            // 1MB Hard Limit Protection: If it exceeds 1MB, stop saving to memory.
                            // We still call filter.write() so the browser can render/download the file normally.
                            if (!aborted && totalSize <= MAX_BODY) {
                                // IMPORTANT: Clone the ArrayBuffer using Uint8Array, otherwise the browser
                                // might recycle the memory buffer before onstop fires, resulting in corrupted data.
                                chunks.push(new Uint8Array(event.data));
                            } else {
                                aborted = true;
                            }
                            filter.write(event.data);
                        };
                        filter.onstop = () => {
                            try {
                                if (chunks.length === 0) {
                                    filter.disconnect();
                                    return;
                                }
                                let capturedSize = 0;
                                for (const c of chunks) capturedSize += c.byteLength;
                                const combined = new Uint8Array(capturedSize);
                                let offset = 0;
                                for (const c of chunks) {
                                    combined.set(c, offset);
                                    offset += c.byteLength;
                                }
                                // Decode safely (fatal: false prevents crashes on weird binary characters)
                                const body = new TextDecoder('utf-8', { fatal: false }).decode(combined).substring(0, MAX_BODY);
                                this.bodyCaptureCount++;
                                this.mergeBodyByUrl(url, body, totalSize > MAX_BODY);
                            } catch (e) {
                                this.bodyCaptureErrors.push({ url: url.slice(0, 100), error: e.message });
                            } finally {
                                // CORRECT API METHOD (replaces filter.close())
                                filter.disconnect();
                            }
                        };
                        filter.onerror = () => {
                            this.bodyCaptureErrors.push({ url: url.slice(0, 100), error: 'filter.onerror' });
                            try {
                                // CORRECT API METHOD
                                filter.disconnect();
                            } catch (e) {}
                        };
                    } catch (e) {
                        this.bodyCaptureErrors.push({ url: url.slice(0, 100), error: 'attach: ' + e.message });
                    }
                }
                mergeBodyByUrl(url, body, truncated) {
                    if (!body) return;
                    const normUrl = normalizeUrl(url);
                    if (!normUrl) return;
                    for (let i = this.rawRequests.length - 1; i >= 0; i--) {
                        const r = this.rawRequests[i];
                        if ((r.url === normUrl || r.rawUrl === url) && !r.body) {
                            r.body = body;
                            r.truncated = truncated;
                            const cls = this.classifyRequest(r);
                            if (cls.category !== r.category) {
                                r.category = cls.category;
                                r.playable = cls.playable || r.playable;
                                r.layer = this.classifyLayer(cls.category);
                                r.subLayer = SUB_LAYERS[cls.category] || 'Other';
                                r.apiRole = this.classifyApiRole(cls, r);
                            }
                            return;
                        }
                    }
                    for (const id of Object.keys(this.pendingById)) {
                        const p = this.pendingById[id];
                        if ((p.url === normUrl || p.rawUrl === url) && !p.body) {
                            p.body = body;
                            p.truncated = truncated;
                            return;
                        }
                    }
                }
                onRequestStarted(details) {
                    const normUrl = normalizeUrl(details.url);
                    if (!normUrl) return;
                    this.pendingById[details.requestId] = {
                        requestId: details.requestId, url: normUrl, rawUrl: details.url, method: details.method,
                        resourceType: details.type, pageUrl: this.currentPageUrl, startTime: details.timeStamp,
                        requestBody: extractRequestBody(details.requestBody), requestHeaders: {}, responseHeaders: {},
                        status: null, redirectURL: null, body: null, durationMs: null, error: null
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
                    const contentType = e.responseHeaders['content-type'] || '';
                    if (details.tabId === this.activeTabId) {
                        this.attachBodyFilter(details.requestId, e.url, contentType);
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
                    e.layer = this.classifyLayer(cls.category);
                    e.subLayer = SUB_LAYERS[cls.category] || 'Other';
                    e.apiRole = this.classifyApiRole(cls, e);
                    const key = `${e.method}:${e.url}`;
                    if (!this.networkDb[key]) {
                        this.networkDb[key] = { url: e.url, template: getRouteTemplate(e.url), method: e.method, type: e.resourceType, category: cls.category, purpose: cls.purpose, firstSeen: e.startTime, pages: [] };
                    }
                    if (e.pageUrl && !this.networkDb[key].pages.includes(e.pageUrl)) this.networkDb[key].pages.push(e.pageUrl);
                    let host = '';
                    try { host = new URL(e.url).hostname; } catch (err) {}
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

                // --- UPDATED: mergeIntercepted with fuzzy path matching and promotion of unmatched records ---
                mergeIntercepted(intercepted) {
                    if (!intercepted || !intercepted.length) return;
                    let patched = 0, added = 0;

                    for (const ic of intercepted) {
                        if (!ic || !ic.url) continue;
                        const norm = normalizeUrl(ic.url);
                        if (!norm) continue;
                        const method = (ic.method || 'GET').toUpperCase();

                        // --- Match pass 1: exact normalized URL + method ---
                        let match = null;
                        for (let i = this.rawRequests.length - 1; i >= 0; i--) {
                            const r = this.rawRequests[i];
                            if (r.method === method && (r.url === norm || r.rawUrl === ic.url)) { match = r; break; }
                        }

                        // --- Match pass 2: fuzzy — same path + method (survives query-string drift) ---
                        if (!match) {
                            let icPath = '';
                            try { icPath = new URL(norm).pathname; } catch (e) {}
                            if (icPath) {
                                for (let i = this.rawRequests.length - 1; i >= 0; i--) {
                                    const r = this.rawRequests[i];
                                    if (r.method !== method) continue;
                                    let rPath = '';
                                    try { rPath = new URL(r.url).pathname; } catch (e) {}
                                    if (rPath === icPath) { match = r; break; }
                                }
                            }
                        }

                        if (match) {
                            // Merge interceptor's depth into webRequest's skeleton
                            if (ic.body && !match.body) {
                                match.body = ic.body;
                                match.truncated = ic.truncated || false;
                                patched++;
                            }
                            if (ic.status && !match.status) match.status = ic.status;
                            if (ic.requestBody && !match.requestBody) match.requestBody = ic.requestBody;
                            if (ic.durationMs && !match.durationMs) match.durationMs = ic.durationMs;
                            if (ic.responseHeaders && Object.keys(ic.responseHeaders).length) {
                                match.responseHeaders = { ...(match.responseHeaders || {}), ...ic.responseHeaders };
                            }
                            if (ic.requestHeaders && Object.keys(ic.requestHeaders).length) {
                                // webRequest headers win on conflict (they're authoritative), interceptor fills gaps
                                match.requestHeaders = { ...ic.requestHeaders, ...(match.requestHeaders || {}) };
                            }
                            // Re-classify now that the body is present (lets us detect manifest/JSON by content)
                            const cls = this.classifyRequest(match);
                            if (cls.category !== match.category) {
                                match.category = cls.category;
                                match.playable = cls.playable || match.playable;
                                match.layer = this.classifyLayer(cls.category);
                                match.subLayer = SUB_LAYERS[cls.category] || 'Other';
                                match.apiRole = this.classifyApiRole(cls, match);
                            }
                        } else {
                            // --- No webRequest record: promote the interceptor entry to a first-class request ---
                            // The interceptor already has url+method+status+headers+body+timing, so nothing is lost.
                            const entry = {
                                requestId: 'ic_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
                                url: norm,
                                rawUrl: ic.url,
                                method: method,
                                resourceType: ic.via === 'xhr' ? 'xmlhttprequest' : 'fetch',
                                pageUrl: this.currentPageUrl,
                                startTime: ic.t || Date.now(),
                                requestBody: ic.requestBody || null,
                                requestHeaders: ic.requestHeaders || {},
                                responseHeaders: ic.responseHeaders || {},
                                status: ic.status || null,
                                redirectURL: null,
                                body: ic.body || null,
                                truncated: ic.truncated || false,
                                durationMs: ic.durationMs || null,
                                error: ic.error ? 'intercepted-error' : null,
                                fromInterceptor: true
                            };
                            this.finalizeRequest(entry); // classifies + registers in networkDb/apiGroups
                            added++;
                        }
                    }

                    this.bodyCaptureCount += patched + added;
                    console.log(`[MSA-bg] mergeIntercepted: patched ${patched} bodies, added ${added} interceptor-only requests (raw total: ${this.rawRequests.length})`);
                }

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
                classifyLayer(category) {
                    if (LAYER_1_DISCOVERY.includes(category)) return 1;
                    if (LAYER_2_RESOLUTION.includes(category)) return 2;
                    if (LAYER_3_PLAYBACK.includes(category)) return 3;
                    if (LAYER_4_METADATA.includes(category)) return 4;
                    return 5;
                }
                classifyApiRole(cls, e) {
                    const cat = cls.category;
                    const path = (() => { try { return new URL(e.url).pathname.toLowerCase(); } catch (err) { return ''; } })();
                    if (cat === 'Search API') return 'Search';
                    if (cat === 'Anime Details API') return 'Metadata';
                    if (cat === 'Episodes API') return 'Episode List';
                    if (cat === 'Servers API') return path.includes('server') ? 'Server Discovery' : 'Resolver';
                    if (cat === 'Proxy API') return 'Manifest Proxy';
                    if (cat === 'Embed') return 'Player Embed';
                    if (cat === 'Manifest') return 'Manifest';
                    if (cat === 'Video') return 'Direct Media';
                    if (cat === 'Subtitle API' || cat === 'Subtitle') return 'Subtitles';
                    if (cat === 'Comments') return 'Optional Metadata';
                    if (cat === 'Authentication') return 'Authentication';
                    if (cat === 'Analytics' || cat === 'Advertisement') return 'Ignore';
                    if (cat === 'Asset' || cat === 'Third-party Asset' || cat === 'Script' || cat === 'Third-party Script') return 'Ignore';
                    if (cat === 'Cloudflare') return 'Security';
                    if (path.includes('skip') || path.includes('aniskip')) return 'Optional Metadata';
                    if (path.includes('relation') || path.includes('recommend')) return 'Optional Metadata';
                    if (cat === 'General API') return 'Unknown';
                    return 'Other';
                }
                NOISE_CATEGORIES = ['Analytics', 'Advertisement', 'Asset', 'Third-party Asset', 'Script', 'Third-party Script', 'Cloudflare', 'Subtitle', 'Subtitle API', 'Comments', 'Authentication', 'Other'];
                getRequiredRequests() {
                    const required = [];
                    const supporting = [];
                    const seenReq = new Set();
                    const seenSup = new Set();
                    for (const r of this.rawRequests) {
                        if (/\.(ts|aac|m4s|woff2?|ttf|png|jpe?g|webp|gif|ico|css)(\?|$)/i.test(r.url)) continue;
                        const key = r.method + ' ' + getRouteTemplate(r.url);
                        if (MEDIA_PIPELINE.includes(r.category)) {
                            if (seenReq.has(key)) continue;
                            seenReq.add(key);
                            required.push({ method: r.method, template: getRouteTemplate(r.url), category: r.category, url: r.url, layer: r.layer, subLayer: r.subLayer, apiRole: r.apiRole });
                        } else if (!this.NOISE_CATEGORIES.includes(r.category)) {
                            if (seenSup.has(key)) continue;
                            seenSup.add(key);
                            supporting.push({ method: r.method, template: getRouteTemplate(r.url), category: r.category, url: r.url, layer: r.layer, subLayer: r.subLayer, apiRole: r.apiRole });
                        }
                    }
                    return { required, supporting };
                }
                buildDependencyGraph() {
                    const ORDER = { 'Search API': 1, 'Anime Details API': 2, 'Episodes API': 3, 'Servers API': 4, 'Proxy API': 5, 'Embed': 6, 'Manifest': 7, 'Video': 8 };
                    const { required } = this.getRequiredRequests();
                    const nodes = required
                    .filter(r => MEDIA_PIPELINE.includes(r.category))
                    .map(r => ({ ...r, stage: ORDER[r.category] !== undefined ? ORDER[r.category] : 9 }))
                    .sort((a, b) => a.stage - b.stage);
                    const chain = nodes.map((n, i) => ({
                        step: i + 1,
                        category: n.category,
                        method: n.method,
                        template: n.template,
                        apiRole: n.apiRole,
                        dependsOn: i > 0 ? nodes[i - 1].template : null,
                        feeds: i < nodes.length - 1 ? nodes[i + 1].template : 'Video()'
                    }));
                    const ascii = chain.map(n => `${n.method} ${n.template}   [${n.apiRole}]`).join('\n    ↓\n');
                    return { chain, ascii, totalCaptured: this.rawRequests.length, requiredCount: chain.length };
                }
                buildMediaChain() {
                    const graph = this.buildDependencyGraph();
                    const roles = graph.chain.map(n => n.apiRole);
                    const pipeline = [];
                    const ROLE_ORDER = ['Search', 'Metadata', 'Episode List', 'Server Discovery', 'Resolver', 'Manifest Proxy', 'Player Embed', 'Manifest', 'Direct Media'];
                    for (const role of ROLE_ORDER) {
                        if (roles.includes(role)) pipeline.push(role);
                    }
                    const ascii = pipeline.join('\n    ↓\n');
                    return { pipeline, ascii, complete: pipeline.includes('Manifest') || pipeline.includes('Direct Media') };
                }
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
                    const inferTokenType = (name, val) => {
                        if (/cf_clearance/i.test(name)) return { type: 'Cloudflare', purpose: 'Anti-bot', refresh: 'Challenge' };
                        if (/session|sid/i.test(name)) return { type: 'Session', purpose: 'Authentication', refresh: 'Login' };
                        if (jwtRegex.test(val)) return { type: 'JWT', purpose: 'API auth', refresh: 'Token endpoint' };
                        if (/token|auth/i.test(name)) return { type: 'Bearer', purpose: 'API auth', refresh: 'Unknown' };
                        return { type: 'Opaque', purpose: 'Unknown', refresh: 'Unknown' };
                    };
                    for (const r of this.rawRequests) {
                        const auth = r.requestHeaders && r.requestHeaders['authorization'];
                        if (auth) {
                            const val = auth.replace(/^Bearer\s+/i, '');
                            const c = classifyValue(val);
                            const key = 'auth:' + c.encoding;
                            if (!seen.has(key)) {
                                seen.add(key);
                                const tt = inferTokenType('authorization', val);
                                tokens.push({
                                    location: 'Authorization header', example: auth.slice(0, 30) + '…', ...c,
                                            source: c.encoding === 'JWT' ? 'Server-issued' : 'Unknown',
                                            tokenType: tt.type, purpose: tt.purpose, neededFor: 'API requests',
                                            generatedBy: 'Server', refresh: tt.refresh
                                });
                            }
                        }
                        const cookie = r.requestHeaders && r.requestHeaders['cookie'];
                        if (cookie) {
                            const pairs = cookie.split(';').map(c => c.trim()).filter(Boolean);
                            const sessionish = pairs.filter(p => /session|token|auth|sid|cf_clearance/i.test(p.split('=')[0]));
                            if (sessionish.length && !seen.has('cookie:' + sessionish.map(p => p.split('=')[0]).join(','))) {
                                seen.add('cookie:' + sessionish.map(p => p.split('=')[0]).join(','));
                                sessionish.forEach(pair => {
                                    const name = pair.split('=')[0];
                                    const val = pair.split('=').slice(1).join('=');
                                    const tt = inferTokenType(name, val);
                                    tokens.push({
                                        location: 'Cookie', example: name + '=…', encoding: 'opaque', expires: null,
                                        source: 'Set-Cookie from server',
                                        tokenType: tt.type, purpose: tt.purpose, neededFor: 'All requests',
                                        generatedBy: 'Server', refresh: tt.refresh
                                    });
                                });
                            }
                        }
                        try {
                            const u = new URL(r.url);
                            for (const [k, v] of u.searchParams) {
                                if (/^(token|key|sig|signature|auth|access_token|hash)$/i.test(k)) {
                                    const c = classifyValue(v);
                                    const key = 'param:' + k;
                                    if (!seen.has(key)) {
                                        seen.add(key);
                                        const tt = inferTokenType(k, v);
                                        tokens.push({
                                            location: `query param "${k}"`, example: v.slice(0, 24) + '…', ...c,
                                                    source: c.encoding === 'JWT' ? 'Server-issued' : 'Possibly JS-generated',
                                                    tokenType: tt.type, purpose: tt.purpose, neededFor: 'This endpoint',
                                                    generatedBy: c.encoding === 'JWT' ? 'Server' : 'Unknown', refresh: tt.refresh
                                        });
                                    }
                                }
                            }
                        } catch (e) {}
                    }
                    return tokens;
                }
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
                detectFramework() {
                    const frameworks = new Set();
                    const evidence = [];
                    this.results.forEach(r => {
                        if (r.frameworks && r.frameworks.result) {
                            r.frameworks.result.forEach(f => { frameworks.add(f); evidence.push(`DOM: ${f} detected on ${r.url}`); });
                        }
                    });
                    const allJsNames = this.jsInventory.map(j => (j.name || '').toLowerCase());
                    const allJsUrls = this.jsInventory.map(j => (j.url || '').toLowerCase());
                    const allUrls = this.rawRequests.map(r => r.url.toLowerCase());
                    if (allUrls.some(u => u.includes('/_app/immutable/') || u.includes('.svelte-kit')) || allJsNames.some(n => n.includes('svelte')) || allJsUrls.some(u => u.includes('svelte'))) {
                        frameworks.add('SvelteKit'); evidence.push('JS/URL: SvelteKit patterns detected');
                    }
                    if (allJsNames.some(n => n.includes('solid')) || allJsUrls.some(u => u.includes('solid-js'))) {
                        frameworks.add('Solid'); evidence.push('JS: Solid.js patterns detected');
                    }
                    if (allUrls.some(u => u.includes('/_astro/')) || allJsNames.some(n => n.includes('astro'))) {
                        frameworks.add('Astro'); evidence.push('URL/JS: Astro patterns detected');
                    }
                    if (allJsNames.some(n => n.includes('vue')) || allJsUrls.some(u => u.includes('vue'))) {
                        frameworks.add('Vue'); evidence.push('JS: Vue patterns detected');
                    }
                    if (allJsNames.some(n => n.includes('react')) || allJsUrls.some(u => u.includes('react'))) {
                        frameworks.add('React'); evidence.push('JS: React patterns detected');
                    }
                    let rendering = 'Unknown';
                    if (frameworks.has('Next.js') || frameworks.has('Nuxt.js') || frameworks.has('SvelteKit') || frameworks.has('Astro')) {
                        rendering = 'SSR + Hydration';
                    } else if (frameworks.has('React') || frameworks.has('Vue') || frameworks.has('Solid')) {
                        rendering = 'Client-rendered (SPA)';
                    }
                    const primary = frameworks.size > 0 ? Array.from(frameworks)[0] : 'Unknown';
                    const confidence = frameworks.size > 0 ? (evidence.length >= 3 ? 99 : evidence.length >= 2 ? 90 : 75) : 0;
                    return { frameworks: Array.from(frameworks), primary, confidence, rendering, evidence };
                }
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
                        usesCloudflare: has('Cloudflare'), usesJWT, usesAES: has('AES / Crypto'),
                        usesCookies, usesReferer, usesOrigin, usesWASM: has('WASM'),
                        usesBrowserFingerprint: has('Browser fingerprinting'), likelyMaintenance: maintenance
                    };
                }
                buildKotlinRecipe() {
                    const graph = this.buildDependencyGraph();
                    const steps = [];
                    let stepNum = 1;
                    const extractionHint = (category) => {
                        switch (category) {
                            case 'Search API': return 'extract slug';
                            case 'Anime Details API': return 'extract episode id';
                            case 'Episodes API': return 'extract episode id for target';
                            case 'Servers API': case 'Proxy API': return 'choose first server';
                            case 'Embed': return 'extract player URL from HTML';
                            case 'Manifest': return 'return Video(manifestUrl)';
                            default: return 'extract next value';
                        }
                    };
                    for (const node of graph.chain) {
                        steps.push({ step: stepNum++, action: `${node.method} ${node.template}`, category: node.category, apiRole: node.apiRole, extract: extractionHint(node.category) });
                    }
                    const ascii = steps.map(s => `${s.action}\n    ↓\n${s.extract}`).join('\n\n    ↓\n\n');
                    const { supporting } = this.getRequiredRequests();
                    const optionalApis = supporting.filter(s => s.layer === 4);
                    return { steps, ascii, optionalApis };
                }
                buildManifestProvenance() {
                    const manifests = this.rawRequests.filter(r => r.category === 'Manifest');
                    const provenances = [];
                    for (const m of manifests) {
                        const h = m.requestHeaders || {};
                        const rh = m.responseHeaders || {};
                        let finalHost = '';
                        try { finalHost = new URL(m.url).hostname; } catch (e) {}
                        const redirects = m.redirectURL ? 1 : 0;
                        provenances.push({
                            url: m.url.slice(0, 150),
                                         obtainedFrom: m.pageUrl || 'Unknown',
                                         method: m.method,
                                         returnedAs: rh['content-type'] || 'unknown',
                                         headersRequired: {
                                             cookie: !!h['cookie'],
                                             referer: !!h['referer'],
                                             origin: !!h['origin'],
                                             authorization: !!h['authorization']
                                         },
                                         redirects,
                                         finalHost,
                                         status: m.status
                        });
                    }
                    return provenances;
                }
                inferResponseSchema(obj, depth = 0) {
                    if (depth > 3) return '…';
                    if (obj === null || obj === undefined) return 'null';
                    if (Array.isArray(obj)) {
                        if (obj.length === 0) return '[]';
                        return `[${this.inferResponseSchema(obj[0], depth + 1)}]`;
                    }
                    if (typeof obj === 'object') {
                        const schema = {};
                        const keys = Object.keys(obj).slice(0, 10);
                        for (const k of keys) {
                            const v = obj[k];
                            if (typeof v === 'string') schema[k] = 'string';
                            else if (typeof v === 'number') schema[k] = Number.isInteger(v) ? 'int' : 'float';
                            else if (typeof v === 'boolean') schema[k] = 'bool';
                            else if (v === null) schema[k] = 'null';
                            else if (Array.isArray(v)) schema[k] = this.inferResponseSchema(v, depth + 1);
                            else if (typeof v === 'object') schema[k] = this.inferResponseSchema(v, depth + 1);
                        }
                        return schema;
                    }
                    return typeof obj;
                }
                buildResponseSchemas() {
                    const schemas = [];
                    const seen = new Set();
                    for (const r of this.rawRequests) {
                        if (!MEDIA_PIPELINE.includes(r.category) && r.category !== 'General API') continue;
                        if (!r.body) continue;
                        const template = getRouteTemplate(r.url);
                        const key = r.method + ' ' + template;
                        if (seen.has(key)) continue;
                        try {
                            const parsed = JSON.parse(r.body);
                            seen.add(key);
                            schemas.push({
                                method: r.method, template, category: r.category, apiRole: r.apiRole,
                                schema: this.inferResponseSchema(parsed),
                                         example: this.summarizeJson(parsed),
                                         bodySample: r.body.slice(0, 2000)
                            });
                        } catch (e) { /* not JSON */ }
                    }
                    return schemas;
                }
                buildKotlinDataModels() {
                    const models = [];
                    const schemas = this.buildResponseSchemas();
                    for (const s of schemas) {
                        if (!s.schema || typeof s.schema !== 'object' || Array.isArray(s.schema)) continue;
                        const className = this.toPascalCase(s.apiRole || s.category || 'Response');
                        const fields = [];
                        for (const [key, type] of Object.entries(s.schema)) {
                            const ktType = this.toKotlinType(type);
                            fields.push(`    val ${this.toCamelCase(key)}: ${ktType}`);
                        }
                        if (fields.length > 0) {
                            models.push({
                                className,
                                endpoint: `${s.method} ${s.template}`,
                                apiRole: s.apiRole,
                                kotlin: `data class ${className}(\n${fields.join(',\n')}\n)`
                            });
                        }
                    }
                    return models;
                }
                toPascalCase(str) {
                    return str.replace(/[^a-zA-Z0-9]/g, ' ').split(' ').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
                }
                toCamelCase(str) {
                    const pascal = this.toPascalCase(str);
                    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
                }
                toKotlinType(schemaType) {
                    if (schemaType === 'string') return 'String';
                    if (schemaType === 'int') return 'Int';
                    if (schemaType === 'float') return 'Double';
                    if (schemaType === 'bool') return 'Boolean';
                    if (schemaType === 'null') return 'String?';
                    if (typeof schemaType === 'string' && schemaType.startsWith('[')) return 'List<Any>';
                    if (typeof schemaType === 'object') return 'Map<String, Any>';
                    return 'Any';
                }
                buildDataFlowGraph() {
                    const flows = [];
                    const apiRequests = this.rawRequests.filter(r =>
                    (r.resourceType === 'xmlhttprequest' || r.resourceType === 'fetch') &&
                    MEDIA_PIPELINE.includes(r.category) && r.body
                    ).sort((a, b) => a.startTime - b.startTime);
                    const responseFields = [];
                    for (const r of apiRequests) {
                        try {
                            const parsed = JSON.parse(r.body);
                            const fields = this.extractFlatFields(parsed, '', 0);
                            responseFields.push({ request: r, fields, template: getRouteTemplate(r.url), apiRole: r.apiRole });
                        } catch (e) { /* not JSON */ }
                    }
                    for (let i = 1; i < apiRequests.length; i++) {
                        const current = apiRequests[i];
                        let currentParams = {};
                        try {
                            const u = new URL(current.url);
                            u.searchParams.forEach((v, k) => { currentParams[k] = v; });
                        } catch (e) {}
                        const pathSegments = (() => { try { return new URL(current.url).pathname.split('/').filter(Boolean); } catch (e) { return []; } })();
                        for (let j = 0; j < i; j++) {
                            const prev = responseFields[j];
                            if (!prev) continue;
                            for (const [fieldPath, fieldValue] of Object.entries(prev.fields)) {
                                const strVal = String(fieldValue);
                                if (strVal.length < 2 || strVal.length > 100) continue;
                                for (const [pk, pv] of Object.entries(currentParams)) {
                                    if (pv === strVal) {
                                        flows.push({
                                            value: strVal,
                                            from: { endpoint: `${prev.request.method} ${prev.template}`, field: fieldPath, apiRole: prev.apiRole },
                                            to: { endpoint: `${current.method} ${getRouteTemplate(current.url)}`, param: pk, apiRole: current.apiRole }
                                        });
                                    }
                                }
                                for (const seg of pathSegments) {
                                    if (seg === strVal) {
                                        flows.push({
                                            value: strVal,
                                            from: { endpoint: `${prev.request.method} ${prev.template}`, field: fieldPath, apiRole: prev.apiRole },
                                            to: { endpoint: `${current.method} ${getRouteTemplate(current.url)}`, param: 'path:' + seg, apiRole: current.apiRole }
                                        });
                                    }
                                }
                            }
                        }
                    }
                    const seen = new Set();
                    const unique = flows.filter(f => {
                        const key = f.value + f.from.endpoint + f.to.endpoint;
                        if (seen.has(key)) return false;
                        seen.add(key);
                        return true;
                    });
                    return unique.slice(0, 30);
                }
                extractFlatFields(obj, prefix, depth) {
                    const result = {};
                    if (depth > 3 || !obj || typeof obj !== 'object') return result;
                    if (Array.isArray(obj)) {
                        if (obj.length > 0 && typeof obj[0] === 'object') {
                            const sub = this.extractFlatFields(obj[0], prefix + '[]', depth + 1);
                            Object.assign(result, sub);
                        }
                        return result;
                    }
                    for (const [key, val] of Object.entries(obj)) {
                        const path = prefix ? `${prefix}.${key}` : key;
                        if (typeof val === 'string' || typeof val === 'number') {
                            result[path] = val;
                        } else if (val && typeof val === 'object') {
                            Object.assign(result, this.extractFlatFields(val, path, depth + 1));
                        }
                    }
                    return result;
                }
                buildHtmlDataSources() {
                    const sources = [];
                    for (const [url, html] of Object.entries(this.htmlSnapshots)) {
                        if (!html) continue;
                        const entry = { url, dataAttributes: [], inlineState: null };
                        const dataAttrRegex = /data-(id|anilist|slug|episode|server|anime|mal|key)="([^"]+)"/gi;
                        let match;
                        const seenAttrs = new Set();
                        while ((match = dataAttrRegex.exec(html)) !== null) {
                            const key = `data-${match[1]}="${match[2]}"`;
                            if (!seenAttrs.has(key)) {
                                seenAttrs.add(key);
                                entry.dataAttributes.push({ attr: `data-${match[1]}`, value: match[2] });
                            }
                        }
                        if (html.includes('__INITIAL_STATE__')) entry.inlineState = '__INITIAL_STATE__';
                        else if (html.includes('__NEXT_DATA__')) entry.inlineState = '__NEXT_DATA__';
                        else if (html.includes('__NUXT__')) entry.inlineState = '__NUXT__';
                        else if (html.includes('window.__data')) entry.inlineState = 'window.__data';
                        if (entry.dataAttributes.length > 0 || entry.inlineState) {
                            sources.push(entry);
                        }
                    }
                    return sources;
                }
                buildRedirectChains() {
                    const chains = [];
                    const redirects = this.rawRequests.filter(r => r.redirectURL || (r.status >= 300 && r.status < 400));
                    for (const r of redirects) {
                        if (!r.redirectURL) continue;
                        const chain = [{ url: r.url, status: r.status }];
                        let nextUrl = r.redirectURL;
                        let depth = 0;
                        while (nextUrl && depth < 5) {
                            const nextReq = this.rawRequests.find(nr => nr.url === nextUrl || nr.rawUrl === nextUrl);
                            if (nextReq) {
                                chain.push({ url: nextReq.url, status: nextReq.status });
                                nextUrl = nextReq.redirectURL || null;
                            } else {
                                chain.push({ url: nextUrl, status: 'final (not captured)' });
                                nextUrl = null;
                            }
                            depth++;
                        }
                        if (chain.length > 1) {
                            chains.push({ start: r.url, chain, finalHost: (() => { try { return new URL(chain[chain.length - 1].url).hostname; } catch (e) { return 'unknown'; } })() });
                        }
                    }
                    return chains;
                }
                buildEndpointStability() {
                    const endpoints = [];
                    const seen = new Set();
                    for (const r of this.rawRequests) {
                        const template = getRouteTemplate(r.url);
                        const key = r.method + ' ' + template;
                        if (seen.has(key)) continue;
                        seen.add(key);
                        let stability = 10;
                        if (r.category === 'Script' || r.category === 'Third-party Script') stability = 2;
                        else if (r.category === 'Asset' || r.category === 'Third-party Asset') stability = 3;
                        else if (r.category === 'Proxy API') stability = 6;
                        else if (r.category === 'Manifest') {
                            try {
                                const host = new URL(r.url).hostname;
                                if (host !== this.domain) stability = 7;
                            } catch (e) {}
                        }
                        else if (r.category === 'Search API' || r.category === 'Anime Details API' || r.category === 'Episodes API') stability = 10;
                        else if (r.category === 'Servers API') stability = 9;
                        else if (r.category === 'Cloudflare') stability = 4;
                        endpoints.push({
                            method: r.method, template, category: r.category,
                            apiRole: r.apiRole, stability: stability + '/10'
                        });
                    }
                    return endpoints.sort((a, b) => parseInt(b.stability) - parseInt(a.stability));
                }
                buildGeneratorHints() {
                    const hints = [];
                    const seen = new Set();
                    for (const r of this.rawRequests) {
                        const template = getRouteTemplate(r.url);
                        const key = r.method + ' ' + template;
                        if (seen.has(key)) continue;
                        seen.add(key);
                        const role = r.apiRole || 'Other';
                        const useInExtension = MEDIA_PIPELINE.includes(r.category) || r.category === 'General API';
                        const reason = useInExtension ? role : (this.NOISE_CATEGORIES.includes(r.category) ? 'Noise/Asset' : 'Optional metadata');
                        hints.push({
                            method: r.method, template, category: r.category, apiRole: role,
                            useInExtension: useInExtension ? 'YES' : 'NO',
                            purpose: useInExtension ? role : null,
                            reason: useInExtension ? null : reason
                        });
                    }
                    return hints;
                }
                buildEvidence() {
                    const evidence = {};
                    const jsReport = this.buildJsDependencyReport();
                    const playable = this.detectPlayableUrls();
                    const apiRequests = this.rawRequests.filter(r => (r.resourceType === 'xmlhttprequest' || r.resourceType === 'fetch'));
                    const jsonApis = apiRequests.filter(r => r.responseHeaders && (r.responseHeaders['content-type'] || '').includes('application/json'));
                    const ptEvidence = [];
                    if (playable.some(p => p.type === 'hls')) ptEvidence.push({ fact: 'application/vnd.apple.m3u8 requested', supports: true });
                    if (playable.some(p => p.type === 'dash')) ptEvidence.push({ fact: 'DASH manifest (.mpd) requested', supports: true });
                    if (playable.some(p => p.type === 'mp4')) ptEvidence.push({ fact: 'Direct .mp4 requested', supports: true });
                    if (this.rawRequests.some(r => r.category === 'Embed')) ptEvidence.push({ fact: 'iframe embed observed', supports: true });
                    if (playable.length === 0) ptEvidence.push({ fact: 'No media URL observed in session', supports: false });
                    evidence['Provider Type'] = {
                        conclusion: playable.length > 0 ? 'Media observed' : 'No media observed',
                        confidence: playable.length > 0 ? 97 : 30,
                        evidence: ptEvidence
                    };
                    const diffEvidence = [];
                    diffEvidence.push({ fact: `${jsonApis.length} JSON APIs observed`, supports: jsonApis.length > 0 });
                    diffEvidence.push({ fact: jsReport.some(j => j.contains.includes('webassembly')) ? 'WASM detected' : 'No WASM', supports: !jsReport.some(j => j.contains.includes('webassembly')) });
                    diffEvidence.push({ fact: jsReport.some(j => j.contains.includes('eval(')) ? 'eval() detected' : 'No eval()', supports: !jsReport.some(j => j.contains.includes('eval(')) });
                    diffEvidence.push({ fact: jsReport.some(j => j.contains.some(p => ['aes', 'cryptojs', 'decrypt'].includes(p))) ? 'AES/Crypto detected' : 'No AES/Crypto', supports: !jsReport.some(j => j.contains.some(p => ['aes', 'cryptojs', 'decrypt'].includes(p))) });
                    const hasPost = apiRequests.some(r => r.method === 'POST');
                    diffEvidence.push({ fact: hasPost ? 'POST resolver observed' : 'No POST requests', supports: true });
                    const bodiesCaptured = apiRequests.filter(r => r.body).length;
                    diffEvidence.push({ fact: `${bodiesCaptured}/${apiRequests.length} response bodies captured`, supports: bodiesCaptured > apiRequests.length * 0.5 });
                    evidence['Difficulty'] = {
                        conclusion: 'Based on observed complexity factors',
                        confidence: Math.round((bodiesCaptured / Math.max(1, apiRequests.length)) * 100),
                        evidence: diffEvidence
                    };
                    const replayEvidence = [];
                    const replay = this.buildReplayTest();
                    replayEvidence.push({ fact: `Required headers: ${replay.requiredHeaders.join(', ') || 'none'}`, supports: replay.requiredHeaders.length <= 1 });
                    replayEvidence.push({ fact: `Blockers: ${replay.blockers.length}`, supports: replay.blockers.length === 0 });
                    replay.blockers.forEach(b => replayEvidence.push({ fact: b, supports: false }));
                    evidence['Replayability'] = {
                        conclusion: replay.verdict,
                        confidence: replay.replayable ? 95 : 70,
                        evidence: replayEvidence
                    };
                    return evidence;
                }
                buildDimensionalScores() {
                    const stability = this.buildStabilityReport();
                    const replay = this.buildReplayTest();
                    const jsReport = this.buildJsDependencyReport();
                    const tokens = this.analyzeTokens();
                    const graph = this.buildDependencyGraph();
                    const categories = graph.chain.map(n => n.category);
                    const apiRequests = this.rawRequests.filter(r => (r.resourceType === 'xmlhttprequest' || r.resourceType === 'fetch'));
                    const hasJsonApi = apiRequests.some(r => r.responseHeaders && (r.responseHeaders['content-type'] || '').includes('application/json'));
                    const multipleApis = Object.keys(this.apiGroups).length > 2;
                    const usesAES = jsReport.some(j => j.contains.some(p => ['aes', 'cryptojs', 'decrypt'].includes(p)));
                    const usesWASM = jsReport.some(j => j.contains.includes('webassembly'));
                    const obfuscated = this.jsInventory.some(s => s.size && s.size > 50000 && s.avgLineLength && s.avgLineLength > 500);
                    const dynamicJs = jsReport.some(j => j.contains.some(p => ['fetch(', 'xmlhttprequest'].includes(p)));
                    const jsGeneratedToken = tokens.some(t => (t.source || '').includes('JS-generated'));
                    const usesFingerprint = stability.usesBrowserFingerprint;
                    const usesCookies = stability.usesCookies;
                    const usesReferer = stability.usesReferer;
                    const usesOrigin = stability.usesOrigin;
                    const usesCloudflare = stability.usesCloudflare;
                    const usesProxy = categories.includes('Proxy API');
                    const hasSearch = categories.includes('Search API');
                    const hasEpisodes = categories.includes('Episodes API');
                    const hasServers = categories.includes('Servers API');
                    const hasManifest = categories.includes('Manifest');
                    let reScore = 0;
                    const reReasons = [];
                    if (hasJsonApi) { reReasons.push({ factor: 'REST JSON APIs', points: 0, easy: true }); }
                    else { reScore += 1; reReasons.push({ factor: 'HTML parsing required', points: 1, easy: false }); }
                    if (multipleApis) { reScore += 1; reReasons.push({ factor: 'Multiple APIs', points: 1, easy: false }); }
                    if (dynamicJs) { reScore += 2; reReasons.push({ factor: 'Dynamic JS', points: 2, easy: false }); }
                    if (obfuscated) { reScore += 2; reReasons.push({ factor: 'Obfuscated JS', points: 2, easy: false }); }
                    if (usesAES) { reScore += 3; reReasons.push({ factor: 'AES encryption', points: 3, easy: false }); }
                    if (jsGeneratedToken) { reScore += 3; reReasons.push({ factor: 'JWT/token generation in JS', points: 3, easy: false }); }
                    if (usesWASM) { reScore += 4; reReasons.push({ factor: 'WASM module', points: 4, easy: false }); }
                    if (usesFingerprint) { reScore += 5; reReasons.push({ factor: 'Browser fingerprinting', points: 5, easy: false }); }
                    reScore = Math.min(10, reScore);
                    let implScore = 0;
                    const implReasons = [];
                    if (hasSearch) { implScore += 1; implReasons.push({ factor: 'Search endpoint', points: 1 }); }
                    if (hasEpisodes) { implScore += 1; implReasons.push({ factor: 'Episodes endpoint', points: 1 }); }
                    if (hasServers) { implScore += 1; implReasons.push({ factor: 'Servers endpoint', points: 1 }); }
                    if (hasManifest) { implScore += 1; implReasons.push({ factor: 'Manifest parsing', points: 1 }); }
                    if (usesCookies) { implScore += 2; implReasons.push({ factor: 'Cookie management', points: 2 }); }
                    if (usesReferer) { implScore += 2; implReasons.push({ factor: 'Referer header', points: 2 }); }
                    if (usesOrigin) { implScore += 2; implReasons.push({ factor: 'Origin header', points: 2 }); }
                    if (dynamicJs && !usesAES) { implScore += 3; implReasons.push({ factor: 'JS execution needed', points: 3 }); }
                    if (usesAES) { implScore += 4; implReasons.push({ factor: 'Crypto reproduction', points: 4 }); }
                    implScore = Math.min(10, implScore);
                    let maintScore = 0;
                    const maintReasons = [];
                    if (usesCloudflare) { maintScore += 3; maintReasons.push({ factor: 'Cloudflare protection', points: 3 }); }
                    if (this.thirdPartyCDNs.length > 2) { maintScore += 2; maintReasons.push({ factor: 'Rotating CDN domains', points: 2 }); }
                    if (usesProxy) { maintScore += 2; maintReasons.push({ factor: 'Frequent endpoint changes', points: 2 }); }
                    const shortLivedToken = tokens.some(t => t.expires && t.expires.includes('min'));
                    if (shortLivedToken) { maintScore += 2; maintReasons.push({ factor: 'Short-lived tokens', points: 2 }); }
                    if (usesFingerprint) { maintScore += 4; maintReasons.push({ factor: 'Fingerprinting updates', points: 4 }); }
                    maintScore = Math.min(10, maintScore);
                    let replayScore = 0;
                    const replayReasons = [];
                    if (replay.replayable) { replayScore = 1; replayReasons.push({ factor: 'Native HTTP replay possible', points: 0, easy: true }); }
                    else {
                        replayScore = 8;
                        replay.blockers.forEach(b => { replayScore += 1; replayReasons.push({ factor: b, points: 1, easy: false }); });
                    }
                    if (usesCloudflare) { replayScore += 2; replayReasons.push({ factor: 'Cloudflare session', points: 2, easy: false }); }
                    replayScore = Math.min(10, replayScore);
                    const totalDetections = 6;
                    let confidentDetections = 0;
                    if (hasSearch || hasEpisodes || hasServers) confidentDetections++;
                    if (hasManifest || this.detectPlayableUrls().length > 0) confidentDetections++;
                    if (Object.keys(this.apiGroups).length > 0) confidentDetections++;
                    if (this.rawRequests.length > 10) confidentDetections++;
                    if (this.results.length >= 3) confidentDetections++;
                    if (this.jsInventory.length > 0) confidentDetections++;
                    const confidence = Math.round((confidentDetections / totalDetections) * 100);
                    const overall = Math.round((reScore * 0.3 + implScore * 0.3 + maintScore * 0.2 + replayScore * 0.2));
                    return {
                        reverseEngineering: { score: reScore, reasons: reReasons },
                        implementation: { score: implScore, reasons: implReasons },
                        maintenance: { score: maintScore, reasons: maintReasons },
                        replayability: { score: replayScore, reasons: replayReasons },
                        confidence,
                        overall: Math.min(10, overall)
                    };
                }
                buildSplitReplayability() {
                    const playable = this.detectPlayableUrls();
                    const replay = this.buildReplayTest();
                    const playableStreamFound = playable.length > 0;
                    const mediaType = playable.some(p => p.type === 'hls') ? 'HLS'
                    : playable.some(p => p.type === 'dash') ? 'DASH'
                    : playable.some(p => p.type === 'mp4') ? 'MP4'
                    : playable.some(p => p.type === 'iframe') ? 'Iframe' : 'Unknown';
                    const nativeReplay = replay.replayable;
                    const replayMethod = nativeReplay ? 'Native HTTP' : 'Browser-assisted';
                    const reason = nativeReplay ? 'All requests reproducible with standard HTTP client'
                    : replay.blockers.length > 0 ? replay.blockers[0] : 'Unknown blocker';
                    return { playableStream: playableStreamFound, mediaType, replayMethod, nativeHttpReplay: nativeReplay, reason };
                }
                detectProviderFamily() {
                    const results = [];
                    const allUrls = this.rawRequests.map(r => r.url.toLowerCase());
                    const allHosts = new Set();
                    this.rawRequests.forEach(r => { try { allHosts.add(new URL(r.url).hostname.toLowerCase()); } catch (e) {} });
                    this.thirdPartyCDNs.forEach(c => allHosts.add(c.domain.toLowerCase()));
                    const allBodies = this.rawRequests.map(r => (r.body || '').toLowerCase()).join(' ');
                    const allJsNames = this.jsInventory.map(j => (j.name || '').toLowerCase());
                    const allJsUrls = this.jsInventory.map(j => (j.url || '').toLowerCase());
                    const allJsPatterns = this.jsInventory.flatMap(j => j.patterns || []);
                    for (const family of PROVIDER_FAMILIES) {
                        let score = 0;
                        let maxScore = 0;
                        const evidence = [];
                        maxScore += family.signals.domains.length * 30;
                        for (const d of family.signals.domains) {
                            for (const host of allHosts) {
                                if (host.includes(d)) { score += 30; evidence.push(`Domain: ${host} contains "${d}"`); break; }
                            }
                        }
                        maxScore += family.signals.urlPatterns.length * 20;
                        for (const pat of family.signals.urlPatterns) {
                            if (allUrls.some(u => pat.test(u))) { score += 20; evidence.push(`URL pattern: ${pat}`); }
                        }
                        maxScore += family.signals.jsPatterns.length * 15;
                        for (const jp of family.signals.jsPatterns) {
                            if (allJsNames.some(n => n.includes(jp)) || allJsUrls.some(u => u.includes(jp)) || allJsPatterns.includes(jp)) {
                                score += 15; evidence.push(`JS: "${jp}"`);
                            }
                        }
                        maxScore += family.signals.responsePatterns.length * 10;
                        for (const rp of family.signals.responsePatterns) {
                            if (rp.test(allBodies)) { score += 10; evidence.push(`Response: ${rp}`); }
                        }
                        const confidence = maxScore > 0 ? Math.min(99, Math.round((score / maxScore) * 100)) : 0;
                        if (confidence >= 20) {
                            results.push({ id: family.id, name: family.name, extractor: family.extractor, player: family.signals.player, confidence, evidence });
                        }
                    }
                    const frameworks = new Set();
                    this.results.forEach(r => {
                        if (r.frameworks && r.frameworks.result) r.frameworks.result.forEach(f => frameworks.add(f));
                    });
                        if (frameworks.has('Next.js') && !results.some(r => r.id === 'custom_nextjs')) {
                            results.push({ id: 'custom_nextjs', name: 'Custom Next.js API', extractor: null, player: null, confidence: 60, evidence: ['Next.js framework detected'] });
                        }
                        if (frameworks.has('Nuxt.js') && !results.some(r => r.id === 'custom_nuxt')) {
                            results.push({ id: 'custom_nuxt', name: 'Custom Nuxt.js API', extractor: null, player: null, confidence: 60, evidence: ['Nuxt.js framework detected'] });
                        }
                        const playerDetected = allJsPatterns.includes('hls') || allJsNames.some(n => n.includes('hls')) ? 'HLS.js'
                        : allJsPatterns.includes('jwplayer') || allJsNames.some(n => n.includes('jwplayer')) ? 'JW Player'
                        : allJsPatterns.includes('vidstack') ? 'Vidstack' : null;
                        results.sort((a, b) => b.confidence - a.confidence);
                        let primary;
                        if (results.length > 0) {
                            primary = results[0];
                        } else {
                            primary = {
                                id: 'custom', name: 'No known match', extractor: null, player: playerDetected,
                                confidence: 82, likely: 'Custom implementation',
                                evidence: ['No known provider family signatures matched', 'Likely a custom or less common provider']
                            };
                        }
                        return { primary, all: results, playerDetected, noMatch: results.length === 0 };
                }
                buildTokenSourceChain() {
                    const chains = [];
                    const playable = this.detectPlayableUrls();
                    const tokens = this.analyzeTokens();
                    const jsReport = this.buildJsDependencyReport();
                    for (const p of playable) {
                        const chain = [];
                        chain.push({ step: 1, description: `Playable URL found: ${p.type.toUpperCase()}`, detail: p.url.slice(0, 120) + (p.url.length > 120 ? '…' : '') });
                        const serverApis = this.rawRequests.filter(r =>
                        (r.category === 'Servers API' || r.category === 'Proxy API' || r.category === 'Embed') && r.pageUrl === p.pageUrl
                        );
                        if (serverApis.length > 0) {
                            const api = serverApis[0];
                            chain.push({ step: 2, description: `Generated by ${api.method} ${getRouteTemplate(api.url)}`, detail: `[${api.category}]` });
                            const ct = (api.responseHeaders || {})['content-type'] || '';
                            if (ct.includes('json') || (api.body && api.body.trim().startsWith('{'))) {
                                chain.push({ step: 3, description: 'Returned as JSON', detail: 'Parse JSON body for URL field' });
                            } else if (ct.includes('html') || (api.body && api.body.includes('<'))) {
                                chain.push({ step: 3, description: 'Returned as HTML (embed)', detail: 'Extract URL from HTML/JS' });
                            } else {
                                chain.push({ step: 3, description: 'Returned as raw text', detail: 'URL in body directly' });
                            }
                        } else {
                            chain.push({ step: 2, description: 'Source API not captured', detail: 'May be constructed in JS or embed' });
                        }
                        const playerJs = jsReport.find(j => j.contains.some(c => ['hls', 'm3u8', 'manifest', 'player'].includes(c)));
                        if (playerJs) {
                            chain.push({ step: chain.length + 1, description: `Constructed in ${playerJs.file}`, detail: playerJs.verdict });
                        } else {
                            chain.push({ step: chain.length + 1, description: 'No JS construction', detail: 'URL returned directly from API' });
                        }
                        if (p.requiresAuth) {
                            const jwtToken = tokens.find(t => t.encoding === 'JWT');
                            if (jwtToken) {
                                chain.push({ step: chain.length + 1, description: 'JWT appended', detail: jwtToken.expires ? `Expires: ${jwtToken.expires}` : 'Expiry unknown' });
                            } else {
                                chain.push({ step: chain.length + 1, description: 'Auth header required', detail: 'Authorization must be present' });
                            }
                        }
                        if (p.requiresReferer) {
                            chain.push({ step: chain.length + 1, description: 'Referer required', detail: 'Must set Referer to page URL' });
                        }
                        const provenance = {
                            tokenSource: serverApis.length > 0 ? 'API response' : (playerJs ? 'JS construction' : 'Unknown'),
                            lifetime: p.staticUrl ? 'Static (reusable)' : 'Session (per-request)',
                            generatedBy: serverApis.length > 0 ? 'Server' : (playerJs ? 'Client JS' : 'Unknown'),
                            replay: !p.requiresAuth && p.staticUrl ? 'YES' : 'NO'
                        };
                        chains.push({ playableType: p.type, pageUrl: p.pageUrl, chain, provenance });
                    }
                    if (chains.length === 0) {
                        const graph = this.buildDependencyGraph();
                        const genericChain = graph.chain.slice(-3).map((n, i) => ({
                            step: i + 1, description: `${n.method} ${n.template}`, detail: `[${n.category}] → feeds ${n.feeds}`
                        }));
                        chains.push({ playableType: 'unknown', pageUrl: null, chain: genericChain, provenance: { tokenSource: 'Unknown', lifetime: 'Unknown', generatedBy: 'Unknown', replay: 'Unknown' } });
                    }
                    return chains;
                }
                buildRequestImportance() {
                    const critical = [];
                    const seen = new Set();
                    let num = 1;
                    for (const r of this.rawRequests) {
                        if (!MEDIA_PIPELINE.includes(r.category)) continue;
                        const key = r.method + ' ' + getRouteTemplate(r.url);
                        if (seen.has(key)) continue;
                        seen.add(key);
                        critical.push({ num: num++, method: r.method, template: getRouteTemplate(r.url), category: r.category, layer: r.layer, apiRole: r.apiRole });
                    }
                    const ignoredCategories = {};
                    for (const r of this.rawRequests) {
                        if (MEDIA_PIPELINE.includes(r.category)) continue;
                        if (!ignoredCategories[r.category]) ignoredCategories[r.category] = 0;
                        ignoredCategories[r.category]++;
                    }
                    const ignored = Object.entries(ignoredCategories).map(([cat, count]) => ({ category: cat, count })).sort((a, b) => b.count - a.count);
                    return { critical, ignored, totalRequests: this.rawRequests.length, criticalCount: critical.length };
                }
                buildRequestTemplates() {
                    const templates = [];
                    const seen = new Set();
                    for (const r of this.rawRequests) {
                        if (!MEDIA_PIPELINE.includes(r.category)) continue;
                        const template = getRouteTemplate(r.url);
                        const key = r.method + ' ' + template;
                        if (seen.has(key)) continue;
                        seen.add(key);
                        const headers = {};
                        const h = r.requestHeaders || {};
                        if (h['referer']) headers['Referer'] = h['referer'];
                        if (h['origin']) headers['Origin'] = h['origin'];
                        if (h['authorization']) headers['Authorization'] = h['authorization'].slice(0, 40) + '…';
                        if (h['cookie']) {
                            const cookieNames = h['cookie'].split(';').map(c => c.trim().split('=')[0]).filter(Boolean);
                            headers['Cookie'] = cookieNames.map(n => n + '=…').join('; ');
                        }
                        if (h['content-type']) headers['Content-Type'] = h['content-type'];
                        if (h['x-requested-with']) headers['X-Requested-With'] = h['x-requested-with'];
                        let responseSummary = null;
                        let responseBodySample = null;
                        if (r.body) {
                            responseBodySample = r.body.slice(0, 2000);
                            try {
                                const parsed = JSON.parse(r.body);
                                responseSummary = this.summarizeJson(parsed);
                            } catch (e) {
                                if (r.body.includes('#EXTM3U')) responseSummary = 'HLS Manifest (text)';
                                else if (r.body.includes('<MPD')) responseSummary = 'DASH Manifest (XML)';
                                else responseSummary = r.body.slice(0, 300) + (r.body.length > 300 ? '…' : '');
                            }
                        }
                        templates.push({
                            method: r.method, template, category: r.category, apiRole: r.apiRole, url: r.url.slice(0, 200),
                                       headers, requestBody: r.requestBody ? r.requestBody.slice(0, 500) : null,
                                       responseStatus: r.status, responseSummary, responseBodySample,
                                       pagesObserved: (this.networkDb[r.method + ':' + r.url] && this.networkDb[r.method + ':' + r.url].pages) || []
                        });
                    }
                    return templates;
                }
                summarizeJson(obj, depth = 0) {
                    if (depth > 2) return '…';
                    if (Array.isArray(obj)) {
                        if (obj.length === 0) return '[]';
                        return `[${obj.length} items] e.g. ` + this.summarizeJson(obj[0], depth + 1);
                    }
                    if (obj && typeof obj === 'object') {
                        const keys = Object.keys(obj).slice(0, 8);
                        const summary = {};
                        for (const k of keys) {
                            const v = obj[k];
                            if (typeof v === 'string') summary[k] = v.length > 50 ? v.slice(0, 50) + '…' : v;
                            else if (typeof v === 'number' || typeof v === 'boolean') summary[k] = v;
                            else if (Array.isArray(v)) summary[k] = `[${v.length}]`;
                            else if (v && typeof v === 'object') summary[k] = '{…}';
                            else summary[k] = String(v);
                        }
                        return JSON.stringify(summary);
                    }
                    return String(obj);
                }
                buildConfidenceScores() {
                    const scores = {};
                    const apiGroups = this.apiGroups;
                    scores['Search API'] = apiGroups['Search'] ? 99 : 0;
                    scores['Episode API'] = apiGroups['Episodes'] ? 100 : 0;
                    scores['Servers API'] = (apiGroups['Video Resolver'] || apiGroups['Proxy']) ? 95 : 0;
                    scores['Manifest'] = this.rawRequests.some(r => r.category === 'Manifest') ? 100 : 0;
                    const red = this.detectRedFlags();
                    scores['Cloudflare'] = red.some(f => f.flag === 'Cloudflare') ? 100 : 0;
                    scores['JWT'] = red.some(f => f.flag === 'JWT / Bearer auth') ? 85 : 4;
                    scores['AES'] = red.some(f => f.flag === 'AES / Crypto') ? 90 : 4;
                    scores['WASM'] = red.some(f => f.flag === 'WASM') ? 95 : 2;
                    const fam = this.detectProviderFamily();
                    scores['Provider Family'] = fam.primary ? fam.primary.confidence : 0;
                    return scores;
                }
                buildImplementationEstimate() {
                    const dims = this.buildDimensionalScores();
                    const graph = this.buildDependencyGraph();
                    const categories = graph.chain.map(n => n.category);
                    const jsReport = this.buildJsDependencyReport();
                    const usesAES = jsReport.some(j => j.contains.some(p => ['aes', 'cryptojs', 'decrypt'].includes(p)));
                    const usesWASM = jsReport.some(j => j.contains.includes('webassembly'));
                    const dynamicJs = jsReport.some(j => j.contains.some(p => ['fetch(', 'xmlhttprequest'].includes(p)));
                    let lines = 40;
                    if (categories.includes('Search API')) lines += 15;
                    if (categories.includes('Anime Details API')) lines += 15;
                    if (categories.includes('Episodes API')) lines += 15;
                    if (categories.includes('Servers API')) lines += 20;
                    if (categories.includes('Proxy API')) lines += 25;
                    if (categories.includes('Embed')) lines += 20;
                    if (categories.includes('Manifest')) lines += 10;
                    if (this.detectPlayableUrls().some(p => p.requiresAuth)) lines += 15;
                    if (this.detectPlayableUrls().some(p => p.requiresReferer)) lines += 5;
                    if (usesAES) lines += 60;
                    if (usesWASM) lines += 100;
                    if (dynamicJs && !usesAES) lines += 30;
                    const dependencies = ['OkHttp', 'Json'];
                    if (categories.includes('Manifest')) dependencies.push('PlaylistUtils');
                    if (usesAES) dependencies.push('CryptoJS / AES');
                    if (usesWASM) dependencies.push('WASM Runtime');
                    if (dynamicJs && !usesAES) dependencies.push('JS Engine (QuickJS)');
                    if (this.detectPlayableUrls().some(p => p.requiresAuth)) dependencies.push('CookieJar');
                    let timeMinutes = 15;
                    timeMinutes += dims.reverseEngineering.score * 20;
                    timeMinutes += dims.implementation.score * 10;
                    if (usesAES) timeMinutes += 120;
                    if (usesWASM) timeMinutes += 180;
                    const timeStr = timeMinutes >= 60 ? `${Math.round(timeMinutes / 60)} hours` : `${timeMinutes} minutes`;
                    return { lines, dependencies, timeStr, timeMinutes };
                }
                buildProviderComparison() {
                    const stability = this.buildStabilityReport();
                    const graph = this.buildDependencyGraph();
                    const categories = graph.chain.map(n => n.category);
                    const playable = this.detectPlayableUrls();
                    const jsReport = this.buildJsDependencyReport();
                    const usesAES = jsReport.some(j => j.contains.some(p => ['aes', 'cryptojs', 'decrypt'].includes(p)));
                    const myFeatures = {
                        search: categories.includes('Search API'), episodes: categories.includes('Episodes API'),
                        servers: categories.includes('Servers API'), manifest: categories.includes('Manifest'),
                        proxy: categories.includes('Proxy API'), cloudflare: stability.usesCloudflare,
                        jwt: stability.usesJWT, aes: usesAES, cookies: stability.usesCookies,
                        referer: stability.usesReferer, origin: stability.usesOrigin,
                        iframe: categories.includes('Embed'), hls: playable.some(p => p.type === 'hls'),
                        dash: playable.some(p => p.type === 'dash')
                    };
                    let bestMatch = null, bestSimilarity = 0, bestShared = 0, bestTotal = 0;
                    for (const provider of KNOWN_PROVIDERS) {
                        let shared = 0, total = 0;
                        for (const key of Object.keys(myFeatures)) { total++; if (myFeatures[key] === provider.features[key]) shared++; }
                        const similarity = Math.round((shared / total) * 100);
                        if (similarity > bestSimilarity) { bestSimilarity = similarity; bestMatch = provider; bestShared = shared; bestTotal = total; }
                    }
                    let reuse = [], rewrite = [];
                    if (bestMatch) {
                        for (const key of Object.keys(myFeatures)) {
                            if (myFeatures[key] && bestMatch.features[key]) reuse.push(key);
                            else if (myFeatures[key] && !bestMatch.features[key]) rewrite.push(key);
                        }
                    }
                    const recommendation = bestMatch
                    ? (bestSimilarity >= 85 ? `Fork ${bestMatch.name} provider` : `Reference ${bestMatch.name}, rewrite ${rewrite.join(', ') || 'server resolver'}`)
                    : 'Build from scratch';
                    return { closestMatch: bestMatch ? bestMatch.name : 'None', similarity: bestSimilarity, sharedApis: `${bestShared}/${bestTotal}`, reuse, rewrite, recommendation };
                }
                buildFinalRecommendation() {
                    const dims = this.buildDimensionalScores();
                    const estimate = this.buildImplementationEstimate();
                    const comparison = this.buildProviderComparison();
                    const fam = this.detectProviderFamily();
                    const splitReplay = this.buildSplitReplayability();
                    let stars = 5;
                    if (dims.overall >= 7) stars = 2;
                    else if (dims.overall >= 5) stars = 3;
                    else if (dims.overall >= 3) stars = 4;
                    if (dims.maintenance >= 7) stars = Math.max(1, stars - 1);
                    if (!splitReplay.nativeHttpReplay) stars = Math.max(1, stars - 1);
                    const recommended = stars >= 3;
                    const positives = [], negatives = [];
                    if (dims.reverseEngineering.score <= 2) positives.push('Standard REST API');
                    if (splitReplay.mediaType === 'HLS') positives.push('direct HLS manifests');
                    if (!this.buildStabilityReport().usesJWT) positives.push('no JWT');
                    if (!this.buildStabilityReport().usesAES) positives.push('no cryptography');
                    if (splitReplay.nativeHttpReplay) positives.push('native HTTP replay');
                    if (this.buildStabilityReport().usesCloudflare) negatives.push('Cloudflare affects maintenance');
                    if (!splitReplay.nativeHttpReplay) negatives.push('browser-only execution detected');
                    if (dims.maintenance >= 6) negatives.push('high maintenance burden');
                    let reason = '';
                    if (positives.length) reason += positives.join(', ') + '. ';
                    if (negatives.length) reason += negatives.join('; ') + '.';
                    if (!reason) reason = 'Standard provider with moderate complexity.';
                    return {
                        stars, recommended, difficulty: dims.overall, maintenance: dims.maintenance,
                        estimatedBuildTime: estimate.timeStr, reusableCode: comparison.similarity + '%',
                        existingExtractor: fam.primary && fam.primary.extractor ? fam.primary.extractor : 'None', reason
                    };
                }
                buildProviderSignature() {
                    const replay = this.buildReplayTest();
                    const stability = this.buildStabilityReport();
                    const playable = this.detectPlayableUrls();
                    const dims = this.buildDimensionalScores();
                    let finalOutput = 'unknown';
                    let providerType = 'Unknown';
                    if (playable.some(p => p.type === 'hls')) { finalOutput = 'm3u8'; }
                    else if (playable.some(p => p.type === 'dash')) { finalOutput = 'mpd'; }
                    else if (playable.some(p => p.type === 'mp4')) { finalOutput = 'mp4'; }
                    const hasIframe = playable.some(p => p.type === 'iframe') || this.rawRequests.some(r => r.category === 'Embed');
                    if (finalOutput !== 'unknown') {
                        providerType = hasIframe ? `Iframe → ${finalOutput.toUpperCase()}` : `Direct → ${finalOutput.toUpperCase()}`;
                    } else if (hasIframe) {
                        providerType = 'Iframe → UNKNOWN (no media observed)';
                    } else {
                        providerType = 'UNKNOWN (no media URL observed)';
                    }
                    const playableStreamFound = playable.length > 0;
                    const providerReplayable = replay.replayable;
                    return {
                        providerType, difficulty: dims.overall,
                        difficultyBreakdown: dims.reverseEngineering.reasons.concat(dims.implementation.reasons),
                        stability: Math.max(1, 10 - dims.maintenance),
                        requiredHeaders: replay.requiredHeaders, requiredCookies: replay.requiredCookies,
                        usesCloudflare: stability.usesCloudflare, usesJWT: stability.usesJWT, usesAES: stability.usesAES,
                        finalOutput, playableStreamFound, providerReplayable, replayable: providerReplayable,
                        dimensionalScores: dims
                    };
                }
                buildRequestLayers() {
                    const layers = { 1: [], 2: [], 3: [], 4: [], 5: [] };
                    const seen = new Set();
                    for (const r of this.rawRequests) {
                        const key = r.method + ' ' + getRouteTemplate(r.url);
                        if (seen.has(key)) continue;
                        seen.add(key);
                        const layer = r.layer || 5;
                        layers[layer].push({ method: r.method, template: getRouteTemplate(r.url), category: r.category, subLayer: r.subLayer, apiRole: r.apiRole });
                    }
                    return {
                        layer1_discovery: layers[1],
                        layer2_resolution: layers[2],
                        layer3_playback: layers[3],
                        layer4_metadata: layers[4],
                        layer5_assets: layers[5]
                    };
                }
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
                        pagesAnalyzed: this.results.length, queueLength: this.queue.length,
                        detectedApis: Object.values(this.apiGroups).flat().length,
                        networkRequests: this.rawRequests.length,
                        foundTypes: Array.from(this.visitedTypes), rejectedLinks: this.rejectedLinks.length
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
                            const tabStartTime = Date.now();
                            const MAX_TAB_TIME = 50000; // 50 seconds hard limit per tab
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
                            const isWatchPage = item.url.includes('/watch') || item.url.includes('/episode');
                            const waitTime = isWatchPage ? 15000 : 6000;
                            await new Promise(r => setTimeout(r, waitTime));
                            await this.updateProgress("Running detectors", item.url);
                            let pageData = {};
                            try {
                                const executePromise = browser.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
                                // Calculate remaining time to ensure the TOTAL tab time doesn't exceed 50s
                                const elapsed = Date.now() - tabStartTime;
                                const remainingTime = Math.max(2000, MAX_TAB_TIME - elapsed);
                                const timeoutPromise = new Promise((_, reject) =>
                                setTimeout(() => reject(new Error(`Tab execution timeout (limit: ${MAX_TAB_TIME/1000}s)`)), remainingTime)
                                );
                                // Race the script execution against the 50s hard limit
                                const results = await Promise.race([executePromise, timeoutPromise]);
                                pageData = results[0].result || {};
                            } catch (e) {
                                console.error('[MSA-bg] executeScript FAILED or TIMEOUT:', e);
                                await browser.storage.local.set({ msaError: `Detector timeout/failed: ${e.message}` });
                            }
                            // === NEW DIAGNOSTIC LOG ===
                            console.log('[MSA-bg] content.js result:', JSON.stringify({
                                url: pageData.url,
                                error: pageData.error || null,
                                linksCount: pageData.links ? pageData.links.length : 'MISSING',
                                linksSample: pageData.links ? pageData.links.slice(0, 3) : 'MISSING',
                                                                                      interceptedCount: pageData.intercepted ? pageData.intercepted.length : 'MISSING',
                                                                                      interceptedSample: pageData.intercepted && pageData.intercepted.length > 0 ?
                                                                                      { url: pageData.intercepted[0].url, hasBody: !!pageData.intercepted[0].body, bodyLen: pageData.intercepted[0].body ? pageData.intercepted[0].body.length : 0 } : 'EMPTY',
                                                                                      pageType: pageData.pageType || 'unknown'
                            }));

                            // --- UPDATED: Accumulate and merge intercepted requests ---
                            const pageIntercepted = pageData.intercepted || [];
                            this.allIntercepted.push(...pageIntercepted);
                            this.mergeIntercepted(pageIntercepted);

                            if (pageData.htmlSnapshot) this.htmlSnapshots[item.url] = pageData.htmlSnapshot;
                            if (pageData.detectors && pageData.detectors.jsInventory) this.jsInventory.push(...pageData.detectors.jsInventory);
                            await this.updateProgress("Classifying page", item.url);
                            const classification = this.classifyPage(item.url, pageData, item.predictedType);
                            if (!this.visitedTypes.has(classification.type)) this.visitedTypes.add(classification.type);
                            this.crawlGraph.push({ from: item.parentUrl, to: item.url, type: classification.type, selector: item.selector, text: item.text, depth: item.depth });
                            const pageRecord = {
                                url: item.url, routeTemplate: getRouteTemplate(item.url), queryParams: getQueryParams(item.url),
                                type: classification.type, family: classification.family, variant: classification.variant,
                                activeFilters: classification.activeFilters, confidence: classification.confidence, reasons: classification.reasons,
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
                            console.log('[MSA-bg] Processing links:', {
                                count: pageData.links ? pageData.links.length : 0,
                                isArray: Array.isArray(pageData.links),
                                        type: typeof pageData.links
                            });
                            for (const link of (pageData.links || [])) {
                                const prediction = this.predictLink(link.url, link.text);
                                this.addToQueue(link.url, prediction.score, prediction.type, item.url, classification.type, item.depth + 1, link.selector, link.text);
                            }
                            await browser.tabs.remove(tab.id);
                            this.activeTabId = null;
                            this.currentPageUrl = null;
                        }

                        // --- UPDATED: Final reconciliation pass for late-arriving bodies ---
                        await this.updateProgress("Reconciling response bodies", this.startUrl);
                        await new Promise(r => setTimeout(r, 2000));
                        // Final pass: re-merge everything so late-arriving bodies patch any webRequest
                        // entries that finalized AFTER their page's merge ran.
                        this.mergeIntercepted(this.allIntercepted);

                        await this.updateProgress("Generating report", this.startUrl);
                        const report = this.generateReport();
                        const har = this.generateHAR();
                        await browser.storage.local.set({
                            msaStatus: "complete", msaReport: report, msaHAR: har,
                            msaSnapshots: this.htmlSnapshots,
                            msaRaw: {
                                networkDb: this.networkDb, rawRequests: this.rawRequests,
                                apiGroups: this.apiGroups, thirdPartyCDNs: this.thirdPartyCDNs,
                                bodyCaptureCount: this.bodyCaptureCount,
                                bodyCaptureErrors: this.bodyCaptureErrors
                            },
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
                            startedDateTime: new Date(r.startTime).toISOString(), time: r.durationMs || 0,
                                                         request: req,
                                                         response: {
                                                             status: r.status || 0, statusText: '', httpVersion: 'HTTP/1.1',
                                                             cookies: [], headers: Object.entries(r.responseHeaders || {}).map(([name, value]) => ({ name, value })),
                                                         content: { size: (r.body || '').length, mimeType: (r.responseHeaders || {})['content-type'] || '', text: r.body || '' },
                                                         redirectURL: r.redirectURL || '', headersSize: -1, bodySize: -1
                                                         },
                                                         cache: {}, timings: { send: 0, wait: r.durationMs || 0, receive: 0 }, pageref: 'page_0'
                        };
                    });
                    return {
                        log: {
                            version: '1.2', creator: { name: 'Media Site Analyzer', version: '3.0.0' },
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
                        providerFamily: this.detectProviderFamily(),
                        frameworkDetection: this.detectFramework(),
                        dimensionalScores: this.buildDimensionalScores(),
                        splitReplayability: this.buildSplitReplayability(),
                        dependencyGraph: this.buildDependencyGraph(),
                        mediaChain: this.buildMediaChain(),
                        requiredRequests: this.getRequiredRequests(),
                        requestLayers: this.buildRequestLayers(),
                        requestImportance: this.buildRequestImportance(),
                        tokenAnalysis: this.analyzeTokens(),
                        tokenSourceChain: this.buildTokenSourceChain(),
                        manifestProvenance: this.buildManifestProvenance(),
                        requestTemplates: this.buildRequestTemplates(),
                        responseSchemas: this.buildResponseSchemas(),
                        kotlinDataModels: this.buildKotlinDataModels(),
                        dataFlowGraph: this.buildDataFlowGraph(),
                        htmlDataSources: this.buildHtmlDataSources(),
                        redirectChains: this.buildRedirectChains(),
                        endpointStability: this.buildEndpointStability(),
                        generatorHints: this.buildGeneratorHints(),
                        evidence: this.buildEvidence(),
                        jsDependencyReport: this.buildJsDependencyReport(),
                        replayTest: this.buildReplayTest(),
                        stabilityReport: this.buildStabilityReport(),
                        kotlinRecipe: this.buildKotlinRecipe(),
                        confidenceScores: this.buildConfidenceScores(),
                        implementationEstimate: this.buildImplementationEstimate(),
                        providerComparison: this.buildProviderComparison(),
                        finalRecommendation: this.buildFinalRecommendation()
                    };
                    const blueprint = this.generateBlueprint(providerIntelligence);
                    return {
                        meta: {
                            tool: "Media Site Analyzer", version: "3.0.0", schemaVersion: 12,
                            generatedAt: now.toISOString(), analysisDurationMs: duration,
                            domain: this.domain, startUrl: this.startUrl, filename,
                            bodyCaptureStats: {
                                captured: this.bodyCaptureCount,
                                errors: this.bodyCaptureErrors.length,
                                errorDetails: this.bodyCaptureErrors.slice(0, 10)
                            },
                            detectorsUsed: [
                                { name: "Framework Detector", version: "2.0" },
                                { name: "Metadata Detector", version: "1.3" },
                                { name: "DOM Detector", version: "1.9" },
                                { name: "Route Detector", version: "1.3" },
                                { name: "API Detector", version: "1.7" },
                                { name: "Network Recorder", version: "1.0" },
                                { name: "JS Inventory", version: "1.0" },
                                { name: "Flag Detector", version: "1.0" },
                                { name: "Provider Intelligence", version: "5.0" },
                                { name: "Provider Family Detector", version: "2.1" },
                                { name: "Token Source Tracer", version: "2.1" },
                                { name: "Request Template Extractor", version: "2.0" },
                                { name: "Dimensional Scorer", version: "1.1" },
                                { name: "Implementation Estimator", version: "1.0" },
                                { name: "Provider Comparator", version: "1.0" },
                                { name: "Request Layer Classifier", version: "1.0" },
                                { name: "API Role Classifier", version: "1.0" },
                                { name: "Media Chain Detector", version: "1.0" },
                                { name: "Manifest Provenance Tracer", version: "1.0" },
                                { name: "Response Schema Inferrer", version: "1.0" },
                                { name: "Endpoint Stability Scorer", version: "1.0" },
                                { name: "Generator Hint Builder", version: "1.0" },
                                { name: "Data Flow Tracer", version: "1.0" },
                                { name: "Kotlin Model Generator", version: "1.0" },
                                { name: "HTML Data Source Extractor", version: "1.0" },
                                { name: "Redirect Chain Tracer", version: "1.0" },
                                { name: "Evidence Builder", version: "1.0" },
                                { name: "Response Body Capture", version: "2.0" },
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
                            totalRequests: this.rawRequests.length, byCategory, playableUrls, redFlags, greenFlags,
                            jsInventory: this.jsInventory, harAvailable: true
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
                        recommendedOrder: order, knownLimitations: limitations, recommendedStrategy: strategy
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
