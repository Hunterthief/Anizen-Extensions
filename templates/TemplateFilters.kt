// ==========================================================
// FILTERS TEMPLATE - ANIZEN EXTENSION FRAMEWORK
// ==========================================================
// Copy this file if the target website supports advanced search filters.
// ==========================================================

// CHANGE FOR NEW WEBSITE: Update package name
package eu.kanade.tachiyomi.animeextension.en.mysite

// DO NOT MODIFY: Required imports
import eu.kanade.tachiyomi.animesource.model.AnimeFilter
import eu.kanade.tachiyomi.animesource.model.AnimeFilterList

// DO NOT MODIFY: Helper class for translating filter selection to URL params
abstract class SelectFilter(
    displayName: String,
    private val options: Array<Pair<String, String>>,
) : AnimeFilter.Select<String>(
    displayName,
    options.map { it.first }.toTypedArray(),
) {
    val selectedValue: String
        get() = options[state].second
}

// CHANGE FOR NEW WEBSITE: Define specific filter classes based on site options
class GenreFilter : SelectFilter(
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
            GenreFilter(),
        )
    }
}
