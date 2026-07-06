<?php
// login.php
ob_start();
require_once 'config/database.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (isset($_SESSION['user_id'])) {
    header("Location: index.php");
    exit;
}

if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'] ?? '')) {
        $error = "Your session expired. Please try again.";
    } else {
        $username = trim($_POST['username']);
        $password = $_POST['password'];

        if (empty($username) || empty($password)) {
            $error = "Please enter your username and password.";
        } else {
            $database = new Database();
            $db = $database->getConnection();

            $stmt = $db->prepare("SELECT id, username, password_hash FROM users WHERE username = :user");
            $stmt->execute(['user' => $username]);
            $user = $stmt->fetch();

            if ($user && password_verify($password, $user['password_hash'])) {
                session_regenerate_id(true);
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['username'] = $user['username'];

                header("Location: index.php");
                exit;
            } else {
                $error = "Incorrect username or password.";
            }
        }
    }
}

include 'includes/header.php';
?>

<main class="container my-5" style="max-width: 450px; min-height: 75vh;">
    <div class="bg-surface p-4 p-md-5 rounded-4 shadow-lg border border-secondary border-opacity-10 mt-5">
        <div class="text-center mb-4">
            <h2 class="h3 text-white fw-bold" style="font-family: 'Fraunces', serif; font-style: italic;">Welcome Back</h2>
            <p class="small text-muted">Sign in to sync your personalized streaming shelves.</p>
        </div>

        <?php if (!empty($error)): ?>
            <div class="alert alert-danger py-2 small text-white border-0 bg-danger bg-opacity-25 mb-4"><?php echo htmlspecialchars($error); ?></div>
        <?php endif; ?>

        <form action="login.php" method="POST">
            <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($_SESSION['csrf_token']); ?>">
            <div class="mb-3">
                <label class="form-label small text-muted">Username</label>
                <input type="text" name="username" class="form-control bg-black border-secondary text-white border-opacity-20 shadow-none" placeholder="Enter username" required>
            </div>
            <div class="mb-4">
                <label class="form-label small text-muted">Password</label>
                <input type="password" name="password" class="form-control bg-black border-secondary text-white border-opacity-20 shadow-none" placeholder="••••••••" required>
            </div>
            <button type="submit" class="btn btn-warning-custom w-100 fw-semibold text-dark rounded-3 py-2">Sign In</button>
        </form>

        <div class="text-center mt-4 pt-2">
            <p class="small text-muted mb-0">New to the application? <a href="register.php" class="text-warning text-decoration-none">Create an account</a></p>
        </div>
    </div>
</main>

<?php include 'includes/footer.php'; ?>
