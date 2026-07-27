# Video Provider Feasibility & Stability Assessment

## Context

I am building a multi-provider Aniyomi anime extension. My architecture has a
`VideoProvider` interface with a single method:

    suspend fun fetchVideos(anime: SAnime, episode: SEpisode): List<Video>

Each provider receives an `EpisodeMeta` containing:
- `anilistId: Int` (AniList database ID)
- `malId: Int` (MyAnimeList database ID)
- `epNum: Int` (episode number)
- `title: String` (anime title, URL-decoded)

The provider must return playable `Video` objects (direct .m3u8 HLS URLs,
.mp4 URLs, or .mpd DASH manifests that ExoPlayer can play natively).

I have access to these shared libraries:
- PlaylistUtils (HLS .m3u8 extraction)
- FilemoonExtractor, StreamWishExtractor, Mp4uploadExtractor
- DoodExtractor, GogoStreamExtractor, StreamlareExtractor, OkruExtractor
- JsUnpacker (packed JavaScript unpacking)

## Your Task

I will provide you with the full source code of an existing Aniyomi/Tachiyomi
anime extension. Analyze it and answer the following:

### 1. DIFFICULTY RATING (1-10)

Rate how hard it would be to extract a working video provider from this
extension's logic, where:
- 1 = Trivial (single API call returns a direct .m3u8/.mp4 URL)
- 3 = Easy (2-3 steps: search → episode page → video URL, all plain HTTP)
- 5 = Medium (requires HTML parsing, multiple AJAX calls, or cookie sessions)
- 7 = Hard (requires JS execution, packed code unpacking, or token generation)
- 9 = Very Hard (AES/encryption, WASM, browser fingerprinting, captcha)
- 10 = Impractical (requires full WebView, constantly rotating keys)

### 2. STABILITY RATING (1-10)

Rate how likely the site's video delivery logic is to break, where:
- 10 = Rock solid (public CDN, no auth, URL structure hasn't changed in years)
- 8 = Stable (simple API, no encryption, standard patterns)
- 6 = Moderate (occasional domain changes, but logic stays the same)
- 4 = Fragile (frequent endpoint changes, rotating tokens)
- 2 = Very fragile (encrypted responses, keys rotate weekly, JS obfuscation)
- 1 = Nightmare (WASM-based, browser fingerprinting, changes monthly)

### 3. EXTRACTION FLOW

Describe the exact step-by-step network flow needed to go from
(anilistId OR title + episode number) → playable video URL.

Format:  Step 1: [METHOD] [URL pattern] → [what you get]
Step 2: [METHOD] [URL pattern] → [what you get]
...
Step N: Final output = [type of URL]
### 4. RED FLAGS

List anything that signals this will break or is hard to maintain:
- Encrypted/encoded responses (AES, XOR, base64 chains, custom encoding)
- JavaScript execution requirements (eval, WASM, packed JS)
- Token/key rotation (JWT with short expiry, rotating secrets)
- Cloudflare/DDoS-Guard challenges
- Domain rotation history
- Browser fingerprinting or captcha
- Dependencies on specific User-Agent strings or cookies
- WebSocket requirements
- Any hardcoded hashes, persisted queries, or version-pinned endpoints

### 5. GREEN FLAGS

List anything that signals this will be stable and easy:
- Direct CDN URLs (no auth, no tokens)
- Standard REST API with JSON responses
- Public API documented or used by multiple projects
- Simple HTML with stable CSS selectors
- No JavaScript required for video URL extraction
- Multiple mirror domains (redundancy)
- Uses AniList/MAL IDs directly (no title search needed)

### 6. VERDICT

One paragraph: Should I add this as a provider? Is it worth the maintenance
burden? How often will I likely need to fix it?

### 7. MINIMAL PROVIDER SKELETON

If difficulty ≤ 6, write a minimal Kotlin provider skeleton (just the
fetchVideos method body with the actual HTTP calls) showing the happy path.
Skip error handling. I just want to see if it's 10 lines or 200 lines.

---

"## Files to analyze:
