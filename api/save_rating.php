<?php
// api/save_rating.php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
require_once '../config/database.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Please login to rate movies.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method Not Allowed']);
    exit;
}

if (!hash_equals($_SESSION['csrf_token'] ?? '', $_POST['csrf_token'] ?? '')) {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Invalid or expired session token.']);
    exit;
}

$userId = $_SESSION['user_id'];
$movieId = isset($_POST['movie_id']) ? (int)$_POST['movie_id'] : 0;
$rating = isset($_POST['rating']) ? (int)$_POST['rating'] : 0;

if ($movieId <= 0 || $rating < 1 || $rating > 5) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid structural payload.']);
    exit;
}

try {
    $database = new Database();
    $db = $database->getConnection();

    $stmt = $db->prepare(
        "INSERT INTO movie_ratings (user_id, movie_id, rating)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE rating = VALUES(rating)"
    );
    $stmt->execute([$userId, $movieId, $rating]);

    echo json_encode(['status' => 'success', 'message' => 'Rating saved!']);
} catch (Exception $e) {
    error_log('save_rating error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Database operation fault.']);
}