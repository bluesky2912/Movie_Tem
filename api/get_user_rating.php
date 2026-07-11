<?php
// api/get_user_rating.php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
require_once '../config/database.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    // Not logged in — no rating to show, not an error
    echo json_encode(['rating' => 0, 'review_text' => '']);
    exit;
}

$movieId = isset($_GET['movie_id']) ? (int) $_GET['movie_id'] : 0;

if ($movieId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing or invalid movie id.']);
    exit;
}

try {
    $database = new Database();
    $db = $database->getConnection();

    $stmt = $db->prepare("SELECT rating, review_text FROM movie_ratings WHERE user_id = ? AND movie_id = ?");
    $stmt->execute([$_SESSION['user_id'], $movieId]);
    $existing = $stmt->fetch();

    if ($existing) {
        echo json_encode([
            'rating' => (int) $existing['rating'],
            'review_text' => $existing['review_text'] ?? ''
        ]);
    } else {
        echo json_encode(['rating' => 0, 'review_text' => '']);
    }
} catch (Exception $e) {
    error_log('get_user_rating error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Could not load your rating.']);
}