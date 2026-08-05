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
   Streaming provider search URLs
   TMDB's free API only gives one generic aggregator link, not a true
   per-title deep link into each provider (that's a paid JustWatch affiliate
   feature). This sends the click to the *actual* provider's own site,
   pre-searched for the title, instead of routing through TMDB. Keyed on the
   lowercased provider_name TMDB returns; unmatched providers fall back to
   the TMDB regional link, then to a plain Google search as a last resort.
============================================================================ */
const PROVIDER_SEARCH_URLS = {
    'netflix':                  (q) => `https://www.netflix.com/search?q=${q}`,
    'amazon prime video':       (q) => `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${q}`,
    'amazon video':             (q) => `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${q}`,
    'disney plus':              (q) => `https://www.disneyplus.com/search?q=${q}`,
    'disney+':                  (q) => `https://www.disneyplus.com/search?q=${q}`,
    'disney+ hotstar':          (q) => `https://www.hotstar.com/in/search?q=${q}`,
    'hotstar':                  (q) => `https://www.hotstar.com/in/search?q=${q}`,
    'apple tv':                 (q) => `https://tv.apple.com/search?term=${q}`,
    'apple tv plus':            (q) => `https://tv.apple.com/search?term=${q}`,
    'apple itunes':             (q) => `https://tv.apple.com/search?term=${q}`,
    'hulu':                     (q) => `https://www.hulu.com/search?q=${q}`,
    'hbo max':                  (q) => `https://play.max.com/search?q=${q}`,
    'max':                      (q) => `https://play.max.com/search?q=${q}`,
    'paramount plus':           (q) => `https://www.paramountplus.com/search/?query=${q}`,
    'peacock':                  (q) => `https://www.peacocktv.com/search?q=${q}`,
    'youtube':                  (q) => `https://www.youtube.com/results?search_query=${q}`,
    'google play movies':       (q) => `https://play.google.com/store/search?q=${q}&c=movies`,
    'jiocinema':                (q) => `https://www.jiocinema.com/search/${q}`,
    'sonyliv':                  (q) => `https://www.sonyliv.com/search?q=${q}`,
    'zee5':                     (q) => `https://www.zee5.com/search?q=${q}`,
    'mubi':                     (q) => `https://mubi.com/search/films?query=${q}`,
};

function buildProviderUrl(providerName, movieTitle, fallbackWatchLink) {
    const key = (providerName || '').trim().toLowerCase();
    const query = encodeURIComponent(movieTitle || '');
    if (PROVIDER_SEARCH_URLS[key]) {
        return PROVIDER_SEARCH_URLS[key](query);
    }
    if (fallbackWatchLink) {
        return fallbackWatchLink;
    }
    return `https://www.google.com/search?q=${encodeURIComponent('watch ' + (movieTitle || '') + ' on ' + providerName)}`;
}

/* ============================================================================
   Watchlist filter tabs (All / To Watch / Watched) — watchlist.php only.
   Safe to call on pages without these elements; every lookup is guarded.
============================================================================ */
function getActiveWatchlistFilter() {
    const activeTab = document.querySelector('.watchlist-filter-tab.active');
    return activeTab ? activeTab.dataset.filter : 'all';
}

function applyActiveWatchlistFilter() {
    const filter = getActiveWatchlistFilter();
    const cards = document.querySelectorAll('.watchlist-card-col');
    let visibleCount = 0;

    cards.forEach(card => {
        const matches =
            filter === 'all' ||
            (filter === 'watched' && card.classList.contains('is-watched')) ||
            (filter === 'unwatched' && card.classList.contains('is-unwatched'));
        card.classList.toggle('filtered-out', !matches);
        if (matches) visibleCount++;
    });

    const emptyState = document.getElementById('watchlist-empty-filter');
    if (emptyState) {
        emptyState.classList.toggle('d-none', visibleCount !== 0);
    }
}

function updateWatchlistFilterCounts() {
    const allCount = document.querySelectorAll('.watchlist-card-col').length;
    const watchedCount = document.querySelectorAll('.watchlist-card-col.is-watched').length;
    const unwatchedCount = allCount - watchedCount;

    const setCount = (filter, value) => {
        const tab = document.querySelector(`.watchlist-filter-tab[data-filter="${filter}"] .filter-count`);
        if (tab) tab.textContent = value;
    };
    setCount('all', allCount);
    setCount('watched', watchedCount);
    setCount('unwatched', unwatchedCount);
}

function initWatchlistFilterTabs() {
    const tabs = document.querySelectorAll('.watchlist-filter-tab');
    if (!tabs.length) return;

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            applyActiveWatchlistFilter();
        });
    });
}

/* ============================================================================
   Timeline page: franchise/collection search autocomplete
============================================================================ */
/* ============================================================================
   Cinematic rotating background — fetches a handful of top-rated movie
   backdrops and crossfades between them behind the page content. Only
   activates on pages that actually include the #cinematic-bg container.
============================================================================ */
function initCinematicBackground() {
    const container = document.getElementById('cinematic-bg');
    if (!container) return;

    fetch('api/get_background_movies.php')
        .then(res => res.json())
        .then(data => {
            if (!data || data.error || !data.length) return;

            data.forEach((url, i) => {
                const slide = document.createElement('div');
                slide.className = 'bg-slide' + (i === 0 ? ' active' : '');
                slide.style.backgroundImage = `url(${url})`;
                container.appendChild(slide);
            });

            const slides = container.querySelectorAll('.bg-slide');
            if (slides.length <= 1) return;

            let current = 0;
            setInterval(() => {
                slides[current].classList.remove('active');
                current = (current + 1) % slides.length;
                slides[current].classList.add('active');
            }, 7000);
        })
        .catch(() => {
            // Silent failure is the right call here — this is pure
            // atmosphere, not something worth interrupting the page over.
        });
}

