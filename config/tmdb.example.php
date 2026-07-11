<?php
// config/tmdb.example.php (Commit this, NOT your real tmdb.php!)
class TMDBEngine {
    private $apiKey = "YOUR_TMDB_API_KEY_HERE";
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

    public function getMoviesByMood($mood) {
        // ... same as your real file ...
    }

    public function searchMovies($query) {
        // ... same as your real file ...
    }

    public function getTrendingMovies() {
        return $this->fetchFromTMDB('trending/movie/day');
    }

    public function getMovieDetails($movieId) {
        return $this->fetchFromTMDB('movie/' . (int) $movieId, [
            'append_to_response' => 'videos,watch/providers'
        ]);
    }
}