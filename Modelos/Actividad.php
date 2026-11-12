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
        $sql = "SELECT * FROM actividades ORDER BY fechaEvento ASC";
        $consulta = $this->conexion->prepare($sql);
        $consulta->execute();
        return $consulta->fetchAll();
    }

    public function obtetenerActividades()
    {
        return $this->obtenerActividades();
    }

    public function guardar($datos)
    {
        $sql = "INSERT INTO actividades (nombreActividad, fechaEvento, municipio) VALUES (:nombreActividad, :fechaEvento, :municipio)";
        $consulta = $this->conexion->prepare($sql);

        return $consulta->execute([
            ":nombreActividad" => $datos['nombreActividad'],
            ":fechaEvento" => $datos['fechaEvento'],
            ":municipio" => $datos['municipio']
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
        $sql = "UPDATE actividades SET nombreActividad = :nombreActividad, fechaEvento = :fechaEvento, municipio = :municipio, totalRecaudado = :totalRecaudado WHERE idActividad = :idActividad";
        $consulta = $this->conexion->prepare($sql);
        $resultado = $consulta->execute([
            ":nombreActividad" => $datos['nombreActividad'],
            ":fechaEvento" => $datos['fechaEvento'],
            ":municipio" => $datos['municipio'],
            ":totalRecaudado" => $datos['totalRecaudado'],
            ":idActividad" => $datos['idActividad']
        ]);

        return $resultado && $consulta->rowCount() > 0;
    }
}
