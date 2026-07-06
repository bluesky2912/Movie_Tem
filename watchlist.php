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
    "SELECT tmdb_movie_id, title, poster_path, vote_average, release_date
     FROM watchlist WHERE user_id = :uid ORDER BY added_at DESC"
);
$stmt->execute(['uid' => $userId]);
$savedItems = $stmt->fetchAll();

include 'includes/header.php';
?>

<main class="container my-5" style="min-height: 70vh;">
    <div class="mb-5">
        <h1 class="display-5 text-white fw-bold" style="font-family: 'Fraunces', serif; font-style: italic;">
            Your Curated Collection
        </h1>
        <p class="text-custom-muted mb-0">
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
        <div class="row row-cols-1 row-cols-sm-2 row-cols-md-4 g-4">
            <?php foreach ($savedItems as $item):
                $movieId = $item['tmdb_movie_id'];
                $posterPath = $item['poster_path']
                    ? "https://image.tmdb.org/t/p/w500" . $item['poster_path']
                    : 'https://via.placeholder.com/500x750/1F150C/E1DCC9?text=No+Poster';
                $rating = $item['vote_average'] !== null ? number_format((float) $item['vote_average'], 1) : 'N/A';
                $year = !empty($item['release_date']) ? substr($item['release_date'], 0, 4) : 'Unknown';
                $title = $item['title'] ?: 'Untitled';
            ?>
                <div class="col" id="watchlist-item-<?php echo $movieId; ?>">
                    <div class="card h-100 bg-surface border border-secondary border-opacity-10 overflow-hidden shadow movie-card-interactive" data-open-modal="<?php echo $movieId; ?>" style="cursor: pointer;">

                        <button class="watchlist-btn-toggle active-saved" data-movie-id="<?php echo $movieId; ?>" title="Remove from watchlist" aria-label="Remove from watchlist">
                            <i class="bi bi-bookmark-check-fill"></i>
                        </button>

                        <div class="position-relative overflow-hidden img-hover-container">
                            <img src="<?php echo $posterPath; ?>" class="card-img-top w-100 object-fit-cover" style="height: 340px;" alt="<?php echo htmlspecialchars($title); ?>">
                            <div class="card-rating-badge position-absolute rounded bg-black bg-opacity-75 small font-monospace text-warning" style="right: 10px; top: 10px;">
                                ★ <?php echo $rating; ?>
                            </div>
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
    <?php endif; ?>
</main>

<?php include 'includes/footer.php'; ?>
