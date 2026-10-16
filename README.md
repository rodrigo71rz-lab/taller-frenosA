# BuenFreno — control de taller

Aplicación para administrar clientes, tipos de vehículo, inventario de repuestos,
órdenes de trabajo y secuencias de mantenimiento. Incluye un frontend Angular,
una API Express y PostgreSQL.

## Requisitos

- Node.js y npm
- PostgreSQL

## Backend

Desde PowerShell, configura el entorno:

```powershell
cd backend
Copy-Item .env.example .env
```

Edita `backend/.env` con la conexión local a PostgreSQL y crea la base de datos
indicada en `DB_NAME`. Luego instala dependencias e inicia la API:

```powershell
npm install
npm run dev
```

La API se ejecuta en `http://localhost:3000`; el estado puede comprobarse en
`http://localhost:3000/api/health`.

## Frontend

En otra terminal:

```powershell
cd frontend
npm install
npm start
```

Abre `http://localhost:4200/`. También están disponibles la página de acceso
`http://localhost:4200/acceso.html` y la vista rápida
`http://localhost:4200/visualizar.html`.

El frontend utiliza la API en `http://localhost:3000/api`; ambos servicios deben
estar activos para consultar y gestionar los datos.
