<?php
// Intentional standalone LFI route for the SC-01 pretty-path endpoint.

$file = $_GET['file'] ?? '';
$file_content = '';

if ($file !== '') {
    $full_path = '/var/www/html/' . $file;
    if (file_exists($full_path)) {
        $file_content = htmlspecialchars(file_get_contents($full_path));
    } elseif (file_exists($file)) {
        $file_content = htmlspecialchars(file_get_contents($file));
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>NovaMed Records Viewer</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
  .card { background: white; border: 1px solid #ddd; border-radius: 4px; padding: 20px; margin-bottom: 15px; }
  input[type=text] { width: 100%; padding: 8px; margin: 5px 0 12px; border: 1px solid #ccc; border-radius: 3px; box-sizing: border-box; }
  button { background: #1a5f7a; color: white; border: none; padding: 10px 20px; border-radius: 3px; cursor: pointer; }
  pre { background: #f0f0f0; padding: 10px; overflow-x: auto; font-size: 12px; }
</style>
</head>
<body>
<div class="card">
  <h2>Medical Records</h2>
  <form method="GET">
    <label>Load record file:</label>
    <input type="text" name="file" value="<?= htmlspecialchars($_GET['file'] ?? '') ?>" placeholder="records/patient_1.txt">
    <button type="submit">Load</button>
  </form>
  <?php if ($file_content): ?>
  <h3>File contents:</h3>
  <pre><?= $file_content ?></pre>
  <?php endif; ?>
</div>
</body>
</html>
