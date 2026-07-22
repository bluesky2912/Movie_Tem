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

/* ============================================================================
   Scroll Reveal Engine
   Adds the .reveal-on-scroll class (focus-pull effect defined in styles.css)
   to any matched elements, staggers their transition delay, and fades/sharpens
   them in via IntersectionObserver as they enter the viewport. Safe to call
   repeatedly — e.g. after dynamically injecting fresh movie cards — since
   elements that already have the class are just re-observed, not re-tagged.
============================================================================ */
const scrollRevealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            scrollRevealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

function initScrollReveal(selector, container = document) {
    container.querySelectorAll(selector).forEach((el, i) => {
        if (!el.classList.contains('reveal-on-scroll')) {
            el.classList.add('reveal-on-scroll');
            el.style.transitionDelay = `${Math.min(i * 60, 360)}ms`;
            el.style.setProperty('--tilt', i % 2 === 0 ? '-1.5deg' : '1.5deg');
        }
        scrollRevealObserver.observe(el);
    });
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

/* ============================================================================
   Scroll progress bar — a strip of film unwinding across the top
============================================================================ */
function updateScrollProgress() {
    const bar = document.getElementById('scroll-progress-bar');
    if (!bar) return;
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width = `${pct}%`;
}
window.addEventListener('scroll', updateScrollProgress, { passive: true });

/* ============================================================================
   Hero: letter-by-letter title reveal, cursor-follow spotlight, parallax posters
============================================================================ */
function splitLettersForReveal(el) {
    if (!el || el.dataset.split === 'true') return;
    const text = el.textContent;
    el.textContent = '';
    let delay = 0;
    [...text].forEach(ch => {
        const span = document.createElement('span');
        span.className = 'letter';
        span.textContent = ch === ' ' ? '\u00A0' : ch;
        span.style.animationDelay = `${delay}ms`;
        delay += 22;
        el.appendChild(span);
    });
    el.dataset.split = 'true';
}

function initHeroMotion() {
    const heroBanner = document.getElementById('hero-banner');
    if (!heroBanner) return;

    splitLettersForReveal(heroBanner.querySelector('.hero-headline'));

    const spotlight = heroBanner.querySelector('.hero-spotlight');
    const posterLayers = heroBanner.querySelectorAll('.poster-parallax-layer');

    heroBanner.addEventListener('mousemove', (e) => {
        const rect = heroBanner.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        if (spotlight) {
            spotlight.style.setProperty('--spot-x', `${x}%`);
            spotlight.style.setProperty('--spot-y', `${y}%`);
        }

        posterLayers.forEach(layer => {
            const depth = parseFloat(layer.dataset.depth || '1');
            const base = layer.dataset.baseTransform || '';
            const moveX = (x - 50) * depth * 0.25;
            const moveY = (y - 50) * depth * 0.25;
            layer.style.transform = `translate(${moveX}px, ${moveY}px) ${base}`;
        });
    });

    heroBanner.addEventListener('mouseleave', () => {
        posterLayers.forEach(layer => {
            layer.style.transform = layer.dataset.baseTransform || '';
        });
    });
}

/* ============================================================================
   3D tilt for mood cards + movie cards — delegated so it works on cards
   injected later by fetch() calls too
============================================================================ */
function applyTilt(el, e) {
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rotateY = (px - 0.5) * 14;
    const rotateX = (0.5 - py) * 14;
    el.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
}

document.addEventListener('mousemove', (e) => {
    const tiltEl = e.target.closest('.mood-card, .movie-card-interactive');
    if (tiltEl) applyTilt(tiltEl, e);
});

// mouseleave doesn't bubble, so listen in the capture phase on the document
document.addEventListener('mouseleave', (e) => {
    const tiltEl = e.target.closest && e.target.closest('.mood-card, .movie-card-interactive');
    if (tiltEl) tiltEl.style.transform = '';
}, true);

/* ============================================================================
   Ripple effect on primary buttons
============================================================================ */
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-warning-custom');
    if (!btn) return;

    let layer = btn.querySelector('.btn-ripple-layer');
    if (!layer) {
        layer = document.createElement('span');
        layer.className = 'btn-ripple-layer';
        btn.insertBefore(layer, btn.firstChild);
    }

    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.4;
    const ripple = document.createElement('span');
    ripple.className = 'btn-ripple';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    layer.appendChild(ripple);
    setTimeout(() => ripple.remove(), 650);
});

