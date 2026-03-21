import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcrypt';
import { LoginDTO } from '../shared/dto/auth/LoginDTO';
import { ErrorMessagesEnum } from '../shared/enums/ErrorMessagesEnum';
import { UserRepository } from '../repositories/UserRepository';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userRepository: UserRepository,
  ) {}

  async login(input: LoginDTO): Promise<{
    accessToken: string;
    user: { id: string; name: string; email: string; role: string };
  }> {
    const user = await this.userRepository.findByEmail(input.email);
    const isPasswordValid = user && !user.deletedAt
      ? await compare(input.password, user.password)
      : false;

    if (!user || user.deletedAt || !isPasswordValid) {
      throw new UnauthorizedException(ErrorMessagesEnum.INVALID_EMAIL_OR_PASSWORD);
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}
