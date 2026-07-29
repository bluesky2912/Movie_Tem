<?php
// api/get_background_movies.php
ob_start();
require_once '../config/tmdb.php';

header('Content-Type: application/json');

$tmdb = new TMDBEngine();
$response = $tmdb->getTopRatedMovies(1);

ob_clean();

if (isset($response['error'])) {
    http_response_code(502);
    echo json_encode(['error' => $response['error']]);
    exit;
}

$movies = $response['results'] ?? [];

// Only movies with a usable backdrop image are worth showing full-screen.
$backdrops = array_values(array_filter(array_map(function ($movie) {
    return !empty($movie['backdrop_path'])
        ? 'https://image.tmdb.org/t/p/original' . $movie['backdrop_path']
        : null;
}, $movies)));

echo json_encode(array_slice($backdrops, 0, 8));