function initTimelineSearch() {
    const input = document.getElementById('timeline-search-input');
    const box = document.getElementById('timeline-suggestions-box');
    if (!input || !box) return;

    let debounceTimeout;
    input.addEventListener('input', function () {
        clearTimeout(debounceTimeout);
        const query = this.value.trim();

        if (query.length < 2) {
            box.classList.add('d-none');
            return;
        }

        debounceTimeout = setTimeout(() => {
            fetch(`api/search_collections.php?query=${encodeURIComponent(query)}`)
                .then(res => res.json())
                .then(results => {
                    if (!results || results.error || results.length === 0) {
                        box.classList.add('d-none');
                        return;
                    }
                    box.innerHTML = results.map(c => `
                        <button type="button" class="list-group-item list-group-item-action bg-dark text-white border-secondary border-opacity-10 small py-2 d-flex align-items-center gap-2 timeline-suggestion-item" data-collection-id="${c.id}">
                            <i class="bi bi-collection-play text-warning-custom small"></i>
                            <span class="text-truncate">${escapeHtml(c.name)}</span>
                        </button>
                    `).join('');
                    box.classList.remove('d-none');
                })
                .catch(() => box.classList.add('d-none'));
        }, 250);
    });

    box.addEventListener('click', (e) => {
        const item = e.target.closest('.timeline-suggestion-item');
        if (item) {
            window.location.href = `timeline.php?collection_id=${encodeURIComponent(item.dataset.collectionId)}`;
        }
    });

    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !box.contains(e.target)) {
            box.classList.add('d-none');
        }
    });
}

/* ============================================================================
   Movie Match — two-person swipe game (match.php only)
   Both players swipe the SAME shuffled deck, one after another on the same
   device. A "match" is any movie both players liked. Everything lives in
   memory for the duration of the session — there's nothing to persist here,
   the whole point is a quick, in-the-moment decision.
============================================================================ */
let matchDeck = [];
let matchIndex = 0;
let matchCurrentPlayer = 1;
let matchPlayer1Likes = [];
let matchPlayer2Likes = [];
let matchDeckLoading = false;
let matchSelectedGenres = [];
let matchSelectedEra = 'any';

function setupMatchCardDrag(cardEl, onSwiped) {
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let dragging = false;
    const threshold = 110;

    function updateStamps(dx) {
        const likeStamp = cardEl.querySelector('.match-card-stamp.like');
        const nopeStamp = cardEl.querySelector('.match-card-stamp.nope');
        const strength = Math.min(Math.abs(dx) / threshold, 1);
        if (dx > 0) {
            if (likeStamp) likeStamp.style.opacity = strength;
            if (nopeStamp) nopeStamp.style.opacity = 0;
        } else {
            if (nopeStamp) nopeStamp.style.opacity = strength;
            if (likeStamp) likeStamp.style.opacity = 0;
        }
    }

    function onPointerDown(e) {
        dragging = true;
        cardEl.classList.add('dragging');
        startX = e.clientX;
        startY = e.clientY;
        cardEl.setPointerCapture(e.pointerId);
    }
    function onPointerMove(e) {
        if (!dragging) return;
        currentX = e.clientX - startX;
        const dy = e.clientY - startY;
        const rotate = currentX / 20;
        cardEl.style.transform = `translate(${currentX}px, ${dy * 0.4}px) rotate(${rotate}deg)`;
        updateStamps(currentX);
    }
    function onPointerUp() {
        if (!dragging) return;
        dragging = false;
        cardEl.classList.remove('dragging');
        if (Math.abs(currentX) > threshold) {
            onSwiped(currentX > 0);
        } else {
            cardEl.style.transform = '';
            cardEl.querySelectorAll('.match-card-stamp').forEach(s => { s.style.opacity = 0; });
        }
        currentX = 0;
    }

    cardEl.addEventListener('pointerdown', onPointerDown);
    cardEl.addEventListener('pointermove', onPointerMove);
    cardEl.addEventListener('pointerup', onPointerUp);
    cardEl.addEventListener('pointercancel', onPointerUp);
}

function updateMatchProgress() {
    const bar = document.getElementById('match-progress-bar');
    const label = document.getElementById('match-player-label');
    if (bar) bar.style.width = `${(matchIndex / matchDeck.length) * 100}%`;
    if (label) label.textContent = `Player ${matchCurrentPlayer}`;
}

