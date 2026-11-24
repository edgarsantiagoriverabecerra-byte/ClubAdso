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

    public function __construct(?array $datos = null)
    {
        $conexionDB = new Conexion();
        $this->conexion = $conexionDB->conectar();

        if ($datos !== null) {
            $this->asignarDatos($datos);
        }
    }

    public function asignarDatos(array $datos): void
    {
        $this->documento = $datos['documento'] ?? null;
        $this->nombres = $datos['nombres'] ?? null;
        $this->apellidos = $datos['apellidos'] ?? null;
        $this->fechaNacimiento = $datos['fechaNacimiento'] ?? null;
        $this->genero = $datos['genero'] ?? null;
        $this->direccionResidencia = $datos['direccionResidencia'] ?? null;
        $this->ciudad = $datos['ciudad'] ?? null;
        $this->email = $datos['email'] ?? null;
        $this->telefono = $datos['telefono'] ?? null;
        if (!empty($datos['contraseña'])) {
            $this->contraseña = password_hash($datos['contraseña'], PASSWORD_DEFAULT);
        }
    }

    public function guardar(?array $datos = null): bool
    {
        if ($datos !== null) {
            $this->asignarDatos($datos);
        }

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

    public function obtenerAsociados(): array
    {
        $sql = "SELECT idAsociado, documento, nombres, apellidos, fechaNacimiento, genero, direccionResidencia, ciudad, telefono, email, rol 
                FROM asociados 
                ORDER BY idAsociado DESC";
        $consulta = $this->conexion->prepare($sql);
        $consulta->execute();
        return $consulta->fetchAll();
    }

    public function obtenerPorId(int $idAsociado): ?array
    {
        $sql = "SELECT idAsociado, documento, nombres, apellidos, fechaNacimiento, genero, direccionResidencia, ciudad, telefono, email, rol 
                FROM asociados 
                WHERE idAsociado = :idAsociado";
        $consulta = $this->conexion->prepare($sql);
        $consulta->execute([":idAsociado" => $idAsociado]);
        $resultado = $consulta->fetch();
        return $resultado ?: null;
    }

    public function obtenerPorDocumento($documento): ?array
    {
        $sql = "SELECT idAsociado, documento, nombres, apellidos, fechaNacimiento, genero, direccionResidencia, ciudad, telefono, email, rol 
                FROM asociados 
                WHERE documento = :documento";
        $consulta = $this->conexion->prepare($sql);
        $consulta->execute([":documento" => $documento]);
        $resultado = $consulta->fetch();
        return $resultado ?: null;
    }

    public function editar(array $datos): bool
    {
        $sqlCheck = "SELECT COUNT(*) FROM asociados WHERE idAsociado = :idAsociado";
        $check = $this->conexion->prepare($sqlCheck);
        $check->execute([":idAsociado" => $datos['idAsociado']]);
        if ($check->fetchColumn() == 0) {
            return false;
        }

        $sql = "UPDATE asociados 
                SET documento = :documento, 
                    nombres = :nombres, 
                    apellidos = :apellidos, 
                    fechaNacimiento = :fechaNacimiento, 
                    genero = :genero, 
                    direccionResidencia = :direccionResidencia, 
                    ciudad = :ciudad, 
                    telefono = :telefono, 
                    email = :email 
                WHERE idAsociado = :idAsociado";

        $consulta = $this->conexion->prepare($sql);
        return $consulta->execute([
            ":documento" => $datos['documento'],
            ":nombres" => $datos['nombres'],
            ":apellidos" => $datos['apellidos'],
            ":fechaNacimiento" => $datos['fechaNacimiento'],
            ":genero" => $datos['genero'],
            ":direccionResidencia" => $datos['direccionResidencia'],
            ":ciudad" => $datos['ciudad'],
            ":telefono" => $datos['telefono'],
            ":email" => $datos['email'],
            ":idAsociado" => $datos['idAsociado']
        ]);
    }

    public function eliminar(int $idAsociado): bool
    {
        $sql = "DELETE FROM asociados WHERE idAsociado = :idAsociado";
        $consulta = $this->conexion->prepare($sql);
        $consulta->execute([":idAsociado" => $idAsociado]);
        return $consulta->rowCount() > 0;
    }
}
