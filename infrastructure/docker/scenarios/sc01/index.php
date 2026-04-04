<?php
// NovaMed Healthcare Portal - INTENTIONALLY VULNERABLE APPLICATION
// For educational use only - runs inside isolated Docker container with no internet access
// All data is simulated - no real patient data

session_start();

function db() {
    static $pdo;
    if (!$pdo) {
        $pdo = new PDO(
            'mysql:host=' . getenv('DB_HOST') . ';dbname=novamed',
            getenv('DB_USER'), getenv('DB_PASS')
        );
    }
    return $pdo;
}

$page = $_GET['page'] ?? 'login';
$error = '';
$success = '';

// --- LOGIN (SQL injection vulnerability: intentional for education) ---
if ($page === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';
    // EDUCATIONAL FLAW: direct string interpolation into SQL
    $sql = "SELECT * FROM users WHERE username='$username' AND password='" . md5($password) . "'";
    try {
        $result = db()->query($sql);
        $user = $result ? $result->fetch(PDO::FETCH_ASSOC) : null;
        if ($user) {
            $_SESSION['user'] = $user;
            header('Location: ?page=dashboard');
            exit;
        } else {
            $error = 'Invalid username or password';
        }
    } catch (PDOException $e) {
        // EDUCATIONAL FLAW: exposing database errors
        $error = 'Database error: ' . $e->getMessage();
    }
}

// --- LOGOUT ---
if ($page === 'logout') {
    session_destroy();
    header('Location: ?page=login');
    exit;
}

// Auth check for protected pages
$protected = ['dashboard', 'records', 'upload', 'admin'];
if (in_array($page, $protected) && empty($_SESSION['user'])) {
    header('Location: ?page=login');
    exit;
}

// --- RECORDS (LFI vulnerability: intentional for education) ---
$file_content = '';
if ($page === 'records') {
    $file = $_GET['file'] ?? '';
    if ($file) {
        // EDUCATIONAL FLAW: no path sanitization
        $full_path = '/var/www/html/' . $file;
        if (file_exists($full_path)) {
            $file_content = htmlspecialchars(file_get_contents($full_path));
        } else {
            // Try absolute path (path traversal)
            if (file_exists($file)) {
                $file_content = htmlspecialchars(file_get_contents($file));
            }
        }
    }
}

// --- UPLOAD (unrestricted file upload: intentional for education) ---
$upload_msg = '';
if ($page === 'upload' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_FILES['document'])) {
        $filename = $_FILES['document']['name'];
        $dest = '/var/www/html/uploads/' . basename($filename);
        // EDUCATIONAL FLAW: no file type validation
        if (move_uploaded_file($_FILES['document']['tmp_name'], $dest)) {
            $upload_msg = "File uploaded: <a href='/uploads/" . htmlspecialchars($filename) . "'>" . htmlspecialchars($filename) . "</a>";
        }
    }
}

