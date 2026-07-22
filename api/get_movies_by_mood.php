<?php
// api/get_movies_by_mood.php
require_once '../config/tmdb.php';

header('Content-Type: application/json');
$tmdb = new TMDBEngine();

// Handle Autocomplete Suggestions Dropdown
if (isset($_GET['action']) && $_GET['action'] === 'suggest') {
    $query = isset($_GET['query']) ? trim($_GET['query']) : '';
    if (strlen($query) < 2) {
        echo json_encode([]);
        exit;
    }
    $response = $tmdb->searchMovies($query);
    if (isset($response['results'])) {
        // Return top 5 matches only for clean autocomplete previewing
        echo json_encode(array_slice($response['results'], 0, 5));
    } else {
        echo json_encode([]);
    }
    exit;
}

// Handle Global Full Text Search Queries
if (isset($_GET['action']) && $_GET['action'] === 'search') {
    if (!isset($_GET['query']) || empty(trim($_GET['query']))) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing search query parameter.']);
        exit;
    }
    $query = trim($_GET['query']);
    $response = $tmdb->searchMovies($query);
    if (isset($response['error'])) {
        http_response_code(502);
        echo json_encode(['error' => $response['error']]);
        exit;
    }
    echo json_encode($response['results'] ?? []);
    exit;
}

// Handle Traditional Mood Queries
if (!isset($_GET['mood'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing mood or search parameter.']);
    exit;
}

$moodKey = trim($_GET['mood']);
$response = $tmdb->getMoviesByMood($moodKey);
if (isset($response['error'])) {
    http_response_code(502);
    echo json_encode(['error' => $response['error']]);
    exit;
}
echo json_encode($response['results'] ?? []);