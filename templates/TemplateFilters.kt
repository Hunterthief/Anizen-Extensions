// ==========================================================
// FILTERS TEMPLATE - ANIZEN EXTENSION FRAMEWORK
// ==========================================================
// Copy this file if the target website supports advanced search filters.
// ==========================================================

// CHANGE FOR NEW WEBSITE: Update package name
package eu.kanade.tachiyomi.animeextension.en.mysite

import eu.kanade.tachiyomi.animesource.model.AnimeFilter
import eu.kanade.tachiyomi.animesource.model.AnimeFilterList

object MySiteFilters {
    fun getFilterList(): AnimeFilterList = AnimeFilterList(
        AnimeFilter.Header("Text search ignores filters"),
        GenreFilter()
    )

    // CRITICAL: MUST BE PUBLIC (no 'private' modifier) so the main extension class can access it
    class GenreFilter : UriPartFilter(
        "Genre",
        arrayOf(
            Pair("All", ""),
            Pair("Action", "action"),
            Pair("Comedy", "comedy"),
            Pair("Romance", "romance"),
        )
    )

    // CRITICAL: MUST explicitly inherit from AnimeFilter.Select<String> to satisfy Kotlin's type inference
    open class UriPartFilter(displayName: String, private val vals: Array<Pair<String, String>>) :
        AnimeFilter.Select<String>(displayName, vals.map { it.first }.toTypedArray()) {
        fun toUriPart() = vals[state].second
    }
}
