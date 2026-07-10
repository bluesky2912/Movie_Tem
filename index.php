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

    <!-- Upgraded Hero Banner Section with Live Search and Dynamic Poster Stack Layout -->
    <div class="p-5 rounded-4 mb-5 border border-secondary border-opacity-10 position-relative overflow-hidden" style="background: linear-gradient(135deg, #150f0a 0%, #0d0905 100%);">
        
        <div class="row align-items-center g-4">
            <!-- Left Side: Header Copy & Global Search Bar Elements -->
            <div class="col-md-7 position-relative" style="z-index: 2;">
                <span class="text-warning-custom text-uppercase font-monospace small tracking-wider d-block mb-2" style="font-size: 0.75rem;">MovieTem — Cinema, Sorted by Feeling</span>
                <h1 class="display-4 text-white fw-bold mb-3" style="font-family: 'Fraunces', serif; font-style: italic; letter-spacing: -1px;">
                    Find the perfect movie for every mood.
                </h1>
                <p class="text-white-50 mb-4" style="font-size: 1.05rem; line-height: 1.6; opacity: 0.85;">
                    Pick how you're feeling, or search for a specific title, and we'll match it to something worth watching tonight.
                </p>

               <!-- Persistent Cinematic Search Bar -->
<div class="mb-4 position-relative" style="max-width: 500px;">
    <form id="global-search-form" class="position-relative">
        <div class="input-group shadow-sm rounded-3 overflow-hidden" style="border: 1px solid rgba(255, 193, 7, 0.25);">
            <span class="input-group-text bg-dark border-0 text-white-50 ps-3">
                <i class="bi bi-search"></i>
            </span>
            <input type="text" id="movie-search-input" autocomplete="off" class="form-control bg-dark text-white border-0 py-2.5 px-2 font-sans-serif" placeholder="Type a movie title..." style="box-shadow: none; font-size: 0.95rem;">
            <button type="submit" class="btn btn-warning-custom px-4 fw-semibold text-dark m-0" style="font-size: 0.95rem;">Search</button>
        </div>
    </form>
    <!-- Live Search Suggestions Injection Box -->
    <div id="search-suggestions-box" class="list-group position-absolute w-100 shadow-lg mt-1 d-none" style="z-index: 2000; max-height: 300px; overflow-y: auto; background: #1a1510; border: 1px solid rgba(255,193,7,0.15);"></div>
