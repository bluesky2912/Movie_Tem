<?php
// api/get_hidden_gems.php
require_once '../config/tmdb.php';

header('Content-Type: application/json');

$tmdb = new TMDBEngine();
$response = $tmdb->getHiddenGems();

if (isset($response['error'])) {
    http_response_code(502);
    echo json_encode(['error' => $response['error']]);
    exit;
}

echo json_encode($response['results'] ?? []);