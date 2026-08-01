# 🎬 MovieTem

**Cinema, sorted by feeling.**

MovieTem is a mood-based movie discovery platform. Instead of scrolling through endless grids of titles, pick how you feel — happy, mind-bending, chill, nostalgic — and get matched with something worth watching tonight. Rate what you watch, and MovieTem learns your taste to recommend more of it, visualizes that taste back at you, and even helps two people agree on something to watch together.

  <img src="screenshots/homepage.png" alt="Movietem  Homepage" width="800">
  <img src="screenshots/trendingtoday.png" alt="Movietem  trendingtoday" width="800">
  <img src="screenshots/picked for you .png" alt="Movietem  picked for you" width="800">
  <img src="screenshots/compare.png" alt="Movietem  compare" width="800">
  <img src="screenshots/moodfinder.png" alt="Movietem  moodfinder" width="800">
  <img src="screenshots/moviematch.png" alt="Movietem moviematch" width="800">
  <img src="screenshots/mytast.png" alt="Movietem  mytast" width="800">
  <img src="screenshots/timeline.png" alt="Movietem  timeline" width="800">
  <img src="screenshots/watchlist.png" alt="Movietem watchlist " width="800">
  <img src="screenshots/how to use.png" alt="Movietem  how to use" width="800">

## ✨ Features

### Discovery
- **Mood-based discovery** — thirteen curated moods (Happy, Horror Night, Sci-Fi, Nostalgic, Hidden Gems, and more) each mapped to a genre profile or a dedicated discovery query, pulling live results from TMDB.
- **Hidden Gems** — a mood unlike the others: instead of genre-matching, it surfaces highly-rated films (7.5+) that stayed under 20,000 votes, so it skips anything mainstream and turns up movies TMDB's own trending lists never would.
- **Personalized recommendations ("Picked for You")** — MovieTem analyzes a user's highest-rated movies, computes a weighted genre affinity score, and surfaces titles matching their actual taste — excluding anything already rated or watchlisted. Genre data is cached at rating time so recommendations load fast without hammering the TMDB API.
- **Live search with autocomplete** — debounced, real-time title suggestions as you type.
- **Trending carousel** — auto-refreshing showcase of what's popular today, with a slow Ken Burns zoom on the active slide.

### Personal collection
- **Watchlist** — one-click bookmarking, persisted per user, with poster/rating/year data stored locally so the watchlist page never needs to re-query TMDB.
- **Mark as Watched** — a second toggle on every watchlist card separates "want to watch" from "already seen," with filter tabs (All / To Watch / Watched) and live counts.
- **Star ratings & reviews** — rate any movie 1–5 stars with an optional written review; reopening a movie shows your existing rating pre-filled.
- **Movie detail modal** — synopsis, runtime, trailer link, and regional streaming availability. Provider badges (Netflix, Prime Video, Hotstar, etc.) are clickable and route to that *specific provider's own* search page for the title — not a generic aggregator link.

### Comparing & exploring
- **Compare Movies** — pick any two movies from a floating selection tray and see them head-to-head: rating, vote count, popularity, runtime, budget, revenue, and any shared cast between them.
- **Movie Timeline** — search any franchise (or pick from curated quick-starts like Harry Potter, Star Wars, or Jurassic Park) and see every film in it laid out as a visual, connected timeline in release order, pulling from TMDB's own curated Collections data.

### Together / social
- **Movie Match** — a two-person swipe game for settling "what do we watch tonight." Both players swipe the same shuffled deck (optionally filtered by genre and era), pass the device between turns, and MovieTem reveals every movie you both liked — with a confetti celebration if there's a match.

### Your taste, visualized
- **Mood Compass** — a personal radar chart built entirely from your own rating history: your top genres plotted as a shape, exact per-genre averages, a rating-habits breakdown (how many 1★s vs 5★s you actually give), and an honest "you're toughest on [genre]" callout alongside your dominant-genre "verdict" tag.

