<?php
// match.php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
require_once 'config/database.php';
require_once 'config/tmdb.php';
include 'includes/header.php';
?>

<main class="container my-5" style="min-height: 75vh;">

    <div id="match-intro" class="text-center mx-auto" style="max-width: 520px;">
        <span class="text-warning-custom text-uppercase font-monospace small tracking-wider" style="font-size: 0.75rem;">Two Players, One Screen</span>
        <h1 class="display-5 text-white fw-bold mb-3" style="font-family: 'Fraunces', serif; font-style: italic;">Movie Match</h1>
        <p class="text-muted mb-4">Can't agree on what to watch? Swipe through movies, then pass the device to a friend for their turn — we'll show you every movie you <em>both</em> liked.</p>
        <button id="match-start-btn" type="button" class="btn btn-warning-custom px-4 py-2 rounded-3 fw-semibold">🎬 Start a Match</button>
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
        <p class="text-center text-muted small mt-3 d-none d-md-block">Drag the card, or use the buttons below</p>
    </div>

    <div id="match-handoff" class="d-none text-center mx-auto" style="max-width: 480px;">
        <div class="display-1 mb-3">🔄</div>
        <h2 class="text-white fw-bold mb-2" style="font-family: 'Fraunces', serif; font-style: italic;">Pass the device</h2>
        <p class="text-muted mb-4">Player 1 is done! Hand the screen to <strong>Player 2</strong>.</p>
        <button type="button" id="match-continue-btn" class="btn btn-warning-custom px-4 py-2 rounded-3 fw-semibold">I'm ready</button>
    </div>

    <div id="match-reveal" class="d-none text-center">
        <div id="match-reveal-content"></div>
    </div>

</main>

<?php include 'includes/footer.php'; ?>