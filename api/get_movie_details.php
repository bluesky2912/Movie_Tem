<?php
// api/get_movie_details.php
require_once '../config/tmdb.php';

header('Content-Type: application/json');

$movieId = isset($_GET['id']) ? intval($_GET['id']) : 0;

if ($movieId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing or invalid movie id.']);
    exit;
}

$tmdb = new TMDBEngine();
$movie = $tmdb->getMovieDetails($movieId);

if (isset($movie['error'])) {
    http_response_code(502);
}

echo json_encode($movie);
