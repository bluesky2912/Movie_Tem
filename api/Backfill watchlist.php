<?php
// api/backfill_watchlist.php
// ONE-TIME USE: fills in title/poster_path/vote_average/release_date for
// watchlist rows saved before that data was tracked. Visit this file once
// in your browser, confirm the output looks right, then DELETE this file.

require_once '../config/database.php';
require_once '../config/tmdb.php';

header('Content-Type: text/plain');

$db = (new Database())->getConnection();
$tmdb = new TMDBEngine();

$stmt = $db->query("SELECT id, tmdb_movie_id FROM watchlist WHERE title IS NULL OR title = ''");
$rows = $stmt->fetchAll();

if (empty($rows)) {
    echo "Nothing to backfill — every row already has movie data.\n";
    exit;
}

$update = $db->prepare(
    "UPDATE watchlist SET title = ?, poster_path = ?, vote_average = ?, release_date = ? WHERE id = ?"
);

foreach ($rows as $row) {
    $movie = $tmdb->getMovieDetails($row['tmdb_movie_id']);

    if (isset($movie['error']) || empty($movie['title'])) {
        echo "Skipped tmdb_movie_id {$row['tmdb_movie_id']} — could not fetch from TMDB.\n";
        continue;
    }

    $update->execute([
        $movie['title'],
        $movie['poster_path'] ?? null,
        $movie['vote_average'] ?? null,
        $movie['release_date'] ?? null,
        $row['id']
    ]);

    echo "Updated: {$movie['title']} (tmdb_movie_id {$row['tmdb_movie_id']})\n";
}

echo "\nDone. Delete this file (api/backfill_watchlist.php) now.\n";