</div>

                <div class="d-flex flex-wrap gap-3 align-items-center">
                    <a href="#mood-selector-anchor" class="btn btn-outline-warning text-warning px-4 py-2 fw-semibold d-inline-flex align-items-center gap-2 rounded-3 border-opacity-25" style="font-size: 0.95rem;">
                        <i class="bi bi-compass"></i> Jump to Moods
                    </a>
                    <a href="#how-it-works-section" class="btn btn-outline-light px-4 py-2 fw-semibold d-inline-flex align-items-center rounded-3 border-opacity-10 text-white-50" style="border-color: rgba(255,255,255,0.15); font-size: 0.95rem; transition: all 0.2s ease;">
                        How it works
                    </a>
                </div>
            </div>

            <!-- Right Side: Layered Poster Display Asset -->
            <div class="col-md-5 d-none d-md-flex justify-content-center align-items-center position-relative py-2">
                <div class="position-absolute rounded-circle" style="width: 300px; height: 300px; background: radial-gradient(circle, rgba(255,193,7,0.12) 0%, rgba(0,0,0,0) 70%); filter: blur(25px); z-index: 1;"></div>
                
                <div class="poster-stack position-relative" style="width: 220px; height: 300px; z-index: 2;">
                    <?php 
                    $poster1 = isset($trendingMovies[0]['poster_path']) ? "https://image.tmdb.org/t/p/w500" . $trendingMovies[0]['poster_path'] : 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500';
                    $poster2 = isset($trendingMovies[1]['poster_path']) ? "https://image.tmdb.org/t/p/w500" . $trendingMovies[1]['poster_path'] : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500';
                    $poster3 = isset($trendingMovies[2]['poster_path']) ? "https://image.tmdb.org/t/p/w500" . $trendingMovies[2]['poster_path'] : 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=500';
                    ?>

                    <div class="position-absolute rounded shadow-lg overflow-hidden" 
                         style="width: 150px; height: 215px; top: 15px; left: -35px; transform: rotate(-10deg); opacity: 0.45; border: 1px solid rgba(255,255,255,0.08);">
                        <img src="<?php echo $poster2; ?>" alt="Cinema Art" class="w-100 h-100 object-fit-cover">
                    </div>

                    <div class="position-absolute rounded shadow-lg overflow-hidden" 
                         style="width: 150px; height: 215px; top: 25px; right: -35px; transform: rotate(12deg); opacity: 0.45; border: 1px solid rgba(255,255,255,0.08);">
                        <img src="<?php echo $poster3; ?>" alt="Cinema Art" class="w-100 h-100 object-fit-cover">
                    </div>

                    <div class="position-absolute rounded" 
                         style="width: 190px; height: 275px; top: -5px; left: 15px; z-index: 3; overflow: hidden; border: 1px solid rgba(255, 193, 7, 0.25); box-shadow: 0 20px 40px rgba(0,0,0,0.8), 0 0 25px rgba(255,193,7,0.08);">
                        <img src="<?php echo $poster1; ?>" alt="Featured Poster Collection" class="w-100 h-100 object-fit-cover">
                        <div class="position-absolute w-100 h-100 top-0 start-0" style="background: linear-gradient(to top, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 60%);"></div>
                    </div>
                </div>
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

    <!-- Mood Selector Section (12 Expanded Moods) -->
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
            <div class="col">
                <div class="mood-card text-center p-3 rounded-3" data-mood="ACTION" role="button" tabindex="0">
                    <span class="fs-2 mb-2 d-block mood-icon">💥</span>
                    <span class="small fw-bold tracking-wider text-uppercase font-monospace mood-title">Action-Packed</span>
                </div>
            </div>
            <div class="col">
                <div class="mood-card text-center p-3 rounded-3" data-mood="DEEP" role="button" tabindex="0">
                    <span class="fs-2 mb-2 d-block mood-icon">🧠</span>
                    <span class="small fw-bold tracking-wider text-uppercase font-monospace mood-title">Deep Thinker</span>
                </div>
            </div>
            <div class="col">
                <div class="mood-card text-center p-3 rounded-3" data-mood="ROMANTIC" role="button" tabindex="0">
                    <span class="fs-2 mb-2 d-block mood-icon">💖</span>
                    <span class="small fw-bold tracking-wider text-uppercase font-monospace mood-title">Romantic</span>
                </div>
            </div>
            <div class="col">
                <div class="mood-card text-center p-3 rounded-3" data-mood="CHILL" role="button" tabindex="0">
                    <span class="fs-2 mb-2 d-block mood-icon">🍿</span>
                    <span class="small fw-bold tracking-wider text-uppercase font-monospace mood-title">Chill Vibe</span>
                </div>
            </div>
            <div class="col">
                <div class="mood-card text-center p-3 rounded-3" data-mood="NOSTALGIC" role="button" tabindex="0">
                    <span class="fs-2 mb-2 d-block mood-icon">📺</span>
                    <span class="small fw-bold tracking-wider text-uppercase font-monospace mood-title">Nostalgic</span>
                </div>
            </div>
            <div class="col">
                <div class="mood-card text-center p-3 rounded-3" data-mood="SAD" role="button" tabindex="0">
                    <span class="fs-2 mb-2 d-block mood-icon">😢</span>
                    <span class="small fw-bold tracking-wider text-uppercase font-monospace mood-title">Tear-Jerker</span>
                </div>
            </div>
        </div>

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
                    <h4 class="h5 text-white mb-2 fw-semibold">Pick a mood or Search</h4>
                    <p class="small text-muted mb-0">Choose from twelve premium mood arrays or run a direct title search instantly.</p>
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
    window.MOVIETEM_IS_LOGGED_IN = <?php echo isset($_SESSION['user_id']) ? 'true' : 'false'; ?>;
</script>

<?php include 'includes/footer.php'; ?>