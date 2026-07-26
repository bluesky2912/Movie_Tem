<?php
// api/get_match_deck.php
require_once '../config/tmdb.php';

header('Content-Type: application/json');

$tmdb = new TMDBEngine();
$page1 = $tmdb->getPopularMovies(1);
$page2 = $tmdb->getPopularMovies(2);

if (isset($page1['error']) && isset($page2['error'])) {
    http_response_code(502);
    echo json_encode(['error' => $page1['error']]);
    exit;
}

$pool = array_merge($page1['results'] ?? [], $page2['results'] ?? []);

if (empty($pool)) {
    echo json_encode([]);
    exit;
}

shuffle($pool);
$deck = array_slice($pool, 0, 16);

echo json_encode(array_values($deck));