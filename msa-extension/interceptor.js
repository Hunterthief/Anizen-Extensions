// interceptor.js — page-level fetch/XHR recorder, gated by analysis state.
(async function () {
    try {
        const { msaActive } = await browser.storage.local.get('msaActive');
        if (!msaActive) return;
    } catch (e) { return; }

    const pageScript = `
    (function () {
        if (window.__msa_hooked) return;
        window.__msa_hooked = true;
        window.__msa_intercepted = [];
        var MAX_BODY = 51200, MAX_ENTRIES = 400;
        function push(entry) {
            try { if (window.__msa_intercepted.length < MAX_ENTRIES) window.__msa_intercepted.push(entry); } catch (e) {}
        }
        function headersToObj(h) {
            var out = {};
            try { h.forEach(function (v, k) { out[k.toLowerCase()] = v; }); } catch (e) {}
            return out;
        }

        // ---- fetch hook ----
        var origFetch = window.fetch;
        window.fetch = function (input, init) {
            var url = (typeof input === 'string') ? input : (input && input.url ? input.url : String(input));
            var method = (init && init.method) || (input && input.method) || 'GET';
            var reqBody = null, reqHeaders = {};
            try { if (init && init.body) reqBody = (typeof init.body === 'string') ? init.body.slice(0, MAX_BODY) : '[non-string body]'; } catch (e) {}
            try { if (init && init.headers) reqHeaders = headersToObj(new Headers(init.headers)); } catch (e) {}
            var start = performance.now();
            return origFetch.apply(this, arguments).then(function (resp) {
                try {
                    var clone = resp.clone();
                    clone.text().then(function (text) {
                        push({
                            url: url, method: String(method).toUpperCase(),
                             requestHeaders: reqHeaders, requestBody: reqBody,
                             status: resp.status,
                             responseHeaders: headersToObj(resp.headers),
                             body: text.slice(0, MAX_BODY), truncated: text.length > MAX_BODY,
                             durationMs: Math.round(performance.now() - start),
                             via: 'fetch', t: Date.now()
                        });
                    });
                } catch (e) {}
                return resp;
            });
        };

        // ---- XHR hook ----
        var origOpen = XMLHttpRequest.prototype.open;
        var origSend = XMLHttpRequest.prototype.send;
        var origSetHeader = XMLHttpRequest.prototype.setRequestHeader;
        XMLHttpRequest.prototype.open = function (method, url) {
            this.__msa = { method: String(method).toUpperCase(), url: String(url), headers: {}, start: 0, body: null };
            return origOpen.apply(this, arguments);
        };
        XMLHttpRequest.prototype.setRequestHeader = function (k, v) {
            if (this.__msa) this.__msa.headers[String(k).toLowerCase()] = String(v);
            return origSetHeader.apply(this, arguments);
        };
        XMLHttpRequest.prototype.send = function (body) {
            var meta = this.__msa;
            if (meta) {
                meta.start = performance.now();
                try { if (body) meta.body = (typeof body === 'string') ? body.slice(0, MAX_BODY) : '[non-string body]'; } catch (e) {}
                this.addEventListener('load', function () {
                    try {
                        var respHeaders = {};
                        (this.getAllResponseHeaders() || '').split(/\\r?\\n/).forEach(function (line) {
                            var i = line.indexOf(':');
                            if (i > 0) respHeaders[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
                        });
                            var text = this.responseText || '';
                            push({
                                url: meta.url, method: meta.method,
                                requestHeaders: meta.headers, requestBody: meta.body,
                                status: this.status,
                                responseHeaders: respHeaders,
                                body: text.slice(0, MAX_BODY), truncated: text.length > MAX_BODY,
                                 durationMs: Math.round(performance.now() - meta.start),
                                 via: 'xhr', t: Date.now()
                            });
                    } catch (e) {}
                });
            }
            return origSend.apply(this, arguments);
        };
    })();
    `;

    try {
        var s = document.createElement('script');
        s.textContent = pageScript;
        (document.documentElement || document.head || document.body).appendChild(s);
        s.remove();
    } catch (e) {}
})();
