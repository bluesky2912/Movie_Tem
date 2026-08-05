<?php
// api/get_favorites_showcase.php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
require_once '../config/database.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['status' => 'guest', 'movies' => []]);
    exit;
}

try {
    $db = (new Database())->getConnection();

    // Poster/title/rating data lives on watchlist (cached at save-time);
    // whether it was actually loved lives on movie_ratings. Join them so
    // "rated 4+ AND marked watched" only surfaces movies that are both.
    $stmt = $db->prepare(
        "SELECT w.tmdb_movie_id, w.title, w.poster_path, w.vote_average, w.release_date, r.rating
         FROM watchlist w
         INNER JOIN movie_ratings r ON r.movie_id = w.tmdb_movie_id AND r.user_id = w.user_id
         WHERE w.user_id = :uid AND w.is_watched = 1 AND r.rating >= 4
         ORDER BY r.rating DESC, r.created_at DESC
         LIMIT 12"
    );
    $stmt->execute(['uid' => $_SESSION['user_id']]);
    $movies = $stmt->fetchAll();

    if (empty($movies)) {
        echo json_encode(['status' => 'empty', 'movies' => []]);
        exit;
    }

    echo json_encode(['status' => 'success', 'movies' => $movies]);
} catch (Exception $e) {
    error_log('get_favorites_showcase error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['status' => 'error', 'movies' => []]);
}