function renderMatchStack() {
    const stack = document.getElementById('match-card-stack');
    if (!stack) return;
    stack.innerHTML = '';

    const visible = matchDeck.slice(matchIndex, matchIndex + 3);

    // Append back-to-front so the current (top) card ends up last in the
    // DOM — that's also what the Yes/No buttons target via :last-child.
    visible.slice().reverse().forEach((movie, revIdx) => {
        const posIdx = visible.length - 1 - revIdx; // 0 = the interactive top card
        const poster = movie.poster_path
            ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
            : 'https://via.placeholder.com/500x750/1a1510/fff?text=No+Poster';
        const safeTitle = escapeHtml(movie.title || 'Untitled');

        const card = document.createElement('div');
        card.className = 'match-card';
        card.style.zIndex = 10 - posIdx;
        card.style.transform = posIdx === 0 ? '' : `scale(${1 - posIdx * 0.04}) translateY(${posIdx * 10}px)`;
        card.style.opacity = posIdx === 0 ? '1' : `${1 - posIdx * 0.25}`;
        card.innerHTML = `
            <img src="${poster}" alt="${safeTitle}">
            <span class="match-card-stamp like">LIKE</span>
            <span class="match-card-stamp nope">NOPE</span>
            <div class="match-card-overlay">
                <h5 class="match-card-title">${safeTitle}</h5>
                <div class="match-card-meta">★ ${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'} · ${movie.release_date ? movie.release_date.substring(0, 4) : 'Unknown'}</div>
            </div>
        `;
        stack.appendChild(card);

        if (posIdx === 0) {
            setupMatchCardDrag(card, (liked) => commitMatchSwipe(liked, card));
        }
    });

    updateMatchProgress();
}

function commitMatchSwipe(liked, cardEl) {
    const movie = matchDeck[matchIndex];
    if (liked) {
        (matchCurrentPlayer === 1 ? matchPlayer1Likes : matchPlayer2Likes).push(movie.id);
    }

    const flyX = liked ? window.innerWidth : -window.innerWidth;
    cardEl.style.transition = 'transform 0.4s ease, opacity 0.4s ease';
    cardEl.style.transform = `translate(${flyX}px, -40px) rotate(${liked ? 30 : -30}deg)`;
    cardEl.style.opacity = '0';

    setTimeout(() => {
        matchIndex++;
        if (matchIndex >= matchDeck.length) {
            if (matchCurrentPlayer === 1) {
                showMatchHandoff();
            } else {
                finishMatch();
            }
        } else {
            renderMatchStack();
        }
    }, 300);
}

function showMatchHandoff() {
    document.getElementById('match-game')?.classList.add('d-none');
    document.getElementById('match-handoff')?.classList.remove('d-none');
}

function startPlayer2Round() {
    matchCurrentPlayer = 2;
    matchIndex = 0;
    document.getElementById('match-handoff')?.classList.add('d-none');
    document.getElementById('match-game')?.classList.remove('d-none');
    renderMatchStack();
}

function renderMatchReveal(matches) {
    document.getElementById('match-game')?.classList.add('d-none');
    document.getElementById('match-handoff')?.classList.add('d-none');
    const revealSection = document.getElementById('match-reveal');
    const content = document.getElementById('match-reveal-content');
    if (!revealSection || !content) return;

    revealSection.classList.remove('d-none');

    if (matches.length === 0) {
        content.innerHTML = `
            <div class="display-1 mb-3">😅</div>
            <h2 class="text-white fw-bold mb-2" style="font-family:'Fraunces',serif; font-style:italic;">No matches this round!</h2>
            <p class="text-muted mb-4">You two have wildly different taste. Want to try a fresh batch?</p>
            <button type="button" id="match-retry-btn" class="btn btn-warning-custom px-4 py-2 rounded-3 fw-semibold">🔁 Try Again</button>
        `;
    } else {
        content.innerHTML = `
            <div class="display-1 mb-2">🎉</div>
            <h2 class="text-white fw-bold mb-2" style="font-family:'Fraunces',serif; font-style:italic;">You matched on ${matches.length} movie${matches.length > 1 ? 's' : ''}!</h2>
            <p class="text-muted mb-4">Pick one and start watching.</p>
            <div class="row row-cols-2 row-cols-md-4 g-4 justify-content-center mb-4">
                ${matches.map(movieCardHtml).join('')}
            </div>
            <button type="button" id="match-retry-btn" class="btn btn-outline-light px-4 py-2 rounded-pill">🔁 Play Again</button>
        `;
        fireConfetti(window.innerWidth / 2, revealSection.getBoundingClientRect().top + 120, 40);
        initScrollReveal('.movie-card-interactive', content);
    }

    document.getElementById('match-retry-btn')?.addEventListener('click', startMovieMatch);
}

function finishMatch() {
    const matches = matchDeck.filter(m => matchPlayer1Likes.includes(m.id) && matchPlayer2Likes.includes(m.id));
    renderMatchReveal(matches);
}

