<?php
// config/database.php

class Database {
    private $host = "localhost";
    private $db_name = "movietem";
    private $username = "root";
    private $password = "";
    public $conn;

    public function getConnection() {
        $this->conn = null;

        try {
            $this->conn = new PDO(
                "mysql:host=" . $this->host . ";dbname=" . $this->db_name . ";charset=utf8mb4",
                $this->username,
                $this->password
            );
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        } catch (PDOException $exception) {
            error_log("Database connection failure: " . $exception->getMessage());
            die("<div style='font-family:sans-serif; text-align:center; padding:50px; background:#0d0a07; color:#fff;'>
                    <h2 style='color:#ffc107;'>We'll be right back</h2>
                    <p style='color:#a09080;'>MovieTem is briefly offline for maintenance. Please refresh in a moment.</p>
                 </div>");
        }

        return $this->conn;
    }
}