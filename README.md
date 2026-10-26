# ⚽ AbanPlay · Backend API

> **API REST** para la aplicación móvil (Flutter: clientes y administradores) y el panel web del super administrador.

![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=flat-square&logo=nodedotjs)
![NestJS](https://img.shields.io/badge/NestJS-10.x-E0234E?style=flat-square&logo=nestjs)
![Prisma](https://img.shields.io/badge/Prisma-5.x-2D3748?style=flat-square&logo=prisma)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=flat-square&logo=mysql)
![Cloudinary](https://img.shields.io/badge/Cloudinary-Media-3448C5?style=flat-square&logo=cloudinary)
![JWT](https://img.shields.io/badge/Auth-JWT-000000?style=flat-square&logo=jsonwebtokens)

---

## 🏗️ Arquitectura del Sistema

![Arquitectura](docs/arquitectura.png)

---

## 🚀 Puesta en Marcha

```bash
cp .env.example .env
npm install 

npx prisma migrate dev --name init
npm run seed                    

npm run start:dev