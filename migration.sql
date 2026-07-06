-- Run this once against your existing `movietem` database.
-- It adds the columns toggle_watchlist.php now writes to, and watchlist.php
-- now reads from, instead of making a live TMDB API call per saved movie.

ALTER TABLE watchlist
    ADD COLUMN title VARCHAR(255) NULL AFTER tmdb_movie_id,
    ADD COLUMN poster_path VARCHAR(255) NULL AFTER title,
    ADD COLUMN vote_average DECIMAL(3,1) NULL AFTER poster_path,
    ADD COLUMN release_date VARCHAR(10) NULL AFTER vote_average;

-- Optional: backfill existing rows once with a manual TMDB lookup, or just
-- let them show "Untitled" / "N/A" until they're re-toggled off and on.