/* ============================================================================
   Star rating sparkle burst — fires when the user picks 5 stars
============================================================================ */
function spawnSparkles(container) {
    if (!container) return;
    for (let i = 0; i < 8; i++) {
        const spark = document.createElement('span');
        spark.className = 'star-sparkle';
        const angle = (Math.PI * 2 * i) / 8;
        spark.style.setProperty('--dx', `${Math.cos(angle) * 32}px`);
        spark.style.setProperty('--dy', `${Math.sin(angle) * 32}px`);
        container.appendChild(spark);
        setTimeout(() => spark.remove(), 700);
    }
}

/* ============================================================================
   Toast notifications — replaces jarring alert() calls
============================================================================ */
function getToastStack() {
    let stack = document.getElementById('toast-stack');
    if (!stack) {
        stack = document.createElement('div');
        stack.id = 'toast-stack';
        document.body.appendChild(stack);
    }
    return stack;
}

function showToast(message, type = 'info', icon = null) {
    const stack = getToastStack();
    const toast = document.createElement('div');
    toast.className = `movietem-toast ${type === 'error' ? 'toast-error' : ''}`;
    toast.innerHTML = `<span>${icon || (type === 'error' ? '⚠️' : '🎬')}</span><span>${escapeHtml(message)}</span>`;
    stack.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('toast-leaving');
        setTimeout(() => toast.remove(), 350);
    }, 3200);
}

/* ============================================================================
   Confetti burst
============================================================================ */
function fireConfetti(originX = window.innerWidth / 2, originY = window.innerHeight / 2, count = 26) {
    const colors = ['#C9962E', '#F2EBDA', '#6AAE7F', '#E1DCC9'];
    for (let i = 0; i < count; i++) {
        const piece = document.createElement('span');
        piece.className = 'confetti-piece';
        const angle = Math.random() * Math.PI * 2;
        const distance = 60 + Math.random() * 140;
        const x1 = Math.cos(angle) * distance;
        const y1 = Math.sin(angle) * distance - 40;
        piece.style.setProperty('--x0', `${originX}px`);
        piece.style.setProperty('--y0', `${originY}px`);
        piece.style.setProperty('--x1', `${originX + x1}px`);
        piece.style.setProperty('--y1', `${originY + y1 + 200}px`);
        piece.style.setProperty('--spin', `${360 + Math.random() * 360}deg`);
        piece.style.background = colors[Math.floor(Math.random() * colors.length)];
        piece.style.animationDuration = `${0.9 + Math.random() * 0.6}s`;
        document.body.appendChild(piece);
        setTimeout(() => piece.remove(), 1600);
    }
}

