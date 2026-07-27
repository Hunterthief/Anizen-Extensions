// content.js — DOM detectors + JS inventory + HTML snapshot + intercepted harvest
(async function () {
    const startUrl = window.location.href;
    const currentPath = window.location.pathname.toLowerCase();

    // --- 1. Framework Detector ---
    const frameworks = []; const fwEvidence = [];
    if (window.React) { frameworks.push("React"); fwEvidence.push("Found window.React"); }
    if (document.querySelector('[data-reactroot], #root')) { frameworks.push("React"); fwEvidence.push("Found #root div"); }
    if (window.Vue) { frameworks.push("Vue"); fwEvidence.push("Found window.Vue"); }
    if (document.querySelector('#__next')) { frameworks.push("Next.js"); fwEvidence.push("Found #__next"); }
    if (document.querySelector('#__nuxt')) { frameworks.push("Nuxt.js"); fwEvidence.push("Found #__nuxt"); }

    // --- 2. Metadata Detector ---
    const getMeta = (name) => document.querySelector(`meta[name="${name}"], meta[property="${name}"]`)?.content || null;
    const metadata = {
        description: getMeta('description'),
 ogTitle: getMeta('og:title'),
 ogImage: getMeta('og:image'),
 ogType: getMeta('og:type')
    };

    // --- 3. Link Detector ---
    const links = [];
    document.querySelectorAll('a[href]').forEach(a => {
        try {
            const url = new URL(a.href);
            if (url.hostname === window.location.hostname) {
                links.push({ url: url.href.split('#')[0], text: a.innerText.trim().substring(0, 50) });
            }
        } catch (e) {}
    });

    // --- 4. Robust Component Detection ---
    const domHints = {
        isHomepage: window.location.pathname === "/",
        hasVideoPlayer: !!document.querySelector('video, iframe[src*="stream"], iframe[src*="player"]'),
 isSearchPage: window.location.search.includes('?s=') || window.location.search.includes('q='),
 hasEpisodeList: !!document.querySelector('.episode-list, .episodes, [class*="episode"]'),
 hasPagination: !!document.querySelector('.pagination, [class*="load-more"]')
    };
    if (!domHints.hasEpisodeList) {
        const watchLinks = links.filter(l =>
        l.url.includes('/watch/') || l.url.includes('/episode/') || (l.text.toLowerCase().includes('ep') && /\d/.test(l.text))
        );
        if (watchLinks.length >= 3) domHints.hasEpisodeList = true;
    }
    if (!domHints.hasVideoPlayer) {
        const titleStr = (document.title + " " + (metadata.ogTitle || "")).toLowerCase();
        const isWatchPath = currentPath.includes('/watch/') || currentPath.includes('/episode/');
        if (metadata.ogType === 'video.episode' || (metadata.ogType === 'video.tv_show' && isWatchPath) || (titleStr.includes('watch') && titleStr.includes('ep'))) {
            domHints.hasVideoPlayer = true;
        }
    }

    // --- Play Button Click (all watch pages, triggers lazy resolver) ---
    if (currentPath.includes('watch') || currentPath.includes('episode')) {
        let playBtn = null; let bestPlayScore = 0;
        document.querySelectorAll('button, a, div[role="button"], div, i').forEach(el => {
            if (el.offsetParent === null) return;
            let pScore = 0;
            const aria = (el.getAttribute('aria-label') || el.getAttribute('title') || "").toLowerCase();
            const cls = (el.className || "").toString().toLowerCase();
            const txt = (el.innerText || "").toLowerCase().trim();
            if (aria.includes('play') || txt === 'play' || txt === 'watch now') pScore += 40;
            if (cls.includes('play') || cls.includes('btn-play') || cls.includes('fa-play')) pScore += 30;
            if (cls.includes('list') || txt.includes('list')) pScore -= 50;
            if (pScore > bestPlayScore && pScore >= 30) { bestPlayScore = pScore; playBtn = el; }
        });
        if (playBtn) {
            try {
                playBtn.click();
                await new Promise(r => setTimeout(r, 2500));
                if (document.querySelector('video, iframe[src*="stream"], iframe[src*="player"]')) domHints.hasVideoPlayer = true;
            } catch (e) {}
        }
    }

    // --- Active & Universal Search Discovery (two-step flow) ---
    let searchSimulated = false;
    let searchViewAllLink = null;
    const isCatalog = currentPath.includes('catalog') || currentPath.includes('browse') || currentPath.includes('search');
    if (!domHints.isSearchPage && (domHints.isHomepage || isCatalog)) {
        const scoreInput = (inp, allowHidden) => {
            if (inp.type === 'hidden') return 0;
            if (!allowHidden && inp.offsetParent === null) return 0;
            let score = 0;
            const attrs = `${inp.type} ${inp.name} ${inp.id} ${inp.placeholder} ${inp.getAttribute('aria-label')}`.toLowerCase();
            if (inp.type === 'search') score += 50;
            if (attrs.includes('search')) score += 30;
            if (['q', 'query', 'keyword', 'k', 's'].includes((inp.name || '').toLowerCase())) score += 30;
            if (attrs.includes('anime') || attrs.includes('find')) score += 10;
            if (inp.offsetParent !== null) score += 15;
            if (document.activeElement === inp) score += 30;
            return score;
        };
        let bestInput = null; let bestScore = 0;
        document.querySelectorAll('input').forEach(inp => {
            const s = scoreInput(inp, false);
            if (s > bestScore) { bestScore = s; bestInput = inp; }
        });
        if (!bestInput || bestScore < 30) {
            let searchTrigger = null; let bestTriggerScore = 0;
            document.querySelectorAll('button, a, div[role="button"], span, i').forEach(el => {
                if (el.offsetParent === null) return;
                let tScore = 0;
                const aria = (el.getAttribute('aria-label') || el.getAttribute('title') || "").toLowerCase();
                const cls = (el.className || "").toString().toLowerCase();
                const txt = (el.innerText || "").toLowerCase();
                if (aria.includes('search')) tScore += 40;
                if (txt === 'search') tScore += 30;
                if (cls.includes('search-toggle') || cls.includes('search-btn') || cls.includes('search-icon')) tScore += 40;
                if (cls.includes('magnifying-glass') || cls.includes('fa-search') || cls.includes('icon-search')) tScore += 30;
                if (tScore > bestTriggerScore) { bestTriggerScore = tScore; searchTrigger = el; }
            });
            if (searchTrigger && bestTriggerScore >= 30) {
                searchTrigger.click();
                await new Promise(r => setTimeout(r, 500));
                bestInput = null; bestScore = 0;
                document.querySelectorAll('input').forEach(inp => {
                    const s = scoreInput(inp, true);
                    if (s > bestScore) { bestScore = s; bestInput = inp; }
                });
            }
        }
        if (bestInput && bestScore >= 30) {
            try {
                bestInput.focus();
                const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                nativeSetter.call(bestInput, "naruto");
                bestInput.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
                bestInput.dispatchEvent(new Event('change', { bubbles: true }));
                bestInput.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter', keyCode: 13 }));
                await new Promise(r => setTimeout(r, 800));
                document.querySelectorAll('a').forEach(a => {
                    const txt = (a.innerText || "").toLowerCase();
                    if (txt.includes('view all') || txt.includes('see all results') || txt.includes('all results')) {
                        if (a.href && a.href.startsWith('http')) searchViewAllLink = a.href;
                    }
                });
                if (window.location.href !== startUrl && /[?&](q|s|search|query|keyword)=/i.test(window.location.href)) {
                    searchSimulated = true;
                }
            } catch (e) {}
        }
    }

    // --- Fingerprint Detector ---
    function getFingerprint() {
        let structure = "";
        const walk = (node, depth) => {
            if (!node || depth > 3) return;
            if (node.tagName) {
                structure += `<${node.tagName.toLowerCase()}>`;
                Array.from(node.children).forEach(child => walk(child, depth + 1));
            }
        };
        walk(document.body, 0);
        let hash = 0;
        for (let i = 0; i < structure.length; i++) {
            const c = structure.charCodeAt(i);
            hash = ((hash << 5) - hash) + c;
            hash = hash & hash;
        }
        return "fp_" + Math.abs(hash).toString(16) + `_${domHints.hasVideoPlayer}-${domHints.hasEpisodeList}`;
    }

    // --- Hidden Data Sources (JSON Detector) ---
    const embeddedJSON = [];
    document.querySelectorAll('script[type="application/ld+json"]').forEach(() => {
        embeddedJSON.push({ name: "JSON-LD", location: "script[type='application/ld+json']", purpose: "Structured Data", confidence: 95, completeness: "High" });
    });
    if (document.getElementById('__NEXT_DATA__')) embeddedJSON.push({ name: "__NEXT_DATA__", location: "#__NEXT_DATA__", purpose: "Next.js Hydration", confidence: 98, completeness: "Full", usefulFields: ["props", "pageProps"] });
    if (window.__NUXT__) embeddedJSON.push({ name: "__NUXT__", location: "window.__NUXT__", purpose: "Nuxt.js State", confidence: 98, completeness: "Full", usefulFields: ["state"] });
    if (window.__INITIAL_STATE__) embeddedJSON.push({ name: "__INITIAL_STATE__", location: "window.__INITIAL_STATE__", purpose: "Vuex/Redux State", confidence: 90, completeness: "High" });

    // --- JS Inventory (feeds the JS dependency report) ---
    const JS_PATTERNS = ['m3u8', 'manifest', '.mpd', 'jwt', 'token', 'bearer', 'aes', 'cryptojs', 'decrypt', 'encrypt', 'fetch(', 'xmlhttprequest', 'websocket', 'atob(', 'btoa(', 'eval(', 'webassembly', 'getcontext', 'webgl', 'fingerprint', 'hls'];
    const jsInventory = [];
    const scriptEls = Array.from(document.querySelectorAll('script[src]')).slice(0, 20);
    for (const sc of scriptEls) {
        try {
            const su = new URL(sc.src);
            const name = su.pathname.split('/').pop() || 'inline';
            const lname = name.toLowerCase();
            let classification = 'unknown';
            if (lname.includes('player')) classification = 'player';
            else if (lname.includes('embed')) classification = 'embed';
            else if (lname.includes('app') || lname.includes('main') || lname.includes('index')) classification = 'app';
            else if (lname.includes('vendor') || lname.includes('chunk') || lname.includes('runtime')) classification = 'vendor';
            else if (lname.includes('analytics') || lname.includes('gtag')) classification = 'analytics';
            const entry = { url: sc.src, name, classification, sameOrigin: su.hostname === window.location.hostname, patterns: [], size: null, avgLineLength: null };
            if (entry.sameOrigin) {
                try {
                    const resp = await fetch(sc.src);
                    const text = await resp.text();
                    entry.size = text.length;
                    const lines = text.split('\n');
                    entry.avgLineLength = Math.round(text.length / Math.max(1, lines.length));
                    const lower = text.toLowerCase();
                    JS_PATTERNS.forEach(p => { if (lower.includes(p)) entry.patterns.push(p); });
                } catch (e) { entry.patterns.push('[fetch blocked]'); }
            }
            jsInventory.push(entry);
        } catch (e) {}
    }

    // --- HTML Snapshot ---
    let htmlSnapshot = null;
    if (currentPath.includes('watch') || currentPath.includes('episode') || currentPath.includes('anime') || currentPath.includes('title')) {
        try { htmlSnapshot = document.documentElement.outerHTML.slice(0, 102400); } catch (e) {}
    }

    // --- Harvest intercepted requests ---
    let intercepted = [];
    try {
        const raw = (window.wrappedJSObject && window.wrappedJSObject.__msa_intercepted) || window.__msa_intercepted || [];
        intercepted = JSON.parse(JSON.stringify(Array.from(raw)));
    } catch (e) { intercepted = []; }

    return {
        site: { url: window.location.href, title: document.title },
        detectors: {
            frameworks: { result: frameworks, confidence: frameworks.length ? 95 : 0, evidence: fwEvidence },
            metadata: { result: metadata, confidence: metadata.ogTitle ? 85 : 40, evidence: metadata.ogTitle ? ["og:title detected"] : ["No og:title"] },
            domHints: { result: domHints, confidence: 100, evidence: ["Direct DOM observation + Link Clustering + Play Click"] },
            fingerprint: getFingerprint(),
 embeddedJSON: embeddedJSON,
 jsInventory: jsInventory
        },
        links: Array.from(new Set(links.map(l => l.url))).map(url => links.find(l => l.url === url)),
 searchSimulated,
 searchViewAllLink,
 htmlSnapshot,
 intercepted
    };
})();
