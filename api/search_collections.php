<?php
// api/search_collections.php
require_once '../config/tmdb.php';

header('Content-Type: application/json');

$query = isset($_GET['query']) ? trim($_GET['query']) : '';
if (strlen($query) < 2) {
    echo json_encode([]);
    exit;
}

$tmdb = new TMDBEngine();
$response = $tmdb->searchCollections($query);

if (isset($response['error'])) {
    http_response_code(502);
    echo json_encode(['error' => $response['error']]);
    exit;
}

// Top 6 matches only for a clean autocomplete dropdown
echo json_encode(array_slice($response['results'] ?? [], 0, 6));