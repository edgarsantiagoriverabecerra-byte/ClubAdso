<?php
ob_start();
session_start();
header("Content-Type: application/json; charset=utf-8");

function responderJson(int $codigo, array $payload): void
{
    http_response_code($codigo);
    ob_clean();
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function leerDatos(): array
{
    $raw = file_get_contents("php://input");
    $datos = json_decode($raw ?: "", true);
    if (!is_array($datos) || json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception("Datos JSON inválidos", 400);
    }
    return $datos;
}

function validarId($id): int
{
    $idValidado = filter_var($id, FILTER_VALIDATE_INT, ["options" => ["min_range" => 1]]);
    if ($idValidado === false) {
        throw new Exception("El identificador del asociado no es válido", 400);
    }
    return (int) $idValidado;
}

function validarAsociado(array $datos): array
{
    $campos = [
        "documento", "nombres", "apellidos", "fechaNacimiento", "genero",
        "direccionResidencia", "ciudad", "telefono", "email"
    ];

    foreach ($campos as $campo) {
        if (!isset($datos[$campo]) || trim((string) $datos[$campo]) === "") {
            throw new Exception("Falta el campo: " . $campo, 400);
        }
    }

    $email = trim((string) $datos["email"]);
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception("El correo electrónico no es válido", 400);
    }

    $genero = trim((string) $datos["genero"]);
    if (!in_array($genero, ["Masculino", "Femenino", "Otro"], true)) {
        throw new Exception("El género no es válido", 400);
    }

    return [
        "documento" => trim((string) $datos["documento"]),
        "nombres" => trim((string) $datos["nombres"]),
        "apellidos" => trim((string) $datos["apellidos"]),
        "fechaNacimiento" => trim((string) $datos["fechaNacimiento"]),
        "genero" => $genero,
        "direccionResidencia" => trim((string) $datos["direccionResidencia"]),
        "ciudad" => trim((string) $datos["ciudad"]),
        "telefono" => trim((string) $datos["telefono"]),
        "email" => $email
    ];
}

try {
    if (!isset($_SESSION["documento"], $_SESSION["rol"])) {
        throw new Exception("Inicia sesión para consultar los asociados", 401);
    }

    $rol = strtolower(trim((string) $_SESSION["rol"]));
    require_once __DIR__ . "/Asociado.php";
    $asociado = new Asociado();
    $metodo = $_SERVER["REQUEST_METHOD"] ?? "";

    if (!in_array($metodo, ["GET", "PUT", "DELETE"], true)) {
        throw new Exception("Método HTTP no permitido", 405);
    }

    if ($metodo === "GET") {
        if ($rol === "admin") {
            $lista = $asociado->obtenerAsociados();
        } else {
            // El usuario asociado consulta sus propios datos
            $propio = $asociado->obtenerPorDocumento($_SESSION["documento"]);
            $lista = $propio ? [$propio] : [];
        }

        responderJson(200, [
            "success" => true,
            "rol" => $rol,
            "asociados" => $lista
        ]);
    }

    $datos = leerDatos();

    if ($metodo === "PUT") {
        $idAsociado = validarId($datos["idAsociado"] ?? null);
        $validados = validarAsociado($datos);
        $validados["idAsociado"] = $idAsociado;

        // Si no es admin, solo puede modificar sus propios datos
        if ($rol !== "admin") {
            $propio = $asociado->obtenerPorDocumento($_SESSION["documento"]);
            if (!$propio || (int)$propio["idAsociado"] !== $idAsociado) {
                throw new Exception("No tienes permisos para modificar este asociado", 403);
            }
        }

        if (!$asociado->editar($validados)) {
            throw new Exception("No se encontró el asociado o no hubo cambios", 404);
        }

        responderJson(200, [
            "success" => true,
            "mensaje" => "Asociado actualizado correctamente"
        ]);
    }

    // Solo admin puede eliminar asociados
    if ($rol !== "admin") {
        throw new Exception("No tienes permisos para eliminar asociados", 403);
    }

    $idAsociado = validarId($datos["idAsociado"] ?? null);
    if (!$asociado->eliminar($idAsociado)) {
        throw new Exception("No se encontró el asociado", 404);
    }

    responderJson(200, [
        "success" => true,
        "mensaje" => "Asociado eliminado correctamente"
    ]);
} catch (PDOException $e) {
    if ($e->getCode() == 23000) {
        responderJson(409, [
            "success" => false,
            "mensaje" => "El documento o el correo ya existen"
        ]);
    }
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