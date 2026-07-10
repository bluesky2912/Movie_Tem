// assets/js/app.js
const isLoggedIn = typeof window.MOVIETEM_IS_LOGGED_IN !== 'undefined' ? window.MOVIETEM_IS_LOGGED_IN : true;
const csrfToken = typeof window.MOVIETEM_CSRF_TOKEN !== 'undefined' ? window.MOVIETEM_CSRF_TOKEN : '';

// Prevents untrusted strings (search queries, TMDB titles) from being
// interpreted as HTML when inserted via innerHTML.
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
}

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
    const safeTitle = escapeHtml(title);

    return `
        <div class="col">
            <div class="card bg-surface border border-secondary border-opacity-10 rounded-4 overflow-hidden h-100 shadow-sm movie-card-interactive">
                <button class="watchlist-btn-toggle bookmark-btn" type="button"
                        data-movie-id="${movie.id}"
                        data-title="${encodeURIComponent(title)}"
                        data-poster="${movie.poster_path || ''}"
                        data-rating="${movie.vote_average || ''}"
                        data-year="${movie.release_date || ''}"
                        aria-label="Bookmark ${safeTitle}">
                    <i class="bi bi-bookmark"></i>
                </button>
                <div class="position-relative overflow-hidden img-hover-container" data-open-modal="${movie.id}" style="cursor:pointer;">
                    <img src="${poster}" class="card-img-top w-100 object-fit-cover" style="height: 340px;" alt="${safeTitle}">
                    <div class="card-rating-badge position-absolute rounded bg-black bg-opacity-75 small font-monospace text-warning" style="right: 10px; top: 10px;">
                        ★ ${rating}
                    </div>
                </div>
                <div class="card-body p-3 d-flex flex-column justify-content-between flex-grow-1">
                    <div>
                        <h5 class="card-title text-white h6 text-truncate mb-1">${safeTitle}</h5>
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
    const searchForm = document.getElementById('global-search-form');
    const searchInput = document.getElementById('movie-search-input');
    const suggestionsBox = document.getElementById('search-suggestions-box');

    function selectMood(card) {
        moodCards.forEach(c => c.classList.remove('active-mood'));
        card.classList.add('active-mood');

        const selectedMood = card.getAttribute('data-mood');
        const moodLabel = card.querySelector('.mood-title')?.innerText || selectedMood;

        if (!outputTarget) return;

        outputTarget.innerHTML = `
            <div class="text-start mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
                <h4 class="text-white m-0" style="font-family:'Fraunces', serif; font-style: italic;">
                    Showing matches for mood: <span class="text-warning">${escapeHtml(moodLabel)}</span>
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

    // Execution routine for running full text results search matching
    function executeSearch(query) {
        if (!query) return;
        if (suggestionsBox) suggestionsBox.classList.add('d-none');
        moodCards.forEach(c => c.classList.remove('active-mood'));

        if (!outputTarget) return;

        const safeQuery = escapeHtml(query);

        outputTarget.innerHTML = `
            <div class="text-start mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
                <h4 class="text-white m-0" style="font-family:'Fraunces', serif; font-style: italic;">
                    Search results for: <span class="text-warning">"${safeQuery}"</span>
                </h4>
                <button type="button" class="btn-clear-filter" id="clear-search-filter">Clear search ✕</button>
            </div>
            <div class="row row-cols-2 row-cols-md-4 g-4" id="mood-results-grid"></div>`;

        const grid = document.getElementById('mood-results-grid');
        renderSkeletons(grid);

        document.getElementById('clear-search-filter')?.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            outputTarget.innerHTML = '';
        });

        outputTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        fetch(`api/get_movies_by_mood.php?action=search&query=${encodeURIComponent(query)}`)
            .then(res => res.json())
            .then(data => {
                if (!data || !data.length) {
                    grid.innerHTML = `<div class="col-12 text-center text-muted py-4">No movies found matching "${safeQuery}". Check your spelling or try another title!</div>`;
                    return;
                }
                grid.innerHTML = data.slice(0, 8).map(movieCardHtml).join('');
            })
            .catch(() => {
                grid.innerHTML = `<div class="col-12 text-center text-danger py-4">Something went wrong processing your search query. Please try again.</div>`;
            });
    }

    if (searchForm && searchInput) {
        searchForm.addEventListener('submit', function (e) {
            e.preventDefault();
            executeSearch(searchInput.value.trim());
        });

        // LIVE AUTOCOMPLETE SUGGESTIONS LOGIC WITH TIMEOUT DEBOUNCING
        let debounceTimeout;
        searchInput.addEventListener('input', function () {
            clearTimeout(debounceTimeout);
            const query = this.value.trim();

            if (query.length < 2) {
                if (suggestionsBox) suggestionsBox.classList.add('d-none');
                return;
            }

            debounceTimeout = setTimeout(() => {
                fetch(`api/get_movies_by_mood.php?action=suggest&query=${encodeURIComponent(query)}`)
                    .then(res => res.json())
                    .then(movies => {
                        if (!movies || movies.length === 0 || !suggestionsBox) {
                            if (suggestionsBox) suggestionsBox.classList.add('d-none');
                            return;
                        }

                        suggestionsBox.innerHTML = movies.map(movie => {
                            const year = movie.release_date ? ` (${movie.release_date.substring(0, 4)})` : '';
                            const safeTitle = escapeHtml(movie.title);
                            return `
                                <button type="button" class="list-group-item list-group-item-action bg-dark text-white border-secondary border-opacity-10 small py-2 d-flex align-items-center gap-2 suggestion-item" data-title="${encodeURIComponent(movie.title)}">
                                    <i class="bi bi-film text-warning-custom small"></i>
                                    <span class="text-truncate">${safeTitle}${escapeHtml(year)}</span>
                                </button>
                            `;
                        }).join('');
                        suggestionsBox.classList.remove('d-none');
                    });
            }, 250);
        });

        // Hide recommendations dropdown if user clicks away
        document.addEventListener('click', (e) => {
            if (suggestionsBox && !searchForm.contains(e.target)) {
                suggestionsBox.classList.add('d-none');
            }
        });

        // Click handler for selected suggestion list items
        if (suggestionsBox) {
            suggestionsBox.addEventListener('click', function (e) {
                const item = e.target.closest('.suggestion-item');
                if (item) {
                    const selectedTitle = decodeURIComponent(item.dataset.title);
                    searchInput.value = selectedTitle;
                    executeSearch(selectedTitle);
                }
            });
        }
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
   Global click delegate: Watchlist and Details Modal
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
        formData.append('csrf_token', csrfToken);
        if (!isAlreadySaved) {
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

    // 2. Movie details modal + Where to Watch fetch logic
    const modalTrigger = e.target.closest('[data-open-modal]');
    if (modalTrigger) {
        const movieId = modalTrigger.dataset.openModal;
        const modalEl = document.getElementById('movieDetailsModal');
        if (!modalEl) return;

        const bsModal = new bootstrap.Modal(modalEl);
        bsModal.show();
        document.getElementById('modal-loading-spinner')?.classList.remove('d-none');
        document.getElementById('modal-content-target')?.classList.add('d-none');

        // Bind the current movie ID onto the rating module context
        const ratingContainer = document.getElementById('user-star-rating-container');
        if (ratingContainer) {
            ratingContainer.dataset.currentMovieId = movieId;
            ratingContainer.querySelectorAll('.star-select-btn').forEach(s => {
                s.classList.remove('text-warning');
                s.classList.add('text-muted');
            });
        }
        const reviewInput = document.getElementById('modal-review-text-input');
        if (reviewInput) reviewInput.value = '';
        const statusMsg = document.getElementById('review-status-msg');
        if (statusMsg) statusMsg.innerText = '';

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

                // BUILD STREAMING PROVIDERS LIST
                const providersTarget = document.getElementById('modal-movie-providers-target');
                if (providersTarget) {
                    providersTarget.innerHTML = '';

                    const regionalProviders = movie['watch/providers']?.results?.IN;
                    const flatStreamingOptions = regionalProviders?.flatrate || regionalProviders?.rent || [];

                    if (flatStreamingOptions.length > 0) {
                        providersTarget.innerHTML = flatStreamingOptions.slice(0, 4).map(provider => `
                            <div class="d-flex align-items-center bg-dark bg-opacity-50 border border-secondary border-opacity-10 p-1 pe-2 rounded-2" title="${escapeHtml(provider.provider_name)}">
                                <img src="https://image.tmdb.org/t/p/w92${provider.logo_path}" alt="${escapeHtml(provider.provider_name)}" class="rounded" style="width:24px; height:24px; object-fit:cover;">
                                <span class="ms-2 font-sans-serif text-white-50" style="font-size:0.75rem;">${escapeHtml(provider.provider_name)}</span>
                            </div>
                        `).join('');
                    } else {
                        providersTarget.innerHTML = '<span class="text-muted small">Not currently streaming locally. Check theater listings!</span>';
                    }
                }

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

/* ============================================================================
   Star Rating + Review Submission
============================================================================ */
document.addEventListener('DOMContentLoaded', () => {
    let chosenRatingValue = 0;
    const starContainer = document.getElementById('user-star-rating-container');
    const reviewTextInput = document.getElementById('modal-review-text-input');
    const submitBtn = document.getElementById('submit-review-action-btn');
    const statusTextFeedback = document.getElementById('review-status-msg');

    if (!starContainer || !submitBtn) return;

    const allStars = starContainer.querySelectorAll('.star-select-btn');

    function paintStars(ratingCount) {
        allStars.forEach(star => {
            const currentStarValue = parseInt(star.getAttribute('data-value'));
            if (currentStarValue <= ratingCount) {
                star.classList.remove('text-muted');
                star.classList.add('text-warning');
            } else {
                star.classList.remove('text-warning');
                star.classList.add('text-muted');
            }
        });
    }

    allStars.forEach(star => {
        star.addEventListener('mouseenter', (e) => {
            const hoveredValue = parseInt(e.target.getAttribute('data-value'));
            paintStars(hoveredValue);
        });

        star.addEventListener('mouseleave', () => {
            paintStars(chosenRatingValue);
        });

        star.addEventListener('click', (e) => {
            if (!isLoggedIn) {
                statusTextFeedback.className = "small text-danger font-monospace";
                statusTextFeedback.innerText = "Please log in first!";
                return;
            }
            chosenRatingValue = parseInt(e.target.getAttribute('data-value'));
            paintStars(chosenRatingValue);
        });
    });

    submitBtn.addEventListener('click', () => {
        if (!isLoggedIn) {
            statusTextFeedback.className = "small text-danger font-monospace";
            statusTextFeedback.innerText = "Log in required.";
            return;
        }

        const activeMovieId = starContainer.dataset.currentMovieId;
        const feedbackMessage = reviewTextInput.value.trim();

        if (!activeMovieId) {
            statusTextFeedback.className = "small text-danger font-monospace";
            statusTextFeedback.innerText = "Error: Invalid target identification.";
            return;
        }

        if (chosenRatingValue === 0) {
            statusTextFeedback.className = "small text-danger font-monospace";
            statusTextFeedback.innerText = "Select at least 1 star.";
            return;
        }

        submitBtn.disabled = true;
        statusTextFeedback.className = "small text-muted font-monospace";
        statusTextFeedback.innerText = "Saving data...";

        const formPayload = new FormData();
        formPayload.append('movie_id', activeMovieId);
        formPayload.append('rating', chosenRatingValue);
        formPayload.append('review_text', feedbackMessage);
        formPayload.append('csrf_token', csrfToken);

        fetch('api/submit_review.php', {
            method: 'POST',
            body: formPayload
        })
        .then(response => response.json())
        .then(data => {
            submitBtn.disabled = false;
            if (data.status === 'success') {
                statusTextFeedback.className = "small text-success font-monospace";
                statusTextFeedback.innerText = "Saved successfully!";
                setTimeout(() => { statusTextFeedback.innerText = ''; }, 3000);
            } else {
                statusTextFeedback.className = "small text-danger font-monospace";
                statusTextFeedback.innerText = data.message || "Execution error.";
            }
        })
        .catch(error => {
            submitBtn.disabled = false;
            statusTextFeedback.className = "small text-danger font-monospace";
            statusTextFeedback.innerText = "Network connection error.";
            console.error('Submission error context details:', error);
        });
    });
});