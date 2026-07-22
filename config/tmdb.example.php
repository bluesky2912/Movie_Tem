<?php
// config/tmdb.php
class TMDBEngine {
    private $apiKey = "c3f516a959eb68a8f6f6a9ca68f1481f";
    private $baseUrl = "https://api.themoviedb.org/3/";

    public function getMoviesByGenres($genreIds) {
        // Pipe ("|") means OR — any movie matching at least one of these genres
        return $this->fetchFromTMDB('discover/movie', [
            'with_genres'    => implode('|', $genreIds),
            'sort_by'        => 'vote_average.desc',
            'vote_count.gte' => 200, // filters out obscure/low-signal titles
            'include_adult'  => 'false',
            'page'           => 1
        ]);
    }
    private function fetchFromTMDB($endpoint, $queryParams = [], $attempt = 1) {
        $queryParams['api_key'] = $this->apiKey;
        $queryString = http_build_query($queryParams);
        $url = $this->baseUrl . $endpoint . '?' . $queryString;

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 12);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 8);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        // These three options work around a common cause of cURL error 35
        // ("Recv failure: Connection was reset") on older/Windows PHP
        // builds — an outdated OpenSSL/cURL pairing failing to negotiate
        // TLS or HTTP/2 correctly with modern APIs.
        curl_setopt($ch, CURLOPT_SSLVERSION, CURL_SSLVERSION_TLSv1_2);
        curl_setopt($ch, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4);
        curl_setopt($ch, CURLOPT_HTTP_VERSION, CURL_HTTP_VERSION_1_1);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErrNo = curl_errno($ch);
        $curlErrMsg = curl_error($ch);
        curl_close($ch);

        // Transient failure — connection dropped, timed out, or DNS blipped.
        // Retry twice with a short backoff before giving up, since these
        // usually succeed on the second or third try rather than being a
        // permanent problem.
        $isTransportFailure = ($response === false);
        $isTransientHttpError = in_array($httpCode, [429, 502, 503, 504], true);

        if (($isTransportFailure || $isTransientHttpError) && $attempt < 3) {
            usleep(300000 * $attempt); // 0.3s, then 0.6s
            return $this->fetchFromTMDB($endpoint, $queryParams, $attempt + 1);
        }

        if ($response === false) {
            // Surface the real cURL failure reason (DNS, SSL cert, timeout,
            // connection refused, etc.) instead of a generic message — this
            // is what actually tells us what's wrong with the server's
            // outbound connection to TMDB.
            error_log("TMDB cURL failure after {$attempt} attempt(s) (errno {$curlErrNo}): {$curlErrMsg} — URL: {$url}");
            return ['error' => "Network transmission failure after {$attempt} attempts: [{$curlErrNo}] {$curlErrMsg}"];
        }

        $decoded = json_decode($response, true);
        if ($httpCode >= 400) {
            error_log("TMDB HTTP {$httpCode} after {$attempt} attempt(s) — URL: {$url} — Body: {$response}");
            return ['error' => ($decoded['status_message'] ?? 'TMDB request failed') . " (HTTP {$httpCode})"];
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