function startMovieMatch() {
    // Guard against rapid double-clicks or a slow/failing request still in
    // flight — without this, every extra click fired its own fetch and
    // stacked its own error toast on top of the last one.
    if (matchDeckLoading) return;
    matchDeckLoading = true;

    // Whichever trigger button exists right now (the initial "Start a
    // Match" button, or a "Try Again" / "Play Again" button rendered after
    // a previous round) gets disabled for the duration of the request.
    const triggerBtn = document.getElementById('match-start-btn') || document.getElementById('match-retry-btn');
    if (triggerBtn) {
        triggerBtn.disabled = true;
        triggerBtn.dataset.originalText = triggerBtn.innerHTML;
        triggerBtn.innerHTML = 'Shuffling…';
    }

    document.getElementById('match-intro')?.classList.add('d-none');
    document.getElementById('match-how-it-works')?.classList.add('d-none');
    document.getElementById('match-reveal')?.classList.add('d-none');
    document.getElementById('match-handoff')?.classList.add('d-none');
    const gameSection = document.getElementById('match-game');
    gameSection?.classList.remove('d-none');

    matchIndex = 0;
    matchCurrentPlayer = 1;
    matchPlayer1Likes = [];
    matchPlayer2Likes = [];

    const stack = document.getElementById('match-card-stack');
    if (stack) stack.innerHTML = '<div class="text-center text-muted py-5 w-100">Shuffling movies…</div>';
    updateMatchProgress();

    function backToIntro() {
        matchDeckLoading = false;
        gameSection?.classList.add('d-none');
        document.getElementById('match-intro')?.classList.remove('d-none');
        document.getElementById('match-how-it-works')?.classList.remove('d-none');
        if (triggerBtn) {
            triggerBtn.disabled = false;
            triggerBtn.innerHTML = triggerBtn.dataset.originalText || '🎬 Start a Match';
        }
    }

    fetch(buildMatchDeckUrl())
        .then(res => res.json())
        .then(data => {
            if (data && data.error) {
                showToast("Couldn't load movies for matching. Try again.", 'error');
                backToIntro();
                return;
            }
            if (!data || !data.length) {
                showToast('No movies matched that genre + era combo. Try loosening the filters.', 'error');
                backToIntro();
                return;
            }
            matchDeck = data;
            matchDeckLoading = false;
            renderMatchStack();
        })
        .catch(() => {
            showToast('Network error loading the match deck.', 'error');
            backToIntro();
        });
}

function buildMatchDeckUrl() {
    const params = new URLSearchParams();
    if (matchSelectedGenres.length > 0) {
        params.set('genres', matchSelectedGenres.join(','));
    }
    if (matchSelectedEra && matchSelectedEra !== 'any') {
        params.set('era', matchSelectedEra);
    }
    const query = params.toString();
    return `api/get_match_deck.php${query ? '?' + query : ''}`;
}

function initMatchPreferenceChips() {
    const genreChips = document.querySelectorAll('#match-genre-chips .match-chip');
    genreChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const genreId = chip.dataset.genre;
            chip.classList.toggle('active');
            if (chip.classList.contains('active')) {
                if (!matchSelectedGenres.includes(genreId)) matchSelectedGenres.push(genreId);
            } else {
                matchSelectedGenres = matchSelectedGenres.filter(g => g !== genreId);
            }
        });
    });

    const eraChips = document.querySelectorAll('#match-era-chips .match-chip-era');
    eraChips.forEach(chip => {
        chip.addEventListener('click', () => {
            eraChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            matchSelectedEra = chip.dataset.era;
        });
    });
}

/* ============================================================================
   Mood Compass (taste.php) — count-up stat numbers and bar fills, both
   triggered the moment the page loads (these stats sit above the fold, so
   there's no need to gate this behind scroll visibility).
============================================================================ */
/* ============================================================================
   Custom magnetic cursor — mouse-only devices get a two-part cursor (a
   lerped outer ring, an instant inner dot) that expands over anything
   interactive. Gated behind (pointer: fine) so touch/tablet users never
   lose their native cursor, and the CSS itself only hides the native
   cursor once this JS confirms it actually attached successfully.
============================================================================ */
function initCustomCursor() {
    if (!window.matchMedia('(pointer: fine)').matches) return;

    document.body.classList.add('has-custom-cursor');

    const ring = document.createElement('div');
    ring.className = 'custom-cursor-ring';
    const dot = document.createElement('div');
    dot.className = 'custom-cursor-dot';
    document.body.appendChild(ring);
    document.body.appendChild(dot);

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
    });

    function animateRing() {
        ringX += (mouseX - ringX) * 0.18;
        ringY += (mouseY - ringY) * 0.18;
        ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
        requestAnimationFrame(animateRing);
    }
    animateRing();

    const interactiveSelector = 'a, button, input, textarea, .mood-card, .movie-card-interactive, .timeline-node, .compare-btn-toggle, .watchlist-btn-toggle, .watched-btn-toggle';
    document.addEventListener('mouseover', (e) => {
        if (e.target.closest(interactiveSelector)) ring.classList.add('is-hovering');
    });
    document.addEventListener('mouseout', (e) => {
        if (e.target.closest(interactiveSelector)) ring.classList.remove('is-hovering');
    });

    document.addEventListener('mouseleave', () => {
        ring.style.opacity = '0';
        dot.style.opacity = '0';
    });
    document.addEventListener('mouseenter', () => {
        ring.style.opacity = '1';
        dot.style.opacity = '1';
    });

    // Movie Match's drag cards get their native grab/grabbing cursor back —
    // a dot cursor would fight with the drag gesture instead of aiding it.
    const matchStack = document.getElementById('match-card-stack');
    if (matchStack) {
        matchStack.addEventListener('mouseenter', () => {
            ring.style.opacity = '0';
            dot.style.opacity = '0';
        });
        matchStack.addEventListener('mouseleave', () => {
            ring.style.opacity = '1';
            dot.style.opacity = '1';
        });
    }
}

