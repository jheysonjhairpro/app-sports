import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, RolNombre } from '../common/auth-user';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  // Se consulta la BD para que desactivar a un usuario surta efecto de inmediato.
  async validate(payload: { sub: number }): Promise<AuthUser> {
    const u = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      select: { id: true, correo: true, activo: true, rol: { select: { nombre: true } } },
    });
    if (!u || !u.activo) throw new UnauthorizedException();
    return { id: u.id, correo: u.correo, rol: u.rol.nombre as RolNombre };
  }
}