// --- API endpoints ---
if (strpos($_SERVER['REQUEST_URI'], '/api/v1/patients') !== false) {
    header('Content-Type: application/json');
    $id = (int)($_GET['id'] ?? 0);
    if ($id) {
        // EDUCATIONAL FLAW: no authorization check - IDOR
        $stmt = db()->prepare("SELECT id, name, dob, diagnosis FROM patients WHERE id = ?");
        $stmt->execute([$id]);
        $patient = $stmt->fetch(PDO::FETCH_ASSOC);
        echo json_encode($patient ?: ['error' => 'Not found']);
    } else {
        $patients = db()->query("SELECT id, name FROM patients LIMIT 10")->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($patients);
    }
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>NovaMed Patient Portal</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
  .header { background: #1a5f7a; color: white; padding: 15px 20px; border-radius: 4px; margin-bottom: 20px; }
  .header span { font-size: 12px; opacity: 0.8; float: right; margin-top: 4px; }
  .card { background: white; border: 1px solid #ddd; border-radius: 4px; padding: 20px; margin-bottom: 15px; }
  .error { background: #fee; border: 1px solid #fcc; color: #c00; padding: 10px; border-radius: 3px; margin: 10px 0; }
  input[type=text], input[type=password], input[type=file] { width: 100%; padding: 8px; margin: 5px 0 12px; border: 1px solid #ccc; border-radius: 3px; box-sizing: border-box; }
  button, input[type=submit] { background: #1a5f7a; color: white; border: none; padding: 10px 20px; border-radius: 3px; cursor: pointer; }
  nav a { margin-right: 15px; color: #1a5f7a; text-decoration: none; }
  nav a:hover { text-decoration: underline; }
  pre { background: #f0f0f0; padding: 10px; overflow-x: auto; font-size: 12px; }
  .nav-bar { background: white; border: 1px solid #ddd; padding: 10px 20px; border-radius: 4px; margin-bottom: 20px; }
</style>
</head>
<body>

<div class="header">
  NovaMed Healthcare Portal
  <?php if (!empty($_SESSION['user'])): ?>
  <span>Logged in as: <?= htmlspecialchars($_SESSION['user']['username']) ?> | <a href="?page=logout" style="color:#adf">Logout</a></span>
  <?php endif; ?>
</div>

<?php if (!empty($_SESSION['user'])): ?>
<div class="nav-bar">
  <nav>
    <a href="?page=dashboard">Dashboard</a>
    <a href="?page=records">My Records</a>
    <a href="?page=upload">Upload Document</a>
    <?php if (($_SESSION['user']['role'] ?? '') === 'admin'): ?>
    <a href="?page=admin">Admin Panel</a>
    <?php endif; ?>
  </nav>
</div>
<?php endif; ?>

<?php if ($page === 'login'): ?>
<div class="card">
  <h2>Patient Login</h2>
  <?php if ($error): ?><div class="error"><?= $error ?></div><?php endif; ?>
  <form method="POST" action="?page=login">
    <label>Username</label>
    <input type="text" name="username" placeholder="Enter your username" autofocus>
    <label>Password</label>
    <input type="password" name="password" placeholder="Enter your password">
    <input type="submit" value="Sign In">
  </form>
  <p style="margin-top:15px; font-size:13px; color:#666">
    Demo accounts: patient1 / pass123 | admin / admin123
  </p>
</div>

<?php elseif ($page === 'dashboard'): ?>
<div class="card">
  <h2>Welcome, <?= htmlspecialchars($_SESSION['user']['name'] ?? $_SESSION['user']['username']) ?></h2>
  <p>Access your medical records, appointments, and documents below.</p>
  <ul>
    <li><a href="?page=records">View my medical records</a></li>
    <li><a href="?page=upload">Upload documents</a></li>
    <li><a href="/api/v1/patients">Patient API</a></li>
  </ul>
</div>

<?php elseif ($page === 'records'): ?>
<div class="card">
  <h2>Medical Records</h2>
  <form method="GET">
    <input type="hidden" name="page" value="records">
    <label>Load record file:</label>
    <input type="text" name="file" value="<?= htmlspecialchars($_GET['file'] ?? '') ?>" placeholder="records/patient_<?= $_SESSION['user']['id'] ?>.txt">
    <button type="submit">Load</button>
  </form>
  <?php if ($file_content): ?>
  <h3>File contents:</h3>
  <pre><?= $file_content ?></pre>
  <?php endif; ?>
</div>

<?php elseif ($page === 'upload'): ?>
<div class="card">
  <h2>Upload Document</h2>
  <?php if ($upload_msg): ?><p><?= $upload_msg ?></p><?php endif; ?>
  <form method="POST" enctype="multipart/form-data">
    <label>Select document (PDF, JPG, PNG accepted):</label>
    <input type="file" name="document">
    <button type="submit">Upload</button>
  </form>
</div>

<?php elseif ($page === 'admin'): ?>
<div class="card">
  <h2>Administration Panel</h2>
  <?php if (($_SESSION['user']['role'] ?? '') !== 'admin'): ?>
  <div class="error">Access denied. Administrators only.</div>
  <?php else: ?>
  <h3>User Management</h3>
  <?php
    $users = db()->query("SELECT id, username, email, role FROM users")->fetchAll(PDO::FETCH_ASSOC);
    echo '<table border="1" cellpadding="5"><tr><th>ID</th><th>Username</th><th>Email</th><th>Role</th></tr>';
    foreach ($users as $u) {
        echo "<tr><td>{$u['id']}</td><td>" . htmlspecialchars($u['username']) . "</td><td>" . htmlspecialchars($u['email']) . "</td><td>{$u['role']}</td></tr>";
    }
    echo '</table>';
  ?>
  <?php endif; ?>
</div>

<?php endif; ?>

<!-- INTENTIONAL: Server version disclosure via comment -->
<!-- Apache/2.4.49 (Ubuntu) PHP/7.4.3 -->
</body>
</html>
