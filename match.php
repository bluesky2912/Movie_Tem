<?php
// match.php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
require_once 'config/database.php';
require_once 'config/tmdb.php';
include 'includes/header.php';
?>

<div id="cinematic-bg" class="cinematic-bg" aria-hidden="true"></div>

<main class="container my-5" style="min-height: 75vh; position: relative; z-index: 1;">

    <div class="text-center position-relative overflow-hidden mb-4">
        <div class="timeline-hero-glow"></div>
        <div class="projector-beam"></div>
        <span class="text-warning-custom text-uppercase font-monospace small tracking-wider" style="font-size: 0.75rem; position: relative; z-index: 2;">Two Players, One Screen</span>
        <h1 class="hero-headline display-5 text-white fw-bold mb-3" style="font-family: 'Fraunces', serif; font-style: italic; position: relative; z-index: 2;">Movie Match</h1>
    </div>

    <div id="match-intro" class="text-center mx-auto" style="max-width: 560px;">
        <p class="text-custom-muted mb-4 reveal-on-scroll timeline-fade-in" style="font-size: 1rem; transition-delay: 0.6s;">Can't agree on what to watch? Swipe through movies, then pass the device to a friend for their turn — we'll show you every movie you <em>both</em> liked.</p>

        <div class="match-preferences mb-4 reveal-on-scroll timeline-fade-in" style="transition-delay: 0.75s;">
            <p class="text-center font-monospace tracking-wider text-uppercase mb-2" style="font-size: 0.7rem; color: var(--text-faint);">Pick genres — optional, both players can agree first</p>
            <div class="d-flex flex-wrap gap-2 justify-content-center mb-4" id="match-genre-chips">
                <button type="button" class="match-chip" data-genre="28">💥 Action</button>
                <button type="button" class="match-chip" data-genre="35">😆 Comedy</button>
                <button type="button" class="match-chip" data-genre="27">😱 Horror</button>
                <button type="button" class="match-chip" data-genre="10749">💖 Romance</button>
                <button type="button" class="match-chip" data-genre="878">🚀 Sci-Fi</button>
                <button type="button" class="match-chip" data-genre="18">🎭 Drama</button>
                <button type="button" class="match-chip" data-genre="16">🎨 Animation</button>
                <button type="button" class="match-chip" data-genre="53">🔪 Thriller</button>
            </div>

            <p class="text-center font-monospace tracking-wider text-uppercase mb-2" style="font-size: 0.7rem; color: var(--text-faint);">Pick an era</p>
            <div class="d-flex flex-wrap gap-2 justify-content-center" id="match-era-chips">
                <button type="button" class="match-chip match-chip-era active" data-era="any">Any Era</button>
                <button type="button" class="match-chip match-chip-era" data-era="2020s">2020s</button>
                <button type="button" class="match-chip match-chip-era" data-era="2010s">2010s</button>
                <button type="button" class="match-chip match-chip-era" data-era="2000s">2000s</button>
                <button type="button" class="match-chip match-chip-era" data-era="classic">90s &amp; Earlier</button>
            </div>
        </div>

        <button id="match-start-btn" type="button" class="btn btn-warning-custom px-4 py-2 rounded-3 fw-semibold reveal-on-scroll timeline-fade-in" style="transition-delay: 0.9s;">🎬 Start a Match</button>
    </div>

    <div id="match-how-it-works" class="row g-4 justify-content-center mt-5 pt-4">
        <div class="col-12 col-md-4">
            <div class="bg-surface p-4 rounded-4 border border-secondary border-opacity-10 h-100 shadow-sm text-center">
                <div class="fs-1 mb-3">👉</div>
                <h4 class="h6 text-white mb-2 fw-semibold">Player 1 swipes</h4>
                <p class="small text-custom-muted mb-0" style="font-size: 0.9rem;">Heart the ones you'd watch, skip the rest — 16 movies, no overthinking.</p>
            </div>
        </div>
        <div class="col-12 col-md-4">
            <div class="bg-surface p-4 rounded-4 border border-secondary border-opacity-10 h-100 shadow-sm text-center">
                <div class="fs-1 mb-3">🔄</div>
                <h4 class="h6 text-white mb-2 fw-semibold">Pass the device</h4>
                <p class="small text-custom-muted mb-0" style="font-size: 0.9rem;">Player 2 swipes the exact same deck — no peeking at each other's picks.</p>
            </div>
        </div>
        <div class="col-12 col-md-4">
            <div class="bg-surface p-4 rounded-4 border border-secondary border-opacity-10 h-100 shadow-sm text-center">
                <div class="fs-1 mb-3">🎉</div>
                <h4 class="h6 text-white mb-2 fw-semibold">See your matches</h4>
                <p class="small text-custom-muted mb-0" style="font-size: 0.9rem;">Whatever you both liked gets revealed — pick one and start watching.</p>
            </div>
        </div>
    </div>

    <div id="match-game" class="d-none">
        <div class="text-center mb-4">
            <span id="match-player-label" class="badge bg-warning text-dark font-monospace px-3 py-2 mb-2">Player 1</span>
            <div class="progress mx-auto" style="max-width: 300px; height: 6px; background: rgba(255,255,255,0.08);">
                <div id="match-progress-bar" class="progress-bar bg-warning" style="width: 0%;"></div>
            </div>
        </div>

        <div id="match-card-stack" class="match-card-stack"></div>

        <div class="d-flex justify-content-center gap-4 mt-4">
            <button type="button" id="match-no-btn" class="match-swipe-btn match-swipe-no" aria-label="Not interested">✕</button>
            <button type="button" id="match-yes-btn" class="match-swipe-btn match-swipe-yes" aria-label="Interested">❤</button>
        </div>
        <p class="text-center small mt-3 d-none d-md-block" style="color: var(--text-muted);">Drag the card, or use the buttons below</p>
    </div>

    <div id="match-handoff" class="d-none text-center mx-auto" style="max-width: 480px;">
        <div class="display-1 mb-3">🔄</div>
        <h2 class="text-white fw-bold mb-2" style="font-family: 'Fraunces', serif; font-style: italic;">Pass the device</h2>
        <p class="text-custom-muted mb-4" style="font-size: 1rem;">Player 1 is done! Hand the screen to <strong>Player 2</strong>.</p>
        <button type="button" id="match-continue-btn" class="btn btn-warning-custom px-4 py-2 rounded-3 fw-semibold">I'm ready</button>
    </div>

    <div id="match-reveal" class="d-none text-center">
        <div id="match-reveal-content"></div>
    </div>

</main>

<?php include 'includes/footer.php'; ?>