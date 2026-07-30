<?php
// compare.php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
require_once 'config/database.php';
require_once 'config/tmdb.php';

$idA = isset($_GET['a']) ? (int) $_GET['a'] : 0;
$idB = isset($_GET['b']) ? (int) $_GET['b'] : 0;

$errorMsg = '';
$movieA = null;
$movieB = null;

if ($idA <= 0 || $idB <= 0) {
    $errorMsg = 'Pick two movies to compare using the compare button on any movie card.';
} else {
    $tmdb = new TMDBEngine();
    $movieA = $tmdb->getMovieCompareData($idA);
    $movieB = $tmdb->getMovieCompareData($idB);

    if (isset($movieA['error']) || isset($movieB['error'])) {
        $errorMsg = 'Could not load one or both movies for comparison. ' .
            ($movieA['error'] ?? $movieB['error'] ?? '');
    }
}

function fmtMoney($n) {
    if (empty($n)) return 'Unknown';
    return '$' . number_format($n);
}
function fmtRuntime($m) {
    if (empty($m)) return 'Unknown';
    return floor($m / 60) . 'h ' . ($m % 60) . 'm';
}
function sharedCast($movieA, $movieB) {
    $castA = $movieA['credits']['cast'] ?? [];
    $castB = $movieB['credits']['cast'] ?? [];
    $idsInB = array_column($castB, 'name', 'id');
    $shared = [];
    foreach ($castA as $actor) {
        if (isset($idsInB[$actor['id']])) {
            $shared[] = $actor['name'];
        }
    }
    return array_slice($shared, 0, 8);
}

include 'includes/header.php';
?>

<div id="cinematic-bg" class="cinematic-bg" aria-hidden="true"></div>

