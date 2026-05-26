<?php
// Training config leak used by the SC-01 LFI chain.
// These credentials are for the isolated NovaMed lab database only.

define('DB_HOST', 'sc01-db');
define('DB_USER', 'webapp');
define('DB_PASS', 'WebAppPass2024!');
define('DB_NAME', 'novamed');
