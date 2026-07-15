# Networking Guide

## Standard Requests
All HTTP requests should use `GET` or `POST` from `eu.kanade.tachiyomi.network`.
The `client` and `headers` properties are provided by `AnimeHttpSource`.

```kotlin
override fun popularAnimeRequest(page: Int): Request {
    return GET("$baseUrl/popular?page=$page", headers)
}
