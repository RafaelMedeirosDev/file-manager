import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { PreAuthJwtStrategy } from './pre-auth.strategy';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { env } from '../config/env';
import { UserRepository } from '../repositories/UserRepository';
import { MembershipRepository } from '../repositories/MembershipRepository';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: env.JWT_SECRET,
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController],
  // As duas strategies coexistem porque a PreAuthJwtStrategy se registra sob
  // o nome 'jwt-pre-auth'; sem esse nome ela sobrescreveria a 'jwt' e as
  // rotas de negocio passariam a aceitar token pre-auth.
  providers: [
    JwtStrategy,
    PreAuthJwtStrategy,
    AuthService,
    UserRepository,
    MembershipRepository,
  ],
  exports: [PassportModule, JwtModule, AuthService],
})
export class AuthModule {}
