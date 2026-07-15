Architecture Report
Stage 1-5: Ecosystem Analysis
Core Utilities (keiyoushi.utils)

The ecosystem relies heavily on a core utility package. Network.kt provides networkClient and defaultUserAgentProvider. Json.kt wraps kotlinx.serialization. Preferences.kt provides a DSL for building preference screens. NextJs.kt, GraphQL.kt, and Crypto.kt handle specific recurring web patterns. These are perfectly designed for reuse and belong in the framework's foundation.
Reference Extensions (AV1Encodes, AllAnime, AniWave, etc.)

Extensions generally extend AnimeHttpSource and optionally ConfigurableAnimeSource. The primary workflow always consists of: Search -> Details -> Episodes -> Video Extraction.

    Common Architecture: HTTP requests returning Jsoup Document or JSON. DTOs mapped via @Serializable. Video extraction delegated to shared libraries.
    Common Anti-patterns: Copy-pasting Cloudflare bypass logic, hardcoding user agents, and failing to use UrlUtils.kt for absolute URL resolution.
    Site-Specific: URL paths, DOM selectors, JSON schema structures, and obfuscation algorithms.

Shared Libraries (lib/)

The ecosystem contains robust extractors for nearly every major video host (Filemoon, Mp4Upload, StreamWish, etc.). PlaylistUtils is critical for standardizing m3u8 HLS streams and subtitles. Unpacker handles JavaScript-packed payloads. These libraries are the backbone of video delivery and must be directly referenced by the framework.
MultiSrc (lib-multisrc/)

Themes like AnimeKaiTheme and AnikotoTheme reduce duplication for site clones. While useful, the framework prioritizes composition over deep inheritance hierarchies. MultiSrc patterns inform how we build adapters, but the Master Framework prefers isolated adapters using shared utilities rather than forcing extensions into rigid base classes unless multiple identical sites exist.
Stage 6: Architecture Report
Component Diagram

[AniZen App] <-> [Extension Adapter] <-> [Framework Core]
                                        ├─ [Networking Utils]
                                        ├─ [Parsing Utils]
                                        ├─ [Extractors (lib/)]
                                        └─ [Models / DTOs]

### Workflows
1. **Search**: App calls `searchAnimeRequest`. Adapter builds URL -> HTTP GET -> `searchAnimeParse` maps DOM/JSON -> `AnimesPage`.
2. **Anime**: App calls `animeDetailsRequest`. HTTP GET -> `animeDetailsParse` fills `SAnime`.
3. **Episodes**: App calls `episodeListRequest`. HTTP GET -> `episodeListParse` maps list -> `List<SEpisode>`.
4. **Streaming**: App calls `extractVideos`. HTTP GET episode page -> Parse server list -> Map server name to Extractor -> `List<Video>`.

### Strengths & Weaknesses
- **Strengths**: Powerful existing extractor libraries. Standardized `SAnime`/`SEpisode` models.
- **Weaknesses**: High boilerplate. Inconsistent error handling. Developers often reimplement utility functions.
- **Improvements**: Centralize boilerplate into `MasterTemplate`. Enforce use of `UrlUtils`. Standardize extractor mapping via a predictable interface.