### Authentication & account
- Registration, login, and account settings, with hashed passwords and CSRF-protected forms throughout.

---

## 🎨 Design & Motion

MovieTem's visual identity is a film print, not a dashboard — grain, sprocket holes, ticket-stub buttons, and marquee brass, built from actual cinema materials rather than a generic UI kit. On top of that sits a full motion system:

- **Cinematic rotating background** — real TMDB top-rated backdrops crossfade behind several pages, blurred and dimmed so content stays fully readable.
- **Letter-by-letter title reveals**, ambient glows, and a one-time projector-beam sweep on page load.
- **Scroll reveal** ("focus pull") — content fades in from a blurred, out-of-frame state as it enters the viewport, alternating a subtle tilt so items don't march in uniformly.
- **3D cursor-tilt** on mood cards, movie cards, and stat cards.
- **The signature moment**: the movie detail modal opens like a projector iris rather than a generic fade.
- **Toasts, confetti, and sparkle bursts** replace jarring `alert()` calls and mark genuine wins (added to watchlist, 5-star rating, Movie Match success).
- A hidden easter egg on the logo (click it five times).

All animation respects `prefers-reduced-motion` throughout.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | PHP (vanilla, PDO for database access) |
| Database | MySQL / MariaDB |
| Frontend | HTML, vanilla JavaScript (fetch API), Bootstrap 5.3 |
| External API | [The Movie Database (TMDB)](https://www.themoviedb.org/) |
| Fonts | Fraunces, Inter, JetBrains Mono (Google Fonts) |

No frameworks, no build step — clone it and run it on any standard PHP/MySQL stack (XAMPP, MAMP, or a LAMP server).

## 🧠 How the Recommendation Engine Works

1. When a user rates a movie, MovieTem fetches that movie's genres from TMDB once and stores them alongside the rating.
2. To generate recommendations, it pulls the user's 4★+ rated movies and computes a weighted genre score (a 5★ rating counts more than a 4★ one).
3. It queries TMDB separately for each of the user's top 3 genres, then interleaves the results round-robin — so one dominant genre doesn't flood every recommendation slot.
4. Anything the user has already rated or watchlisted is filtered out before display.

This means recommendations get more accurate the more a user rates, and never repeat data they've already engaged with.

## 🧭 How Mood Compass Works

1. Pulls every rating the user has made, along with the genre IDs cached at rating time (the same data the recommendation engine uses).
2. Computes a weighted score per genre (sum of ratings for movies in that genre) and a genuine per-genre average (score ÷ number of movies in that genre).
3. The top 7 genres by weighted score become the axes of a hand-built SVG radar chart — no charting library, just server-side trigonometry.
4. A "toughest on" callout surfaces the genre with the user's lowest average rating (minimum 2 movies rated in it, so one harsh review can't unfairly brand a whole genre), and a rating-habits bar shows the full 1★–5★ distribution.

Needs at least 3 rated movies with cached genre data before it renders; otherwise it shows an honest empty state.

## 🤝 How Movie Match Works

1. Optionally, both players agree on genre tags and/or an era before starting — this builds a filtered TMDB `discover` query instead of a generic popular-movies pool.
2. A shuffled 16-movie deck is fetched once and shared between both players.
3. Player 1 swipes (drag or tap ✕/❤); their likes are tracked in memory only.
4. A "pass the device" screen hands off to Player 2, who swipes the identical deck without seeing Player 1's picks.
5. Any movie both players liked is revealed as a match. Zero overlap gets an honest "wildly different taste" message with a one-tap reshuffle.

## 📁 Project Structure

