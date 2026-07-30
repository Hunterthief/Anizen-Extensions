// content.js — DOM detectors + JS inventory + HTML snapshot + intercepted harvest
// v2.5: Fully bypasses Firefox XPCNativeWrapper by serializing intercepted data to JSON in the MAIN world.
(async function () {
    const startUrl = window.location.href;
    const currentPath = window.location.pathname.toLowerCase();

    // ============================================================
    // MAIN WORLD ACCESS HELPER
    // ============================================================
    function callMainWorldFn(fnName) {
        try {
            const wjs = window.wrappedJSObject;
            if (wjs && typeof wjs[fnName] === 'function') {
                return wjs[fnName]();
            }
        } catch(e) {}
        return null;
    }

    // ============================================================
    // UTILITY
    // ============================================================
    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    function cleanSnapshot(html) {
        if (!html) return '';
        html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        html = html.replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '<svg/>');
        html = html.replace(/\son\w+="[^"]*"/gi, '');
        html = html.replace(/\s{2,}/g, ' ');
        return html.slice(0, 50000);
    }

    // ============================================================
    // FRAMEWORK DETECTION
    // ============================================================
    function detectFrameworks() {
        const frameworks = [];
        const scripts = Array.from(document.querySelectorAll('script[src]'));
        const allScripts = Array.from(document.querySelectorAll('script'));

        if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__ ||
            document.querySelector('[data-reactroot]') ||
            document.querySelector('#__next') ||
            allScripts.some(s => s.textContent && s.textContent.includes('$RC'))) {
            frameworks.push('React');
            }
            if (allScripts.some(s => s.textContent && (s.textContent.includes('$RC') || s.textContent.includes('$RB')))) {
                frameworks.push('React Server Components');
            }
            if (window.__NEXT_DATA__ || document.querySelector('#__next') || scripts.some(s => s.src && s.src.includes('/_next/'))) {
                frameworks.push('Next.js');
            }
            if (window.__NUXT__ || document.querySelector('#__nuxt') || scripts.some(s => s.src && s.src.includes('/_nuxt/'))) {
                frameworks.push('Nuxt');
            }
            if (scripts.some(s => s.src && s.src.includes('/_build/assets/')) || scripts.some(s => s.src && s.src.includes('/@vite/'))) {
                frameworks.push('Vite');
            }
            if (window.__sveltekit || document.querySelector('[data-sveltekit]')) {
                frameworks.push('SvelteKit');
            }
            if (window._$HY || document.querySelector('[data-hk]')) {
                frameworks.push('Solid');
            }
            if (document.querySelector('astro-island') || document.querySelector('[data-astro-cid]')) {
                frameworks.push('Astro');
            }
            if (window.__VUE__ || window.__vue_app__ || document.querySelector('[data-v-]')) {
                frameworks.push('Vue');
            }
            if (document.querySelector('meta[name="csrf-token"]') || document.cookie.includes('laravel_session') || document.cookie.includes('XSRF-TOKEN')) {
                frameworks.push('Laravel');
            }
            return frameworks;
    }

    // ============================================================
    // METADATA EXTRACTION
    // ============================================================
    function extractMetadata() {
        const get = (sel) => {
            const el = document.querySelector(sel);
            return el ? (el.content || el.textContent || '').trim() : null;
        };
        return {
            title: get('meta[property="og:title"]') || document.title,
 description: get('meta[property="og:description"]') || get('meta[name="description"]'),
 image: get('meta[property="og:image"]'),
 type: get('meta[property="og:type"]'),
 siteName: get('meta[property="og:site_name"]'),
 url: get('meta[property="og:url"]') || get('link[rel="canonical"]') || startUrl,
        };
    }

    // ============================================================
    // DOM HINTS DETECTION
    // ============================================================
    function detectDomHints() {
        const hints = {};
        const video = document.querySelector('video');
        hints.hasVideoElement = !!video;
        if (video) {
            hints.videoSrc = video.src || (video.querySelector('source') && video.querySelector('source').src) || null;
        }
        const searchInput = document.querySelector('input[type="search"], input[name="search"], input[name="q"], input[placeholder*="search" i], input[placeholder*="Search"], input[aria-label*="search" i]');
        hints.hasSearchInput = !!searchInput;
        if (searchInput) {
            hints.searchInputSelector = searchInput.tagName.toLowerCase() + (searchInput.name ? `[name="${searchInput.name}"]` : '') + (searchInput.type ? `[type="${searchInput.type}"]` : '');
        }
        const episodeLinks = document.querySelectorAll('a[href*="episode"], a[href*="/watch/"], [class*="episode"]');
        hints.hasEpisodeList = episodeLinks.length > 0;
        hints.episodeCount = episodeLinks.length;
        const pagination = document.querySelector('[class*="pagination"], [class*="pager"], nav[aria-label*="pagination" i]');
        hints.hasPagination = !!pagination;
        const skeletons = document.querySelectorAll('[class*="skeleton"], [class*="animate-pulse"], [class*="loading"], [class*="placeholder"]');
        hints.hasLoadingSkeletons = skeletons.length > 0;
        hints.skeletonCount = skeletons.length;
        const serverButtons = document.querySelectorAll('[data-server-id], [data-server], button[class*="server"], [class*="source-btn"]');
        hints.hasServerSelector = serverButtons.length > 0;
        hints.serverCount = serverButtons.length;
        if (serverButtons.length > 0) {
            hints.serverLabels = Array.from(serverButtons).slice(0, 10).map(b => (b.textContent || b.getAttribute('data-server') || b.getAttribute('data-server-id') || '').trim()).filter(Boolean);
        }
        const iframes = document.querySelectorAll('iframe');
        hints.hasIframes = iframes.length > 0;
        hints.iframeCount = iframes.length;
        if (iframes.length > 0) {
            hints.iframeSrcs = Array.from(iframes).slice(0, 5).map(f => f.src).filter(Boolean);
        }
        const cmdK = document.querySelector('[title*="Command palette"], kbd');
        hints.hasCommandPalette = !!cmdK;
        return hints;
    }

    // ============================================================
    // DATA ATTRIBUTE EXTRACTION
    // ============================================================
    function extractDataAttributes() {
        const attrs = {};
        const selectors = ['[data-id]', '[data-anilist]', '[data-mal]', '[data-slug]', '[data-episode]', '[data-server]', '[data-server-id]', '[data-source]', '[data-embed]', '[data-video]'];
        for (const sel of selectors) {
            const els = document.querySelectorAll(sel);
            if (els.length > 0) {
                const key = sel.replace(/[[\]]/g, '').replace('data-', '');
                attrs[key] = Array.from(els).slice(0, 5).map(el => ({
                    value: el.getAttribute(sel.slice(1, -1)) || el.getAttribute('data-' + key),
                                                                    tag: el.tagName.toLowerCase(),
                                                                    text: (el.textContent || '').trim().slice(0, 100)
                }));
            }
        }
        return attrs;
    }

    // ============================================================
    // INLINE SCRIPT API PATTERN EXTRACTION
    // ============================================================
    function extractInlineApiPatterns() {
        const patterns = [];
        const scripts = Array.from(document.querySelectorAll('script:not([src])'));
        for (const script of scripts) {
            const text = script.textContent || '';
            if (text.length < 20 || text.length > 100000) continue;
            const apiMatches = text.match(/["'`](\/api\/v?\d*\/[^"'`\s,;)]+)/g);
            if (apiMatches) {
                for (const m of apiMatches) {
                    const clean = m.replace(/^["'`]/, '');
                    if (!patterns.includes(clean)) patterns.push(clean);
                }
            }
            const fetchMatches = text.match(/fetch\s*\(\s*["'`]([^"'`]+)["'`]/g);
            if (fetchMatches) {
                for (const m of fetchMatches) {
                    const url = m.replace(/fetch\s*\(\s*["'`]/, '').replace(/["'`]$/, '');
                    if (!patterns.includes(url)) patterns.push(url);
                }
            }
            const templateMatches = text.match(/["'`](https?:\/\/[^"'`]*api[^"'`]*)["'`]/gi);
            if (templateMatches) {
                for (const m of templateMatches) {
                    const clean = m.replace(/^["'`]/, '').replace(/["'`]$/, '');
                    if (!patterns.includes(clean)) patterns.push(clean);
                }
            }
        }
        return patterns.slice(0, 30);
    }

    // ============================================================
    // LINK DETECTION
    // ============================================================
    function detectLinks() {
        const seen = new Set();
        const links = [];
        const anchors = document.querySelectorAll('a[href]');
        for (const a of anchors) {
            const href = a.getAttribute('href') || '';
            if (!href || href.startsWith('#') || href.startsWith('javascript:')) continue;
            let fullUrl;
            try { fullUrl = new URL(href, window.location.origin).href; } catch(e) { continue; }
            try { if (new URL(fullUrl).hostname !== window.location.hostname) continue; } catch(e) { continue; }
            const cleanUrl = fullUrl.split('#')[0];
            if (seen.has(cleanUrl)) continue;
            seen.add(cleanUrl);
            links.push({ url: cleanUrl, text: (a.textContent || '').trim().slice(0, 100), category: categorizeLink(cleanUrl) });
        }
        return links.slice(0, 100);
    }

    function categorizeLink(url) {
        if (url.includes('/watch/')) return 'watch';
        if (url.includes('/anime/')) return 'anime';
        if (url.includes('/catalog') || url.includes('/genre')) return 'catalog';
        if (url.includes('/dojo/') || url.includes('/profile')) return 'profile';
        if (url.includes('/search')) return 'search';
        return 'other';
    }

    // ============================================================
    // CDN / THIRD-PARTY REFERENCE DETECTION
    // ============================================================
    function detectCdnReferences() {
        const cdns = [];
        const CDN_PATTERNS = ['animepahe', 'kwik', 'megacloud', 'rapid-cloud', 'filemoon', 'streamwish', 'animeonsen', 'animeapps', 'nukitashith', 'vivibebe', 'animix', 'gogoanime', 'vidstream', 'streamtape', 'mp4upload', 'doodstream', 'mixdrop', 'voe', 'streamsb'];
        const links = document.querySelectorAll('link[rel="preconnect"], link[rel="dns-prefetch"], link[rel="preload"]');
        for (const link of links) {
            const href = link.href || '';
            for (const p of CDN_PATTERNS) {
                if (href.includes(p)) {
                    try { cdns.push({ domain: new URL(href).hostname, pattern: p, source: 'preconnect' }); } catch(e) {}
                }
            }
        }
        const allResources = document.querySelectorAll('script[src], link[href], img[src], source[src]');
        for (const res of allResources) {
            const url = res.src || res.href || '';
            for (const p of CDN_PATTERNS) {
                if (url.includes(p)) {
                    try {
                        const hostname = new URL(url).hostname;
                        if (!cdns.find(c => c.domain === hostname)) {
                            cdns.push({ domain: hostname, pattern: p, source: res.tagName.toLowerCase() });
                        }
                    } catch(e) {}
                }
            }
        }
        const inlineScripts = document.querySelectorAll('script:not([src])');
        for (const script of inlineScripts) {
            const text = script.textContent || '';
            for (const p of CDN_PATTERNS) {
                if (text.includes(p)) {
                    if (!cdns.find(c => c.pattern === p)) {
                        cdns.push({ domain: null, pattern: p, source: 'inline_script' });
                    }
                }
            }
        }
        return cdns;
    }

    function getPreconnectHints() {
        const hints = [];
        const links = document.querySelectorAll('link[rel="preconnect"], link[rel="dns-prefetch"]');
        for (const link of links) { if (link.href) hints.push(link.href); }
        return hints;
    }

    // ============================================================
    // JS INVENTORY
    // ============================================================
    function buildJsInventory() {
        const scripts = Array.from(document.querySelectorAll('script[src]'));
        const inventory = [];
        for (const script of scripts) {
            const src = script.src || '';
            const filename = src.split('/').pop().split('?')[0];
            if (src.includes('cloudflareinsights') || src.includes('beacon') || src.includes('analytics') || src.includes('google') || src.includes('facebook') || src.includes('adsbygoogle')) continue;
            const entry = { file: filename, url: src, classification: 'unknown', contains: [], verdict: '' };
            if (filename.includes('hls') || filename.includes('player')) {
                entry.classification = 'player'; entry.contains.push('hls', 'player'); entry.verdict = 'Video player — inspect for stream URL handling';
            } else if (filename.includes('video') || filename.includes('watch')) {
                entry.classification = 'video_page'; entry.contains.push('video'); entry.verdict = 'Video page chunk — inspect for API calls';
            } else if (filename.includes('api') || filename.includes('client')) {
                entry.classification = 'api_client'; entry.contains.push('fetch('); entry.verdict = 'API client — inspect endpoints';
            } else if (filename.includes('framework') || filename.includes('vendor')) {
                entry.classification = 'framework'; entry.verdict = 'Framework/vendor bundle — skip';
            }
            inventory.push(entry);
        }
        return inventory;
    }

    // ============================================================
    // PLAYER INITIALIZATION WAIT
    // ============================================================
    async function waitForPlayerInitialization() {
        const state = { videoFound: false, videoSrc: null, hlsFound: false, hlsUrl: null, m3u8Found: false, m3u8Urls: [], videoJsFound: false, attempts: 0 };
        const MAX_ATTEMPTS = 30;
        for (let i = 0; i < MAX_ATTEMPTS; i++) {
            state.attempts = i + 1;
            const video = document.querySelector('video[src], video source[src]');
            if (video) {
                state.videoFound = true;
                state.videoSrc = video.src || (video.querySelector('source') && video.querySelector('source').src) || null;
            }
            try {
                const wjs = window.wrappedJSObject;
                if (wjs && wjs.Hls && wjs.Hls.instances && wjs.Hls.instances.length > 0) {
                    state.hlsFound = true;
                    if (wjs.Hls.instances[0].url) state.hlsUrl = wjs.Hls.instances[0].url;
                }
            } catch(e) {}
            try {
                const wjs = window.wrappedJSObject;
                if (wjs && wjs.videojs && wjs.videojs.getPlayers) {
                    const players = wjs.videojs.getPlayers();
                    if (Object.keys(players).length > 0) state.videoJsFound = true;
                }
            } catch(e) {}
            try {
                const entries = performance.getEntriesByType('resource');
                for (const e of entries) {
                    if (e.name.includes('.m3u8') || e.name.includes('/proxy/master.m3u8') || e.name.includes('/proxy/manifest.mpd')) {
                        if (!state.m3u8Urls.includes(e.name)) { state.m3u8Urls.push(e.name); state.m3u8Found = true; }
                    }
                }
            } catch(e) {}
            if (state.m3u8Found || (state.videoFound && state.videoSrc)) break;
            await sleep(500);
        }
        return state;
    }

    // ============================================================
    // VIDEO RESOLVE WAIT
    // ============================================================
    async function waitForVideoResolve() {
        const MAX_WAIT = 25000;
        const POLL_INTERVAL = 1000;
        let elapsed = 0;
        while (elapsed < MAX_WAIT) {
            // Fetch the serialized JSON string directly from the MAIN world
            const jsonStr = callMainWorldFn('__msa_getInterceptedJSON') || "[]";
            let entries = [];
            try { entries = JSON.parse(jsonStr); } catch(e) { entries = []; }

            const resolveEntry = entries.find(e => e.url && e.url.includes('/api/v1/video/resolve') && e.status === 200 && e.body && e.body.includes('"sources"') && !e.body.includes('"sources":[]'));
            if (resolveEntry) return resolveEntry;

            await sleep(POLL_INTERVAL);
            elapsed += POLL_INTERVAL;
        }

        // Fallback
        const jsonStr = callMainWorldFn('__msa_getInterceptedJSON') || "[]";
        let entries = [];
        try { entries = JSON.parse(jsonStr); } catch(e) {}
        return entries.find(e => e.url && e.url.includes('/api/v1/video/resolve')) || null;
    }

    // ============================================================
    // SERVER BUTTON CLICK SIMULATION
    // ============================================================
    async function clickServerButtons() {
        const clicked = [];
        const serverSelectors = ['[data-server-id]', '[data-server]', 'button[class*="server"]', '[class*="server-btn"]', '[role="tab"][class*="server"]', '[class*="source-btn"]', '[data-source]'];
        for (const sel of serverSelectors) {
            const buttons = document.querySelectorAll(sel);
            for (const btn of buttons) {
                try {
                    btn.click();
                    clicked.push({ selector: sel, text: (btn.textContent || '').trim().slice(0, 50), dataServer: btn.getAttribute('data-server') || btn.getAttribute('data-server-id') || null });
                    await sleep(2000);
                } catch(e) {}
            }
        }
        return clicked;
    }

    function getPerformanceMediaEntries() {
        try {
            return performance.getEntriesByType('resource').filter(e => e.name.includes('.m3u8') || e.name.includes('.mpd') || e.name.includes('.mp4') || e.name.includes('.ts') || e.name.includes('/proxy/') || e.name.includes('/stream') || e.name.includes('animeonsen') || e.name.includes('animeapps') || e.name.includes('nukitashith') || e.name.includes('vivibebe') || e.name.includes('animepahe') || e.name.includes('kwik') || e.name.includes('megacloud') || e.name.includes('rapid-cloud')).map(e => ({ name: e.name, type: e.initiatorType, duration: Math.round(e.duration || 0), size: e.transferSize || 0 }));
        } catch(e) { return []; }
    }

    function discoverSearch() {
        const searchInfo = { found: false, method: null, endpoint: null };
        const searchInput = document.querySelector('input[type="search"], input[name="search"], input[name="q"], input[placeholder*="search" i], input[aria-label*="search" i]');
        if (searchInput) {
            searchInfo.found = true; searchInfo.method = 'input'; searchInfo.inputSelector = searchInput.tagName.toLowerCase() + (searchInput.name ? `[name="${searchInput.name}"]` : '');
        }

        // Fetch the serialized JSON string directly from the MAIN world
        const jsonStr = callMainWorldFn('__msa_getInterceptedJSON') || "[]";
        let entries = [];
        try { entries = JSON.parse(jsonStr); } catch(e) {}

        const searchReq = entries.find(e => e.url && (e.url.includes('/search') || e.url.includes('/api/v1/anime?')));
        if (searchReq) { searchInfo.found = true; searchInfo.method = 'api'; searchInfo.endpoint = searchReq.url; }
        return searchInfo;
    }

    function getFingerprint() {
        return { userAgent: navigator.userAgent, platform: navigator.platform, language: navigator.language, cookiesEnabled: navigator.cookieEnabled, doNotTrack: navigator.doNotTrack, hardwareConcurrency: navigator.hardwareConcurrency, deviceMemory: navigator.deviceMemory || null, screenResolution: `${screen.width}x${screen.height}`, viewportSize: `${window.innerWidth}x${window.innerHeight}`, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone };
    }

    // ============================================================
    // MAIN HARVEST
    // ============================================================
    async function harvest() {
        const isWatchPage = currentPath.includes('/watch/') || currentPath.includes('/episode/');
        const isAnimePage = currentPath.includes('/anime/') && !isWatchPage;

        const frameworks = detectFrameworks();
        const metadata = extractMetadata();
        const domHints = detectDomHints();
        const dataAttrs = extractDataAttributes();
        const inlineApis = extractInlineApiPatterns();
        const links = detectLinks();
        const cdnRefs = detectCdnReferences();
        const preconnects = getPreconnectHints();
        const jsInventory = buildJsInventory();
        const searchInfo = discoverSearch();
        const fingerprint = getFingerprint();

        let playerState = null, videoResolve = null, serverClicks = [], performanceMediaEntries = [];
        if (isWatchPage) {
            playerState = await waitForPlayerInitialization();

            // Check if resolve already captured using MAIN world helper
            const jsonStrCheck = callMainWorldFn('__msa_getInterceptedJSON') || "[]";
            let checkEntries = [];
            try { checkEntries = JSON.parse(jsonStrCheck); } catch(e) {}

            const hasResolve = checkEntries.some(e => e.url && e.url.includes('/api/v1/video/resolve'));
            if (!hasResolve && domHints.hasServerSelector) {
                serverClicks = await clickServerButtons();
            }

            videoResolve = await waitForVideoResolve();
            performanceMediaEntries = getPerformanceMediaEntries();
        }

        // ============================================================
        // PHASE 4: WAIT & HARVEST INTERCEPTED REQUESTS (JSON SERIALIZATION)
        // ============================================================

        // 1. Wait for async body reads to finish using the MAIN world helper
        let status = callMainWorldFn('__msa_getStatus') || { pending: 0, count: 0 };
        let waitAttempts = 0;
        while (status.pending > 0 && waitAttempts < 40) { // Max 10 seconds
            await sleep(250);
            waitAttempts++;
            status = callMainWorldFn('__msa_getStatus') || { pending: 0, count: 0 };
        }

        // Small stabilization delay for late-arriving network events
        await sleep(500);

        // 2. Fetch the serialized JSON string directly from the MAIN world
        const finalJsonStr = callMainWorldFn('__msa_getInterceptedJSON') || "[]";

        // 3. Parse it safely in the ISOLATED world
        let intercepted = [];
        try {
            intercepted = JSON.parse(finalJsonStr);
        } catch(e) {
            console.warn('[MSA-content] Failed to parse intercepted JSON', e);
        }

        console.log(`[MSA-content] Harvested ${intercepted.length} intercepted requests. Bodies present: ${intercepted.filter(i => i.body).length}`);

        const htmlSnapshot = cleanSnapshot(document.documentElement.outerHTML);

        return {
            url: startUrl, path: currentPath, timestamp: Date.now(), pageType: isWatchPage ? 'watch' : isAnimePage ? 'anime' : 'other',
                                          frameworks, metadata, domHints, dataAttributes: dataAttrs, inlineApiPatterns: inlineApis, search: searchInfo, jsInventory, cdnReferences: cdnRefs, preconnects, fingerprint,
                                          links,
                                          linksByCategory: { watch: links.filter(l => l.category === 'watch').map(l => l.url), anime: links.filter(l => l.category === 'anime').map(l => l.url), catalog: links.filter(l => l.category === 'catalog').map(l => l.url) },
                                          playerState,
                                          videoResolve: videoResolve ? { url: videoResolve.url, method: videoResolve.method, requestBody: videoResolve.requestBody, responseBody: videoResolve.body, status: videoResolve.status, responseType: videoResolve.responseType, responseDetail: videoResolve.responseDetail, schema: videoResolve.schema, durationMs: videoResolve.durationMs } : null,
                                          serverClicks, performanceMediaEntries,
                                          intercepted, interceptedCount: intercepted.length, criticalIntercepted: intercepted.filter(e => e.critical).length,
                                          htmlSnapshot, htmlSnapshotSize: htmlSnapshot.length,
        };
    }

    try {
        const result = await harvest();
        return result;
    } catch(e) {
        return { error: e.message, stack: e.stack ? e.stack.slice(0, 500) : null, url: startUrl, path: currentPath, timestamp: Date.now() };
    }
})();
