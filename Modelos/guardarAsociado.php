<?php
header("Content-Type: application/json; charset=utf-8");
require_once __DIR__.'/../Modelos/Asociado.php';
 
try{
 if($_SERVER['REQUEST_METHOD']!=='POST'){
    http_response_code(405);

    //Saltar a cathch y mostrar el mensaje de error
    throw new Exception("Metodo HTTP no permitido");
   }

     //leer el contenido JSON de la solicitud enviada por fetch
    $json = file_get_contents('php://input'); 

    //Decodificar el JSON en un array asociativo 
    $datos = json_decode($json, true);

    if(!is_array($datos) || json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        throw new Exception("Datos inválidos");
    }

    $campos=["documento","nombre","apellido","fechaNacimiento","genero","direccionResidencia","ciudad","telefono","email","password_hash"];
     foreach($campos as $campo){ 
        if(!isset($datos[$campo]) || !is_scalar($datos[$campo]) || trim((string) $datos[$campo]) === ''){
            http_response_code(400);
            throw new Exception("Falta el campo:". $campo);
        }
    }

    $datos['email'] = strtolower(trim($datos['email']));
    if(!filter_var($datos['email'], FILTER_VALIDATE_EMAIL)){
        http_response_code(400);
        throw new Exception("Email invalido");
    }

    if(!isset($datos['password']) || !is_string($datos['password']) || strlen($datos['password']) < 8){
        http_response_code(400);
        throw new Exception("La contraseña debe tener al menos 8 caracteres");
    }

    $datos['password_hash'] = password_hash($datos['password'], PASSWORD_DEFAULT);
    unset($datos['password']);

    $asociado = new Asociado($datos);

    $resultado = $asociado->guardar();

    if($resultado){
        http_response_code(201);
        echo json_encode(["success"=>true, "mensaje"=>"Asociado guardado exitosamente"]);
    }else{
        http_response_code(500);
        echo json_encode(["success"=>false, "mensaje"=>"Error al guardar el asociado"]);
    }
}catch(PDOException $e) {
     if($e->getCode() == 23000) {
        http_response_code(409);
        echo json_encode(["success" => false, "mensaje" => "El documento o correo ya está registrado"]);
     } else { 
        http_response_code(500);
        error_log($e->getMessage());
        echo json_encode(["success" => false, "mensaje" => "Error al guardar el asociado"]);
     }


     //errorres de codigo por ejemplo metodo HTTP, datos invalidos 
}catch (Exception $e) {
    echo json_encode(["success" => false, "mensaje" => $e->getMessage()]);
}