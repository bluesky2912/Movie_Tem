<?php
// config/tmdb.php
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

    public function getMoviesByMood($mood) {
        $moodToGenreMap = [
            'HAPPY'        => '35',
            'MINDBENDING'  => '9648,878',
            'MIND-BENDING' => '9648,878',
            'HORROR'       => '27',
            'HORRORNIGHT'  => '27',
            'HORROR NIGHT' => '27',
            'MOTIVATIONAL' => '18,36',
            'RAINY'        => '10751,16',
            'RAINYDAY'     => '10751,16',
            'RAINY DAY'    => '10751,16',
            'SCIFI'        => '878',
            'SCI-FI'       => '878',
            'ACTION'       => '28',
            'DEEP'         => '18,9648',
            'ROMANTIC'     => '10749',
            'CHILL'        => '35,14',
            'NOSTALGIC'    => '10751,36',
            'SAD'          => '18'
        ];

        $normalizedMood = strtoupper(trim($mood));
        $normalizedMoodClean = str_replace([' ', '-'], '', $normalizedMood);

        if (isset($moodToGenreMap[$normalizedMoodClean])) {
            $genreId = $moodToGenreMap[$normalizedMoodClean];
        } else {
            $genreId = isset($moodToGenreMap[$normalizedMood]) ? $moodToGenreMap[$normalizedMood] : '35';
        }

        return $this->fetchFromTMDB('discover/movie', [
            'with_genres'   => $genreId,
            'sort_by'       => 'popularity.desc',
            'include_adult' => 'false',
            'page'          => 1
        ]);
    }

    public function searchMovies($query) {
        return $this->fetchFromTMDB('search/movie', [
            'query'         => $query,
            'include_adult' => 'false',
            'language'      => 'en-US',
            'page'          => 1
        ]);
    }

    public function getTrendingMovies() {
        return $this->fetchFromTMDB('trending/movie/day');
    }

    public function getMovieDetails($movieId) {
        // Appending watch/providers directly filters streaming locations seamlessly
        return $this->fetchFromTMDB('movie/' . (int) $movieId, [
            'append_to_response' => 'videos,watch/providers'
        ]);
    }
}