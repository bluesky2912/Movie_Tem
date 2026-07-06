<?php
// config/tmdb.php
// The TMDB API key lives ONLY here on the server. Nothing client-facing
// (app.js, watchlist.php, etc.) should ever hardcode or echo this key.

class TMDBEngine {
    private $apiKey = "c3f516a959eb68a8f6f6a9ca68f1481f";
    private $baseUrl = "https://api.themoviedb.org/3/";

    private function fetchFromTMDB($endpoint, $queryParams = []) {
        $queryParams['api_key'] = $this->apiKey;

        $queryString = http_build_query($queryParams);
        $url = $this->baseUrl . $endpoint . '?' . $queryString;

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($response === false) {
            return ['error' => 'Network transmission failure'];
        }

        $decoded = json_decode($response, true);

        if ($httpCode >= 400) {
            return ['error' => $decoded['status_message'] ?? 'TMDB request failed'];
        }

        return $decoded;
    }

    /**
     * Discover movies matching a mood-mapped genre filter.
     */
    public function getMoviesByMood($genreId) {
        $params = [
            'with_genres'   => $genreId,
            'sort_by'       => 'popularity.desc',
            'include_adult' => 'false',
            'page'          => 1
        ];
        return $this->fetchFromTMDB('discover/movie', $params);
    }

    public function getTrendingMovies() {
        return $this->fetchFromTMDB('trending/movie/day');
    }

    /**
     * Full details for a single movie, including trailer info, for the
     * details modal. Used server-side so the API key never reaches the browser.
     */
    public function getMovieDetails($movieId) {
        return $this->fetchFromTMDB('movie/' . (int) $movieId, [
            'append_to_response' => 'videos'
        ]);
    }
}