/* ============================================================================
   Magnetic buttons — primary CTAs pull gently toward the cursor while it's
   nearby, snapping back on mouseleave. Mouse-only, same as the cursor above.
============================================================================ */
function initMagneticButtons() {
    if (!window.matchMedia('(pointer: fine)').matches) return;

    document.querySelectorAll('.btn-warning-custom, .match-swipe-btn').forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const relX = e.clientX - rect.left - rect.width / 2;
            const relY = e.clientY - rect.top - rect.height / 2;
            btn.style.transform = `translate(${relX * 0.25}px, ${relY * 0.25}px)`;
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = '';
        });
    });
}

/* ============================================================================
   Nav link text-scramble on hover — characters cycle randomly before
   settling back on the real label.
============================================================================ */
const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
function scrambleText(el) {
    if (el.dataset.scrambling === 'true') return;
    const originalText = el.dataset.originalText || el.textContent;
    el.dataset.originalText = originalText;
    el.dataset.scrambling = 'true';

    let iteration = 0;
    const totalIterations = originalText.length * 3;

    const interval = setInterval(() => {
        el.textContent = originalText.split('').map((char, index) => {
            if (char === ' ') return ' ';
            if (index < iteration / 3) return originalText[index];
            return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
        }).join('');

        iteration++;
        if (iteration > totalIterations) {
            clearInterval(interval);
            el.textContent = originalText;
            el.dataset.scrambling = 'false';
        }
    }, 30);
}

function initNavScramble() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('mouseenter', () => scrambleText(link));
    });
}

/* ============================================================================
   WebGL hero showcase (index.php only) — three concentric gold rings,
   each spinning on a different axis at a different speed, drifting behind
   a soft particle field of "grain in space," reacting to mouse position
   for a depth-parallax feel. Genuinely different from the CSS-only motion
   elsewhere on the site — this is real 3D, not a simulation of it.
   Requires three.js (loaded via CDN, homepage only) and a fine pointer;
   degrades to the section's own CSS gradient/glow background otherwise.
============================================================================ */
function initHeroWebGL() {
    const canvas = document.getElementById('hero-3d-canvas');
    if (!canvas || typeof THREE === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let scene, camera, renderer, ringGroup, particles;
    const rings = [];
    let mouseX = 0;
    let mouseY = 0;
    let spinBoost = 0; // decaying multiplier, kicked up by clicking the reel

    function getSize() {
        return { w: canvas.clientWidth || canvas.parentElement.clientWidth, h: canvas.clientHeight || 380 };
    }

    function setup() {
        const { w, h } = getSize();

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
        camera.position.z = 8;

        renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(w, h, false);

        scene.add(new THREE.AmbientLight(0xffffff, 0.4));
        const key = new THREE.PointLight(0xC9962E, 2, 20);
        key.position.set(5, 3, 5);
        scene.add(key);
        const fill = new THREE.PointLight(0xF2EBDA, 1, 20);
        fill.position.set(-5, -3, 3);
        scene.add(fill);

        const goldMaterial = new THREE.MeshStandardMaterial({
            color: 0xC9962E, metalness: 0.7, roughness: 0.3,
            emissive: 0x2a1c08, emissiveIntensity: 0.3
        });

        ringGroup = new THREE.Group();
        [
            { radius: 2.4, tube: 0.05, speed: 0.004, axis: 'y' },
            { radius: 1.8, tube: 0.06, speed: -0.006, axis: 'x' },
            { radius: 1.2, tube: 0.07, speed: 0.008, axis: 'y' },
        ].forEach(cfg => {
            const geo = new THREE.TorusGeometry(cfg.radius, cfg.tube, 16, 100);
            const mesh = new THREE.Mesh(geo, goldMaterial);
            mesh.rotation.x = Math.random() * Math.PI;
            mesh.rotation.y = Math.random() * Math.PI;
            ringGroup.add(mesh);
            rings.push({ mesh, cfg });
        });
        scene.add(ringGroup);

        const particleCount = 180;
        const positions = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 12;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 12;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 12;
        }
        const particleGeo = new THREE.BufferGeometry();
        particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const particleMat = new THREE.PointsMaterial({ color: 0xF2EBDA, size: 0.03, transparent: true, opacity: 0.5 });
        particles = new THREE.Points(particleGeo, particleMat);
        scene.add(particles);
    }

    function onPointerMove(e) {
        const rect = canvas.getBoundingClientRect();
        mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    }
    canvas.addEventListener('mousemove', onPointerMove);

    // Click the reel to spin it — a genuinely different mechanic from
    // "Surprise Me" (which filters the whole page to a mood grid): this
    // pairs up TWO movies as a "Double Feature" and reveals them right
    // inside the showcase itself, with a one-click add-both-to-watchlist.
    const showcaseEl = canvas.closest('.webgl-showcase');
    canvas.style.cursor = 'pointer';

    function spinReel(e) {
        spinBoost = 6;
        showcaseEl?.classList.add('reel-spinning');

        const rect = canvas.getBoundingClientRect();
        const originX = e ? rect.left + (e.clientX - rect.left) : rect.left + rect.width / 2;
        const originY = e ? rect.top + (e.clientY - rect.top) : rect.top + rect.height / 2;
        fireConfetti(originX, originY, 24);
        showToast('🏆 Pulling up your Hall of Fame...', 'info', '🎬');

        fetch('api/get_favorites_showcase.php')
            .then(res => res.json())
            .then(data => {
                setTimeout(() => {
                    showcaseEl?.classList.remove('reel-spinning');
                    renderHallOfFame(data.status, data.movies || [], spinReel);
                }, 1100);
            })
            .catch(() => {
                showcaseEl?.classList.remove('reel-spinning');
                showToast("Couldn't load your Hall of Fame. Try again.", 'error');
            });
    }

    canvas.addEventListener('click', spinReel);

    function animate() {
        rings.forEach(r => { r.mesh.rotation[r.cfg.axis] += r.cfg.speed * (1 + spinBoost); });
        particles.rotation.y += 0.0006 * (1 + spinBoost * 0.5);
        spinBoost *= 0.94; // settles back to ambient speed over ~1s

        ringGroup.rotation.y += (mouseX * 0.3 - ringGroup.rotation.y) * 0.05;
        ringGroup.rotation.x += (mouseY * 0.2 - ringGroup.rotation.x) * 0.05;

        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    }

    function onResize() {
        const { w, h } = getSize();
        if (!w || !h) return;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
    }
    window.addEventListener('resize', onResize);

    setup();
    animate();
}

