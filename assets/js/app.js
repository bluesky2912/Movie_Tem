// assets/js/app.js
//
// Single source of truth for all interactive behavior on MovieTem:
// mood filtering, bookmarking/watchlist toggling, the movie details modal,
// and the "Surprise Me" button. (Previously index.php also had its own
// inline copy of the mood/bookmark logic, which fired alongside this file
// and referenced elements that don't exist — that duplicate has been removed.)

const isLoggedIn = typeof window.MOVIETEM_IS_LOGGED_IN !== 'undefined' ? window.MOVIETEM_IS_LOGGED_IN : true;

function renderSkeletons(container, count = 4) {
    container.innerHTML = Array(count).fill(0).map(() => `
        <div class="col"><div class="skeleton-card"></div></div>
    `).join('');
}

function movieCardHtml(movie) {
    const poster = movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : 'https://via.placeholder.com/500x750/1a1510/fff?text=No+Poster';
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
    const title = movie.title || 'Untitled';

    return `
        <div class="col">
            <div class="card bg-surface border border-secondary border-opacity-10 rounded-4 overflow-hidden h-100 shadow-sm movie-card-interactive">
                <button class="watchlist-btn-toggle bookmark-btn" type="button"
                        data-movie-id="${movie.id}"
                        data-title="${encodeURIComponent(title)}"
                        data-poster="${movie.poster_path || ''}"
                        data-rating="${movie.vote_average || ''}"
                        data-year="${movie.release_date || ''}"
                        aria-label="Bookmark ${title}">
                    <i class="bi bi-bookmark"></i>
                </button>
                <div class="position-relative overflow-hidden img-hover-container" data-open-modal="${movie.id}" style="cursor:pointer;">
                    <img src="${poster}" class="card-img-top w-100 object-fit-cover" style="height: 340px;" alt="${title}">
                    <div class="card-rating-badge position-absolute rounded bg-black bg-opacity-75 small font-monospace text-warning" style="right: 10px; top: 10px;">
                        ★ ${rating}
                    </div>
                </div>
                <div class="card-body p-3 d-flex flex-column justify-content-between flex-grow-1">
                    <div>
                        <h5 class="card-title text-white h6 text-truncate mb-1">${title}</h5>
                        <p class="card-text text-muted small mb-0">${movie.release_date ? movie.release_date.substring(0, 4) : 'Unknown'}</p>
                    </div>
                </div>
            </div>
        </div>`;
}

document.addEventListener('DOMContentLoaded', () => {
    const moodCards = document.querySelectorAll('.mood-card');
    const outputTarget = document.getElementById('mood-movies-output-target');
    const randomMoodBtn = document.getElementById('random-mood-btn');

    function selectMood(card) {
        moodCards.forEach(c => c.classList.remove('active-mood'));
        card.classList.add('active-mood');

        const selectedMood = card.getAttribute('data-mood');
        const moodLabel = card.querySelector('.mood-title')?.innerText || selectedMood;

        if (!outputTarget) return;

        outputTarget.innerHTML = `
            <div class="text-start mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
                <h4 class="text-white m-0" style="font-family:'Fraunces', serif; font-style: italic;">
                    Showing matches for mood: <span class="text-warning">${moodLabel}</span>
                </h4>
                <button type="button" class="btn-clear-filter" id="clear-mood-filter">Clear filter ✕</button>
            </div>
            <div class="row row-cols-2 row-cols-md-4 g-4" id="mood-results-grid"></div>`;

        const grid = document.getElementById('mood-results-grid');
        renderSkeletons(grid);

        document.getElementById('clear-mood-filter')?.addEventListener('click', () => {
            moodCards.forEach(c => c.classList.remove('active-mood'));
            outputTarget.innerHTML = '';
        });

        outputTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        fetch(`api/get_movies_by_mood.php?mood=${encodeURIComponent(selectedMood)}`)
            .then(res => res.json())
            .then(data => {
                if (data.error || !data.length) {
                    grid.innerHTML = `<div class="col-12 text-center text-muted py-4">No movies matched this mood tonight. Try another one.</div>`;
                    return;
                }
                grid.innerHTML = data.slice(0, 8).map(movieCardHtml).join('');
            })
            .catch(() => {
                grid.innerHTML = `<div class="col-12 text-center text-danger py-4">Something went wrong fetching movies. Please try again.</div>`;
            });
    }

    moodCards.forEach(card => {
        card.addEventListener('click', () => selectMood(card));
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectMood(card);
            }
        });
    });

    if (randomMoodBtn) {
        randomMoodBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (moodCards.length === 0) return;
            const randomCard = moodCards[Math.floor(Math.random() * moodCards.length)];
            randomCard.click();
        });
    }
});

