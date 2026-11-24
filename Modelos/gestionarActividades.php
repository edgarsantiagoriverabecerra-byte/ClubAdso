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
        throw new Exception("Error al decodificar JSON: " . json_last_error_msg(), 400);
    }
    return $datos;
}

function validarActividad(array $datos): array
{
    $nombre = $datos['nombreActividad'] ?? null;
    $fecha = $datos['fechaEvento'] ?? null;
    $municipio = $datos['municipio'] ?? null;

    if (!is_string($nombre) || trim($nombre) === "" || strlen($nombre) > 100 || 
        !is_string($municipio) || trim($municipio) === "" || strlen($municipio) > 50 ||
        empty($fecha)) {
        throw new Exception("Ingresa un nombre, fecha y municipio válidos", 400);
    }

    $totalRecaudado = null;
    if (isset($datos['totalRecaudado']) && $datos['totalRecaudado'] !== null && $datos['totalRecaudado'] !== '') {
        $totalRecaudado = (float) $datos['totalRecaudado'];
    }

    return [
        "nombreActividad" => trim($nombre),
        "fechaEvento" => trim($fecha),
        "municipio" => trim($municipio),
        "totalRecaudado" => $totalRecaudado
    ];
}

function validarId($id): int
{
    $idActividad = filter_var($id, FILTER_VALIDATE_INT, ["options" => ["min_range" => 1]]);
    if ($idActividad === false) {
        throw new Exception("El identificador de la actividad no es válido", 400);
    }
    return (int) $idActividad;
}

try {
    if (!isset($_SESSION["documento"], $_SESSION["rol"])) {
        throw new Exception("Inicia sesión para consultar las actividades", 401);
    }

    $metodo = $_SERVER["REQUEST_METHOD"] ?? "";
    if (!in_array($metodo, ["GET", "POST", "PUT", "DELETE"], true)) {
        throw new Exception("Método HTTP no permitido", 405);
    }

    require_once __DIR__ . "/Actividad.php";
    require_once __DIR__ . "/Asociado.php";
    $actividad = new Actividad();
    $asociadoModel = new Asociado();

    $rol = strtolower(trim((string) $_SESSION["rol"]));
    $usuarioActual = $asociadoModel->obtenerPorDocumento($_SESSION["documento"]);
    $idAsociadoSesion = $usuarioActual ? (int) $usuarioActual["idAsociado"] : 0;

    switch ($metodo) {
        case "GET":
            $accion = $_GET["accion"] ?? "";
            if ($accion === "participantes") {
                $idActividad = validarId($_GET["idActividad"] ?? null);
                $infoAct = $actividad->obtenerPorId($idActividad);
                if (!$infoAct) {
                    throw new Exception("Actividad no encontrada", 404);
                }
                $participantes = $actividad->obtenerParticipantes($idActividad);
                $totalRecaudado = (float) ($infoAct["totalRecaudado"] ?? 0);
                $numParticipantes = count($participantes);
                $parteDistribuida = $totalRecaudado * 0.50;
                $montoIndividual = $numParticipantes > 0 ? ($parteDistribuida / $numParticipantes) : 0;

                // Verificar si el usuario actual ya está inscrito
                $estaInscrito = false;
                foreach ($participantes as $p) {
                    if ((int)$p["idAsociado"] === $idAsociadoSesion) {
                        $estaInscrito = true;
                        break;
                    }
                }

                responderJson(200, [
                    "success" => true,
                    "actividad" => $infoAct,
                    "participantes" => $participantes,
                    "calculo" => [
                        "totalRecaudado" => $totalRecaudado,
                        "parteClub" => $totalRecaudado * 0.50,
                        "parteDistribuida" => $parteDistribuida,
                        "totalParticipantes" => $numParticipantes,
                        "montoIndividual" => $montoIndividual
                    ],
                    "estaInscrito" => $estaInscrito
                ]);
            }

            responderJson(200, [
                "success" => true,
                "rol" => $rol,
                "idAsociadoActual" => $idAsociadoSesion,
                "actividades" => $actividad->obtenerActividades()
            ]);
            break;

        case "POST":
            $datos = leerDatos();
            $accion = $datos["accion"] ?? "";

            if ($accion === "inscribir") {
                $idActividad = validarId($datos["idActividad"] ?? null);
                $idAsociadoInscribir = ($rol === "admin" && !empty($datos["idAsociado"])) 
                    ? (int)$datos["idAsociado"] 
                    : $idAsociadoSesion;

                if ($idAsociadoInscribir <= 0) {
                    throw new Exception("Asociado no válido", 400);
                }

                $actividad->inscribirParticipante($idActividad, $idAsociadoInscribir);
                responderJson(200, [
                    "success" => true,
                    "mensaje" => "Inscripción a la actividad realizada exitosamente"
                ]);
            }

            if ($accion === "desinscribir") {
                $idActividad = validarId($datos["idActividad"] ?? null);
                $idAsociadoDesinscribir = ($rol === "admin" && !empty($datos["idAsociado"])) 
                    ? (int)$datos["idAsociado"] 
                    : $idAsociadoSesion;

                $actividad->desinscribirParticipante($idActividad, $idAsociadoDesinscribir);
                responderJson(200, [
                    "success" => true,
                    "mensaje" => "Se ha retirado la inscripción correctamente"
                ]);
            }

            // Crear actividad (solo admin)
            if ($rol !== "admin") {
                throw new Exception("No tienes permisos para crear actividades", 403);
            }

            $validados = validarActividad($datos);
            $actividad->guardar($validados);
            responderJson(201, [
                "success" => true,
                "mensaje" => "Actividad creada exitosamente"
            ]);
            break;

        case "PUT":
            $datos = leerDatos();
            $idActividad = validarId($datos["idActividad"] ?? null);
            $validados = validarActividad($datos);
            $validados["idActividad"] = $idActividad;

            if (!$actividad->editar($validados)) {
                throw new Exception("No se encontró la actividad", 404);
            }

            responderJson(200, [
                "success" => true,
                "mensaje" => "Actividad actualizada correctamente"
            ]);
            break;

        case "DELETE":
            $datos = leerDatos();
            $idActividad = validarId($datos["idActividad"] ?? null);

            if (!$actividad->eliminar($idActividad)) {
                throw new Exception("No se encontró la actividad", 404);
            }

            responderJson(200, [
                "success" => true,
                "mensaje" => "Actividad eliminada correctamente"
            ]);
            break;
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
