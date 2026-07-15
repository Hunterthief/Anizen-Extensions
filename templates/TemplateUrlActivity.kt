// ==========================================================
// URL ACTIVITY TEMPLATE - ANIZEN EXTENSION FRAMEWORK
// ==========================================================
// Copy this file if you want to support deep-linking (opening anime
// directly from a browser link into the AniZen app).
// Requires matching AndroidManifest.xml setup.
// ==========================================================

// CHANGE FOR NEW WEBSITE: Update package name
package eu.kanade.tachiyomi.animeextension.en.mysite

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import eu.kanade.tachiyomi.animesource.AnimeSource
import eu.kanade.tachiyomi.extension.api.AnimeExtensionManager
import uy.kohesive.injekt.Injekt
import uy.kohesive.injekt.api.get
import eu.kanade.tachiyomi.data.notification.NotificationReceiver

class MySiteUrlActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // DO NOT MODIFY: Extract path from intent
        val path = intent.data?.path ?: return finish()
        val query = intent.data?.query ?: ""
        
        // CHANGE FOR NEW WEBSITE: Match the deep link structure
        // e.g., if link is https://mysite.example/watch/slug-123?ep=1
        // path will be "/watch/slug-123"
        val animeUrl = path // Adjust as needed

        // DO NOT MODIFY: Find source and open anime
        val source = Injekt.get<AnimeExtensionManager>().installedSources.firstOrNull { it is MySite } as? AnimeSource ?: return finish()
        
        val intent = NotificationReceiver.openAnimeIntent(context = this, animeUrl = animeUrl, sourceId = source.id)
        startActivity(intent)
        finish()
    }
}
