// interceptor.js — page-level fetch/XHR recorder, gated by analysis state.
// Enhanced: critical endpoint detection, response classification, schema inference,
// header dependency tracking, conditional JWT detection.
// v2.2: DIAGNOSTIC LOGGING ADDED to trace exactly where response bodies are dropping.
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
        window.__msa_pending_reads = 0;  // Track async body reads in flight

        // --- EXPOSED HELPERS FOR CONTENT.JS (BYPASS XPC WRAPPER) ---
        window.__msa_getStatus = function() {
            return {
                pending: window.__msa_pending_reads || 0,
                count: (window.__msa_intercepted || []).length
            };
        };
        window.__msa_getInterceptedJSON = function() {
            try {
                // Serialize entirely within the MAIN world to avoid proxy/cloning issues
                return JSON.stringify(window.__msa_intercepted || []);
            } catch(e) {
                return "[]";
            }
        };

        var MAX_BODY = 204800, MAX_BODY_CRITICAL = 204800, MAX_ENTRIES = 400;

        // ============================================================
        // DEVTOOLS / AUTOMATION DETECTION BYPASS
        // ============================================================
        (function bypassDevToolsDetection() {
            try {
                var _innerW = window.innerWidth;
                var _innerH = window.innerHeight;
                try {
                    Object.defineProperty(window, 'outerWidth', {
                        get: function() { return _innerW; },
                                          configurable: true
                    });
                    Object.defineProperty(window, 'outerHeight', {
                        get: function() { return _innerH + 80; },
                                          configurable: true
                    });
                } catch(e) {}

                var _origFuncCtor = Function.prototype.constructor;
                Function.prototype.constructor = function() {
                    var args = Array.prototype.slice.call(arguments);
                    if (args.length > 0 && typeof args[0] === 'string' &&
                        (args[0].indexOf('debugger') > -1 || args[0].indexOf('setInterval') > -1)) {
                        return function() {};
                        }
                        return _origFuncCtor.apply(this, arguments);
                };

                var _origClear = console.clear;
                console.clear = function() { /* no-op */ };

                var _origSetInterval = window.setInterval;
                window.setInterval = function(fn, delay) {
                    var fnStr = '';
                    try { fnStr = typeof fn === 'function' ? fn.toString() : String(fn); } catch(e) {}
                    if (fnStr.indexOf('outerWidth') > -1 ||
                        fnStr.indexOf('outerHeight') > -1 ||
                        fnStr.indexOf('debugger') > -1 ||
                        (fnStr.indexOf('innerWidth') > -1 && fnStr.indexOf('outerWidth') > -1)) {
                        return 0;
                        }
                        return _origSetInterval.apply(this, arguments);
                };
            } catch(e) {}
        })();

        // ============================================================
        // CRITICAL ENDPOINT DETECTION
        // ============================================================
        var CRITICAL_PATTERNS = [
            /\\/api\\/.*sourc/i, /\\/api\\/.*server/i, /\\/api\\/.*video/i,
     /\\/api\\/.*stream/i, /\\/api\\/.*embed/i, /\\/api\\/.*resolv/i,
     /\\/api\\/.*search/i, /\\/api\\/.*episode/i, /\\/api\\/.*anime/i,
     /\\/api\\/.*info/i, /\\/api\\/.*detail/i, /\\/api\\/.*title/i,
     /\\/api\\/.*watch/i, /\\/api\\/.*play/i, /\\/api\\/.*source/i,
     /\\/proxy/i, /\\/pipe/i, /\\/gateway/i, /\\/secure/i,
     /\\.m3u8/, /\\.mpd/, /\\.mp4/
        ];

        function isCriticalEndpoint(url) {
            var lower = url.toLowerCase();
            for (var i = 0; i < CRITICAL_PATTERNS.length; i++) {
                if (CRITICAL_PATTERNS[i].test(lower)) return true;
            }
            return false;
        }

        // ============================================================
        // RESPONSE BODY CLASSIFICATION
        // ============================================================
        function classifyResponse(text, contentType) {
            if (!text || text.length === 0) return { type: 'empty', detail: 'No body' };
            var trimmed = text.trim();

            if (trimmed.indexOf('#EXTM3U') === 0)
                return { type: 'manifest', detail: 'HLS manifest (plain text)' };
            if (trimmed.indexOf('<MPD') === 0 || (trimmed.indexOf('<?xml') === 0 && trimmed.indexOf('MPD') > -1))
                return { type: 'manifest', detail: 'DASH manifest (XML)' };

            if (trimmed.indexOf('<!DOCTYPE') === 0 || trimmed.indexOf('<html') === 0 ||
                (trimmed.indexOf('<iframe') > -1 && trimmed.indexOf('</iframe>') > -1)) {
                if (trimmed.indexOf('<iframe') > -1)
                    return { type: 'html_embed', detail: 'HTML with iframe embed' };
                if (trimmed.indexOf('Just a moment') > -1 || trimmed.indexOf('challenge-platform') > -1 || trimmed.indexOf('cf_chl_opt') > -1)
                    return { type: 'cloudflare_challenge', detail: 'Cloudflare challenge page (403)' };
                return { type: 'html', detail: 'HTML page' };
                }

                if (trimmed.charAt(0) === '{' || trimmed.charAt(0) === '[') {
                    try {
                        var parsed = JSON.parse(trimmed);
                        var jsonStr = trimmed.toLowerCase();
                        if (jsonStr.indexOf('.m3u8') > -1) return { type: 'json_with_manifest', detail: 'JSON containing m3u8 URL' };
                        if (jsonStr.indexOf('.mpd') > -1) return { type: 'json_with_manifest', detail: 'JSON containing mpd URL' };
                        if (jsonStr.indexOf('.mp4') > -1) return { type: 'json_with_media', detail: 'JSON containing mp4 URL' };
                        if (jsonStr.indexOf('embed') > -1 || jsonStr.indexOf('iframe') > -1) return { type: 'json_with_embed', detail: 'JSON containing embed URL' };
                        if (jsonStr.indexOf('sources') > -1 || jsonStr.indexOf('source') > -1) return { type: 'json_sources', detail: 'JSON with sources array' };
                        if (jsonStr.indexOf('/proxy/') > -1) return { type: 'json_with_proxy', detail: 'JSON containing proxy URL' };
                        return { type: 'json', detail: 'Plain JSON' };
                    } catch (e) {
                        return { type: 'encrypted_or_obfuscated', detail: 'JSON-like but unparseable' };
                    }
                }

                if (/^[A-Za-z0-9+\\/=]{50,}$/.test(trimmed.slice(0, 200)))
                    return { type: 'encrypted_or_obfuscated', detail: 'Base64-encoded payload' };

                    if (contentType && (contentType.indexOf('octet-stream') > -1 || contentType.indexOf('binary') > -1))
                        return { type: 'encrypted_or_obfuscated', detail: 'Binary content-type' };

                    return { type: 'unknown', detail: 'Unrecognized format' };
                }

                // ============================================================
                // RESPONSE SCHEMA INFERENCE
                // ============================================================
                function inferSchema(obj, depth) {
                    if (depth === undefined) depth = 0;
                    if (depth > 3) return '…';
                    if (obj === null || obj === undefined) return 'null';
                    if (Array.isArray(obj)) {
                        if (obj.length === 0) return '[]';
                        return '[' + inferSchema(obj[0], depth + 1) + ']';
                    }
                    if (typeof obj === 'object') {
                        var schema = {};
                        var keys = Object.keys(obj).slice(0, 15);
                        for (var i = 0; i < keys.length; i++) {
                            var k = keys[i];
                            var v = obj[k];
                            if (typeof v === 'string') {
                                if (v.indexOf('http') === 0) schema[k] = 'url:string';
                                else if (v.indexOf('.m3u8') > -1) schema[k] = 'manifest_url:string';
                                else if (v.indexOf('.mpd') > -1) schema[k] = 'manifest_url:string';
                                else if (v.indexOf('.mp4') > -1) schema[k] = 'video_url:string';
                                else if (v.indexOf('/proxy/') > -1) schema[k] = 'proxy_url:string';
                                else schema[k] = 'string';
                            } else if (typeof v === 'number') {
                                schema[k] = Number.isInteger(v) ? 'int' : 'float';
                            } else if (typeof v === 'boolean') {
                                schema[k] = 'bool';
                            } else if (v === null) {
                                schema[k] = 'null';
                            } else if (Array.isArray(v)) {
                                schema[k] = inferSchema(v, depth + 1);
                            } else if (typeof v === 'object') {
                                schema[k] = inferSchema(v, depth + 1);
                            }
                        }
                        return schema;
                    }
                    return typeof obj;
                }

                function buildSchemaFromText(text) {
                    try {
                        var parsed = JSON.parse(text);
                        return inferSchema(parsed, 0);
                    } catch (e) { return null; }
                }

                // ============================================================
                // HEADER DEPENDENCY TRACKING & JWT DETECTION
                // ============================================================
                function buildHeaderDeps(reqHeaders) {
                    var deps = {};
                    if (reqHeaders['cookie']) deps.cookie = true;
                    if (reqHeaders['referer']) deps.referer = true;
                    if (reqHeaders['origin']) deps.origin = true;
                    if (reqHeaders['authorization']) deps.authorization = true;
                    if (reqHeaders['user-agent']) deps.userAgent = true;
                    if (reqHeaders['x-requested-with']) deps.xRequestedWith = true;
                    if (reqHeaders['content-type']) deps.contentType = true;
                    if (reqHeaders['x-turnstile-token']) deps.turnstile = true;
                    if (reqHeaders['x-request-id']) deps.requestId = true;
                    return deps;
                }

                function detectJwtInfo(reqHeaders) {
                    var auth = reqHeaders['authorization'];
                    if (!auth) return null;
                    var val = auth.replace(/^Bearer\\s+/i, '');
                    var jwtRegex = /^eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$/;
                    if (!jwtRegex.test(val))
                        return { present: true, type: 'non-JWT bearer', value: auth.slice(0, 30) + '…' };
                    var info = { present: true, type: 'JWT', value: auth.slice(0, 30) + '…', expires: null };
                    try {
                        var payload = JSON.parse(atob(val.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
                        if (payload.exp) {
                            var secs = payload.exp - Math.floor(Date.now() / 1000);
                            info.expires = secs > 0 ? '~' + Math.round(secs / 60) + ' min' : 'expired';
                        }
                        if (payload.iss) info.issuer = payload.iss;
                        if (payload.sub) info.subject = payload.sub;
                    } catch (e) {}
                    return info;
                }

                // ============================================================
                // ENTRY STORAGE & BUILDING
                // ============================================================
                function push(entry) {
                    try {
                        if (window.__msa_intercepted.length < MAX_ENTRIES)
                            window.__msa_intercepted.push(entry);
                    } catch (e) {}
                }

                function headersToObj(h) {
                    var out = {};
                    try { h.forEach(function (v, k) { out[k.toLowerCase()] = v; }); } catch (e) {}
                    return out;
                }

                function buildEntry(url, method, reqHeaders, reqBody, status, respHeaders, text, truncated, durationMs, via) {
                    var critical = isCriticalEndpoint(url);
                    var contentType = (respHeaders && respHeaders['content-type']) || '';
                    var classification = classifyResponse(text, contentType);
                    var schema = null;
                    var jwt = null;
                    var headerDeps = buildHeaderDeps(reqHeaders || {});
                    var bodyCap = critical ? MAX_BODY_CRITICAL : MAX_BODY;

                    if (critical && text && (classification.type.indexOf('json') === 0 || classification.type === 'json_with_proxy')) {
                        schema = buildSchemaFromText(text);
                    }
                    if (reqHeaders && reqHeaders['authorization']) {
                        jwt = detectJwtInfo(reqHeaders);
                    }

                    return {
                        url: url,
                        method: String(method).toUpperCase(),
     requestHeaders: reqHeaders || {},
     requestBody: reqBody,
     status: status,
     responseHeaders: respHeaders || {},
     body: text ? text.slice(0, bodyCap) : null,
     truncated: truncated || (text && text.length > bodyCap),
     durationMs: durationMs,
     via: via,
     t: Date.now(),
     critical: critical,
     responseType: classification.type,
     responseDetail: classification.detail,
     schema: schema,
     headerDependencies: headerDeps,
     jwt: jwt
                    };
                }

                // ============================================================
                // FETCH HOOK — WITH DIAGNOSTIC LOGGING
                // ============================================================
                var origFetch = window.fetch;
                window.fetch = function (input, init) {
                    var url, method, reqBody, reqHeaders;
                    try {
                        if (typeof input === 'string') { url = input; }
                        else if (input instanceof Request) { url = input.url; }
                        else { url = String(input); }
                    } catch(e) { url = String(input); }

                    method = (init && init.method) || (input && input.method) || 'GET';
                    reqBody = null;
                    reqHeaders = {};

                    try {
                        if (init && init.body) {
                            if (typeof init.body === 'string') reqBody = init.body.slice(0, MAX_BODY);
                            else if (init.body instanceof URLSearchParams) reqBody = init.body.toString();
                            else reqBody = '[non-string body: ' + (typeof init.body) + ']';
                        }
                        if (!reqBody && input instanceof Request && input.body) {
                            reqBody = '[Request body — see cloned request]';
                        }
                    } catch (e) {}

                    try {
                        if (init && init.headers) reqHeaders = headersToObj(new Headers(init.headers));
                        else if (input instanceof Request && input.headers) reqHeaders = headersToObj(input.headers);
                    } catch (e) {}

                    var start = performance.now();

                    return origFetch.apply(this, arguments).then(function (resp) {
                        try {
                            var clone = resp.clone();
                            window.__msa_pending_reads++;

                            // ✅ DIAGNOSTIC: Enhanced logging for body capture
                            clone.text().then(function (text) {
                                window.__msa_pending_reads--;
                                try {
                                    console.log('[MSA-interceptor] SUCCESS: Captured ' + text.length + ' chars for ' + url);
                                    var entry = buildEntry(
                                        url, method, reqHeaders, reqBody,
                                        resp.status, headersToObj(resp.headers),
                                                           text, text.length > MAX_BODY_CRITICAL,
                                                           Math.round(performance.now() - start), 'fetch'
                                    );
                                    push(entry);
                                } catch(e) {
                                    console.error('[MSA-interceptor] ERROR building entry for ' + url + ':', e);
                                }
                            }).catch(function(err) {
                                window.__msa_pending_reads--;
                                // ❌ DIAGNOSTIC: Log failure and force an error string so we know it tried
                                console.error('[MSA-interceptor] FAILED to read body for ' + url + ':', err);
                                try {
                                    var entry = buildEntry(
                                        url, method, reqHeaders, reqBody,
                                        resp.status, headersToObj(resp.headers),
                                                           '__MSA_READ_ERROR__: ' + (err ? err.message : 'unknown'), false,
                                                           Math.round(performance.now() - start), 'fetch'
                                    );
                                    entry.responseDetail = 'Body read failed: ' + (err ? err.message : 'unknown');
                                    push(entry);
                                } catch(e) {}
                            });
                        } catch (e) {
                            try {
                                var entry = buildEntry(
                                    url, method, reqHeaders, reqBody,
                                    resp.status, {}, null, false,
                                    Math.round(performance.now() - start), 'fetch'
                                );
                                entry.responseDetail = 'Clone failed';
                                push(entry);
                            } catch(e2) {}
                        }
                        return resp;
                    }).catch(function(err) {
                        try {
                            var entry = buildEntry(
                                url, method, reqHeaders, reqBody,
                                0, {}, null, false,
                                Math.round(performance.now() - start), 'fetch'
                            );
                            entry.responseDetail = 'Network error: ' + (err && err.message || 'unknown');
                            entry.error = true;
                            push(entry);
                        } catch(e) {}
                        throw err;
                    });
                };

                // ============================================================
                // XHR HOOK
                // ============================================================
                var origOpen = XMLHttpRequest.prototype.open;
                var origSend = XMLHttpRequest.prototype.send;
                var origSetHeader = XMLHttpRequest.prototype.setRequestHeader;

                XMLHttpRequest.prototype.open = function (method, url) {
                    this.__msa = {
                        method: String(method).toUpperCase(),
     url: String(url),
     headers: {},
     start: 0,
     body: null
                    };
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
                        try {
                            if (body) {
                                if (typeof body === 'string') meta.body = body.slice(0, MAX_BODY);
                                else if (body instanceof URLSearchParams) meta.body = body.toString();
                                else meta.body = '[non-string body: ' + (typeof body) + ']';
                            }
                        } catch (e) {}

                        this.addEventListener('load', function () {
                            try {
                                var respHeaders = {};
                                (this.getAllResponseHeaders() || '').split(/\\r?\\n/).forEach(function (line) {
                                    var i = line.indexOf(':');
                                    if (i > 0) respHeaders[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
                                });
                                    var text = '';
                                    try { text = this.responseText || ''; } catch(e) {
                                        try { text = '[responseType=' + this.responseType + ']'; } catch(e2) {}
                                    }

                                    if (text && text.length > 0) {
                                        console.log('[MSA-interceptor] XHR SUCCESS: Captured ' + text.length + ' chars for ' + meta.url);
                                    }
                                    var entry = buildEntry(
                                        meta.url, meta.method, meta.headers, meta.body,
                                        this.status, respHeaders,
                                        text, text.length > MAX_BODY_CRITICAL,
                                        Math.round(performance.now() - meta.start), 'xhr'
                                    );
                                    push(entry);
                            } catch (e) {}
                        });

                        this.addEventListener('error', function () {
                            try {
                                var entry = buildEntry(
                                    meta.url, meta.method, meta.headers, meta.body,
                                    0, {}, null, false,
                                    Math.round(performance.now() - meta.start), 'xhr'
                                );
                                entry.responseDetail = 'XHR network error';
                                entry.error = true;
                                push(entry);
                            } catch(e) {}
                        });

                        this.addEventListener('abort', function () {
                            try {
                                var entry = buildEntry(
                                    meta.url, meta.method, meta.headers, meta.body,
                                    0, {}, null, false,
                                    Math.round(performance.now() - meta.start), 'xhr'
                                );
                                entry.responseDetail = 'XHR aborted';
                                entry.error = true;
                                push(entry);
                            } catch(e) {}
                        });
                    }
                    return origSend.apply(this, arguments);
                };

                // ============================================================
                // EARLY REQUEST RECOVERY
                // ============================================================
                (function recoverEarlyRequests() {
                    try {
                        var entries = performance.getEntriesByType('resource');
                        for (var i = 0; i < entries.length; i++) {
                            var e = entries[i];
                            var url = e.name || '';
                            if (!isCriticalEndpoint(url)) continue;
                            var alreadyCaptured = false;
                            for (var j = 0; j < window.__msa_intercepted.length; j++) {
                                if (window.__msa_intercepted[j].url === url) {
                                    alreadyCaptured = true;
                                    break;
                                }
                            }
                            if (alreadyCaptured) continue;
                            push({
                                url: url,
                                method: 'GET',
                                requestHeaders: {},
                                requestBody: null,
                                status: 0,
                                responseHeaders: {},
                                body: null,
                                truncated: false,
                                durationMs: Math.round(e.duration || 0),
                                 via: 'recovered',
                                 t: Date.now(),
                                 critical: true,
                                 responseType: 'recovered_from_performance',
                                 responseDetail: 'Request fired before interceptor was ready — no body captured',
                                 schema: null,
                                 headerDependencies: {},
                                 jwt: null,
                                 initiatorType: e.initiatorType || 'unknown',
                                 recovered: true
                            });
                        }
                    } catch(e) {}
                })();

        })();
        `;

        try {
            var s = document.createElement('script');
            s.textContent = pageScript;
            (document.documentElement || document.head || document.body).appendChild(s);
            s.remove();
        } catch (e) {}
    })();