<main class="container my-5" style="min-height: 75vh; position: relative; z-index: 1;">
    <div class="mb-5 text-center position-relative overflow-hidden">
        <div class="timeline-hero-glow"></div>
        <div class="projector-beam"></div>
        <span class="text-warning-custom text-uppercase font-monospace small tracking-wider" style="font-size: 0.75rem; position: relative; z-index: 2;">Head to Head</span>
        <h1 class="hero-headline display-5 text-white fw-bold" style="font-family: 'Fraunces', serif; font-style: italic; position: relative; z-index: 2;">Compare Movies</h1>
    </div>

    <?php if ($errorMsg): ?>
        <div class="bg-surface p-5 rounded-4 text-center border border-secondary border-opacity-10">
            <p class="text-muted mb-0"><?php echo htmlspecialchars($errorMsg); ?></p>
            <a href="index.php" class="btn btn-warning-custom btn-sm mt-3">Back to browsing</a>
        </div>
    <?php else:
        $posterA = $movieA['poster_path'] ? "https://image.tmdb.org/t/p/w500" . $movieA['poster_path'] : 'https://via.placeholder.com/500x750/1F150C/E1DCC9?text=No+Poster';
        $posterB = $movieB['poster_path'] ? "https://image.tmdb.org/t/p/w500" . $movieB['poster_path'] : 'https://via.placeholder.com/500x750/1F150C/E1DCC9?text=No+Poster';

        $rows = [
            ['label' => 'Rating',      'a' => number_format($movieA['vote_average'] ?? 0, 1) . ' ★', 'b' => number_format($movieB['vote_average'] ?? 0, 1) . ' ★', 'cmp' => ($movieA['vote_average'] ?? 0) <=> ($movieB['vote_average'] ?? 0)],
            ['label' => 'Vote Count',  'a' => number_format($movieA['vote_count'] ?? 0),             'b' => number_format($movieB['vote_count'] ?? 0),             'cmp' => ($movieA['vote_count'] ?? 0) <=> ($movieB['vote_count'] ?? 0)],
            ['label' => 'Popularity',  'a' => number_format($movieA['popularity'] ?? 0),              'b' => number_format($movieB['popularity'] ?? 0),              'cmp' => ($movieA['popularity'] ?? 0) <=> ($movieB['popularity'] ?? 0)],
            ['label' => 'Runtime',     'a' => fmtRuntime($movieA['runtime'] ?? 0),                    'b' => fmtRuntime($movieB['runtime'] ?? 0),                    'cmp' => 0],
            ['label' => 'Budget',      'a' => fmtMoney($movieA['budget'] ?? 0),                       'b' => fmtMoney($movieB['budget'] ?? 0),                       'cmp' => 0],
            ['label' => 'Revenue',     'a' => fmtMoney($movieA['revenue'] ?? 0),                      'b' => fmtMoney($movieB['revenue'] ?? 0),                      'cmp' => ($movieA['revenue'] ?? 0) <=> ($movieB['revenue'] ?? 0)],
        ];

        $shared = sharedCast($movieA, $movieB);
    ?>

    <div class="row g-4 align-items-center justify-content-center mb-5 reveal-on-scroll timeline-fade-in" style="transition-delay: 0.4s;">
        <div class="col-6 col-md-4 text-center">
            <img src="<?php echo $posterA; ?>" class="img-fluid rounded-4 shadow-lg mb-3 border border-secondary border-opacity-10" style="max-height: 380px;" alt="<?php echo htmlspecialchars($movieA['title'] ?? ''); ?>">
            <h4 class="text-white fw-bold" style="font-family: 'Fraunces', serif; font-style: italic;"><?php echo htmlspecialchars($movieA['title'] ?? 'Unknown'); ?></h4>
        </div>
        <div class="col-12 col-md-1 text-center order-md-2">
            <span class="display-6 text-warning fw-bold" style="font-family: 'Fraunces', serif;">VS</span>
        </div>
        <div class="col-6 col-md-4 text-center order-md-3">
            <img src="<?php echo $posterB; ?>" class="img-fluid rounded-4 shadow-lg mb-3 border border-secondary border-opacity-10" style="max-height: 380px;" alt="<?php echo htmlspecialchars($movieB['title'] ?? ''); ?>">
            <h4 class="text-white fw-bold" style="font-family: 'Fraunces', serif; font-style: italic;"><?php echo htmlspecialchars($movieB['title'] ?? 'Unknown'); ?></h4>
        </div>
    </div>

    <div class="bg-surface rounded-4 border border-secondary border-opacity-10 p-4 p-md-5 mx-auto reveal-on-scroll timeline-fade-in" style="max-width: 720px; transition-delay: 0.55s;">
        <?php foreach ($rows as $row): ?>
            <div class="d-flex align-items-center py-3 border-bottom border-secondary border-opacity-10">
                <div class="flex-fill text-end pe-3 <?php echo $row['cmp'] > 0 ? 'text-warning fw-bold' : 'text-white-50'; ?>"><?php echo htmlspecialchars($row['a']); ?></div>
                <div class="text-muted small font-monospace px-3 text-uppercase text-center" style="width: 140px; letter-spacing: 0.05em;"><?php echo htmlspecialchars($row['label']); ?></div>
                <div class="flex-fill ps-3 <?php echo $row['cmp'] < 0 ? 'text-warning fw-bold' : 'text-white-50'; ?>"><?php echo htmlspecialchars($row['b']); ?></div>
            </div>
        <?php endforeach; ?>

        <div class="pt-4">
            <h6 class="small text-uppercase text-muted tracking-wider mb-3">Shared Cast</h6>
            <?php if (!empty($shared)): ?>
                <div class="d-flex flex-wrap gap-2">
                    <?php foreach ($shared as $name): ?>
                        <span class="badge bg-dark border border-secondary border-opacity-20 text-white-50 fw-normal px-3 py-2"><?php echo htmlspecialchars($name); ?></span>
                    <?php endforeach; ?>
                </div>
            <?php else: ?>
                <p class="small text-muted mb-0">No overlapping cast between these two.</p>
            <?php endif; ?>
        </div>
    </div>

    <div class="text-center mt-5">
        <a href="index.php" class="btn btn-outline-light btn-sm px-4 rounded-pill">← Back to browsing</a>
    </div>
    <?php endif; ?>
</main>

<?php include 'includes/footer.php'; ?>