function initTasteAnimations() {
    const countEls = document.querySelectorAll('.taste-count-up');
    const barEls = document.querySelectorAll('.taste-legend-bar-fill[data-bar-target]');
    const radarWrapper = document.getElementById('taste-radar-wrapper');
    if (countEls.length === 0 && barEls.length === 0 && !radarWrapper) return; // not on this page

    setTimeout(() => {
        countEls.forEach(el => {
            const target = parseInt(el.dataset.countTarget, 10) || 0;
            const duration = 900;
            const start = performance.now();
            function tick(now) {
                const progress = Math.min((now - start) / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                el.textContent = Math.round(eased * target);
                if (progress < 1) requestAnimationFrame(tick);
            }
            requestAnimationFrame(tick);
        });

        barEls.forEach(el => {
            const target = el.dataset.barTarget || 0;
            el.style.width = `${target}%`;
            // Add the shimmer-sweep class only after the width transition
            // finishes, so the light sweep reads as "it just settled into
            // place" rather than racing the fill itself.
            setTimeout(() => el.classList.add('taste-bar-filled'), 1050);
        });
    }, 350);

    // Once the radar shape has fully grown in (its CSS animation runs for
    // 1s, starting after the same 350ms setTimeout above), celebrate with a
    // confetti burst centered on the chart — a reward for landing on the
    // page, not something the user has to do anything to earn.
    if (radarWrapper) {
        setTimeout(() => {
            const rect = radarWrapper.getBoundingClientRect();
            fireConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2, 30);
        }, 350 + 1000);
    }
}

function initMovieMatch() {
    const startBtn = document.getElementById('match-start-btn');
    if (!startBtn) return; // not on this page

    startBtn.addEventListener('click', startMovieMatch);
    document.getElementById('match-continue-btn')?.addEventListener('click', startPlayer2Round);
    document.getElementById('match-yes-btn')?.addEventListener('click', () => {
        const topCard = document.querySelector('#match-card-stack .match-card:last-child');
        if (topCard) commitMatchSwipe(true, topCard);
    });
    document.getElementById('match-no-btn')?.addEventListener('click', () => {
        const topCard = document.querySelector('#match-card-stack .match-card:last-child');
        if (topCard) commitMatchSwipe(false, topCard);
    });
    initMatchPreferenceChips();
}

/* ============================================================================
   Compare Movies — floating selection tray
   Pick two movies from any grid, then jump to compare.php?a=ID&b=ID.
   Selection lives only in memory for this page view (by design — comparing
   is a quick in-the-moment thing, not something to persist across visits).
============================================================================ */
let compareSelection = [];

function getCompareTray() {
    let tray = document.getElementById('compare-tray');
    if (!tray) {
        tray = document.createElement('div');
        tray.id = 'compare-tray';
        tray.className = 'compare-tray';
        document.body.appendChild(tray);
    }
    return tray;
}

