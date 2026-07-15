AI Implementation Guide

This document provides strict instructions for an AI model tasked with generating a new AniZen extension using the Master Framework.
Objective

Generate a fully functional AniZen extension for the target website by leveraging the provided templates and reference dataset.
Step 1: Analyze Target Website

    Inspect the target website's HTML structure for search results, anime details, and episode lists.
    Identify the video server domains (e.g., Filemoon, Mp4Upload, custom players).
    Determine if the site uses standard HTML or a JSON API.

Step 2: Project Setup

    Copy template_build.gradle. Rename mysite to the target site name. Update extName.
    Uncomment the necessary lib-* dependencies in build.gradle based on the video servers identified in Step 1.
    Copy MasterTemplate.kt. Rename the class and package.

Step 3: Implement Core Logic

Using the target website's DOM/API, fill in the // CHANGE FOR NEW WEBSITE sections in MasterTemplate.kt:

    Configuration: Set name, baseUrl, lang.
    Popular/Latest/Search: Implement Request builders (URL formatting) and Parse methods (Jsoup selectors or JSON DTO mapping).
    Details: Map the detail page elements to SAnime fields.
    Episodes: Map the episode list to SEpisode objects. Ensure correct URL extraction.
    Video Extraction: 
        Select the iframe/server elements from the episode page.
        Extract the src attribute (use absUrl("src")).
        Pass the URL to the corresponding extractor library (e.g., FilemoonExtractor(client).videosFromUrl(src, headers)).

Step 4: Advanced Features (If Needed)

    Filters: If the site has genre filters, copy TemplateFilters.kt, define the options, and integrate into searchAnimeRequest.
    DTOs: If the site is API-driven, copy TemplateDto.kt, map the JSON, and use response.parseAs<T>() in the parse methods.
    Deep Linking: If the site supports sharing URLs, copy TemplateUrlActivity.kt and create the AndroidManifest.xml.

Rules for AI

    NEVER write custom video extraction logic if a shared library exists in lib/.
    NEVER use relative URLs in final outputs; always use absUrl() or build absolute paths with baseUrl.
    NEVER invent utility functions; rely strictly on keiyoushi.utils and the standard AnimeHttpSource methods.
    Prefer Jsoup CSS selectors over regex whenever possible for HTML parsing.
