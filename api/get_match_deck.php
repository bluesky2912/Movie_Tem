<?php
// api/get_match_deck.php
ob_start();
require_once '../config/tmdb.php';

header('Content-Type: application/json');

$tmdb = new TMDBEngine();

$genres = isset($_GET['genres']) ? trim($_GET['genres']) : '';
$era = isset($_GET['era']) ? trim($_GET['era']) : 'any';

// Era buckets map to a TMDB primary_release_date range. Anything not
// recognized (including 'any') falls through with no date filter at all.
$eraRanges = [
    '2020s'   => ['2020-01-01', date('Y-m-d')],
    '2010s'   => ['2010-01-01', '2019-12-31'],
    '2000s'   => ['2000-01-01', '2009-12-31'],
    'classic' => [null, '1999-12-31'],
];

$hasFilters = ($genres !== '') || isset($eraRanges[$era]);

// A single page (20 results) rather than two — each TMDB call already
// retries transient failures internally, so two sequential calls means
// worst-case latency of both retry chains stacked, which is long enough to
// trip a PHP or browser timeout and surface as a false "network error"
// even when TMDB itself would have eventually responded. One page still
// gives plenty of candidates for a 16-card deck.
if ($hasFilters) {
    [$dateFrom, $dateTo] = $eraRanges[$era] ?? [null, null];
    $response = $tmdb->discoverMovies($genres, $dateFrom, $dateTo, 1);
} else {
    $response = $tmdb->getPopularMovies(1);
}

// Discard any stray PHP warning/notice output before this point so it
// can never corrupt the JSON body — same defensive pattern already used
// in register.php and login.php.
ob_clean();

if (isset($response['error'])) {
    http_response_code(502);
    echo json_encode(['error' => $response['error']]);
    exit;
}

$pool = $response['results'] ?? [];

if (empty($pool)) {
    // A very narrow genre + era combination can legitimately come back
    // empty — that's not an error, just nothing to show.
    echo json_encode([]);
    exit;
}

shuffle($pool);
$deck = array_slice($pool, 0, 16);

echo json_encode(array_values($deck));