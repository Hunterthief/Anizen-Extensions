Configuration Guide
build.gradle

Every extension requires a standard build.gradle file. It must define the plugin, Android namespace, and dependencies.

apply plugin: 'com.android.application'apply plugin: 'kotlin-android'apply plugin: 'kotlinx-serialization'ext {    extName = 'MySite'    pkgName = 'eu.kanade.tachiyomi.animeextension.en.mysite'    extClass = '.MySite'    extVersionCode = 1}dependencies {    // Include core utilities    implementation(project(':core'))    // Include specific extractors used by the site    implementation(project(':lib-filemoonextractor'))    implementation(project(':lib-mp4uploadextractor'))}apply from: "$rootProject.projectDir/gradle/common.gradle"

AndroidManifest.xml (Optional)

Only required if the website supports deep-linking (e.g., opening the app from a browser link). Use the UrlActivity pattern.
