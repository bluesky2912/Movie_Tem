<?php
// api/get_recommendations.php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
require_once '../config/database.php';
require_once '../config/tmdb.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['status' => 'guest', 'movies' => []]);
    exit;
}

$userId = $_SESSION['user_id'];

try {
    $db = (new Database())->getConnection();
    $tmdb = new TMDBEngine();

    // Read cached genre data straight from the DB — no per-movie TMDB calls
    $stmt = $db->prepare(
        "SELECT movie_id, rating, genre_ids FROM movie_ratings
         WHERE user_id = ? AND rating >= 4 AND genre_ids IS NOT NULL AND genre_ids != ''
         ORDER BY rating DESC, created_at DESC
         LIMIT 20"
    );
    $stmt->execute([$userId]);
    $topRated = $stmt->fetchAll();

    if (empty($topRated)) {
        echo json_encode(['status' => 'not_enough_data', 'movies' => []]);
        exit;
    }

    // Weighted genre affinity — a 5-star movie counts more than a 4-star one
    $genreScores = [];
    foreach ($topRated as $row) {
        $genreIds = array_filter(explode(',', $row['genre_ids']));
        foreach ($genreIds as $gid) {
            $genreScores[$gid] = ($genreScores[$gid] ?? 0) + (int) $row['rating'];
        }
    }

    if (empty($genreScores)) {
        echo json_encode(['status' => 'not_enough_data', 'movies' => []]);
        exit;
    }

    arsort($genreScores);
    $topGenreIds = array_slice(array_keys($genreScores), 0, 3);

    // Exclude anything already rated or watchlisted
    $excludeStmt = $db->prepare(
        "SELECT tmdb_movie_id FROM (
            SELECT movie_id AS tmdb_movie_id FROM movie_ratings WHERE user_id = ?
            UNION
            SELECT tmdb_movie_id FROM watchlist WHERE user_id = ?
         ) AS seen"
    );
    $excludeStmt->execute([$userId, $userId]);
    $excludeIds = array_map('intval', array_column($excludeStmt->fetchAll(), 'tmdb_movie_id'));

    // Pull each top genre separately and interleave results, so one dominant
    // genre in your ratings doesn't flood every recommendation slot.
    $perGenreResults = [];
    foreach ($topGenreIds as $genreId) {
        $response = $tmdb->getMoviesByGenres([$genreId]);
        $candidates = $response['results'] ?? [];
        $filtered = array_values(array_filter($candidates, function ($movie) use ($excludeIds) {
            return !in_array($movie['id'], $excludeIds, true);
        }));
        $perGenreResults[] = $filtered;
    }

    // Round-robin interleave: one from genre A, one from B, one from C, repeat
    $interleaved = [];
    $seenMovieIds = [];
    $maxLen = max(array_map('count', $perGenreResults));
    for ($i = 0; $i < $maxLen; $i++) {
        foreach ($perGenreResults as $genreList) {
            if (isset($genreList[$i])) {
                $movie = $genreList[$i];
                if (!in_array($movie['id'], $seenMovieIds, true)) {
                    $interleaved[] = $movie;
                    $seenMovieIds[] = $movie['id'];
                }
            }
        }
    }

    echo json_encode(['status' => 'success', 'movies' => array_slice($interleaved, 0, 12)]);
} catch (Exception $e) {
    error_log('get_recommendations error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['status' => 'error', 'movies' => []]);
}