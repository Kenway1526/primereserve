<<<<<<< HEAD
# Frontend

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.1.0.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
=======
Aplicación de reservaciones de restaurante

Tecnologías

Frontend       ->    Angular (TypeScript)
Backend        ->    Netlify Functions (Serverless)
ORM            ->    Prisma (v6)
Base de Datos  ->    PostgreSQL (Supabase)
Hosting        ->    Netlify

=========================================================================

Requisitos Previos

Antes de clonar, asegúrate de tener instalado:
- Node.js (v18 o superior)
- Angular CLI (`npm install -g @angular/cli`)
- Netlify CLI (`npm install -g netlify-cli`)

==========================================================================

Instalación y Configuración

Sigue estos pasos para levantar el proyecto en una máquina nueva:

1. Clonar el repositorio:
   
   git clone [https://github.com/TU_USUARIO/app-reservaciones.git](https://github.com/TU_USUARIO/app-reservaciones.git)
   cd app-reservaciones

2. Instalar dependencias

   npm install

3. Configurar variables de entorno

   Crea un archivo .env en la --app-reservaciones y añade la siguiente cadena de conexión:}
   - DATABASE_URL="postgresql://postgres:proyectoisreservaciones@db.uzeyiwrxccmfcalbuynr.supabase.co:5432/postgres?pgbouncer=true"

4. Sincronizar la base de datos con Prisma

   npx prisma generate
   npx prisma db push

=======================================================================================

Desarrollo local (habilitar el front)

   - netlify dev (entrar a http://localhost:4200 en el navegador)

API´s -> http://localhost:8888/.netlify/functions/

======================================================================================

Estructura del proyecto

/frontend: código fuente en Angular
/prisma: esquema de la base de datos y migraciones
/netlify/functions: logica del backend

=======================================================================================

Responsabilidades
>>>>>>> 20f2c1b2fa97443342f4b8762366b92b76702cd7