/* ============================================================================
   Global click delegate: bookmarking/watchlist toggling + details modal.
   Handles both index.php's dynamically-rendered cards and watchlist.php's
   server-rendered cards through one consistent code path.
============================================================================ */
document.addEventListener('click', function (e) {
    // 1. Bookmark / watchlist toggle
    const toggleBtn = e.target.closest('.watchlist-btn-toggle, .bookmark-btn');
    if (toggleBtn) {
        e.preventDefault();
        e.stopPropagation();

        if (!isLoggedIn) {
            alert('Please sign in to save movies to your watchlist.');
            window.location.href = 'login.php';
            return;
        }

        const movieId = toggleBtn.dataset.movieId;
        const isAlreadySaved = toggleBtn.classList.contains('active-saved');

        const formData = new FormData();
        formData.append('movie_id', movieId);
        if (!isAlreadySaved) {
            // Only need to send the display metadata when adding — removal
            // only needs the id.
            const title = toggleBtn.dataset.title ? decodeURIComponent(toggleBtn.dataset.title) : '';
            formData.append('title', title);
            formData.append('poster_path', toggleBtn.dataset.poster || '');
            formData.append('vote_average', toggleBtn.dataset.rating || '');
            formData.append('release_date', toggleBtn.dataset.year || '');
        }

        fetch('api/toggle_watchlist.php', { method: 'POST', body: formData })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'error') {
                    alert(data.message || 'Please sign in to save movies to your watchlist.');
                    if (data.message && data.message.toLowerCase().includes('session')) {
                        window.location.href = 'login.php';
                    }
                    return;
                }

                if (data.status === 'added') {
                    toggleBtn.classList.add('active-saved');
                    toggleBtn.innerHTML = '<i class="bi bi-bookmark-check-fill"></i>';
                } else if (data.status === 'removed') {
                    toggleBtn.classList.remove('active-saved');
                    toggleBtn.innerHTML = '<i class="bi bi-bookmark"></i>';

                    // On the watchlist page, removing an item should fade
                    // its card out instead of just flipping the icon.
                    const watchlistCard = document.getElementById(`watchlist-item-${movieId}`);
                    if (watchlistCard) {
                        watchlistCard.style.transition = 'all 0.3s ease';
                        watchlistCard.style.opacity = '0';
                        watchlistCard.style.transform = 'scale(0.9)';
                        setTimeout(() => {
                            watchlistCard.remove();
                            if (document.querySelectorAll('.movie-card-interactive').length === 0) {
                                window.location.reload();
                            }
                        }, 300);
                    }
                }
            })
            .catch(err => {
                console.error(err);
                alert('Error communicating with the watchlist service.');
            });
        return;
    }

    // 2. Movie details modal
    const modalTrigger = e.target.closest('[data-open-modal]');
    if (modalTrigger) {
        const movieId = modalTrigger.dataset.openModal;
        const modalEl = document.getElementById('movieDetailsModal');
        if (!modalEl) return;

        const bsModal = new bootstrap.Modal(modalEl);
        bsModal.show();
        document.getElementById('modal-loading-spinner')?.classList.remove('d-none');
        document.getElementById('modal-content-target')?.classList.add('d-none');

        // Routed through our own server-side endpoint — the TMDB key never
        // touches the browser.
        fetch(`api/get_movie_details.php?id=${encodeURIComponent(movieId)}`)
            .then(res => res.json())
            .then(movie => {
                if (movie.error) throw new Error(movie.error);

                document.getElementById('modal-loading-spinner')?.classList.add('d-none');
                document.getElementById('modal-content-target')?.classList.remove('d-none');

                document.getElementById('modal-movie-title').innerText = movie.title || 'Untitled';
                document.getElementById('modal-movie-overview').innerText = movie.overview || 'No synopsis available.';
                document.getElementById('modal-movie-year').innerText = movie.release_date ? movie.release_date.substring(0, 4) : 'N/A';
                document.getElementById('modal-movie-rating').innerHTML = `★ ${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}`;
                document.getElementById('modal-movie-runtime').innerText = movie.runtime ? `${movie.runtime} min` : '';

                const posterPath = movie.poster_path
                    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                    : 'https://via.placeholder.com/500x750/1F150C/E1DCC9?text=No+Poster';
                document.getElementById('modal-movie-poster').src = posterPath;
                document.getElementById('modal-backdrop-blur').style.backgroundImage = `url(${posterPath})`;

                const trailerBtn = document.getElementById('modal-movie-trailer-btn');
                const videos = movie.videos && movie.videos.results ? movie.videos.results : [];
                const officialTrailer = videos.find(v => v.type === 'Trailer' && v.site === 'YouTube');

                if (officialTrailer && trailerBtn) {
                    trailerBtn.href = `https://www.youtube.com/watch?v=${officialTrailer.key}`;
                    trailerBtn.classList.remove('d-none');
                } else if (trailerBtn) {
                    trailerBtn.classList.add('d-none');
                }
            })
            .catch(err => {
                console.error('Could not load movie details:', err);
                document.getElementById('modal-loading-spinner')?.classList.add('d-none');
                const contentTarget = document.getElementById('modal-content-target');
                if (contentTarget) {
                    contentTarget.classList.remove('d-none');
                    contentTarget.innerHTML = '<div class="col-12 text-center text-danger py-4">Could not load details for this movie.</div>';
                }
            });
    }
});
