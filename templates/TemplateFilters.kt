// ==========================================================
// FILTERS TEMPLATE - ANIZEN EXTENSION FRAMEWORK
// ==========================================================
// Copy this file if the target website supports advanced search filters.
// ==========================================================

// CHANGE FOR NEW WEBSITE: Update package name
package eu.kanade.tachiyomi.animeextension.en.mysite

import eu.kanade.tachiyomi.animesource.model.AnimeFilter
import eu.kanade.tachiyomi.animesource.model.AnimeFilterList

// DO NOT MODIFY: Helper class. Explicitly inherits from AnimeFilter.Select<String>
open class UriPartFilter(displayName: String, private val vals: Array<Pair<String, String>>) :
    AnimeFilter.Select<String>(displayName, vals.map { it.first }.toTypedArray()) {
    fun toUriPart() = vals[state].second
}

// CHANGE FOR NEW WEBSITE: Define specific filter classes. MUST be public (no 'private' modifier)
class GenreFilter : UriPartFilter(
    "Genre",
    arrayOf(
        Pair("All", ""),
        Pair("Action", "action"),
        Pair("Comedy", "comedy"),
        Pair("Romance", "romance"),
    )
)

// DO NOT MODIFY: Object to hold all filters
object MySiteFilters {
    fun getFilterList(): AnimeFilterList {
        return AnimeFilterList(
            AnimeFilter.Header("Text search ignores filters"),
            GenreFilter()
        )
    }
}
