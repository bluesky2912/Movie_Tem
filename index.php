<?php
// index.php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once 'config/database.php';
require_once 'config/tmdb.php';

$tmdb = new TMDBEngine();
$trendingResponse = $tmdb->getTrendingMovies();
$trendingMovies = isset($trendingResponse['results']) ? array_slice($trendingResponse['results'], 0, 3) : [];

include 'includes/header.php';
?>

<main class="container my-4" style="min-height: 85vh;">

    <div class="p-5 rounded-4 mb-5 border border-secondary border-opacity-10 position-relative overflow-hidden" style="background: linear-gradient(135deg, #150f0a 0%, #0d0905 100%);">
        <div class="position-absolute top-0 end-0 p-3 opacity-10">
            <i class="bi bi-film text-warning" style="font-size: 12rem;"></i>
        </div>

        <div class="position-relative" style="max-width: 650px; z-index: 2;">
            <span class="text-warning-custom text-uppercase font-monospace small tracking-wider block mb-2" style="font-size: 0.75rem;">MovieTem — Cinema, Sorted by Feeling</span>
            <h1 class="display-4 text-white fw-bold mb-3" style="font-family: 'Fraunces', serif; font-style: italic; letter-spacing: -1px;">
                Find the perfect movie for every mood.
            </h1>
            <p class="text-white-50 mb-4" style="font-size: 1.05rem; line-height: 1.6; opacity: 0.85;">
                Pick how you're feeling, and we'll match it to something worth watching tonight.
            </p>

            <div class="d-flex flex-wrap gap-3 align-items-center">
                <a href="#mood-selector-anchor" class="btn btn-warning-custom px-4 py-2.5 fw-semibold d-inline-flex align-items-center gap-2 text-dark rounded-3 shadow-sm">
                    <i class="bi bi-compass"></i> Explore Moods
                </a>
                <a href="#how-it-works-section" class="btn btn-outline-light px-4 py-2.5 fw-semibold d-inline-flex align-items-center rounded-3 border-opacity-10 text-white-50" style="border-color: rgba(255,255,255,0.15); font-size: 0.95rem; transition: all 0.2s ease;">
                    How it works
                </a>
            </div>
        </div>
    </div>

    <?php if (!empty($trendingMovies)): ?>
    <div id="heroTrendingCarousel" class="carousel slide carousel-fade mb-5 shadow-lg border border-secondary border-opacity-10 overflow-hidden" data-bs-ride="carousel" style="border-radius: 16px;">
        <div class="carousel-inner">
            <?php foreach ($trendingMovies as $index => $movie):
                $backdropPath = $movie['backdrop_path'] ? "https://image.tmdb.org/t/p/original" . $movie['backdrop_path'] : 'https://via.placeholder.com/1920x1080/1F150C/E1DCC9?text=MovieTem+Cinema';
                $rating = isset($movie['vote_average']) ? number_format($movie['vote_average'], 1) : 'N/A';
            ?>
                <div class="carousel-item <?php echo $index === 0 ? 'active' : ''; ?>" style="height: 440px; background: url('<?php echo $backdropPath; ?>') center/cover no-repeat;">
                    <div class="position-absolute top-0 start-0 w-100 h-100" style="background: linear-gradient(to right, rgba(0,0,0,0.85) 30%, rgba(0,0,0,0.2) 100%), linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 50%);"></div>
                    <div class="carousel-caption d-flex flex-column h-100 justify-content-center align-items-start text-start px-md-5" style="bottom: 0; left: 0; right: 0; max-width: 650px; z-index: 10;">
                        <span class="badge bg-warning text-dark font-monospace mb-2 px-3 py-1 fw-bold" style="font-size: 0.75rem; letter-spacing: 1px;">TRENDING TODAY</span>
                        <h1 class="display-5 text-white fw-bold mb-2" style="font-family: 'Fraunces', serif; font-style: italic; line-height: 1.1;"><?php echo htmlspecialchars($movie['title']); ?></h1>
                        <div class="d-flex align-items-center gap-3">
                            <span class="text-warning fw-semibold small">★ <?php echo $rating; ?> Rating</span>
                            <button class="btn btn-warning-custom btn-sm px-3 fw-semibold text-dark" data-open-modal="<?php echo $movie['id']; ?>">
                                <i class="bi bi-info-circle me-1"></i> View Details
                            </button>
                            <button class="btn btn-outline-light btn-sm px-3 bookmark-btn" type="button"
                                    data-movie-id="<?php echo $movie['id']; ?>"
                                    data-title="<?php echo htmlspecialchars($movie['title']); ?>"
                                    data-poster="<?php echo htmlspecialchars($movie['poster_path'] ?? ''); ?>"
                                    data-rating="<?php echo isset($movie['vote_average']) ? $movie['vote_average'] : ''; ?>"
                                    data-year="<?php echo htmlspecialchars($movie['release_date'] ?? ''); ?>"
                                    aria-label="Bookmark <?php echo htmlspecialchars($movie['title']); ?>"
                                    style="border-color: rgba(255,255,255,0.2);">
                                <i class="bi bi-bookmark"></i>
                            </button>
                        </div>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    </div>
    <?php endif; ?>

    <div id="mood-selector-anchor" class="pt-2 mb-4">
        <h3 class="text-white mb-4" style="font-family: 'Fraunces', serif; font-style: italic;">How does your soul feel tonight?</h3>

        <div class="row row-cols-2 row-cols-sm-3 row-cols-md-6 g-3">
            <div class="col">
                <div class="mood-card text-center p-3 rounded-3" data-mood="HAPPY" role="button" tabindex="0">
                    <span class="fs-2 mb-2 d-block mood-icon">😆</span>
                    <span class="small fw-bold tracking-wider text-uppercase font-monospace mood-title">Happy</span>
                </div>
            </div>
            <div class="col">
                <div class="mood-card text-center p-3 rounded-3" data-mood="MIND-BENDING" role="button" tabindex="0">
                    <span class="fs-2 mb-2 d-block mood-icon">🤯</span>
                    <span class="small fw-bold tracking-wider text-uppercase font-monospace mood-title">Mind-Bending</span>
                </div>
            </div>
            <div class="col">
                <div class="mood-card text-center p-3 rounded-3" data-mood="HORROR NIGHT" role="button" tabindex="0">
                    <span class="fs-2 mb-2 d-block mood-icon">😱</span>
                    <span class="small fw-bold tracking-wider text-uppercase font-monospace mood-title">Horror Night</span>
                </div>
            </div>
            <div class="col">
                <div class="mood-card text-center p-3 rounded-3" data-mood="MOTIVATIONAL" role="button" tabindex="0">
                    <span class="fs-2 mb-2 d-block mood-icon">💪</span>
                    <span class="small fw-bold tracking-wider text-uppercase font-monospace mood-title">Motivational</span>
                </div>
            </div>
            <div class="col">
                <div class="mood-card text-center p-3 rounded-3" data-mood="RAINY DAY" role="button" tabindex="0">
                    <span class="fs-2 mb-2 d-block mood-icon">🌧️</span>
                    <span class="small fw-bold tracking-wider text-uppercase font-monospace mood-title">Rainy Day</span>
                </div>
            </div>
            <div class="col">
                <div class="mood-card text-center p-3 rounded-3" data-mood="SCI-FI" role="button" tabindex="0">
                    <span class="fs-2 mb-2 d-block mood-icon">🚀</span>
                    <span class="small fw-bold tracking-wider text-uppercase font-monospace mood-title">Sci-Fi</span>
                </div>
            </div>
        </div>

        <!-- Fixed: this now sits below the whole mood grid instead of being
             trapped inside the Sci-Fi card's grid column. -->
        <div class="text-center mt-4">
            <button id="random-mood-btn" type="button" class="btn btn-warning-custom fw-semibold px-4 py-2 rounded-3">
                🎲 Surprise Me!
            </button>
        </div>
    </div>

    <div id="mood-movies-output-target" class="my-5"></div>

    <section id="how-it-works-section" class="py-5 mt-5 border-top border-secondary border-opacity-10">
        <div class="text-center mb-5">
            <span class="text-warning-custom text-uppercase font-monospace small tracking-wider" style="font-size:0.75rem;">The Engineering Under the Hood</span>
            <h2 class="display-6 text-white mt-1" style="font-family: 'Fraunces', serif; font-style: italic;">How MovieTem Curates Your Screen</h2>
        </div>
        <div class="row g-4 justify-content-center">
            <div class="col-md-4">
                <div class="bg-surface p-4 rounded-4 border border-secondary border-opacity-10 h-100 shadow-sm">
                    <div class="h3 text-warning mb-3 font-monospace">01</div>
                    <h4 class="h5 text-white mb-2 fw-semibold">Pick a mood</h4>
                    <p class="small text-muted mb-0">Choose from six curated mood profiles mapped to genres you'll actually feel like watching.</p>
                </div>
            </div>
            <div class="col-md-4">
                <div class="bg-surface p-4 rounded-4 border border-secondary border-opacity-10 h-100 shadow-sm">
                    <div class="h3 text-warning mb-3 font-monospace">02</div>
                    <h4 class="h5 text-white mb-2 fw-semibold">We fetch live matches</h4>
                    <p class="small text-muted mb-0">MovieTem queries TMDB in real time and brings back movies that fit.</p>
                </div>
            </div>
            <div class="col-md-4">
                <div class="bg-surface p-4 rounded-4 border border-secondary border-opacity-10 h-100 shadow-sm">
                    <div class="h3 text-warning mb-3 font-monospace">03</div>
                    <h4 class="h5 text-white mb-2 fw-semibold">Save what you like</h4>
                    <p class="small text-muted mb-0">Bookmark anything that catches your eye — it's saved to your watchlist instantly.</p>
                </div>
            </div>
        </div>
    </section>

</main>

<script>
    // Login status passed once, used by app.js — everything else (mood
    // filtering, bookmarking, the modal, "Surprise Me") lives in app.js
    // so there's a single source of truth instead of two competing scripts.
    window.MOVIETEM_IS_LOGGED_IN = <?php echo isset($_SESSION['user_id']) ? 'true' : 'false'; ?>;
</script>

<?php include 'includes/footer.php'; ?>
