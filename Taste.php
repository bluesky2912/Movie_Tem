<?php
// taste.php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
require_once 'config/database.php';

if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit;
}

$userId = $_SESSION['user_id'];
$dbClass = new Database();
$db = $dbClass->getConnection();

$stmt = $db->prepare(
    "SELECT rating, genre_ids FROM movie_ratings
     WHERE user_id = :uid AND genre_ids IS NOT NULL AND genre_ids != ''"
);
$stmt->execute(['uid' => $userId]);
$ratings = $stmt->fetchAll();

// Standard TMDB genre ID list — stable across the API, safe to hardcode.
$GENRE_NAMES = [
    28 => 'Action', 12 => 'Adventure', 16 => 'Animation', 35 => 'Comedy',
    80 => 'Crime', 99 => 'Documentary', 18 => 'Drama', 10751 => 'Family',
    14 => 'Fantasy', 36 => 'History', 27 => 'Horror', 10402 => 'Music',
    9648 => 'Mystery', 10749 => 'Romance', 878 => 'Sci-Fi', 10770 => 'TV Movie',
    53 => 'Thriller', 10752 => 'War', 37 => 'Western',
];

$genreScores = [];
$genreCounts = [];
$ratingDistribution = [1 => 0, 2 => 0, 3 => 0, 4 => 0, 5 => 0];
$totalRatingSum = 0;
$ratedCount = count($ratings);

foreach ($ratings as $row) {
    $r = (int) $row['rating'];
    $totalRatingSum += $r;
    if (isset($ratingDistribution[$r])) {
        $ratingDistribution[$r]++;
    }
    $genreIds = array_filter(explode(',', $row['genre_ids']));
    foreach ($genreIds as $gid) {
        $gid = (int) $gid;
        if (!isset($GENRE_NAMES[$gid])) continue;
        $genreScores[$gid] = ($genreScores[$gid] ?? 0) + $r;
        $genreCounts[$gid] = ($genreCounts[$gid] ?? 0) + 1;
    }
}

arsort($genreScores);
// Up to 7 axes reads cleanly on a radar chart without crowding the labels.
$topGenres = array_slice($genreScores, 0, 7, true);
$hasEnoughData = $ratedCount >= 3 && !empty($topGenres);

$avgRating = $ratedCount > 0 ? round($totalRatingSum / $ratedCount, 1) : 0;
$topGenreId = $hasEnoughData ? array_key_first($topGenres) : null;
$topGenreName = $topGenreId ? $GENRE_NAMES[$topGenreId] : null;

// An honest contrast stat: among genres you've rated at least twice, which
// one gets your lowest average score? Requires 2+ so a single harsh rating
// on one movie doesn't unfairly brand an entire genre.
$toughestGenreName = null;
$toughestGenreAvg = null;
$genreAverages = [];
foreach ($genreScores as $gid => $sum) {
    $count = $genreCounts[$gid];
    $genreAverages[$gid] = round($sum / $count, 1);
    if ($count >= 2) {
        if ($toughestGenreAvg === null || $genreAverages[$gid] < $toughestGenreAvg) {
            $toughestGenreAvg = $genreAverages[$gid];
            $toughestGenreName = $GENRE_NAMES[$gid];
        }
    }
}
// Not worth pointing out if it's basically the same as your top genre.
if ($toughestGenreName === $topGenreName) {
    $toughestGenreName = null;
}

// A fun, honest verdict based on the single strongest genre signal — not a
// real psychological assessment, just a bit of personality for the page.
$taglines = [
    'Action' => 'Adrenaline Junkie 💥', 'Adventure' => 'Born Explorer 🧭',
    'Animation' => 'Forever Young at Heart 🎨', 'Comedy' => 'Certified Mood Lifter 😆',
    'Crime' => 'Armchair Detective 🕵️', 'Documentary' => 'Truth Seeker 📚',
    'Drama' => 'Emotional Depth Diver 🎭', 'Family' => 'Heartwarming Soul 🏡',
    'Fantasy' => 'Dreamer at Heart ✨', 'History' => 'Time Traveler 🏛️',
    'Horror' => 'Certified Scream Enthusiast 🔪', 'Music' => 'Rhythm & Reels 🎵',
    'Mystery' => 'Puzzle Solver 🧩', 'Romance' => 'Hopeless Romantic 💖',
    'Sci-Fi' => 'Future Gazer 🚀', 'TV Movie' => 'Cozy Night Curator 📺',
    'Thriller' => 'Edge-of-Seat Regular 🔪', 'War' => 'History Through Fire 🎖️',
    'Western' => 'Lone Rider 🤠',
];
$tagline = ($topGenreName && isset($taglines[$topGenreName])) ? $taglines[$topGenreName] : 'Eclectic Explorer 🎬';

