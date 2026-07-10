<?php
// api/toggle_watchlist.php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Your session expired. Please log in again.']);
    exit;
}

if (!hash_equals($_SESSION['csrf_token'] ?? '', $_POST['csrf_token'] ?? '')) {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Invalid or expired session token.']);
    exit;
}

require_once '../config/database.php';

$userId       = $_SESSION['user_id'];
$movieId      = isset($_POST['movie_id']) ? intval($_POST['movie_id']) : 0;
$title        = isset($_POST['title']) ? trim($_POST['title']) : null;
$posterPath   = (isset($_POST['poster_path']) && $_POST['poster_path'] !== 'null' && $_POST['poster_path'] !== '')
                    ? trim($_POST['poster_path']) : null;
$voteAverage  = (isset($_POST['vote_average']) && $_POST['vote_average'] !== '')
                    ? (float) $_POST['vote_average'] : null;
$releaseDate  = (isset($_POST['release_date']) && $_POST['release_date'] !== '')
                    ? trim($_POST['release_date']) : null;

if ($movieId <= 0) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Missing or invalid movie id.']);
    exit;
}

try {
    $databaseObj = new Database();
    $db = $databaseObj->getConnection();

    $checkStmt = $db->prepare("SELECT id FROM watchlist WHERE user_id = ? AND tmdb_movie_id = ?");
    $checkStmt->execute([$userId, $movieId]);
    $existingRecord = $checkStmt->fetch();

    if ($existingRecord) {
        $deleteStmt = $db->prepare("DELETE FROM watchlist WHERE user_id = ? AND tmdb_movie_id = ?");
        $deleteStmt->execute([$userId, $movieId]);
        echo json_encode(['status' => 'removed', 'movie_id' => $movieId]);
    } else {
        // Store the display data we already have on hand so watchlist.php
        // never needs to re-fetch every movie from TMDB on every page load.
        $insertStmt = $db->prepare(
            "INSERT INTO watchlist (user_id, tmdb_movie_id, title, poster_path, vote_average, release_date)
             VALUES (?, ?, ?, ?, ?, ?)"
        );
        $insertStmt->execute([$userId, $movieId, $title, $posterPath, $voteAverage, $releaseDate]);
        echo json_encode(['status' => 'added', 'movie_id' => $movieId]);
    }
} catch (Exception $e) {
    error_log('toggle_watchlist error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Could not update your watchlist. Please try again.']);
}