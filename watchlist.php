<?php
// watchlist.php
require_once 'config/database.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit;
}

$userId = $_SESSION['user_id'];

$dbClass = new Database();
$db = $dbClass->getConnection();

// Everything we need to render the grid is already stored at save-time —
// no per-item TMDB round trips needed here.
$stmt = $db->prepare(
    "SELECT tmdb_movie_id, title, poster_path, vote_average, release_date, is_watched
     FROM watchlist WHERE user_id = :uid ORDER BY added_at DESC"
);
$stmt->execute(['uid' => $userId]);
$savedItems = $stmt->fetchAll();

include 'includes/header.php';
?>

<div id="cinematic-bg" class="cinematic-bg" aria-hidden="true"></div>

<main class="container my-5" style="min-height: 70vh; position: relative; z-index: 1;">
    <div class="mb-5 position-relative overflow-hidden">
        <div class="timeline-hero-glow" style="left: 15%; transform: translate(-50%, -50%);"></div>
        <div class="projector-beam"></div>
        <h1 class="hero-headline display-5 text-white fw-bold" style="font-family: 'Fraunces', serif; font-style: italic; position: relative; z-index: 2;">
            Your Curated Collection
        </h1>
        <p class="text-custom-muted mb-0 reveal-on-scroll timeline-fade-in" style="position: relative; z-index: 2; transition-delay: 0.5s;">
            Movies you've bookmarked, saved to your profile.
        </p>
    </div>

    <?php if (empty($savedItems)): ?>
        <div class="bg-surface p-5 rounded-4 text-center border border-secondary border-opacity-10 py-5">
            <div class="text-muted display-4 mb-3">📁</div>
            <h3 class="h5 text-white fw-semibold">Your shelf is empty</h3>
            <p class="small text-muted mb-4">Pick a mood on the home page and bookmark movies you want to watch later.</p>
            <a href="index.php#mood-selector-anchor" class="btn btn-warning-custom btn-sm">Find something good</a>
        </div>
    <?php else: ?>
        <div class="d-flex gap-2 mb-4 reveal-on-scroll timeline-fade-in" id="watchlist-filter-tabs" style="transition-delay: 0.35s;">
            <button type="button" class="watchlist-filter-tab active" data-filter="all">All <span class="filter-count"><?php echo count($savedItems); ?></span></button>
            <button type="button" class="watchlist-filter-tab" data-filter="unwatched">To Watch <span class="filter-count"><?php echo count(array_filter($savedItems, fn($i) => !$i['is_watched'])); ?></span></button>
            <button type="button" class="watchlist-filter-tab" data-filter="watched">Watched <span class="filter-count"><?php echo count(array_filter($savedItems, fn($i) => $i['is_watched'])); ?></span></button>
        </div>

        <div class="row row-cols-1 row-cols-sm-2 row-cols-md-4 g-4" id="watchlist-grid">
            <?php foreach ($savedItems as $item):
                $movieId = $item['tmdb_movie_id'];
                $posterPath = $item['poster_path']
                    ? "https://image.tmdb.org/t/p/w500" . $item['poster_path']
                    : 'https://via.placeholder.com/500x750/1F150C/E1DCC9?text=No+Poster';
                $rating = $item['vote_average'] !== null ? number_format((float) $item['vote_average'], 1) : 'N/A';
                $year = !empty($item['release_date']) ? substr($item['release_date'], 0, 4) : 'Unknown';
                $title = $item['title'] ?: 'Untitled';
                $isWatched = (bool) $item['is_watched'];
            ?>
                <div class="col watchlist-card-col <?php echo $isWatched ? 'is-watched' : 'is-unwatched'; ?>" id="watchlist-item-<?php echo $movieId; ?>">
                    <div class="card h-100 bg-surface border border-secondary border-opacity-10 overflow-hidden shadow movie-card-interactive" data-open-modal="<?php echo $movieId; ?>" style="cursor: pointer;">

                        <button class="watchlist-btn-toggle active-saved" data-movie-id="<?php echo $movieId; ?>" title="Remove from watchlist" aria-label="Remove from watchlist">
                            <i class="bi bi-bookmark-check-fill"></i>
                        </button>

                        <button class="watched-btn-toggle <?php echo $isWatched ? 'is-watched' : ''; ?>" data-movie-id="<?php echo $movieId; ?>" title="<?php echo $isWatched ? 'Mark as not watched' : 'Mark as watched'; ?>" aria-label="Toggle watched status">
                            <i class="bi <?php echo $isWatched ? 'bi-eye-fill' : 'bi-eye'; ?>"></i>
                        </button>

                        <div class="position-relative overflow-hidden img-hover-container">
                            <img src="<?php echo $posterPath; ?>" class="card-img-top w-100 object-fit-cover" style="height: 340px;" alt="<?php echo htmlspecialchars($title); ?>">
                            <div class="card-rating-badge position-absolute rounded bg-black bg-opacity-75 small font-monospace text-warning" style="right: 10px; top: 10px;">
                                ★ <?php echo $rating; ?>
                            </div>
                            <div class="watched-ribbon">Watched</div>
                        </div>
                        <div class="card-body p-3 d-flex flex-column justify-content-between">
                            <div>
                                <h5 class="h6 text-white m-0 text-truncate fw-semibold"><?php echo htmlspecialchars($title); ?></h5>
                                <p class="small text-muted mt-1 mb-0"><?php echo htmlspecialchars($year); ?></p>
                            </div>
                        </div>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>

        <div id="watchlist-empty-filter" class="d-none bg-surface p-4 rounded-4 border border-secondary border-opacity-10 mt-4 text-center">
            <p class="small text-muted mb-0">Nothing in this view yet.</p>
        </div>
    <?php endif; ?>
</main>

<?php include 'includes/footer.php'; ?>