// ---- Build the radar chart as raw SVG (no charting library needed) ----
$polygonPoints = '';
$gridRings = [];
$axisLines = [];
$labelPoints = [];
$legendItems = [];

if ($hasEnoughData) {
    $centerX = 220;
    $centerY = 220;
    $radius = 160;
    $numPoints = count($topGenres);
    $maxScore = max($topGenres);

    $dataPoints = [];
    $legendItems = [];
    $i = 0;
    foreach ($topGenres as $gid => $score) {
        $angle = (M_PI * 2 * $i / $numPoints) - (M_PI / 2); // start straight up
        $normalized = $maxScore > 0 ? ($score / $maxScore) : 0;
        $r = $radius * $normalized;
        $x = round($centerX + $r * cos($angle), 1);
        $y = round($centerY + $r * sin($angle), 1);
        $dataPoints[] = "$x,$y";

        $ax = round($centerX + $radius * cos($angle), 1);
        $ay = round($centerY + $radius * sin($angle), 1);
        $axisLines[] = ['x1' => $centerX, 'y1' => $centerY, 'x2' => $ax, 'y2' => $ay];

        $labelR = $radius + 34;
        $lx = round($centerX + $labelR * cos($angle), 1);
        $ly = round($centerY + $labelR * sin($angle), 1);
        $anchor = 'middle';
        if ($lx > $centerX + 20) $anchor = 'start';
        if ($lx < $centerX - 20) $anchor = 'end';
        $labelPoints[] = ['x' => $lx, 'y' => $ly, 'name' => $GENRE_NAMES[$gid], 'anchor' => $anchor];

        $legendItems[] = [
            'name'    => $GENRE_NAMES[$gid],
            'percent' => round($normalized * 100),
            'avg'     => $genreAverages[$gid],
            'count'   => $genreCounts[$gid],
        ];

        $i++;
    }
    $polygonPoints = implode(' ', $dataPoints);

    foreach ([0.25, 0.5, 0.75, 1.0] as $pct) {
        $ringPoints = [];
        for ($j = 0; $j < $numPoints; $j++) {
            $angle = (M_PI * 2 * $j / $numPoints) - (M_PI / 2);
            $rx = round($centerX + ($radius * $pct) * cos($angle), 1);
            $ry = round($centerY + ($radius * $pct) * sin($angle), 1);
            $ringPoints[] = "$rx,$ry";
        }
        $gridRings[] = implode(' ', $ringPoints);
    }
}

include 'includes/header.php';
?>

<div id="cinematic-bg" class="cinematic-bg" aria-hidden="true"></div>

