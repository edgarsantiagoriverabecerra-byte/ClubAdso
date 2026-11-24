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
        throw new Exception("Inicia sesión para gestionar pagos", 401);
    }

    require_once __DIR__ . "/Asociado.php";
    require_once __DIR__ . "/Prestamo.php";
    require_once __DIR__ . "/Pago.php";

    $asociadoModel = new Asociado();
    $prestamoModel = new Prestamo();
    $pagoModel = new Pago();

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
            $pagos = $pagoModel->obtenerPagos();
            $prestamos = $prestamoModel->obtenerPrestamos();
        } else {
            $pagos = $pagoModel->obtenerPagos($idAsociadoSesion);
            $prestamos = $prestamoModel->obtenerPrestamos($idAsociadoSesion);
        }

        responderJson(200, [
            "success" => true,
            "rol" => $rol,
            "idAsociadoActual" => $idAsociadoSesion,
            "pagos" => $pagos,
            "prestamos" => $prestamos
        ]);
    }

    $datos = leerDatos();

    if ($metodo === "POST") {
        $valorCuota = filter_var($datos["valorCuota"] ?? null, FILTER_VALIDATE_FLOAT);
        $fechaPago = trim((string) ($datos["fechaPago"] ?? ""));
        $idPrestamo = filter_var($datos["idPrestamo"] ?? null, FILTER_VALIDATE_INT, ["options" => ["min_range" => 1]]);

        if ($valorCuota === false || $valorCuota <= 0) {
            throw new Exception("El valor de la cuota debe ser mayor a 0", 400);
        }
        if (empty($fechaPago)) {
            throw new Exception("Debe ingresar la fecha del pago", 400);
        }
        if ($idPrestamo === false) {
            throw new Exception("Debe seleccionar un préstamo válido", 400);
        }

        $prestamoInfo = $prestamoModel->obtenerPorId($idPrestamo);
        if (!$prestamoInfo) {
            throw new Exception("El préstamo seleccionado no existe", 404);
        }

        if ($rol !== "admin" && (int)$prestamoInfo["idAsociado"] !== $idAsociadoSesion) {
            throw new Exception("No tienes permisos para registrar pagos en este préstamo", 403);
        }

        $guardado = $pagoModel->guardar([
            "valorCuota" => $valorCuota,
            "fechaPago" => $fechaPago,
            "idPrestamo" => $idPrestamo
        ]);

        if (!$guardado) {
            throw new Exception("No fue posible registrar el pago", 500);
        }

        responderJson(201, [
            "success" => true,
            "mensaje" => "Pago de cuota registrado exitosamente"
        ]);
    }

    if ($metodo === "DELETE") {
        if ($rol !== "admin") {
            throw new Exception("Solo los administradores pueden eliminar registros de pagos", 403);
        }

        $idPago = filter_var($datos["idPago"] ?? null, FILTER_VALIDATE_INT, ["options" => ["min_range" => 1]]);
        if ($idPago === false) {
            throw new Exception("Identificador de pago no válido", 400);
        }

        if (!$pagoModel->eliminar($idPago)) {
            throw new Exception("No se encontró el pago o no se pudo eliminar", 404);
        }

        responderJson(200, [
            "success" => true,
            "mensaje" => "Pago eliminado correctamente"
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
