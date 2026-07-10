<?php
// includes/header.php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MovieTem — Curate Your Cinema</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.2/font/bootstrap-icons.min.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,400;1,9..144,600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/styles.css">
</head>
<body class="bg-main text-white">

<script>
    window.MOVIETEM_CSRF_TOKEN = <?php echo json_encode($_SESSION['csrf_token']); ?>;
</script>

<nav class="navbar navbar-expand-lg navbar-dark bg-main border-bottom border-secondary border-opacity-10 py-3 sticky-top">
    <div class="container">
        <a class="navbar-brand d-flex align-items-center gap-2 fw-bold text-white tracking-tight" href="index.php">
            <span class="text-warning fs-4"><i class="bi bi-film"></i></span>
            MOVIE<span class="text-warning">TEM</span>
        </a>

        <button class="navbar-toggler border-0 shadow-none" type="button" data-bs-toggle="collapse" data-bs-target="#movieTemPrimaryNav">
            <span class="navbar-toggler-icon"></span>
        </button>

        <div class="collapse navbar-collapse" id="movieTemPrimaryNav">
            <ul class="navbar-nav me-auto mb-2 mb-lg-0 ms-lg-4 gap-2">
                <li class="nav-item">
                    <a class="nav-link text-white-50" href="index.php">Home</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link text-white-50" href="index.php#mood-selector-anchor">Mood Finder</a>
                </li>
            </ul>

            <div class="d-flex align-items-center gap-3">
                <?php if (isset($_SESSION['user_id'])): ?>
                    <div class="dropdown">
                        <button class="btn btn-dark dropdown-toggle btn-sm text-white px-3 border border-secondary border-opacity-20 d-flex align-items-center gap-2" type="button" id="profileDropdown" data-bs-toggle="dropdown" aria-expanded="false" style="border-radius: 20px;">
                            <i class="bi bi-person-circle text-warning"></i>
                            <span><?php echo htmlspecialchars($_SESSION['username']); ?></span>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end bg-surface border border-secondary border-opacity-10 shadow-lg mt-2" aria-labelledby="profileDropdown">
                            <li>
                                <a class="dropdown-item text-white-50 d-flex align-items-center gap-2 py-2" href="watchlist.php">
                                    <i class="bi bi-bookmark-heart text-muted"></i> My Watchlist
                                </a>
                            </li>
                            <li>
                                <a class="dropdown-item text-white-50 d-flex align-items-center gap-2 py-2" href="profile.php">
                                    <i class="bi bi-sliders text-muted"></i> Account Settings
                                </a>
                            </li>
                            <li><hr class="dropdown-divider border-secondary border-opacity-20"></li>
                            <li>
                                <a class="dropdown-item text-danger d-flex align-items-center gap-2 py-2" href="logout.php">
                                    <i class="bi bi-box-arrow-right"></i> Sign Out
                                </a>
                            </li>
                        </ul>
                    </div>
                <?php else: ?>
                    <a href="login.php" class="btn btn-outline-light btn-sm px-4 rounded-pill font-monospace" style="border-color: rgba(255,255,255,0.2)">Login</a>
                    <a href="register.php" class="btn btn-warning btn-sm px-4 rounded-pill font-monospace fw-semibold text-dark">Sign Up</a>
                <?php endif; ?>
            </div>
        </div>
    </div>
</nav>