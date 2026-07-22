<?php
// profile.php
require_once 'config/database.php';
if (session_status() === PHP_SESSION_NONE) { session_start(); }

if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit;
}

if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
                                              
$userId = $_SESSION['user_id'];
$dbClass = new Database();
$db = $dbClass->getConnection();

$statsStmt = $db->prepare("SELECT COUNT(id) as total_saved FROM watchlist WHERE user_id = :uid");
$statsStmt->execute(['uid' => $userId]);
$userStats = $statsStmt->fetch();

$userStmt = $db->prepare("SELECT email, created_at FROM users WHERE id = :uid");
$userStmt->execute(['uid' => $userId]);
$userData = $userStmt->fetch();

$error = '';
$success = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'] ?? '')) {
        $error = "Your session expired. Please try again.";
    } else {
        $newEmail = trim($_POST['email']);
        $newPassword = $_POST['password'];

        if (empty($newEmail)) {
            $error = "Email address cannot be blank.";
        } elseif (!filter_var($newEmail, FILTER_VALIDATE_EMAIL)) {
            $error = "Please enter a valid email address.";
        } elseif (!empty($newPassword) && strlen($newPassword) < 8) {
            $error = "New password must be at least 8 characters.";
        } else {
            $dupeCheck = $db->prepare("SELECT id FROM users WHERE email = :email AND id != :uid");
            $dupeCheck->execute(['email' => $newEmail, 'uid' => $userId]);

            if ($dupeCheck->rowCount() > 0) {
                $error = "That email is already in use by another account.";
            } else {
                if (!empty($newPassword)) {
                    $hashed_pass = password_hash($newPassword, PASSWORD_BCRYPT);
                    $update = $db->prepare("UPDATE users SET email = :email, password_hash = :pass WHERE id = :uid");
                    $executed = $update->execute(['email' => $newEmail, 'pass' => $hashed_pass, 'uid' => $userId]);
                } else {
                    $update = $db->prepare("UPDATE users SET email = :email WHERE id = :uid");
                    $executed = $update->execute(['email' => $newEmail, 'uid' => $userId]);
                }

                if ($executed) {
                    $success = "Your profile was updated successfully.";
                    $userData['email'] = $newEmail;
                } else {
                    $error = "Something went wrong updating your profile. Please try again.";
                }
            }
        }
    }
}

include 'includes/header.php';
?>

<main class="container my-5" style="min-height: 75vh;">
    <div class="row g-4 justify-content-center">
        <div class="col-md-4">
            <div class="bg-surface p-4 rounded-4 shadow-lg text-center border border-secondary border-opacity-10">
                <div class="display-4 my-2 text-warning">
                    <i class="bi bi-person-badge"></i>
                </div>
                <h2 class="h4 text-white mb-1" style="font-family: 'Fraunces', serif; font-style: italic;">
                    <?php echo htmlspecialchars($_SESSION['username']); ?>
                </h2>
                <span class="badge bg-white bg-opacity-10 text-muted font-monospace mb-4">
                    Member Since: <?php echo substr($userData['created_at'], 0, 10); ?>
                </span>

                <hr class="border-secondary border-opacity-20 my-3">

                <div class="row">
                    <div class="col-12 py-2">
                        <div class="h3 m-0 text-white fw-bold font-monospace"><?php echo (int) $userStats['total_saved']; ?></div>
                        <div class="small text-muted text-uppercase tracking-wider" style="font-size: 0.75rem;">Movies Saved</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="col-md-6">
            <div class="bg-surface p-4 rounded-4 shadow-lg border border-secondary border-opacity-10">
                <h3 class="h5 text-white mb-3" style="font-family: 'Fraunces', serif; font-style: italic;">Account Settings</h3>
                <p class="small text-muted mb-4">Update your email or password below.</p>

                <?php if (!empty($error)): ?>
                    <div class="alert alert-danger py-2 small border-0 text-white bg-danger bg-opacity-25"><?php echo htmlspecialchars($error); ?></div>
                <?php endif; ?>
                <?php if (!empty($success)): ?>
                    <div class="alert alert-success py-2 small border-0 text-white bg-success bg-opacity-25"><?php echo htmlspecialchars($success); ?></div>
                <?php endif; ?>

                <form action="profile.php" method="POST">
                    <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($_SESSION['csrf_token']); ?>">
                    <div class="mb-3">
                        <label class="form-label small text-muted">Username</label>
                        <input type="text" class="form-control bg-black border-secondary text-white-50 border-opacity-20" value="<?php echo htmlspecialchars($_SESSION['username']); ?>" disabled>
                    </div>
                    <div class="mb-3">
                        <label class="form-label small text-muted">Email Address</label>
                        <input type="email" name="email" class="form-control bg-black border-secondary text-white border-opacity-20" value="<?php echo htmlspecialchars($userData['email']); ?>" required>
                    </div>
                    <div class="mb-4">
                        <label class="form-label small text-muted">New Password (leave blank to keep current)</label>
                        <input type="password" name="password" class="form-control bg-black border-secondary text-white border-opacity-20" placeholder="At least 8 characters" minlength="8">
                    </div>
                    <button type="submit" class="btn btn-warning-custom btn-sm px-4">Save Changes</button>
                </form>
            </div>
        </div>
    </div>
</main>

<?php include 'includes/footer.php'; ?>