```
movietem/
├── api/                          # JSON endpoints consumed by app.js
│   ├── get_background_movies.php # Backdrops for the cinematic rotating background
│   ├── get_hidden_gems.php       # Highly-rated, low-vote-count discovery
│   ├── get_match_deck.php        # Shuffled deck for Movie Match (genre/era aware)
│   ├── get_movie_details.php
│   ├── get_movies_by_mood.php
│   ├── get_recommendations.php
│   ├── get_user_rating.php
│   ├── save_rating.php
│   ├── search_collections.php    # Franchise/collection search for Timeline
│   ├── submit_review.php
│   ├── toggle_watched.php        # Mark as Watched toggle
│   └── toggle_watchlist.php
├── assets/
│   ├── css/styles.css
│   ├── images/                   # Favicon set (svg, multi-size png, apple-touch-icon)
│   └── js/app.js
├── config/
│   ├── database.example.php      # copy to database.php and fill in your credentials
│   └── tmdb.example.php          # copy to tmdb.php and add your TMDB API key
├── includes/
│   ├── header.php
│   └── footer.php
├── screenshots/                  # README preview images
├── compare.php                   # Head-to-head movie comparison
├── favicon.ico
├── index.php
├── login.php / register.php / logout.php
├── match.php                     # Movie Match swipe game
├── profile.php
├── taste.php                     # Mood Compass taste radar
├── timeline.php                  # Franchise movie timeline
├── watchlist.php
└── schema.sql                    # full database schema
```

## 🚀 Setup

**Requirements:** PHP 7.4+, MySQL/MariaDB, a [free TMDB API key](https://www.themoviedb.org/settings/api).

1. **Clone the repo**
   ```bash
   git clone https://github.com/bluesky2912/Movie_Tem.git
   cd Movie_Tem
   ```

2. **Create your local config files** (these are gitignored — the repo only ships `.example.php` templates)
   ```bash
   cp config/database.example.php config/database.php
   cp config/tmdb.example.php config/tmdb.php
   ```
   Edit `config/database.php` with your MySQL credentials, and `config/tmdb.php` with your TMDB API key.

3. **Create the database**
   ```sql
   CREATE DATABASE movietem;
   ```
   Then import the schema:
   ```bash
   mysql -u root -p movietem < schema.sql
   ```
   Note: `genre_ids` (used by recommendations and Mood Compass) and `is_watched` (used by the watchlist toggle) should be present as columns on `movie_ratings` and `watchlist` respectively — check your live schema matches `schema.sql` before relying on those features, since the two can drift out of sync as the app evolves.

4. **Serve the app** — point your local server (XAMPP/MAMP/`php -S`) at the project root and visit `index.php`.

5. **Register an account**, rate a few movies 4★ or higher, and watch the "Picked for You" section populate on the homepage — then check out **My Taste** in the nav once you've rated a handful more.

## 🔒 Security & Reliability Notes

- All database queries use PDO prepared statements — no raw string interpolation.
- Every state-changing endpoint validates a per-session CSRF token before acting.
- Passwords are hashed with `password_hash()` / verified with `password_verify()` — never stored in plaintext.
- Real credentials (`config/database.php`, `config/tmdb.php`) are gitignored; only placeholder `.example.php` templates are committed.
- TMDB requests automatically retry (up to 3 attempts with backoff) on transient network failures, and force TLS 1.2/IPv4/HTTP1.1 to work around a common connection-reset issue on older PHP/cURL/OpenSSL combinations.
- API endpoints surface the real underlying error (TMDB error message or cURL failure reason) instead of silently returning an empty result, so a genuine outage doesn't look identical to "nothing found."

## 🗺️ Possible Next Steps

- Password reset flow
- TMDB response caching (reduce live calls, further insulate against connectivity hiccups)
- Pagination / infinite scroll on mood and search results (currently capped at TMDB's first page)
- Genre/rating filter chips on the main Mood Finder and search results (Movie Match already has this)
- Public shareable watchlist links
- Public review feed (see what everyone's saying about a movie, not just your own rating)
- Content-rating filters on discovery/recommendation results

## 🙏 Attribution

This product uses the TMDB API but is not endorsed or certified by TMDB.

<img src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg" alt="TMDB Logo" width="150">


This project was built as a college project and is available for educational reference.