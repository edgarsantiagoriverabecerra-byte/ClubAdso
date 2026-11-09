<?php

class conexion{
    private $host ="localhost";
    private $baseDatos ="mr_Club";
    private $User ="root";
    private $password="";

    public function conectar(){
        $dsn = "mysql:host={$this->host};dbname={$this->baseDatos};charset=utf8mb4";
       
        return new PDO($dsn, $this->User, $this->password,[
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,   
        ]);
    }
}