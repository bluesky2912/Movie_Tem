<?php
// api/get_movies_by_mood.php
require_once '../config/tmdb.php';

header('Content-Type: application/json');

if (!isset($_GET['mood'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing mood parameter.']);
    exit;
}

$moodKey = strtoupper(trim($_GET['mood']));
$moodKeyClean = str_replace([' ', '-'], '', $moodKey);

$moodToGenreMap = [
    'HAPPY'        => 35,
    'MINDBENDING'  => '878,9648',
    'MIND-BENDING' => '878,9648',
    'HORROR'       => 27,
    'HORRORNIGHT'  => 27,
    'HORROR NIGHT' => 27,
    'MOTIVATIONAL' => 18,
    'RAINY'        => 10749,
    'RAINYDAY'     => 10749,
    'RAINY DAY'    => 10749,
    'SCIFI'        => 878,
    'SCI-FI'       => 878
];

if (isset($moodToGenreMap[$moodKeyClean])) {
    $genreId = $moodToGenreMap[$moodKeyClean];
} elseif (isset($moodToGenreMap[$moodKey])) {
    $genreId = $moodToGenreMap[$moodKey];
} else {
    http_response_code(400);
    echo json_encode(['error' => 'Unrecognized mood.']);
    exit;
}

$tmdb = new TMDBEngine();
$response = $tmdb->getMoviesByMood($genreId);

if (isset($response['results'])) {
    echo json_encode($response['results']);
} else {
    http_response_code(502);
    echo json_encode(['error' => 'Could not fetch movies right now.']);
}
