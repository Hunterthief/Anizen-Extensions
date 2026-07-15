// ==========================================================
// MASTER TEMPLATE - ANIZEN EXTENSION FRAMEWORK
// ==========================================================
// Copy this file to start a new extension.
// Search for "CHANGE FOR NEW WEBSITE" to find all required modifications.
// ==========================================================

// CHANGE FOR NEW WEBSITE: Update package name
package eu.kanade.tachiyomi.animeextension.en.mysite

// DO NOT MODIFY: Required framework imports
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
import keiyoushi.utils.switchPreference
import okhttp3.Request
import okhttp3.Response
import org.jsoup.nodes.Document
import org.jsoup.nodes.Element
import uy.kohesive.injekt.Injekt
import uy.kohesive.injekt.api.get

// OPTIONAL: Extractor imports (Uncomment as needed)
// import aniyomi.lib.filemoonextractor.FilemoonExtractor
// import aniyomi.lib.mp4uploadextractor.Mp4uploadExtractor
// import aniyomi.lib.streamwishextractor.StreamWishExtractor
// import aniyomi.lib.playlistutils.PlaylistUtils

// CHANGE FOR NEW WEBSITE: Class name
class MySite : AnimeHttpSource(), ConfigurableAnimeSource {

    // ==========================================
    // SECTION 1: CONFIGURATION
    // CHANGE FOR NEW WEBSITE: Name, URL, Language
    // ==========================================
    override val name = "MySite"
    override val baseUrl = "https://mysite.example"
    override val lang = "en"
    override val supportsLatest = true

    // DO NOT MODIFY: Preferences setup
    private val preferences by lazy {
        Injekt.get<Application>().getPreference("mysite_prefs")
    }

    // ==========================================
    // SECTION 2: NETWORKING
    // OPTIONAL: Modify if site requires custom headers
    // ==========================================
    override fun headersBuilder() = super.headersBuilder()
        .add("Referer", baseUrl)
        .add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

    // ==========================================
    // SECTION 3: POPULAR & LATEST
    // CHANGE FOR NEW WEBSITE: URL paths and CSS selectors
    // ==========================================
    override fun popularAnimeRequest(page: Int): Request {
        return GET("$baseUrl/popular?page=$page", headers)
    }

    override fun popularAnimeParse(response: Response): AnimesPage {
        val document = response.asJsoup()
        // CHANGE FOR NEW WEBSITE: CSS Selector for anime cards
        val animes = document.select("div.anime-card").map { element ->
            SAnime.create().apply {
                // CHANGE FOR NEW WEBSITE: CSS Selectors for title, url, image
                title = element.select("a.title").text()
                url = element.select("a").attr("href")
                thumbnail_url = element.select("img").absUrl("src")
            }
        }
        // CHANGE FOR NEW WEBSITE: CSS Selector for next page button
        val hasNextPage = document.select("a.next-page").isNotEmpty()
        return AnimesPage(animes, hasNextPage)
    }

    override fun latestUpdatesRequest(page: Int): Request {
        return GET("$baseUrl/latest?page=$page", headers)
    }

    // DO NOT MODIFY: Usually same as popular parse
    override fun latestUpdatesParse(response: Response): AnimesPage = popularAnimeParse(response)

    // ==========================================
    // SECTION 4: SEARCH
    // CHANGE FOR NEW WEBSITE: Search URL and selectors
    // ==========================================
    override fun searchAnimeRequest(page: Int, query: String, filters: AnimeFilterList): Request {
        // CHANGE FOR NEW WEBSITE: Search endpoint format
        return GET("$baseUrl/search?q=$query&page=$page", headers)
    }

    // DO NOT MODIFY: Usually same as popular parse
    override fun searchAnimeParse(response: Response): AnimesPage = popularAnimeParse(response)