/* ============================================================================
   Slot-machine spin for "Surprise Me"
============================================================================ */
function slotMachineReveal(moodCardsArr, onDone) {
    let ticks = 0;
    const maxTicks = 14;
    const interval = setInterval(() => {
        moodCardsArr.forEach(c => c.classList.remove('slot-cycling'));
        moodCardsArr[Math.floor(Math.random() * moodCardsArr.length)].classList.add('slot-cycling');
        ticks++;
        if (ticks >= maxTicks) {
            clearInterval(interval);
            moodCardsArr.forEach(c => c.classList.remove('slot-cycling'));
            onDone();
        }
    }, 70);
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
                if (data && data.error) {
                    console.error('TMDB error (mood):', data.error);
                    grid.innerHTML = `<div class="col-12 text-center text-danger py-4">Couldn't reach the movie database: ${escapeHtml(data.error)}</div>`;
                    return;
                }
                if (!data || !data.length) {
                    grid.innerHTML = `<div class="col-12 text-center text-muted py-4">No movies matched this mood tonight. Try another one.</div>`;
                    return;
                }
                grid.innerHTML = data.slice(0, 8).map(movieCardHtml).join('');
                initScrollReveal('.movie-card-interactive', grid);
            })
            .catch((err) => {
                console.error('Network error (mood):', err);
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
                if (data && data.error) {
                    console.error('TMDB error (search):', data.error);
                    grid.innerHTML = `<div class="col-12 text-center text-danger py-4">Couldn't reach the movie database: ${escapeHtml(data.error)}</div>`;
                    return;
                }
                if (!data || !data.length) {
                    grid.innerHTML = `<div class="col-12 text-center text-muted py-4">No movies found matching "${safeQuery}". Check your spelling or try another title!</div>`;
                    return;
                }
                grid.innerHTML = data.slice(0, 8).map(movieCardHtml).join('');
                initScrollReveal('.movie-card-interactive', grid);
            })
            .catch((err) => {
                console.error('Network error (search):', err);
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
            randomMoodBtn.disabled = true;
            slotMachineReveal(Array.from(moodCards), () => {
                randomMoodBtn.disabled = false;
                const randomCard = moodCards[Math.floor(Math.random() * moodCards.length)];
                randomCard.click();
            });
        });
    }

    // Hidden easter egg — click the logo 5 times in quick succession
    let logoClickCount = 0;
    let logoClickTimer = null;
    const logo = document.querySelector('.navbar-brand');
    if (logo) {
        logo.addEventListener('click', (e) => {
            logoClickCount++;
            clearTimeout(logoClickTimer);
            logoClickTimer = setTimeout(() => { logoClickCount = 0; }, 1500);
            if (logoClickCount >= 5) {
                e.preventDefault();
                logoClickCount = 0;
                fireConfetti(window.innerWidth / 2, window.innerHeight / 3, 60);
                showToast("You found the director's cut!", 'info', '🎬');
            }
        });
    }

    // "For You" — personalized recommendations based on the user's ratings
    if (isLoggedIn) {
        const forYouSection = document.getElementById('for-you-section');
        const forYouGrid = document.getElementById('for-you-grid');
        const forYouEmpty = document.getElementById('for-you-empty-state');

        if (forYouSection && forYouGrid) {
            renderSkeletons(forYouGrid, 4);
            fetch('api/get_recommendations.php')
                .then(res => res.json())
                .then(data => {
                    if (data.status === 'success' && data.movies && data.movies.length > 0) {
                        forYouGrid.innerHTML = data.movies.map(movieCardHtml).join('');
                        initScrollReveal('.movie-card-interactive', forYouGrid);
                    } else {
                        forYouSection.classList.add('d-none');
                        if (data.status === 'not_enough_data' && forYouEmpty) {
                            forYouEmpty.classList.remove('d-none');
                        }
                    }
                })
                .catch(err => {
                    console.error('Could not load recommendations:', err);
                    forYouSection.classList.add('d-none');
                });
        }
    }

    // Reveal static, always-on-page sections as the user scrolls to them
    // (alternating left/right tilt is applied automatically by initScrollReveal)
    initScrollReveal('.mood-card');
    initScrollReveal('#how-it-works-section .col');
    initScrollReveal('#mood-selector-anchor, #how-it-works-section .text-center.mb-5');

    initHeroMotion();
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
            toggleBtn.classList.add('shake-error');
            setTimeout(() => toggleBtn.classList.remove('shake-error'), 500);
            showToast('Sign in to save movies to your watchlist.', 'error');
            setTimeout(() => { window.location.href = 'login.php'; }, 900);
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
                    toggleBtn.classList.add('shake-error');
                    setTimeout(() => toggleBtn.classList.remove('shake-error'), 500);
                    showToast(data.message || 'Please sign in to save movies to your watchlist.', 'error');
                    if (data.message && data.message.toLowerCase().includes('session')) {
                        setTimeout(() => { window.location.href = 'login.php'; }, 900);
                    }
                    return;
                }

                if (data.status === 'added') {
                    toggleBtn.classList.add('active-saved');
                    toggleBtn.innerHTML = '<i class="bi bi-bookmark-check-fill"></i>';
                    const rect = toggleBtn.getBoundingClientRect();
                    fireConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2, 18);
                    showToast('Added to your watchlist!', 'info', '🍿');
                } else if (data.status === 'removed') {
                    toggleBtn.classList.remove('active-saved');
                    toggleBtn.innerHTML = '<i class="bi bi-bookmark"></i>';
                    showToast('Removed from your watchlist.', 'info', '📤');

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
                showToast('Error communicating with the watchlist service.', 'error');
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
        const spinnerEl = document.getElementById('modal-loading-spinner');
        if (spinnerEl) {
            spinnerEl.innerHTML = '<div class="film-reel-loader"></div>';
            spinnerEl.classList.remove('d-none');
        }
        document.getElementById('modal-content-target')?.classList.add('d-none');

        // Bind the current movie ID onto the rating module context, and reset UI
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
        window.chosenRatingValue = 0;

        // Pre-fill any rating/review the user already saved for this movie
        if (isLoggedIn) {
            fetch(`api/get_user_rating.php?movie_id=${encodeURIComponent(movieId)}`)
                .then(res => res.json())
                .then(data => {
                    if (data.rating && data.rating > 0 && ratingContainer) {
                        window.chosenRatingValue = data.rating;
                        ratingContainer.querySelectorAll('.star-select-btn').forEach(star => {
                            const val = parseInt(star.getAttribute('data-value'));
                            if (val <= data.rating) {
                                star.classList.remove('text-muted');
                                star.classList.add('text-warning');
                            }
                        });
                    }
                    if (data.review_text && reviewInput) {
                        reviewInput.value = data.review_text;
                    }
                })
                .catch(err => console.error('Could not load existing rating:', err));
        }

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
                console.error('Could not load movie details:', err.message);
                const spinner = document.getElementById('modal-loading-spinner');
                if (spinner) {
                    spinner.innerHTML = `<div class="text-danger small px-3">Could not load details: ${escapeHtml(err.message)}</div>`;
                    spinner.classList.remove('d-none');
                }
                // Deliberately leave #modal-content-target hidden rather than
                // overwriting its innerHTML — it holds the star rating and
                // review fields that need to survive for the next successful
                // open of this modal.
                document.getElementById('modal-content-target')?.classList.add('d-none');
            });
    }
});

