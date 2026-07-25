<?php
// api/toggle_watched.php
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

$userId  = $_SESSION['user_id'];
$movieId = isset($_POST['movie_id']) ? intval($_POST['movie_id']) : 0;

if ($movieId <= 0) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Missing or invalid movie id.']);
    exit;
}

try {
    $db = (new Database())->getConnection();

    // Flip is_watched in a single round trip rather than a
    // read-then-write, so two quick clicks can't race each other.
    $stmt = $db->prepare(
        "UPDATE watchlist SET is_watched = NOT is_watched
         WHERE user_id = ? AND tmdb_movie_id = ?"
    );
    $stmt->execute([$userId, $movieId]);

    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'That movie is not on your watchlist.']);
        exit;
    }

    $check = $db->prepare("SELECT is_watched FROM watchlist WHERE user_id = ? AND tmdb_movie_id = ?");
    $check->execute([$userId, $movieId]);
    $row = $check->fetch();

    echo json_encode([
        'status' => 'success',
        'movie_id' => $movieId,
        'is_watched' => (bool) ($row['is_watched'] ?? false)
    ]);
} catch (Exception $e) {
    error_log('toggle_watched error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Could not update watched status. Please try again.']);
}