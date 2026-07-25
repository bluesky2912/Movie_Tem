<?php
// timeline.php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
require_once 'config/database.php';
require_once 'config/tmdb.php';

$collectionId = isset($_GET['collection_id']) ? (int) $_GET['collection_id'] : 0;
$collection = null;
$errorMsg = '';

if ($collectionId > 0) {
    $tmdb = new TMDBEngine();
    $collection = $tmdb->getCollectionDetails($collectionId);
    if (isset($collection['error'])) {
        $errorMsg = $collection['error'];
    } elseif (empty($collection['parts'])) {
        $errorMsg = 'This collection has no listed films yet.';
    }
}

include 'includes/header.php';
?>

<main class="container my-5" style="min-height: 75vh;">
    <div class="mb-5 text-center">
        <span class="text-warning-custom text-uppercase font-monospace small tracking-wider" style="font-size: 0.75rem;">Franchise Journey</span>
        <h1 class="display-5 text-white fw-bold" style="font-family: 'Fraunces', serif; font-style: italic;">Movie Timeline</h1>
        <p class="text-muted mt-2 mb-0">Follow a saga from its first film to its latest.</p>
    </div>

    <div class="mx-auto mb-5" style="max-width: 520px;">
        <div class="position-relative">
            <form id="timeline-search-form" class="position-relative" onsubmit="return false;">
                <div class="input-group shadow-sm rounded-3 overflow-hidden" style="border: 1px solid rgba(255, 193, 7, 0.25);">
                    <span class="input-group-text bg-dark border-0 text-white-50 ps-3"><i class="bi bi-search"></i></span>
                    <input type="text" id="timeline-search-input" autocomplete="off" class="form-control bg-dark text-white border-0" placeholder="Search a franchise... e.g. Harry Potter">
                </div>
            </form>
            <div id="timeline-suggestions-box" class="list-group position-absolute w-100 shadow-lg mt-1 d-none" style="z-index: 2000; background: #1a1510; border: 1px solid rgba(255,193,7,0.15);"></div>
        </div>
        <div class="d-flex flex-wrap gap-2 justify-content-center mt-3">
            <?php
            // A handful of well-known collections as one-click starting
            // points. If any ID ever drifts, the live search box above is
            // the reliable path regardless.
            $quickPicks = [
                'Harry Potter'      => 1241,
                'Star Wars'         => 10,
                'The Lord of the Rings' => 119,
                'The Dark Knight'   => 263,
                'Jurassic Park'     => 328,
                'Toy Story'         => 10194,
                'Fast & Furious'    => 9485,
            ];
            foreach ($quickPicks as $label => $id):
            ?>
                <a href="timeline.php?collection_id=<?php echo $id; ?>" class="btn btn-outline-light btn-sm rounded-pill px-3" style="border-color: rgba(255,255,255,0.15); font-size: 0.8rem;"><?php echo htmlspecialchars($label); ?></a>
            <?php endforeach; ?>
        </div>
    </div>

    <?php if ($errorMsg): ?>
        <div class="bg-surface p-5 rounded-4 text-center border border-secondary border-opacity-10">
            <p class="text-muted mb-0"><?php echo htmlspecialchars($errorMsg); ?></p>
        </div>
    <?php elseif ($collection && !empty($collection['parts'])):
        $parts = $collection['parts'];
        usort($parts, function ($a, $b) {
            return strcmp($a['release_date'] ?? '9999-99-99', $b['release_date'] ?? '9999-99-99');
        });
        $posterUrl = $collection['poster_path'] ? "https://image.tmdb.org/t/p/w500" . $collection['poster_path'] : null;
    ?>
        <div class="text-center mb-5">
            <h2 class="text-white fw-bold" style="font-family: 'Fraunces', serif; font-style: italic;"><?php echo htmlspecialchars($collection['name']); ?></h2>
            <p class="text-muted small font-monospace"><?php echo count($parts); ?> films</p>
        </div>

        <div class="movie-timeline">
            <?php foreach ($parts as $i => $movie):
                $poster = $movie['poster_path'] ? "https://image.tmdb.org/t/p/w500" . $movie['poster_path'] : 'https://via.placeholder.com/500x750/1F150C/E1DCC9?text=No+Poster';
                $year = !empty($movie['release_date']) ? substr($movie['release_date'], 0, 4) : 'TBA';
                $side = $i % 2 === 0 ? 'timeline-left' : 'timeline-right';
            ?>
                <div class="timeline-node <?php echo $side; ?> reveal-on-scroll" data-open-modal="<?php echo $movie['id']; ?>">
                    <div class="timeline-dot"></div>
                    <div class="timeline-card">
                        <img src="<?php echo $poster; ?>" class="timeline-poster" alt="<?php echo htmlspecialchars($movie['title']); ?>">
                        <div class="timeline-info">
                            <span class="timeline-year"><?php echo htmlspecialchars($year); ?></span>
                            <h5 class="timeline-title"><?php echo htmlspecialchars($movie['title']); ?></h5>
                            <span class="timeline-rating">★ <?php echo number_format($movie['vote_average'] ?? 0, 1); ?></span>
                        </div>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>
</main>

<?php include 'includes/footer.php'; ?>