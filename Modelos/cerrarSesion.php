<?php
header("Content-Type: application/json; charset=utf-8");

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        throw new Exception("Método HTTP no permitido");
    }

    session_start();
    $_SESSION = [];

    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            time() - 42000,
            $params["path"],
            $params["domain"],
            $params["secure"],
            $params["httponly"]
        );
    }

    session_destroy();

    echo json_encode([
        "success" => true,
        "mensaje" => "Sesión cerrada correctamente"
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    $codigo = $e->getCode();
    if (!is_int($codigo) || $codigo < 400 || $codigo > 599) {
        $codigo = 400;
    }
    http_response_code($codigo);
    echo json_encode([
        "success" => false,
        "mensaje" => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
