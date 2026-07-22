<div class="modal fade" id="movieDetailsModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content bg-surface border border-secondary border-opacity-10 position-relative text-primary shadow-lg overflow-hidden" style="border-radius: 12px;">
            <div id="modal-backdrop-blur" class="position-absolute top-0 start-0 w-100 h-100" style="background-size: cover; background-position: center; filter: blur(40px) brightness(0.2); z-index: 0; pointer-events: none; opacity: 0.5;"></div>

            <div class="modal-header border-0 position-relative z-1 pb-0">
                <button type="button" class="btn-close btn-close-white ms-auto shadow-none" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>

            <div class="modal-body position-relative z-1 pt-0">
                <div id="modal-loading-spinner" class="text-center py-5">
                    <div class="film-reel-loader"></div>
                </div>

                <div id="modal-content-target" class="row d-none">
                    <div class="col-md-4 mb-3 mb-md-0 text-center">
                        <img id="modal-movie-poster" src="" class="img-fluid rounded-3 shadow border border-secondary border-opacity-10" alt="Poster">
                    </div>
                    <div class="col-md-8">
                        <span id="modal-movie-year" class="badge bg-white bg-opacity-10 text-muted px-2 py-1 small font-monospace tracking-wide mb-2"></span>
                        <h2 id="modal-movie-title" class="h3 fw-bold text-white mb-2" style="font-family: 'Fraunces', serif; font-style: italic;"></h2>
                        <div class="d-flex align-items-center gap-3 small text-custom-muted mb-3">
                            <span id="modal-movie-rating" class="text-warning fw-semibold"></span>
                            <span id="modal-movie-runtime"></span>
                        </div>
                        <p id="modal-movie-overview" class="text-custom-muted small line-height-relaxed mb-4"></p>

                        <div class="d-flex gap-3 flex-wrap mb-3">
                            <a id="modal-movie-trailer-btn" href="#" target="_blank" rel="noopener" class="btn btn-warning-custom btn-sm">
                                <i class="bi bi-play-fill me-1"></i>Watch Trailer
                            </a>
                        </div>

                        <div id="modal-movie-providers-target" class="d-flex gap-2 flex-wrap mb-3"></div>

                        <hr class="border-secondary border-opacity-20 my-3">

                        <h6 class="small text-uppercase text-muted tracking-wider mb-2">Your Rating</h6>
                        <div id="user-star-rating-container" class="d-flex gap-1 mb-2" data-current-movie-id="">
                            <?php foreach ([1, 2, 3, 4, 5] as $val): ?>
                                <button type="button" class="star-select-btn btn btn-link p-0 text-muted" data-value="<?php echo $val; ?>" style="font-size: 1.4rem; text-decoration: none;">★</button>
                            <?php endforeach; ?>
                        </div>
                        <textarea id="modal-review-text-input" class="form-control bg-black border-secondary text-white mb-2" rows="2" placeholder="Optional review..."></textarea>
                        <button id="submit-review-action-btn" type="button" class="btn btn-warning-custom btn-sm">Save Rating</button>
                        <div id="review-status-msg" class="mt-2"></div>
                    </div>
                </div>
            </div> 
        </div>
    </div>
</div>
<footer class="py-4 mt-5" style="background-color: var(--surface); border-top: 1px solid var(--border);">
    <div class="container text-center text-muted">
        <p class="small mb-1">&copy; <?php echo date('Y'); ?> MovieTem. Built with passion for film lovers.</p>
        <p class="xsmall text-uppercase tracking-wide text-secondary" style="font-size: 0.75rem;">Powered by TMDB API & YouTube Data</p>
    </div>
</footer>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
<script src="assets/js/app.js"></script>
</body>
</html>