<main class="container my-5" style="min-height: 75vh; position: relative; z-index: 1;">

    <div class="mb-5 text-center position-relative overflow-hidden">
        <div class="timeline-hero-glow"></div>
        <div class="projector-beam"></div>
        <span class="text-warning-custom text-uppercase font-monospace small tracking-wider" style="font-size: 0.75rem; position: relative; z-index: 2;">Your Taste, Visualized</span>
        <h1 class="hero-headline display-5 text-white fw-bold" style="font-family: 'Fraunces', serif; font-style: italic; position: relative; z-index: 2;">Mood Compass</h1>
    </div>

    <?php if (!$hasEnoughData): ?>
        <div class="bg-surface p-5 rounded-4 text-center border border-secondary border-opacity-10 mx-auto reveal-on-scroll timeline-fade-in" style="max-width: 560px;">
            <div class="display-4 mb-3">🧭</div>
            <h3 class="h5 text-white fw-semibold mb-2">Not enough data yet</h3>
            <p class="small text-custom-muted mb-4">Rate at least 3 movies and we'll chart your taste across genres — this page builds itself from ratings you've already given.</p>
            <a href="index.php#mood-selector-anchor" class="btn btn-warning-custom btn-sm">Find something to rate</a>
        </div>
    <?php else: ?>

        <div class="text-center mb-5 reveal-on-scroll timeline-fade-in" style="transition-delay: 0.3s;">
            <span class="badge bg-warning text-dark font-monospace px-4 py-2 fs-6 fw-bold rounded-pill"><?php echo htmlspecialchars($tagline); ?></span>
            <?php if ($toughestGenreName): ?>
                <p class="small mt-3 mb-0" style="color: var(--text-faint);">...but you're toughest on <strong style="color: var(--text-muted);"><?php echo htmlspecialchars($toughestGenreName); ?></strong> (avg ★<?php echo $toughestGenreAvg; ?>)</p>
            <?php endif; ?>
        </div>

        <div class="row g-4 mb-5 justify-content-center reveal-on-scroll timeline-fade-in" style="transition-delay: 0.4s;">
            <div class="col-6 col-md-3">
                <div class="bg-surface p-3 rounded-4 border border-secondary border-opacity-10 text-center h-100">
                    <div class="h3 text-warning mb-0 font-monospace taste-count-up" data-count-target="<?php echo $ratedCount; ?>">0</div>
                    <div class="small text-muted text-uppercase" style="font-size: 0.7rem;">Movies Rated</div>
                </div>
            </div>
            <div class="col-6 col-md-3">
                <div class="bg-surface p-3 rounded-4 border border-secondary border-opacity-10 text-center h-100">
                    <div class="h3 text-warning mb-0 font-monospace">★ <?php echo $avgRating; ?></div>
                    <div class="small text-muted text-uppercase" style="font-size: 0.7rem;">Average Rating</div>
                </div>
            </div>
            <div class="col-6 col-md-3">
                <div class="bg-surface p-3 rounded-4 border border-secondary border-opacity-10 text-center h-100">
                    <div class="h3 text-warning mb-0 font-monospace" style="font-size: 1.4rem;"><?php echo htmlspecialchars($topGenreName); ?></div>
                    <div class="small text-muted text-uppercase" style="font-size: 0.7rem;">Top Genre</div>
                </div>
            </div>
            <div class="col-6 col-md-3">
                <div class="bg-surface p-3 rounded-4 border border-secondary border-opacity-10 text-center h-100">
                    <div class="h3 text-warning mb-0 font-monospace taste-count-up" data-count-target="<?php echo count($topGenres); ?>">0</div>
                    <div class="small text-muted text-uppercase" style="font-size: 0.7rem;">Genres Explored</div>
                </div>
            </div>
        </div>

        <div class="row g-4 justify-content-center align-items-center reveal-on-scroll timeline-fade-in" style="transition-delay: 0.5s;">
            <div class="col-md-6">
                <div class="taste-radar-wrapper mx-auto">
                    <svg viewBox="0 0 440 440" class="taste-radar-svg">
                        <?php foreach ($gridRings as $ring): ?>
                            <polygon points="<?php echo $ring; ?>" class="taste-radar-grid-ring" />
                        <?php endforeach; ?>

                        <?php foreach ($axisLines as $line): ?>
                            <line x1="<?php echo $line['x1']; ?>" y1="<?php echo $line['y1']; ?>" x2="<?php echo $line['x2']; ?>" y2="<?php echo $line['y2']; ?>" class="taste-radar-axis" />
                        <?php endforeach; ?>

                        <polygon points="<?php echo $polygonPoints; ?>" class="taste-radar-shape" />

                        <?php foreach ($labelPoints as $label): ?>
                            <text x="<?php echo $label['x']; ?>" y="<?php echo $label['y']; ?>" text-anchor="<?php echo $label['anchor']; ?>" class="taste-radar-label"><?php echo htmlspecialchars($label['name']); ?></text>
                        <?php endforeach; ?>
                    </svg>
                </div>
            </div>
            <div class="col-md-5">
                <h6 class="small text-uppercase text-muted tracking-wider mb-3">Exact Standings</h6>
                <?php foreach ($legendItems as $item): ?>
                    <div class="taste-legend-row mb-2">
                        <div class="d-flex justify-content-between small mb-1">
                            <span class="text-white-50"><?php echo htmlspecialchars($item['name']); ?></span>
                            <span class="font-monospace" style="color: var(--text-faint);">★<?php echo $item['avg']; ?> · <?php echo $item['count']; ?> movie<?php echo $item['count'] === 1 ? '' : 's'; ?></span>
                        </div>
                        <div class="taste-legend-bar-track">
                            <div class="taste-legend-bar-fill" data-bar-target="<?php echo $item['percent']; ?>" style="width: 0%;"></div>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>

        <div class="mx-auto mt-5 reveal-on-scroll timeline-fade-in" style="max-width: 480px; transition-delay: 0.6s;">
            <h6 class="small text-uppercase text-muted tracking-wider mb-3 text-center">Your Rating Habits</h6>
            <?php
            $maxDistCount = max(1, max($ratingDistribution));
            for ($star = 5; $star >= 1; $star--):
                $count = $ratingDistribution[$star];
                $pct = round(($count / $maxDistCount) * 100);
            ?>
                <div class="d-flex align-items-center gap-2 mb-2">
                    <span class="font-monospace small" style="width: 42px; color: var(--text-faint);"><?php echo $star; ?> ★</span>
                    <div class="taste-legend-bar-track flex-fill">
                        <div class="taste-legend-bar-fill" data-bar-target="<?php echo $pct; ?>" style="width: 0%;"></div>
                    </div>
                    <span class="font-monospace small text-white-50" style="width: 24px; text-align: right;"><?php echo $count; ?></span>
                </div>
            <?php endfor; ?>
        </div>

        <p class="text-center small mt-5" style="color: var(--text-faint);">Built from your <?php echo $ratedCount; ?> rated movie<?php echo $ratedCount === 1 ? '' : 's'; ?> — rate more to sharpen the shape.</p>

    <?php endif; ?>

</main>

<?php include 'includes/footer.php'; ?>