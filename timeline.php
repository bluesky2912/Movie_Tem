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

<div id="cinematic-bg" class="cinematic-bg" aria-hidden="true"></div>

<main class="container my-5" style="min-height: 75vh; position: relative; z-index: 1;">
    <div class="mb-5 text-center position-relative overflow-hidden">
        <div class="timeline-hero-glow"></div>
        <div class="projector-beam"></div>
        <span class="text-warning-custom text-uppercase font-monospace small tracking-wider" style="font-size: 0.75rem; position: relative; z-index: 2;">Franchise Journey</span>
        <h1 class="hero-headline display-5 text-white fw-bold" style="font-family: 'Fraunces', serif; font-style: italic; position: relative; z-index: 2;">Movie Timeline</h1>
        <p class="text-custom-muted mt-2 mb-0 reveal-on-scroll timeline-fade-in" style="font-size: 1rem; position: relative; z-index: 2; transition-delay: 0.6s;">Follow a saga from its first film to its latest.</p>
    </div>

    <div class="mx-auto mb-5 reveal-on-scroll timeline-fade-in" style="max-width: 560px; transition-delay: 0.75s;">
        <div class="position-relative">
            <form id="timeline-search-form" class="position-relative" onsubmit="return false;">
                <div class="input-group shadow-sm rounded-3 overflow-hidden" style="border: 1px solid rgba(255, 193, 7, 0.25);">
                    <span class="input-group-text bg-dark border-0 text-white-50 ps-3"><i class="bi bi-search"></i></span>
                    <input type="text" id="timeline-search-input" autocomplete="off" class="form-control bg-dark text-white border-0 py-2" placeholder="Search any franchise... e.g. Toy Story" style="box-shadow: none; font-size: 0.95rem;">
                </div>
            </form>
            <div id="timeline-suggestions-box" class="list-group position-absolute w-100 shadow-lg mt-1 d-none" style="z-index: 2000; max-height: 280px; overflow-y: auto; background: #1a1510; border: 1px solid rgba(255,193,7,0.15);"></div>
        </div>

        <p class="text-center font-monospace tracking-wider text-uppercase mt-4 mb-3" style="font-size: 0.7rem; color: var(--text-faint);">— or jump straight into a classic —</p>

        <div class="row row-cols-2 row-cols-sm-4 g-3">
            <?php
            // A handful of well-known collections as one-click starting
            // points. If any ID ever drifts, the live search box above is
            // the reliable path regardless.
            $quickPicks = [
                'Harry Potter'          => ['id' => 1241,  'icon' => '⚡'],
                'Star Wars'             => ['id' => 10,    'icon' => '🚀'],
                'The Lord of the Rings' => ['id' => 119,   'icon' => '💍'],
                'The Dark Knight'       => ['id' => 263,   'icon' => '🦇'],
                'Jurassic Park'         => ['id' => 328,   'icon' => '🦖'],
                'Toy Story'             => ['id' => 10194, 'icon' => '🤠'],
                'Fast & Furious'        => ['id' => 9485,  'icon' => '🏎️'],
            ];
            foreach ($quickPicks as $label => $pick):
            ?>
                <div class="col">
                    <a href="timeline.php?collection_id=<?php echo $pick['id']; ?>" class="mood-card d-block text-center p-3 rounded-3 text-decoration-none h-100">
                        <span class="fs-2 mb-2 d-block mood-icon"><?php echo $pick['icon']; ?></span>
                        <span class="small fw-bold tracking-wider text-uppercase font-monospace mood-title"><?php echo htmlspecialchars($label); ?></span>
                    </a>
                </div>
            <?php endforeach; ?>
        </div>
    </div>

    <?php if ($errorMsg): ?>
        <div class="bg-surface p-5 rounded-4 text-center border border-secondary border-opacity-10">
            <p class="text-custom-muted mb-0" style="font-size: 1rem;"><?php echo htmlspecialchars($errorMsg); ?></p>
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
            <p class="font-monospace small" style="color: var(--accent-bright);"><?php echo count($parts); ?> films</p>
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