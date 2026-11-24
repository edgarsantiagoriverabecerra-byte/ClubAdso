<?php
session_start();
header("Content-Type: application/json; charset=UTF-8");

function responderJson(int $codigo, array $payload): void
{
    http_response_code($codigo);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function leerDatos(): array
{
    $raw = file_get_contents("php://input");
    $datos = json_decode($raw ?: "", true);
    if (!is_array($datos) || json_last_error() !== JSON_ERROR_NONE) {
        $datos = $_POST;
    }
    return $datos;
}

try {
    if (!isset($_SESSION["documento"], $_SESSION["rol"])) {
        throw new Exception("Inicia sesión para gestionar préstamos", 401);
    }

    require_once __DIR__ . "/Asociado.php";
    require_once __DIR__ . "/Prestamo.php";

    $asociadoModel = new Asociado();
    $prestamoModel = new Prestamo();

    $rol = strtolower(trim((string) $_SESSION["rol"]));
    $usuarioActual = $asociadoModel->obtenerPorDocumento($_SESSION["documento"]);
    if (!$usuarioActual) {
        throw new Exception("No se encontró el registro del usuario en sesión", 404);
    }
    $idAsociadoSesion = (int) $usuarioActual["idAsociado"];

    $metodo = $_SERVER["REQUEST_METHOD"] ?? "";
    if (!in_array($metodo, ["GET", "POST", "DELETE"], true)) {
        throw new Exception("Método HTTP no permitido", 405);
    }

    if ($metodo === "GET") {
        if ($rol === "admin") {
            $prestamos = $prestamoModel->obtenerPrestamos();
            $asociados = $asociadoModel->obtenerAsociados();
        } else {
            $prestamos = $prestamoModel->obtenerPrestamos($idAsociadoSesion);
            $asociados = [$usuarioActual];
        }

        responderJson(200, [
            "success" => true,
            "rol" => $rol,
            "idAsociadoActual" => $idAsociadoSesion,
            "nombreUsuario" => $usuarioActual["nombres"] . " " . $usuarioActual["apellidos"],
            "asociados" => $asociados,
            "prestamos" => $prestamos
        ]);
    }

    $datos = leerDatos();

    if ($metodo === "POST") {
        $valorPrestamo = filter_var($datos["valorPrestamo"] ?? null, FILTER_VALIDATE_FLOAT);
        $tasaInteres = 0.25; // Tasa fija del 25%
        $numeroCuotas = filter_var($datos["numeroCuotas"] ?? null, FILTER_VALIDATE_INT, ["options" => ["min_range" => 1]]);
        $fechaPrestamo = trim((string) ($datos["fechaPrestamo"] ?? ""));

        if ($valorPrestamo === false || $valorPrestamo <= 0) {
            throw new Exception("El valor del préstamo debe ser mayor a 0", 400);
        }
        if ($tasaInteres < 0) {
            throw new Exception("La tasa de interés debe ser un número válido", 400);
        }
        if ($numeroCuotas === false) {
            throw new Exception("El número de cuotas debe ser al menos 1", 400);
        }
        if (empty($fechaPrestamo)) {
            throw new Exception("Debe ingresar la fecha del préstamo", 400);
        }

        if ($rol === "admin" && !empty($datos["idAsociado"])) {
            $idAsociadoDestino = (int) $datos["idAsociado"];
        } else {
            $idAsociadoDestino = $idAsociadoSesion;
        }

        $guardado = $prestamoModel->guardar([
            "valorPrestamo" => $valorPrestamo,
            "tasaInteres" => $tasaInteres,
            "numeroCuotas" => $numeroCuotas,
            "fechaPrestamo" => $fechaPrestamo,
            "idAsociado" => $idAsociadoDestino
        ]);

        if (!$guardado) {
            throw new Exception("No fue posible registrar el préstamo", 500);
        }

        responderJson(201, [
            "success" => true,
            "mensaje" => "Préstamo registrado exitosamente"
        ]);
    }

    if ($metodo === "DELETE") {
        if ($rol !== "admin") {
            throw new Exception("Solo los administradores pueden eliminar préstamos", 403);
        }

        $idPrestamo = filter_var($datos["idPrestamo"] ?? null, FILTER_VALIDATE_INT, ["options" => ["min_range" => 1]]);
        if ($idPrestamo === false) {
            throw new Exception("Identificador de préstamo no válido", 400);
        }

        if (!$prestamoModel->eliminar($idPrestamo)) {
            throw new Exception("No se encontró el préstamo o no se pudo eliminar", 404);
        }

        responderJson(200, [
            "success" => true,
            "mensaje" => "Préstamo eliminado correctamente"
        ]);
    }

} catch (PDOException $e) {
    responderJson(500, [
        "success" => false,
        "mensaje" => "Error en la base de datos: " . $e->getMessage()
    ]);
} catch (Exception $e) {
    $codigo = $e->getCode();
    if (!is_int($codigo) || $codigo < 400 || $codigo > 599) {
        $codigo = 400;
    }
    responderJson($codigo, [
        "success" => false,
        "mensaje" => $e->getMessage()
    ]);
}
