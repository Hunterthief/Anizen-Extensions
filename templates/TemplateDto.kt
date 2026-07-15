// ==========================================================
// DTO TEMPLATE - ANIZEN EXTENSION FRAMEWORK
// ==========================================================
// Copy this file if the target website uses a JSON API (REST/GraphQL).
// ==========================================================

// CHANGE FOR NEW WEBSITE: Update package name
package eu.kanade.tachiyomi.animeextension.en.mysite

// DO NOT MODIFY: Required serialization imports
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// CHANGE FOR NEW WEBSITE: Define JSON structure to match website API
@Serializable
data class SearchResponseDto(
    @SerialName("results") val results: List<AnimeDto> = emptyList(),
    @SerialName("hasNextPage") val hasNextPage: Boolean = false,
)

@Serializable
data class AnimeDto(
    @SerialName("title") val title: String,
    @SerialName("slug") val slug: String, // Used to build URL
    @SerialName("cover") val cover: String? = null,
)

// Usage example in Main Source:
// val dto = response.parseAs<SearchResponseDto>()
// val animes = dto.results.map { item ->
//     SAnime.create().apply {
//         title = item.title
//         url = "/anime/${item.slug}"
//         thumbnail_url = item.cover
//     }
// }
