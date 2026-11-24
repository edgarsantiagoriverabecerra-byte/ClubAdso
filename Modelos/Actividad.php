<?php

require_once __DIR__ . '/../Config/conexion.php';

class Actividad {
    private $conexion;

    public function __construct()
    {
        $conexionDB = new Conexion();
        $this->conexion = $conexionDB->conectar();
    }

    public function obtenerActividades()
    {
        $sql = "SELECT a.idActividad, a.nombreActividad, a.fechaEvento, a.municipio, a.totalRecaudado,
                       COUNT(p.idParticipacion) AS totalParticipantes
                FROM actividades a
                LEFT JOIN actividades_asociado p ON a.idActividad = p.idActividad
                GROUP BY a.idActividad, a.nombreActividad, a.fechaEvento, a.municipio, a.totalRecaudado
                ORDER BY a.fechaEvento ASC";
        $consulta = $this->conexion->prepare($sql);
        $consulta->execute();
        return $consulta->fetchAll();
    }

    public function obtetenerActividades()
    {
        return $this->obtenerActividades();
    }

    public function obtenerPorId(int $idActividad): ?array
    {
        $sql = "SELECT a.*, COUNT(p.idParticipacion) AS totalParticipantes 
                FROM actividades a 
                LEFT JOIN actividades_asociado p ON a.idActividad = p.idActividad
                WHERE a.idActividad = :idActividad
                GROUP BY a.idActividad";
        $consulta = $this->conexion->prepare($sql);
        $consulta->execute([":idActividad" => $idActividad]);
        $resultado = $consulta->fetch();
        return $resultado ?: null;
    }

    public function inscribirParticipante(int $idActividad, int $idAsociado): bool
    {
        $check = $this->conexion->prepare("SELECT COUNT(*) FROM actividades_asociado WHERE idActividad = :act AND idAsociado = :aso");
        $check->execute([":act" => $idActividad, ":aso" => $idAsociado]);
        if ($check->fetchColumn() > 0) {
            return true;
        }

        $sql = "INSERT INTO actividades_asociado (idActividad, idAsociado) VALUES (:act, :aso)";
        $consulta = $this->conexion->prepare($sql);
        return $consulta->execute([":act" => $idActividad, ":aso" => $idAsociado]);
    }

    public function desinscribirParticipante(int $idActividad, int $idAsociado): bool
    {
        $sql = "DELETE FROM actividades_asociado WHERE idActividad = :act AND idAsociado = :aso";
        $consulta = $this->conexion->prepare($sql);
        $consulta->execute([":act" => $idActividad, ":aso" => $idAsociado]);
        return $consulta->rowCount() > 0;
    }

    public function obtenerParticipantes(int $idActividad): array
    {
        $sql = "SELECT aa.idParticipacion, aa.idAsociado, a.documento, a.nombres, a.apellidos, a.telefono, a.email
                FROM actividades_asociado aa
                INNER JOIN asociados a ON aa.idAsociado = a.idAsociado
                WHERE aa.idActividad = :act
                ORDER BY a.apellidos ASC";
        $consulta = $this->conexion->prepare($sql);
        $consulta->execute([":act" => $idActividad]);
        return $consulta->fetchAll();
    }

    public function guardar($datos)
    {
        $sql = "INSERT INTO actividades (nombreActividad, fechaEvento, municipio, totalRecaudado) 
                VALUES (:nombreActividad, :fechaEvento, :municipio, :totalRecaudado)";
        $consulta = $this->conexion->prepare($sql);

        $totalRecaudado = isset($datos['totalRecaudado']) && $datos['totalRecaudado'] !== '' ? $datos['totalRecaudado'] : null;

        return $consulta->execute([
            ":nombreActividad" => $datos['nombreActividad'],
            ":fechaEvento" => $datos['fechaEvento'],
            ":municipio" => $datos['municipio'],
            ":totalRecaudado" => $totalRecaudado
        ]);
    }

    public function eliminar($idActividad)
    {
        $sql = "DELETE FROM actividades WHERE idActividad = :idActividad";
        $consulta = $this->conexion->prepare($sql);
        $consulta->execute([":idActividad" => $idActividad]);
        return $consulta->rowCount() > 0;
    }

    public function editar($datos)
    {
        $sqlCheck = "SELECT COUNT(*) FROM actividades WHERE idActividad = :idActividad";
        $check = $this->conexion->prepare($sqlCheck);
        $check->execute([":idActividad" => $datos['idActividad']]);
        if ($check->fetchColumn() == 0) {
            return false;
        }

        $totalRecaudado = isset($datos['totalRecaudado']) && $datos['totalRecaudado'] !== '' ? $datos['totalRecaudado'] : null;

        $sql = "UPDATE actividades 
                SET nombreActividad = :nombreActividad, 
                    fechaEvento = :fechaEvento, 
                    municipio = :municipio, 
                    totalRecaudado = :totalRecaudado 
                WHERE idActividad = :idActividad";

        $consulta = $this->conexion->prepare($sql);
        return $consulta->execute([
            ":nombreActividad" => $datos['nombreActividad'],
            ":fechaEvento" => $datos['fechaEvento'],
            ":municipio" => $datos['municipio'],
            ":totalRecaudado" => $totalRecaudado,
            ":idActividad" => $datos['idActividad']
        ]);
    }
}
