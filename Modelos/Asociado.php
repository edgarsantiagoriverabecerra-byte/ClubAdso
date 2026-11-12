<?php

require_once __DIR__ . '/../Config/conexion.php';

class Asociado {
    private $documento;
    private $nombres;
    private $apellidos;
    private $fechaNacimiento;
    private $genero;
    private $direccionResidencia;
    private $ciudad;
    private $telefono;
    private $email;
    private $contraseña;
    private $conexion;

    public function __construct($datos)
    {
        $this->documento = $datos['documento'];
        $this->nombres = $datos['nombres'];
        $this->apellidos = $datos['apellidos'];
        $this->fechaNacimiento = $datos['fechaNacimiento'];
        $this->genero = $datos['genero'];
        $this->direccionResidencia = $datos['direccionResidencia'];
        $this->ciudad = $datos['ciudad'];
        $this->email = $datos['email'];
        $this->telefono = $datos['telefono'];
        $this->contraseña = password_hash($datos['contraseña'], PASSWORD_DEFAULT);

        $conexionDB = new Conexion();
        $this->conexion = $conexionDB->conectar();
    }

    public function guardar()
    {
        $sql = "INSERT INTO asociados (documento, nombres, apellidos, fechaNacimiento, genero, direccionResidencia, ciudad, email, telefono, contraseña) 
                VALUES (:documento, :nombres, :apellidos, :fechaNacimiento, :genero, :direccionResidencia, :ciudad, :email, :telefono, :contrasena)";
        
        $consulta = $this->conexion->prepare($sql);
        
        return $consulta->execute([
            ":documento" => $this->documento,
            ":nombres" => $this->nombres,
            ":apellidos" => $this->apellidos,
            ":fechaNacimiento" => $this->fechaNacimiento,
            ":genero" => $this->genero,
            ":direccionResidencia" => $this->direccionResidencia,
            ":ciudad" => $this->ciudad,
            ":email" => $this->email,
            ":telefono" => $this->telefono,
            ":contrasena" => $this->contraseña
        ]);
    }
}
?>