    // ==========================================
    // SECTION 5: ANIME DETAILS
    // CHANGE FOR NEW WEBSITE: Detail page selectors
    // ==========================================
    override fun animeDetailsParse(response: Response): SAnime {
        val document = response.asJsoup()
        return SAnime.create().apply {
            // CHANGE FOR NEW WEBSITE: CSS Selectors for details
            title = document.select("h1.anime-title").text()
            genre = document.select("div.genres a").joinToString(", ") { it.text() }
            description = document.select("div.synopsis").text()
            thumbnail_url = document.select("div.cover img").absUrl("src")
            status = parseStatus(document.select("span.status").text())
        }
    }

    // DO NOT MODIFY: Helper function
    private fun parseStatus(status: String): Int {
        return when (status.lowercase()) {
            "ongoing", "airing" -> SAnime.ONGOING
            "completed", "finished" -> SAnime.COMPLETED
            else -> SAnime.UNKNOWN
        }
    }

    // ==========================================
    // SECTION 6: EPISODES
    // CHANGE FOR NEW WEBSITE: Episode list selectors
    // ==========================================
    override fun episodeListParse(response: Response): List<SEpisode> {
        val document = response.asJsoup()
        // CHANGE FOR NEW WEBSITE: CSS Selector for episode items
        return document.select("div.episode-list a").map { element ->
            SEpisode.create().apply {
                // CHANGE FOR NEW WEBSITE: CSS Selectors for episode details
                name = element.select("span.ep-title").text()
                url = element.attr("href")
                episode_number = element.select("span.ep-num").text().toFloatOrNull() ?: 0F
            }
        }.reversed() // Usually oldest to newest
    }

    // ==========================================
    // SECTION 7: VIDEO EXTRACTION
    // CHANGE FOR NEW WEBSITE: Server parsing and Extractor mapping
    // ==========================================
    override fun extractVideos(episode: SEpisode): List<Video> {
        val document = client.newCall(GET(episode.url, headers)).execute().asJsoup()
        val videoList = mutableListOf<Video>()

        // PATTERN A: Standard Iframe Extraction (Static HTML)
        document.select("div.servers iframe").forEach { iframe ->
            val src = iframe.absUrl("src")
            when {
                src.contains("filemoon") -> {
                    // videoList.addAll(FilemoonExtractor(client).videosFromUrl(src, headers))
                }
            }
        }

        // PATTERN B: Dynamic API Resolution (XHR/Fetch)
        // If the site uses JS to fetch video sources via an API, extract the context
        // (e.g., episode ID, server ID) from the DOM, then construct the API request.
        /*
        val episodeId = document.select("div#player").attr("data-episode-id")
        val servers = document.select("button.server-btn")
        
        servers.forEach { serverElement ->
            val serverId = serverElement.attr("data-server-id")
            val apiUrl = "$baseUrl/api/v1/video/resolve"
            val jsonBody = """{"episode_id":"$episodeId","server_id":"$serverId"}"""
            val requestBody = jsonBody.toRequestBody("application/json".toMediaType())
            
            val apiResponse = client.newCall(POST(apiUrl, headers, requestBody)).execute()
            if (apiResponse.isSuccessful) {
                val json = Json.parseToJsonElement(apiResponse.body.string()).jsonObject
                val sources = json["sources"]?.jsonArray
                
                sources?.forEach { sourceElement ->
                    val source = sourceElement.jsonObject
                    val videoUrl = source["url"]?.jsonPrimitive?.content ?: return@forEach
                    val quality = source["quality"]?.jsonPrimitive?.content ?: "Auto"
                    
                    videoList.add(Video(videoUrl, quality, videoUrl, headers))
                }
            }
        }
        */

        return videoList
    }

    // ==========================================
    // SECTION 8: PREFERENCES
    // OPTIONAL: Add settings if the site needs them
    // ==========================================
    override fun setupPreferenceScreen(screen: PreferenceScreen) {
        screen.preferenceScreen {
            switchPreference {
                key = "pref_quality_1080"
                title = "Prefer 1080p"
                defaultValue = true
            }
        }
    }
}
