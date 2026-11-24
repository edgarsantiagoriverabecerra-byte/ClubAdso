<?php
session_start();
header("Content-Type: application/json; charset=UTF-8");

function responderJson(int $codigo, array $payload): void
{
    http_response_code($codigo);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    if (!isset($_SESSION["documento"], $_SESSION["rol"])) {
        throw new Exception("Inicia sesión para consultar los reportes", 401);
    }

    require_once __DIR__ . '/../Config/conexion.php';
    $conexionObj = new Conexion();
    $db = $conexionObj->conectar();

    $rol = strtolower(trim((string) $_SESSION["rol"]));
    $documentoSesion = $_SESSION["documento"];

    // Obtener datos del usuario en sesión
    $stmtUser = $db->prepare("SELECT idAsociado, documento, nombres, apellidos, rol FROM asociados WHERE documento = :doc");
    $stmtUser->execute([":doc" => $documentoSesion]);
    $usuarioActual = $stmtUser->fetch();

    if (!$usuarioActual) {
        throw new Exception("Usuario en sesión no encontrado", 404);
    }
    $idAsociadoSesion = (int) $usuarioActual["idAsociado"];

    // 1. Resumen Global / KPIs Financieros
    $kpis = [];
    if ($rol === "admin") {
        $totalPrestado = (float) $db->query("SELECT COALESCE(SUM(valorPrestamo), 0) FROM prestamos")->fetchColumn();
        $totalPagado = (float) $db->query("SELECT COALESCE(SUM(valorCuota), 0) FROM pagos_cuotas")->fetchColumn();
        $totalRecaudadoActividades = (float) $db->query("SELECT COALESCE(SUM(totalRecaudado), 0) FROM actividades")->fetchColumn();
        $totalAsociados = (int) $db->query("SELECT COUNT(*) FROM asociados")->fetchColumn();
        $totalPrestamosCount = (int) $db->query("SELECT COUNT(*) FROM prestamos")->fetchColumn();
        $totalPagosCount = (int) $db->query("SELECT COUNT(*) FROM pagos_cuotas")->fetchColumn();

        $kpis = [
            "totalPrestado" => $totalPrestado,
            "totalPagado" => $totalPagado,
            "carteraPendiente" => max(0, $totalPrestado - $totalPagado),
            "totalRecaudadoActividades" => $totalRecaudadoActividades,
            "totalAsociados" => $totalAsociados,
            "cantidadPrestamos" => $totalPrestamosCount,
            "cantidadPagos" => $totalPagosCount
        ];
    } else {
        $stmtPrest = $db->prepare("SELECT COALESCE(SUM(valorPrestamo), 0) FROM prestamos WHERE idAsociado = :id");
        $stmtPrest->execute([":id" => $idAsociadoSesion]);
        $totalPrestado = (float) $stmtPrest->fetchColumn();

        $stmtPagos = $db->prepare("
            SELECT COALESCE(SUM(pc.valorCuota), 0) 
            FROM pagos_cuotas pc 
            INNER JOIN prestamos p ON pc.idPrestamo = p.idPrestamo 
            WHERE p.idAsociado = :id
        ");
        $stmtPagos->execute([":id" => $idAsociadoSesion]);
        $totalPagado = (float) $stmtPagos->fetchColumn();

        $kpis = [
            "totalPrestado" => $totalPrestado,
            "totalPagado" => $totalPagado,
            "carteraPendiente" => max(0, $totalPrestado - $totalPagado)
        ];
    }

    // 2. Control de Cartera y Estados de Cuenta por Asociado
    $sqlCartera = "
        SELECT 
            a.idAsociado, a.documento, a.nombres, a.apellidos, a.telefono, a.email, a.rol,
            COALESCE(p_agg.totalPrestado, 0) AS totalPrestado,
            COALESCE(p_agg.numeroPrestamos, 0) AS numeroPrestamos,
            COALESCE(pag_agg.totalPagado, 0) AS totalPagado,
            (COALESCE(p_agg.totalPrestado, 0) - COALESCE(pag_agg.totalPagado, 0)) AS saldoPendiente
        FROM asociados a
        LEFT JOIN (
            SELECT idAsociado, SUM(valorPrestamo) AS totalPrestado, COUNT(*) AS numeroPrestamos
            FROM prestamos
            GROUP BY idAsociado
        ) p_agg ON a.idAsociado = p_agg.idAsociado
        LEFT JOIN (
            SELECT p.idAsociado, SUM(pc.valorCuota) AS totalPagado
            FROM pagos_cuotas pc
            INNER JOIN prestamos p ON pc.idPrestamo = p.idPrestamo
            GROUP BY p.idAsociado
        ) pag_agg ON a.idAsociado = pag_agg.idAsociado
    ";

    $paramsCartera = [];
    if ($rol !== "admin") {
        $sqlCartera .= " WHERE a.idAsociado = :idAsoc ";
        $paramsCartera[":idAsoc"] = $idAsociadoSesion;
    }
    $sqlCartera .= " ORDER BY saldoPendiente DESC, a.apellidos ASC";

    $stmtCartera = $db->prepare($sqlCartera);
    $stmtCartera->execute($paramsCartera);
    $cartera = $stmtCartera->fetchAll();

    // 3. Balance Histórico de Recaudos por Actividades
    $sqlActividades = "
        SELECT 
            act.idActividad, act.nombreActividad, act.fechaEvento, act.municipio,
            COALESCE(act.totalRecaudado, 0) AS totalRecaudado,
            COALESCE(part.totalParticipantes, 0) AS totalParticipantes,
            (COALESCE(act.totalRecaudado, 0) * 0.50) AS parteClub,
            (COALESCE(act.totalRecaudado, 0) * 0.50) AS parteDistribuida,
            CASE 
                WHEN COALESCE(part.totalParticipantes, 0) > 0 
                THEN ((COALESCE(act.totalRecaudado, 0) * 0.50) / part.totalParticipantes) 
                ELSE 0 
            END AS gananciaPorParticipante
        FROM actividades act
        LEFT JOIN (
            SELECT idActividad, COUNT(*) AS totalParticipantes
            FROM actividades_asociado
            GROUP BY idActividad
        ) part ON act.idActividad = part.idActividad
        ORDER BY act.fechaEvento DESC
    ";
    $stmtAct = $db->prepare($sqlActividades);
    $stmtAct->execute();
    $balanceActividades = $stmtAct->fetchAll();

    responderJson(200, [
        "success" => true,
        "rol" => $rol,
        "usuario" => [
            "idAsociado" => $idAsociadoSesion,
            "nombre" => $usuarioActual["nombres"] . " " . $usuarioActual["apellidos"],
            "documento" => $usuarioActual["documento"]
        ],
        "kpis" => $kpis,
        "cartera" => $cartera,
        "actividades" => $balanceActividades
    ]);

} catch (PDOException $e) {
    responderJson(500, [
        "success" => false,
        "mensaje" => "Error de base de datos en reportes: " . $e->getMessage()
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
