<?php
// register.php
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
        $email    = trim($_POST['email']);
        $password = $_POST['password'];

        if (empty($username) || empty($email) || empty($password)) {
            $error = "Please fill in all fields.";
        } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $error = "Please enter a valid email address.";
        } elseif (strlen($password) < 8) {
            $error = "Password must be at least 8 characters.";
        } else {
            $database = new Database();
            $db = $database->getConnection();

            $stmt = $db->prepare("SELECT id FROM users WHERE username = :user OR email = :email");
            $stmt->execute(['user' => $username, 'email' => $email]);

            if ($stmt->rowCount() > 0) {
                $error = "That username or email is already taken.";
            } else {
                $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
                $insert = $db->prepare("INSERT INTO users (username, email, password_hash) VALUES (:user, :email, :pass)");

                if ($insert->execute(['user' => $username, 'email' => $email, 'pass' => $hashedPassword])) {
                    session_regenerate_id(true);
                    $_SESSION['user_id'] = $db->lastInsertId();
                    $_SESSION['username'] = $username;

                    header("Location: index.php");
                    exit;
                } else {
                    $error = "Something went wrong creating your account. Please try again.";
                }
            }
        }
    }
}

include 'includes/header.php';
?>

<main class="container my-5" style="max-width: 450px; min-height: 75vh;">
    <div class="bg-surface p-4 p-md-5 rounded-4 shadow-lg border border-secondary border-opacity-10 mt-5">
        <div class="text-center mb-4">
            <h2 class="h3 text-white fw-bold" style="font-family: 'Fraunces', serif; font-style: italic;">Create Account</h2>
            <p class="small text-muted">Join MovieTem to start curating your collections.</p>
        </div>

        <?php if (!empty($error)): ?>
            <div class="alert alert-danger py-2 small text-white border-0 bg-danger bg-opacity-25 mb-4"><?php echo htmlspecialchars($error); ?></div>
        <?php endif; ?>

        <form action="register.php" method="POST">
            <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($_SESSION['csrf_token']); ?>">
            <div class="mb-3">
                <label class="form-label small text-muted">Username</label>
                <input type="text" name="username" class="form-control bg-black border-secondary text-white border-opacity-20 shadow-none" placeholder="e.g. logastellus" required>
            </div>
            <div class="mb-3">
                <label class="form-label small text-muted">Email Address</label>
                <input type="email" name="email" class="form-control bg-black border-secondary text-white border-opacity-20 shadow-none" placeholder="name@example.com" required>
            </div>
            <div class="mb-4">
                <label class="form-label small text-muted">Password</label>
                <input type="password" name="password" class="form-control bg-black border-secondary text-white border-opacity-20 shadow-none" placeholder="At least 8 characters" minlength="8" required>
            </div>
            <button type="submit" class="btn btn-warning-custom w-100 fw-semibold text-dark rounded-3 py-2">Sign Up</button>
        </form>

        <div class="text-center mt-4 pt-2">
            <p class="small text-muted mb-0">Already have an account? <a href="login.php" class="text-warning text-decoration-none">Login here</a></p>
        </div>
    </div>
</main>

<?php include 'includes/footer.php'; ?>
