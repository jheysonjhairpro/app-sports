import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  for (const nombre of ['usuario', 'administrador', 'super_admin']) {
    await prisma.rol.upsert({ where: { nombre }, update: {}, create: { nombre } });
  }

  const correo = process.env.SUPERADMIN_EMAIL?.toLowerCase();
  const pass = process.env.SUPERADMIN_PASSWORD;
  if (correo && pass) {
    const rol = await prisma.rol.findUniqueOrThrow({ where: { nombre: 'super_admin' } });
    await prisma.usuario.upsert({
      where: { correo },
      update: {},
      create: { nombre: 'Super Admin', correo, passwordHash: await bcrypt.hash(pass, 12), rolId: rol.id },
    });
    console.log(`Super admin listo: ${correo}`);
  }
}

main().finally(() => prisma.$disconnect());
