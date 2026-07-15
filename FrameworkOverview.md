Master Framework Design
COMMON CODE (Do Not Modify)

    keiyoushi.utils.*: Core network, JSON, and preference utilities.
    aniyomi.lib.*: Shared video extractors.
    Framework interfaces and base structures defined in MasterTemplate.kt.

SITE-SPECIFIC CODE (Change For New Website)

    build.gradle: Package name, extension class, dependencies.
    *Source.kt: The main adapter class extending MasterTemplate.
    *Dto.kt: Website-specific JSON data transfer objects.
    *Filters.kt: Search and genre filter definitions.

OPTIONAL MODULES

    UrlActivity.kt: Deep linking support (if the website supports it).
    *Interceptor.kt: Custom OkHttp interceptors for anti-bot measures (e.g., Miruro's Browser Fingerprint).
    *Extractor.kt: Custom video extractors for niche hosts not covered by lib/.

Abstraction Justification

Every reusable component exists outside the extension to ensure a new extension requires zero boilerplate. By isolating networking and parsing into strict override methods, an AI can generate an extension by simply looking at a target website's HTML and writing Jsoup selectors, relying entirely on the framework for HTTP execution and video extraction.
