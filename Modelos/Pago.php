<?php

require_once __DIR__ . '/../Config/conexion.php';

class Pago {
    private $conexion;

    public function __construct()
    {
        $conexionDB = new Conexion();
        $this->conexion = $conexionDB->conectar();
    }

    public function guardar(array $datos): bool
    {
        $sql = "INSERT INTO pagos_cuotas (valorCuota, fechaPago, idPrestamo) 
                VALUES (:valorCuota, :fechaPago, :idPrestamo)";
        $consulta = $this->conexion->prepare($sql);
        return $consulta->execute([
            ":valorCuota" => $datos['valorCuota'],
            ":fechaPago" => $datos['fechaPago'],
            ":idPrestamo" => $datos['idPrestamo']
        ]);
    }

    public function obtenerPagos(?int $idAsociado = null, ?int $idPrestamo = null): array
    {
        $sql = "SELECT pc.idPago, pc.valorCuota, pc.fechaPago, pc.idPrestamo,
                       p.valorPrestamo, p.numeroCuotas, p.idAsociado,
                       a.documento, a.nombres, a.apellidos
                FROM pagos_cuotas pc
                INNER JOIN prestamos p ON pc.idPrestamo = p.idPrestamo
                INNER JOIN asociados a ON p.idAsociado = a.idAsociado ";
        
        $condiciones = [];
        $params = [];

        if ($idAsociado !== null) {
            $condiciones[] = "p.idAsociado = :idAsociado";
            $params[":idAsociado"] = $idAsociado;
        }

        if ($idPrestamo !== null) {
            $condiciones[] = "pc.idPrestamo = :idPrestamo";
            $params[":idPrestamo"] = $idPrestamo;
        }

        if (!empty($condiciones)) {
            $sql .= " WHERE " . implode(" AND ", $condiciones);
        }

        $sql .= " ORDER BY pc.idPago DESC";
        $consulta = $this->conexion->prepare($sql);
        $consulta->execute($params);
        return $consulta->fetchAll();
    }

    public function obtenerPorId(int $idPago): ?array
    {
        $sql = "SELECT pc.*, p.idAsociado, a.nombres, a.apellidos 
                FROM pagos_cuotas pc
                INNER JOIN prestamos p ON pc.idPrestamo = p.idPrestamo
                INNER JOIN asociados a ON p.idAsociado = a.idAsociado
                WHERE pc.idPago = :idPago";
        $consulta = $this->conexion->prepare($sql);
        $consulta->execute([":idPago" => $idPago]);
        $resultado = $consulta->fetch();
        return $resultado ?: null;
    }

    public function eliminar(int $idPago): bool
    {
        $sql = "DELETE FROM pagos_cuotas WHERE idPago = :idPago";
        $consulta = $this->conexion->prepare($sql);
        $consulta->execute([":idPago" => $idPago]);
        return $consulta->rowCount() > 0;
    }
}
