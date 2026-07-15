### AniZen Master Framework
Purpose

This framework is the permanent foundation for generating AniZen/AniYomi anime extensions. It is designed to abstract recurring logic, network utilities, and extraction patterns into reusable modules, allowing new extensions to be built by implementing only website-specific adapters.
Philosophy

    Architecture over Volume: A cleaner architecture is always preferred over more code.
    AI-First Design: Code structure, naming, and file separation are strictly predictable to allow AI models to immediately understand where to implement logic.
    Isolation: Website-specific logic is quarantined to the site adapter. Everything else is reusable.
    Evolutionary: The framework is built to be expanded upon as new websites and patterns are encountered, without requiring revolutionary redesigns.

Workflow for New Extensions

    Copy MasterTemplate.kt.
    Update build.gradle and package names.
    Modify configuration (Name, Base URL, Language).
    Implement website-specific networking (Requests).
    Implement website-specific parsing (Jsoup/JSON).
    Map video servers to standard Extractors.
    Build and install.
