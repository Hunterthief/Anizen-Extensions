// ==========================================================
// MASTER TEMPLATE - ANIZEN EXTENSION FRAMEWORK
// ==========================================================
// This file serves as the canonical structure for all extensions.
// Comments indicate exactly what to modify for a new website.
// ==========================================================

// CHANGE FOR NEW WEBSITE: Update package name to match site
package eu.kanade.tachiyomi.animeextension.en.mysite

// DO NOT MODIFY: Standard framework imports
import android.app.Application
import eu.kanade.tachiyomi.animesource.ConfigurableAnimeSource
import eu.kanade.tachiyomi.animesource.model.AnimeFilterList
import eu.kanade.tachiyomi.animesource.model.AnimesPage
import eu.kanade.tachiyomi.animesource.model.SAnime
import eu.kanade.tachiyomi.animesource.model.SEpisode
import eu.kanade.tachiyomi.animesource.model.Video
import eu.kanade.tachiyomi.animesource.online.AnimeHttpSource
import eu.kanade.tachiyomi.network.GET
import eu.kanade.tachiyomi.network.POST
import keiyoushi.utils.getPreference
import keiyoushi.utils.preferenceScreen
import keiyoushi.utils.toHtmlSpanned
import okhttp3.Request
import okhttp3.Response
import org.jsoup.nodes.Document
import org.jsoup.nodes.Element
import uy.kohesive.injekt.Injekt
import uy.kohesive.injekt.api.get

// OPTIONAL: Extractor imports (Uncomment as needed based on target site)
// import aniyomi.lib.filemoonextractor.FilemoonExtractor
// import aniyomi.lib.mp4uploadextractor.Mp4uploadExtractor
// import aniyomi.lib.streamwishextractor.StreamWishExtractor
// import aniyomi.lib.playlistutils.PlaylistUtils

// CHANGE FOR NEW WEBSITE: Class name
class MySite : AnimeHttpSource(), ConfigurableAnimeSource {

    // ==========================================
    // SECTION 1: CONFIGURATION
    // CHANGE FOR NEW WEBSITE
    // ==========================================
    override val name = "MySite"
    override val baseUrl = "https://mysite.example"
    override val lang = "en"
    override val supportsLatest = true

    // DO NOT MODIFY: Standard preferences initialization
    private val preferences by lazy {
        Injekt.get<Application>().getPreference("mysite_prefs")
    }

    // ==========================================
    // SECTION 2: NETWORKING
    // OPTIONAL: Modify if site requires custom headers or Cloudflare
    // ==========================================
    override fun headersBuilder() = super.headersBuilder()
        .add("Referer", baseUrl)
        // .add("User-Agent", "Mozilla/5.0 ...")

    // ==========================================
    // SECTION 3: POPULAR & LATEST
    // CHANGE FOR NEW WEBSITE: URL paths and selectors
    // ==========================================
    override fun popularAnimeRequest(page: Int): Request {
        return GET("$baseUrl/popular?page=$page", headers)
    }

    override fun popularAnimeParse(response: Response): AnimesPage {
        val document = response.asJsoup()
        val animes = document.select("div.anime-card").map { element ->
            SAnime.create().apply {
                title = element.select("a.title").text()
                url = element.select("a").attr("href")
                thumbnail_url = element.select("img").absUrl("src")
            }
        }
        val hasNextPage = document.select("a.next-page").isNotEmpty()
        return AnimesPage(animes, hasNextPage)
    }

    override fun latestUpdatesRequest(page: Int): Request {
        return GET("$baseUrl/latest?page=$page", headers)
    }

    override fun latestUpdatesParse(response: Response): AnimesPage = popularAnimeParse(response)

    // ==========================================
    // SECTION 4: SEARCH
    // CHANGE FOR NEW WEBSITE: Search URL and selectors
    // ==========================================
    override fun searchAnimeRequest(page: Int, query: String, filters: AnimeFilterList): Request {
        return GET("$baseUrl/search?q=$query&page=$page", headers)
    }

    override fun searchAnimeParse(response: Response): AnimesPage = popularAnimeParse(response)

    // ==========================================
    // SECTION 5: ANIME DETAILS
    // CHANGE FOR NEW WEBSITE: Detail page selectors
    // ==========================================
    override fun animeDetailsParse(response: Response): SAnime {
        val document = response.asJsoup()
        return SAnime.create().apply {
            title = document.select("h1.anime-title").text()
            genre = document.select("div.genres a").joinToString(", ") { it.text() }
            description = document.select("div.synopsis").text()
            thumbnail_url = document.select("div.cover img").absUrl("src")
            status = parseStatus(document.select("span.status").text())
        }
    }

    private fun parseStatus(status: String): Int {
        return when (status.lowercase()) {
            "ongoing" -> SAnime.ONGOING
            "completed" -> SAnime.COMPLETED
            else -> SAnime.UNKNOWN
        }
    }

    // ==========================================
    // SECTION 6: EPISODES
    // CHANGE FOR NEW WEBSITE: Episode list selectors
    // ==========================================
    override fun episodeListParse(response: Response): List<SEpisode> {
        val document = response.asJsoup()
        return document.select("div.episode-list a").map { element ->
            SEpisode.create().apply {
                name = element.select("span.ep-title").text()
                url = element.attr("href")
                episode_number = element.select("span.ep-num").text().toFloatOrNull() ?: 0F
            }
        }.reversed()
    }

    // ==========================================
    // SECTION 7: VIDEO EXTRACTION
    // CHANGE FOR NEW WEBSITE: Server parsing and Extractor mapping
    // ==========================================
    override fun extractVideos(episode: SEpisode): List<Video> {
        val document = client.newCall(GET(episode.url, headers)).execute().asJsoup()
        val videoList = mutableListOf<Video>()

        // Example: Extracting an iframe and passing to an extractor
        document.select("div.servers iframe").forEach { iframe ->
            val src = iframe.absUrl("src")
            when {
                // OPTIONAL: Map to extractors based on URL domain
                src.contains("filemoon") -> {
                    // videoList.addAll(FilemoonExtractor(client).videosFromUrl(src, headers))
                }
                src.contains("mp4upload") -> {
                    // videoList.addAll(Mp4uploadExtractor(client).videosFromUrl(src, headers))
                }
            }
        }
        return videoList
    }

    // ==========================================
    // SECTION 8: PREFERENCES (OPTIONAL)
    // DO NOT MODIFY unless settings are needed
    // ==========================================
    override fun setupPreferenceScreen(screen: PreferenceScreen) {
        // Example preference
        // screen.preferenceScreen {
        //     switchPreference {
        //         key = "pref_quality"
        //         title = "Prefer 1080p"
        //         defaultValue = true
        //     }
        // }
    }
}
