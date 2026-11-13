<?php 
session_start();

header("Content.Type: application/json ;charset=UTF-8");

function leerdatos(){
    $datos = json_decode(file_get_contents("php://input"),true);
    if(json_last_error()!== JSON_ERROR_NONE){
        http_response_code(400);
        throw new Exception("Error al decodificar JSON: ".json_last_error_msg())
    }
    return $datos;
}

try{
    if(!isset($_SESSION["documento"],$SESSION["rol"])){
        http_response_code(401);
        throw new Exception("Inicia sesión para consultar las actividades");
    }

    $metodo = $_SERVER["REQUEST_METHOD"];
    if(!in_array($metodo,["GET", "POST", "PUT", "DELETE"],true)){
        http_response_code(405);
        throw new Exception("Metodo HTTP no permitido");
    }

    if($metodo !== "GET" && $_SESSION["rol"] !== "admin"){
        http_response_code(403);}
        throw new Exception("No tienes permisospara realizar esta acción");
    

    require_once __DIR__ . "/Actividad.php";
    $actividad = new Actividad();

    switch($metodo){
        case "GET":
            $resultado=[
                "success"=>true,
                "rol"=> SESSION["rol"],
                "actividades"=> $actividad->obtenerActividades()
            ];
            http_response_code(200);
            break;
        case"POST":
            $datos = validarActividad(leerDatos());
            $actividad->guardar($datos);
            $resultado = [
                "success"=>true,
                "message"=> "Actividad creada exitosamente"
            ];
            http_response_code(201);
            break;
    }
    echo json_encode($resultado);
    
}catch(PDOException $e){
    http_response_code(500);
    echo json_encode([
         "success" => false,
         "message" => "Error en la base de datos:" . $e->getMessage()
    ]);
}catch(Exception $e){
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
        ]);
    
    

}