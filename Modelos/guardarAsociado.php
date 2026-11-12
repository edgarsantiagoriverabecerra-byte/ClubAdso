<?php
header("Content-Type: application/json; charset=utf-8");
require_once __DIR__.'/../Modelos/Asociado.php';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        throw new Exception("Método HTTP no permitido");
    }

    $tipoContenido = $_SERVER['CONTENT_TYPE'] ?? '';
    if (stripos($tipoContenido, 'application/json') !== false) {
        $datos = json_decode(file_get_contents('php://input'), true);
        if (!is_array($datos) || json_last_error() !== JSON_ERROR_NONE) {
            http_response_code(400);
            throw new Exception("Datos inválidos");
        }
    } else {
        $datos = $_POST;
    }

    $campos = ["documento", "nombres", "apellidos", "fechaNacimiento", "genero", "direccionResidencia", "ciudad", "telefono", "email", "contraseña"];
    foreach ($campos as $campo) { 
        if (!isset($datos[$campo]) || trim($datos[$campo]) === '') {
            http_response_code(400);
            throw new Exception("Falta el campo: " . $campo);
        }
    }

    if (!filter_var($datos['email'], FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        throw new Exception("Email inválido");
    }

    $asociado = new Asociado($datos);
    
    // Ejecución única del método guardar
    $resultado = $asociado->guardar();

    if ($resultado) {
        http_response_code(201);
        echo json_encode(["success" => true, "mensaje" => "Asociado guardado con éxito","redirect" => "..Vista/Login.html"]);

    } else {
        http_response_code(500);
        echo json_encode(["success" => false, "mensaje" => "Error al guardar el asociado"]);
    }
    
} catch (PDOException $e) {
    if ($e->getCode() == 23000) {
        http_response_code(409);
        echo json_encode(["success" => false, "mensaje" => "El documento o el correo ya existen en la base de datos"]);
    } else {  
        http_response_code(500);
        echo json_encode(["success" => false, "mensaje" => "Error en la base de datos: " . $e->getMessage()]);
    }
} catch (Exception $e) {
    if (http_response_code() === 200) {
        http_response_code(400);
    }
    echo json_encode(["success" => false, "mensaje" => $e->getMessage()]);
}
?>