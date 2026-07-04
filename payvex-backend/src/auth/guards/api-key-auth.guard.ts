import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service/prisma.service';

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  private extractApiKey(req: any) {
    const headerKey = req.headers['x-api-key'];

    if (typeof headerKey === 'string' && headerKey.trim()) {
      return headerKey.trim();
    }

    const authHeader = req.headers.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      if (token.startsWith('px_live_')) {
        return token;
      }
    }

    return null;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const key = this.extractApiKey(req);

    if (!key) {
      throw new UnauthorizedException('Api Key não informada.');
    }

    const apiKey = await this.prisma.apiKey.findFirst({
      where: {
        key,
        isActive: true,
      },
      include: {
        filial: {
          select: {
            id: true,
            name: true,
            companyId: true,
          },
        },
      },
    });

    if (!apiKey) {
      throw new UnauthorizedException('Api Key inválida ou inativa.');
    }

    req.apiKey = apiKey;
    req.user = {
      authType: 'api_key',
      apiKeyId: apiKey.id,
      companyId: apiKey.filial.companyId,
      filialId: apiKey.filialId,
      filialName: apiKey.filial.name,
    };

    return true;
  }
}
