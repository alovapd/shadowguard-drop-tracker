{
  "apps": [
    {
      "name": "shadowguard-tracker",
      "script": "server.js",
      "cwd": "./",
      "instances": 1,
      "exec_mode": "fork",
      "watch": false,
      "max_memory_restart": "500M",
      "env": {
        "NODE_ENV": "production",
        "PORT": 3020
      },
      "env_development": {
        "NODE_ENV": "development",
        "PORT": 3020,
        "watch": true
      },
      "log_date_format": "YYYY-MM-DD HH:mm:ss Z",
      "error_file": "./logs/err.log",
      "out_file": "./logs/out.log",
      "log_file": "./logs/combined.log",
      "time": true,
      "autorestart": true,
      "restart_delay": 1000,
      "max_restarts": 5,
      "min_uptime": "10s"
    }
  ]
}