/* ============================================================================
   Star Rating + Review Submission
============================================================================ */
document.addEventListener('DOMContentLoaded', () => {
    window.chosenRatingValue = 0;
    const starContainer = document.getElementById('user-star-rating-container');
    const reviewTextInput = document.getElementById('modal-review-text-input');
    const submitBtn = document.getElementById('submit-review-action-btn');
    const statusTextFeedback = document.getElementById('review-status-msg');

    if (!starContainer || !submitBtn) return;

    const allStars = starContainer.querySelectorAll('.star-select-btn');

    const moodLabels = ['', 'Meh', 'Good', 'Great', 'Amazing', 'Perfect!'];
    const starLabel = document.createElement('span');
    starLabel.className = 'star-mood-label';
    starContainer.appendChild(starLabel);

    function updateMoodLabel(value) {
        if (value > 0) {
            starLabel.textContent = moodLabels[value];
            starLabel.classList.add('is-active');
        } else {
            starLabel.classList.remove('is-active');
        }
    }

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
            updateMoodLabel(hoveredValue);
        });

        star.addEventListener('mouseleave', () => {
            paintStars(window.chosenRatingValue);
            updateMoodLabel(window.chosenRatingValue);
        });

        star.addEventListener('click', (e) => {
            if (!isLoggedIn) {
                statusTextFeedback.className = "small text-danger font-monospace";
                statusTextFeedback.innerText = "Please log in first!";
                return;
            }
            window.chosenRatingValue = parseInt(e.target.getAttribute('data-value'));
            paintStars(window.chosenRatingValue);
            updateMoodLabel(window.chosenRatingValue);
            if (window.chosenRatingValue === 5) {
                spawnSparkles(starContainer);
            }
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

        if (window.chosenRatingValue === 0) {
            statusTextFeedback.className = "small text-danger font-monospace";
            statusTextFeedback.innerText = "Select at least 1 star.";
            return;
        }

        submitBtn.disabled = true;
        statusTextFeedback.className = "small text-muted font-monospace";
        statusTextFeedback.innerText = "Saving data...";

        const formPayload = new FormData();
        formPayload.append('movie_id', activeMovieId);
        formPayload.append('rating', window.chosenRatingValue);
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
                const rect = submitBtn.getBoundingClientRect();
                fireConfetti(rect.left + rect.width / 2, rect.top, 22);
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