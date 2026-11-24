<?php

require_once __DIR__ . '/../Config/conexion.php';

class Prestamo {
    private $conexion;

    public function __construct()
    {
        $conexionDB = new Conexion();
        $this->conexion = $conexionDB->conectar();
    }

    public function guardar(array $datos): bool
    {
        $sql = "INSERT INTO prestamos (valorPrestamo, tasaInteres, numeroCuotas, fechaPrestamo, idAsociado) 
                VALUES (:valorPrestamo, :tasaInteres, :numeroCuotas, :fechaPrestamo, :idAsociado)";
        $consulta = $this->conexion->prepare($sql);
        return $consulta->execute([
            ":valorPrestamo" => $datos['valorPrestamo'],
            ":tasaInteres" => $datos['tasaInteres'],
            ":numeroCuotas" => $datos['numeroCuotas'],
            ":fechaPrestamo" => $datos['fechaPrestamo'],
            ":idAsociado" => $datos['idAsociado']
        ]);
    }

    public function obtenerPrestamos(?int $idAsociado = null): array
    {
        $sql = "SELECT p.idPrestamo, p.valorPrestamo, p.tasaInteres, p.numeroCuotas, p.fechaPrestamo, p.idAsociado,
                       a.documento, a.nombres, a.apellidos
                FROM prestamos p
                INNER JOIN asociados a ON p.idAsociado = a.idAsociado ";
        
        $params = [];
        if ($idAsociado !== null) {
            $sql .= " WHERE p.idAsociado = :idAsociado ";
            $params[":idAsociado"] = $idAsociado;
        }

        $sql .= " ORDER BY p.idPrestamo DESC";
        $consulta = $this->conexion->prepare($sql);
        $consulta->execute($params);
        return $consulta->fetchAll();
    }

    public function obtenerPorId(int $idPrestamo): ?array
    {
        $sql = "SELECT p.*, a.documento, a.nombres, a.apellidos 
                FROM prestamos p 
                INNER JOIN asociados a ON p.idAsociado = a.idAsociado
                WHERE p.idPrestamo = :idPrestamo";
        $consulta = $this->conexion->prepare($sql);
        $consulta->execute([":idPrestamo" => $idPrestamo]);
        $resultado = $consulta->fetch();
        return $resultado ?: null;
    }

    public function eliminar(int $idPrestamo): bool
    {
        $sql = "DELETE FROM prestamos WHERE idPrestamo = :idPrestamo";
        $consulta = $this->conexion->prepare($sql);
        $consulta->execute([":idPrestamo" => $idPrestamo]);
        return $consulta->rowCount() > 0;
    }
}