function renderCompareTray() {
    const tray = getCompareTray();

    if (compareSelection.length === 0) {
        tray.classList.remove('is-visible');
        tray.innerHTML = '';
        return;
    }

    tray.classList.add('is-visible');
    const slots = [0, 1].map(i => {
        const item = compareSelection[i];
        if (!item) {
            return `<div class="compare-slot compare-slot-empty">Pick a movie…</div>`;
        }
        return `
            <div class="compare-slot">
                <span class="text-truncate">${escapeHtml(item.title)}</span>
                <button type="button" class="compare-slot-remove" data-remove-id="${item.id}" aria-label="Remove ${escapeHtml(item.title)} from comparison">&times;</button>
            </div>`;
    }).join('<span class="compare-vs">VS</span>');

    const canCompare = compareSelection.length === 2;

    tray.innerHTML = `
        <div class="compare-tray-inner">
            <div class="compare-slots">${slots}</div>
            <button type="button" id="compare-now-btn" class="btn btn-warning-custom btn-sm px-4" ${canCompare ? '' : 'disabled'}>
                Compare Now
            </button>
            <button type="button" id="compare-clear-btn" class="compare-clear-btn" aria-label="Clear comparison">Clear</button>
        </div>`;

    tray.querySelectorAll('.compare-slot-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.removeId;
            compareSelection = compareSelection.filter(m => String(m.id) !== String(id));
            document.querySelectorAll(`.compare-btn-toggle[data-movie-id="${id}"]`).forEach(b => b.classList.remove('is-selected'));
            renderCompareTray();
        });
    });

    document.getElementById('compare-clear-btn')?.addEventListener('click', () => {
        compareSelection.forEach(item => {
            document.querySelectorAll(`.compare-btn-toggle[data-movie-id="${item.id}"]`).forEach(b => b.classList.remove('is-selected'));
        });
        compareSelection = [];
        renderCompareTray();
    });

    document.getElementById('compare-now-btn')?.addEventListener('click', () => {
        if (compareSelection.length !== 2) return;
        const [a, b] = compareSelection;
        window.location.href = `compare.php?a=${encodeURIComponent(a.id)}&b=${encodeURIComponent(b.id)}`;
    });
}

function toggleCompareSelection(movieId, title, btnEl) {
    const alreadySelected = compareSelection.some(m => String(m.id) === String(movieId));

    if (alreadySelected) {
        compareSelection = compareSelection.filter(m => String(m.id) !== String(movieId));
        btnEl.classList.remove('is-selected');
        renderCompareTray();
        return;
    }

    if (compareSelection.length >= 2) {
        btnEl.classList.add('shake-error');
        setTimeout(() => btnEl.classList.remove('shake-error'), 500);
        showToast('You can only compare two movies at a time. Remove one first.', 'error');
        return;
    }

    compareSelection.push({ id: movieId, title });
    document.querySelectorAll(`.compare-btn-toggle[data-movie-id="${movieId}"]`).forEach(b => b.classList.add('is-selected'));
    renderCompareTray();
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
                    <button class="compare-btn-toggle" type="button"
                            data-movie-id="${movie.id}"
                            data-title="${encodeURIComponent(title)}"
                            aria-label="Add ${safeTitle} to compare">
                        <i class="bi bi-bar-chart-line"></i>
                    </button>
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
    const tiltEl = e.target.closest('.mood-card, .movie-card-interactive, .taste-stat-card');
    if (tiltEl) applyTilt(tiltEl, e);
});

// mouseleave doesn't bubble, so listen in the capture phase on the document
document.addEventListener('mouseleave', (e) => {
    const tiltEl = e.target.closest && e.target.closest('.mood-card, .movie-card-interactive, .taste-stat-card');
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
   Hall of Fame reveal — renders inside the WebGL showcase itself: the
   user's own movies that are BOTH rated 4+ stars AND marked watched
   (a real join between movie_ratings and watchlist, not TMDB data). Each
   poster opens the normal detail modal via the existing [data-open-modal]
   delegate, since these are real DOM elements, not synthetic ones.
============================================================================ */
function renderHallOfFame(status, movies, spinAgainFn) {
    const reveal = document.getElementById('double-feature-reveal');
    if (!reveal) return;

    if (status === 'guest') {
        reveal.innerHTML = `
            <div class="fs-1 mb-2">🔒</div>
            <h5 class="text-white fw-semibold mb-2">Your Hall of Fame is waiting</h5>
            <p class="small text-custom-muted mb-3 text-center" style="max-width: 320px;">Sign in, rate a few movies 4★ or higher, and mark them watched — this is where they'll show up.</p>
            <a href="login.php" class="btn btn-warning-custom btn-sm px-4">Sign In</a>
        `;
    } else if (status === 'empty') {
        reveal.innerHTML = `
            <div class="fs-1 mb-2">🏆</div>
            <h5 class="text-white fw-semibold mb-2">No inductees yet</h5>
            <p class="small text-custom-muted mb-3 text-center" style="max-width: 340px;">Rate something 4★ or higher and mark it as watched on your <a href="watchlist.php" class="text-warning text-decoration-underline">watchlist</a> — it'll land here.</p>
            <button type="button" id="double-feature-again-btn" class="btn btn-outline-light btn-sm px-3 rounded-pill">🔁 Check Again</button>
        `;
    } else {
        const posterUrl = (movie) => movie.poster_path
            ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
            : 'https://via.placeholder.com/500x750/1a1510/fff?text=No+Poster';

        const posterItem = (movie, i) => `
            <div class="hall-of-fame-poster" data-open-modal="${movie.tmdb_movie_id}" title="View details" style="animation-delay: ${i * 70}ms;">
                <img src="${posterUrl(movie)}" alt="${escapeHtml(movie.title || 'Untitled')}">
                <div class="hall-of-fame-poster-rating">★ ${movie.rating}</div>
            </div>`;

        reveal.innerHTML = `
            <span class="text-warning-custom text-uppercase font-monospace small tracking-wider mb-1">🏆 Your Hall of Fame</span>
            <p class="small text-custom-muted mb-3">${movies.length} movie${movies.length === 1 ? '' : 's'} you rated 4★+ and watched</p>
            <div class="hall-of-fame-strip">
                ${movies.map(posterItem).join('')}
            </div>
            <div class="d-flex gap-2 mt-3">
                <a href="watchlist.php" class="btn btn-warning-custom btn-sm px-4">View Watchlist</a>
                <button type="button" id="double-feature-again-btn" class="btn btn-outline-light btn-sm px-3 rounded-pill">🔁 Close</button>
            </div>
        `;
    }

    reveal.classList.remove('d-none');
    requestAnimationFrame(() => reveal.classList.add('is-visible'));

    document.getElementById('double-feature-again-btn')?.addEventListener('click', () => {
        reveal.classList.remove('is-visible');
        setTimeout(() => {
            reveal.classList.add('d-none');
            if (status === 'empty' && typeof spinAgainFn === 'function') spinAgainFn();
        }, 300);
    });
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

        const moodEndpoint = selectedMood === 'HIDDEN GEMS'
            ? 'api/get_hidden_gems.php'
            : `api/get_movies_by_mood.php?mood=${encodeURIComponent(selectedMood)}`;

        fetch(moodEndpoint)
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
    // Covers server-rendered grids like watchlist.php — dynamically
    // injected grids (search/mood/for-you results) already register
    // themselves individually right after their own fetch() completes.
    initScrollReveal('#watchlist-grid .movie-card-interactive');

    initHeroMotion();
    initWatchlistFilterTabs();
    initTimelineSearch();
    initScrollReveal('.timeline-node');
    initScrollReveal('.timeline-fade-in');
    initScrollReveal('#match-how-it-works .col');
    initCinematicBackground();
    initTasteAnimations();
    initCustomCursor();
    initMagneticButtons();
    initNavScramble();
    initHeroWebGL();
    initMovieMatch();

    // Letter-by-letter title reveal for any page's hero headline — not
    // just the homepage's. initHeroMotion() above already handles the
    // homepage case; this covers everything else (splitLettersForReveal
    // is a no-op if it's already been run on a given element).
    document.querySelectorAll('.hero-headline').forEach(el => splitLettersForReveal(el));
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

    // 1b. Mark as Watched toggle (watchlist.php only)
    const watchedBtn = e.target.closest('.watched-btn-toggle');
    if (watchedBtn) {
        e.preventDefault();
        e.stopPropagation();

        if (!isLoggedIn) {
            window.location.href = 'login.php';
            return;
        }

        const movieId = watchedBtn.dataset.movieId;
        const formData = new FormData();
        formData.append('movie_id', movieId);
        formData.append('csrf_token', csrfToken);

        fetch('api/toggle_watched.php', { method: 'POST', body: formData })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'error') {
                    watchedBtn.classList.add('shake-error');
                    setTimeout(() => watchedBtn.classList.remove('shake-error'), 500);
                    showToast(data.message || 'Could not update watched status.', 'error');
                    return;
                }

                const cardCol = document.getElementById(`watchlist-item-${movieId}`);

                if (data.is_watched) {
                    watchedBtn.classList.add('is-watched');
                    watchedBtn.innerHTML = '<i class="bi bi-eye-fill"></i>';
                    watchedBtn.title = 'Mark as not watched';
                    cardCol?.classList.add('is-watched');
                    cardCol?.classList.remove('is-unwatched');
                    showToast('Marked as watched.', 'info', '✅');
                } else {
                    watchedBtn.classList.remove('is-watched');
                    watchedBtn.innerHTML = '<i class="bi bi-eye"></i>';
                    watchedBtn.title = 'Mark as watched';
                    cardCol?.classList.remove('is-watched');
                    cardCol?.classList.add('is-unwatched');
                    showToast('Marked as not watched.', 'info', '👁️');
                }

                updateWatchlistFilterCounts();
                applyActiveWatchlistFilter();
            })
            .catch(err => {
                console.error(err);
                showToast('Error communicating with the watchlist service.', 'error');
            });
        return;
    }

    // 1c. Compare selection toggle
    const compareBtn = e.target.closest('.compare-btn-toggle');
    if (compareBtn) {
        e.preventDefault();
        e.stopPropagation();

        const movieId = compareBtn.dataset.movieId;
        const title = compareBtn.dataset.title ? decodeURIComponent(compareBtn.dataset.title) : 'Untitled';
        toggleCompareSelection(movieId, title, compareBtn);
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
                    const watchLink = regionalProviders?.link || null;

                    if (flatStreamingOptions.length > 0) {
                        providersTarget.innerHTML = flatStreamingOptions.slice(0, 4).map(provider => {
                            const providerName = escapeHtml(provider.provider_name);
                            const href = buildProviderUrl(provider.provider_name, movie.title, watchLink);
                            return `
                                <a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer"
                                   class="provider-chip d-flex align-items-center bg-dark bg-opacity-50 border border-secondary border-opacity-10 p-1 pe-2 rounded-2 text-decoration-none"
                                   title="Watch on ${providerName}">
                                    <img src="https://image.tmdb.org/t/p/w92${provider.logo_path}" alt="${providerName}" class="rounded" style="width:24px; height:24px; object-fit:cover;">
                                    <span class="ms-2 font-sans-serif text-white-50" style="font-size:0.75rem;">${providerName}</span>
                                    <i class="bi bi-box-arrow-up-right ms-2 text-muted" style="font-size:0.65rem;"></i>
                                </a>
                            `;
                        }).join('');
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