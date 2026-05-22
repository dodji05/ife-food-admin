# Admin Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le flux OTP admin par email + bcrypt password avec tokens en cookies HttpOnly, sans toucher au flux OTP mobile.

**Architecture:** Nouveaux endpoints `/auth/admin/*` dans le backend NestJS, coexistant avec `/auth/otp/*` intact. Tokens transmis via cookies `HttpOnly; Secure; SameSite=Strict`. Frontend migré de localStorage vers cookie transparent.

**Tech Stack:** NestJS + Prisma + bcrypt + cookie-parser + passport-jwt | React 18 + TypeScript + Zustand + Axios

---

## Fichiers touchés

### Backend (`/Users/gildasdodji/Desktop/Mouka/IFE FOOD/BACKEND/`)

| Action | Fichier | Rôle |
|---|---|---|
| Installer | `package.json` | cookie-parser + @types/cookie-parser |
| Modifier | `src/main.ts` | Activer cookie-parser middleware |
| Modifier | `src/auth/auth.module.ts` | Enregistrer AdminAuthController + AdminAuthService |
| Modifier | `src/auth/strategies/jwt.strategy.ts` | Lire JWT depuis cookie OU header Bearer |
| Créer | `src/auth/dto/admin-auth.dto.ts` | DTOs validés (login, reset) |
| Créer | `src/common/decorators/admin-level.decorator.ts` | @AdminLevel(...levels) |
| Créer | `src/common/guards/admin-level.guard.ts` | AdminLevelGuard |
| Créer | `src/auth/admin-auth.service.ts` | Logique login/refresh/logout/reset |
| Créer | `src/auth/admin-auth.controller.ts` | Endpoints HTTP |
| Créer | `prisma/seed-admin.ts` | Seed premier compte SUPER_ADMIN |

### Frontend (`/Users/gildasdodji/Desktop/Mouka/IFE FOOD/ADMIN/`)

| Action | Fichier | Rôle |
|---|---|---|
| Créer | `src/hooks/useAdminLevel.ts` | Niveau admin courant + helper `can()` |
| Modifier | `src/store/auth.ts` | Supprimer localStorage token, garder user en mémoire |
| Modifier | `src/services/api.ts` | withCredentials + intercepteur refresh avec queue |
| Modifier | `src/pages/auth/Login.tsx` | Form email+password + flow reset |

---

## Task 1 — Installer cookie-parser (Backend)

**Fichiers :** `package.json`, `src/main.ts`

- [ ] **Installer les packages**

```bash
cd "/Users/gildasdodji/Desktop/Mouka/IFE FOOD/BACKEND"
npm install cookie-parser
npm install --save-dev @types/cookie-parser
```

Résultat attendu : `added N packages` sans erreur.

- [ ] **Activer cookie-parser dans main.ts**

Dans `src/main.ts`, ajouter l'import et l'appel `app.use(cookieParser())` juste après `app.use(helmet())` :

```typescript
// Ajouter en haut du fichier (après les imports existants) :
import * as cookieParser from 'cookie-parser';

// Dans la fonction bootstrap(), après app.use(helmet()) :
app.use(cookieParser());
```

Le bloc helmet + cookieParser doit ressembler à :

```typescript
app.use(helmet());
app.use(cookieParser());
const frontendUrl = configService.get<string>('FRONTEND_URL');
```

- [ ] **Vérifier que le serveur démarre**

```bash
cd "/Users/gildasdodji/Desktop/Mouka/IFE FOOD/BACKEND"
npm run start:dev
```

Résultat attendu : `🚀 ifè FOOD API running on http://localhost:3000/api/v1` sans erreur de compilation.

- [ ] **Arrêter le serveur (Ctrl+C) et committer**

```bash
cd "/Users/gildasdodji/Desktop/Mouka/IFE FOOD/BACKEND"
git add package.json package-lock.json src/main.ts
git commit -m "chore: install cookie-parser middleware for admin cookie auth"
```

---

## Task 2 — Modifier JwtStrategy pour lire depuis cookie + header (Backend)

**Fichiers :** `src/auth/strategies/jwt.strategy.ts`

- [ ] **Remplacer le contenu de jwt.strategy.ts**

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // 1. Cookie admin (HttpOnly) — priorité
        (req: Request) => req?.cookies?.accessToken ?? null,
        // 2. Header Bearer — mobile apps et outils (Swagger, curl)
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      passReqToCallback: false,
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string; role: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        professional: { select: { id: true, status: true } },
        driver:       { select: { id: true, status: true } },
        admin:        { select: { id: true, level: true } },
      },
    });
    if (!user || user.status === 'BANNED') throw new UnauthorizedException();
    return user;
  }
}
```

Note : on ajoute `admin: { select: { id: true, level: true } }` dans l'include pour que `AdminLevelGuard` puisse lire le niveau sans requête supplémentaire.

- [ ] **Vérifier que le serveur compile**

```bash
cd "/Users/gildasdodji/Desktop/Mouka/IFE FOOD/BACKEND"
npm run start:dev
```

Résultat attendu : démarrage sans erreur TypeScript.

- [ ] **Committer**

```bash
git add src/auth/strategies/jwt.strategy.ts
git commit -m "feat(auth): jwt strategy reads token from cookie or Bearer header"
```

---

## Task 3 — DTOs de l'authentification admin (Backend)

**Fichiers :** `src/auth/dto/admin-auth.dto.ts`

- [ ] **Créer le fichier de DTOs**

```typescript
import { IsEmail, IsString, MinLength, Length } from 'class-validator';

export class AdminLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

export class AdminRequestResetDto {
  @IsEmail()
  email: string;
}

export class AdminConfirmResetDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 6)
  code: string;

  @IsString()
  sessionId: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}
```

- [ ] **Vérifier la compilation**

```bash
cd "/Users/gildasdodji/Desktop/Mouka/IFE FOOD/BACKEND"
npx tsc --noEmit
```

Résultat attendu : aucune erreur.

- [ ] **Committer**

```bash
git add src/auth/dto/admin-auth.dto.ts
git commit -m "feat(auth): add admin auth DTOs (login, request-reset, confirm-reset)"
```

---

## Task 4 — Décorateur @AdminLevel + AdminLevelGuard (Backend)

**Fichiers :**
- Créer : `src/common/decorators/admin-level.decorator.ts`
- Créer : `src/common/guards/admin-level.guard.ts`

- [ ] **Créer le décorateur admin-level.decorator.ts**

```typescript
import { SetMetadata } from '@nestjs/common';

export const ADMIN_LEVEL_KEY = 'adminLevel';
export const AdminLevel = (...levels: string[]) =>
  SetMetadata(ADMIN_LEVEL_KEY, levels);
```

- [ ] **Créer le guard admin-level.guard.ts**

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ADMIN_LEVEL_KEY } from '../decorators/admin-level.decorator';

@Injectable()
export class AdminLevelGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredLevels = this.reflector.getAllAndOverride<string[]>(ADMIN_LEVEL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredLevels || requiredLevels.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    const level: string = user?.admin?.level;

    if (!level || !requiredLevels.includes(level)) {
      throw new ForbiddenException('Niveau admin insuffisant');
    }
    return true;
  }
}
```

- [ ] **Vérifier la compilation**

```bash
cd "/Users/gildasdodji/Desktop/Mouka/IFE FOOD/BACKEND"
npx tsc --noEmit
```

- [ ] **Committer**

```bash
git add src/common/decorators/admin-level.decorator.ts src/common/guards/admin-level.guard.ts
git commit -m "feat(auth): add @AdminLevel decorator and AdminLevelGuard"
```

---

## Task 5 — AdminAuthService (Backend)

**Fichiers :** `src/auth/admin-auth.service.ts`

- [ ] **Créer admin-auth.service.ts**

```typescript
import {
  Injectable, UnauthorizedException, BadRequestException, NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { OtpService } from './otp.service';
import { AdminLoginDto, AdminRequestResetDto, AdminConfirmResetDto } from './dto/admin-auth.dto';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
};

@Injectable()
export class AdminAuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private otpService: OtpService,
  ) {}

  async login(dto: AdminLoginDto, res: Response) {
    // Message générique identique pour email inconnu ET mauvais password (anti-énumération)
    const invalidError = new UnauthorizedException('Identifiants invalides');

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { admin: true },
    });
    if (!user || user.role !== 'ADMIN') throw invalidError;
    if (user.status !== 'ACTIVE') throw new UnauthorizedException('Compte désactivé');
    if (!user.pinHash) throw invalidError;

    const passwordValid = await bcrypt.compare(dto.password, user.pinHash);
    if (!passwordValid) throw invalidError;

    this.setTokenCookies(res, user.id, user.role);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      firstName: user.firstName,
      role: user.role,
      admin: user.admin ? { level: user.admin.level } : null,
    };
  }

  async refresh(userId: string, res: Response) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException();
    this.setTokenCookies(res, user.id, user.role);
    return { ok: true };
  }

  logout(res: Response) {
    res.clearCookie('accessToken', { ...COOKIE_OPTIONS });
    res.clearCookie('refreshToken', { ...COOKIE_OPTIONS });
    return { ok: true };
  }

  async requestReset(dto: AdminRequestResetDto) {
    // Réponse identique que l'email existe ou non (anti-énumération)
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (user && user.role === 'ADMIN' && user.status === 'ACTIVE' && user.phone) {
      const channel = this.config.get('OTP_CHANNEL', 'SMS') as 'SMS' | 'WHATSAPP';
      const { sessionId } = await this.otpService.createOtpSession(user.phone, channel);
      return { ok: true, sessionId };
    }
    // Retourne un faux sessionId pour ne pas révéler l'existence du compte
    return { ok: true, sessionId: 'not-applicable' };
  }

  async confirmReset(dto: AdminConfirmResetDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || user.role !== 'ADMIN' || !user.phone) {
      throw new BadRequestException('Réinitialisation impossible');
    }

    await this.otpService.verifyOtp(user.phone, dto.code, dto.sessionId);

    if (dto.newPassword.length < 8) {
      throw new BadRequestException('Le mot de passe doit contenir au moins 8 caractères');
    }

    const hash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({ where: { id: user.id }, data: { pinHash: hash } });
    return { ok: true };
  }

  getMe(user: any) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      firstName: user.firstName,
      role: user.role,
      admin: user.admin ? { level: user.admin.level } : null,
    };
  }

  private setTokenCookies(res: Response, userId: string, role: string) {
    const payload = { sub: userId, role };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    res.cookie('accessToken', accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refreshToken', refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
      path: '/api/v1/auth/admin/refresh',
    });
  }
}
```

- [ ] **Vérifier la compilation**

```bash
cd "/Users/gildasdodji/Desktop/Mouka/IFE FOOD/BACKEND"
npx tsc --noEmit
```

- [ ] **Committer**

```bash
git add src/auth/admin-auth.service.ts
git commit -m "feat(auth): add AdminAuthService (login, refresh, logout, reset)"
```

---

## Task 6 — AdminAuthController (Backend)

**Fichiers :** `src/auth/admin-auth.controller.ts`

- [ ] **Créer admin-auth.controller.ts**

```typescript
import {
  Controller, Post, Get, Body, Res, Req, UseGuards, HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto, AdminRequestResetDto, AdminConfirmResetDto } from './dto/admin-auth.dto';

@ApiTags('admin-auth')
@Controller('auth/admin')
export class AdminAuthController {
  constructor(private adminAuthService: AdminAuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ summary: 'Admin login via email + password' })
  async login(
    @Body() dto: AdminLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.adminAuthService.login(dto, res);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Refresh admin access token via cookie' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Lit le refreshToken depuis le cookie (path restreint)
    const token = req.cookies?.refreshToken;
    if (!token) {
      const { UnauthorizedException } = await import('@nestjs/common');
      throw new UnauthorizedException('Refresh token manquant');
    }
    const { ConfigService } = await import('@nestjs/config');
    const { JwtService } = await import('@nestjs/jwt');
    // Vérification manuelle du refresh token (secret différent)
    const configService = req.app.get ? null : null; // handled in service
    return this.adminAuthService.refreshFromCookie(token, res);
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Admin logout — clear cookies' })
  logout(@Res({ passthrough: true }) res: Response) {
    return this.adminAuthService.logout(res);
  }

  @Public()
  @Post('request-reset')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ summary: 'Request password reset via OTP SMS' })
  requestReset(@Body() dto: AdminRequestResetDto) {
    return this.adminAuthService.requestReset(dto);
  }

  @Public()
  @Post('confirm-reset')
  @HttpCode(200)
  @ApiOperation({ summary: 'Confirm password reset with OTP + new password' })
  confirmReset(@Body() dto: AdminConfirmResetDto) {
    return this.adminAuthService.confirmReset(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get current admin profile' })
  me(@CurrentUser() user: any) {
    return this.adminAuthService.getMe(user);
  }
}
```

Le controller utilise `passthrough: true` sur `@Res` pour que NestJS continue à sérialiser la réponse normalement, et que les intercepteurs (TransformInterceptor) s'appliquent.

Note : la méthode `refresh` nécessite une mise à jour de `AdminAuthService` pour ajouter `refreshFromCookie`. Voir l'étape suivante.

- [ ] **Ajouter `refreshFromCookie` dans admin-auth.service.ts**

Dans `src/auth/admin-auth.service.ts`, remplacer la méthode `refresh` par :

```typescript
async refreshFromCookie(refreshToken: string, res: Response) {
  let payload: { sub: string; role: string };
  try {
    payload = this.jwtService.verify(refreshToken, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
    });
  } catch {
    throw new UnauthorizedException('Refresh token invalide ou expiré');
  }

  const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException();

  this.setTokenCookies(res, user.id, user.role);
  return { ok: true };
}
```

Et supprimer l'ancienne méthode `refresh(userId, res)` qui n'est plus appelée.

- [ ] **Simplifier le controller refresh** (remplacer la méthode `refresh` dans le controller par la version propre) :

```typescript
@Public()
@Post('refresh')
@HttpCode(200)
@ApiOperation({ summary: 'Refresh admin access token via cookie' })
async refresh(
  @Req() req: Request,
  @Res({ passthrough: true }) res: Response,
) {
  const token = req.cookies?.refreshToken;
  if (!token) throw new UnauthorizedException('Refresh token manquant');
  return this.adminAuthService.refreshFromCookie(token, res);
}
```

Ajouter `UnauthorizedException` aux imports du controller :
```typescript
import { Controller, Post, Get, Body, Res, Req, UseGuards, HttpCode, UnauthorizedException } from '@nestjs/common';
```

- [ ] **Vérifier la compilation**

```bash
cd "/Users/gildasdodji/Desktop/Mouka/IFE FOOD/BACKEND"
npx tsc --noEmit
```

- [ ] **Committer**

```bash
git add src/auth/admin-auth.controller.ts src/auth/admin-auth.service.ts
git commit -m "feat(auth): add AdminAuthController with login/refresh/logout/reset/me endpoints"
```

---

## Task 7 — Enregistrer AdminAuthController dans AuthModule (Backend)

**Fichiers :** `src/auth/auth.module.ts`

- [ ] **Modifier auth.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET', 'change_me_in_production_min_32_chars'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '7d') },
      }),
    }),
  ],
  controllers: [AuthController, AdminAuthController],
  providers: [AuthService, OtpService, JwtStrategy, AdminAuthService],
  exports: [AuthService, OtpService],
})
export class AuthModule {}
```

- [ ] **Démarrer le serveur et vérifier que les routes s'enregistrent**

```bash
cd "/Users/gildasdodji/Desktop/Mouka/IFE FOOD/BACKEND"
npm run start:dev 2>&1 | grep -E "POST|GET.*admin"
```

Résultat attendu : lignes montrant `POST /api/v1/auth/admin/login`, `POST /api/v1/auth/admin/refresh`, etc.

- [ ] **Tester le login manuellement (endpoint existant, pas encore de compte)**

```bash
curl -s -X POST http://localhost:3000/api/v1/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrongpass"}' | jq .
```

Résultat attendu : `{"statusCode":401,"message":"Identifiants invalides"}` (pas de 500).

- [ ] **Committer**

```bash
git add src/auth/auth.module.ts
git commit -m "feat(auth): register AdminAuthController and AdminAuthService in AuthModule"
```

---

## Task 8 — Seed premier compte SUPER_ADMIN (Backend)

**Fichiers :** `prisma/seed-admin.ts`

- [ ] **Créer prisma/seed-admin.ts**

```typescript
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const phone = process.env.SEED_ADMIN_PHONE;

  if (!email || !password || !phone) {
    throw new Error(
      'Variables manquantes : SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_PHONE',
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin ${email} existe déjà. Mise à jour du mot de passe.`);
    const hash = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { email }, data: { pinHash: hash } });
    console.log('Mot de passe mis à jour.');
    return;
  }

  const hash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      phone,
      phoneCountry: phone.substring(0, 4),
      email,
      name: 'Admin',
      firstName: 'Super',
      role: 'ADMIN',
      status: 'ACTIVE',
      pinHash: hash,
      admin: {
        create: { level: 'SUPER_ADMIN' },
      },
    },
  });

  console.log(`✅ Compte SUPER_ADMIN créé : ${user.email} (id: ${user.id})`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

- [ ] **Ajouter le script dans package.json**

Dans `package.json`, ajouter dans `"scripts"` :

```json
"seed:admin": "ts-node -r tsconfig-paths/register prisma/seed-admin.ts"
```

- [ ] **Tester le seed (remplacer les valeurs)**

```bash
cd "/Users/gildasdodji/Desktop/Mouka/IFE FOOD/BACKEND"
SEED_ADMIN_EMAIL=admin@ifefood.com \
SEED_ADMIN_PASSWORD=AdminPass123 \
SEED_ADMIN_PHONE=+22991000001 \
npm run seed:admin
```

Résultat attendu : `✅ Compte SUPER_ADMIN créé : admin@ifefood.com (id: ...)`

- [ ] **Tester le login avec ce compte**

```bash
curl -s -c /tmp/admin-cookies.txt -X POST http://localhost:3000/api/v1/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ifefood.com","password":"AdminPass123"}' | jq .
```

Résultat attendu : `{"data":{"id":"...","email":"admin@ifefood.com","role":"ADMIN","admin":{"level":"SUPER_ADMIN"}}}`

- [ ] **Tester le endpoint /me avec le cookie**

```bash
curl -s -b /tmp/admin-cookies.txt http://localhost:3000/api/v1/auth/admin/me | jq .
```

Résultat attendu : le profil admin.

- [ ] **Committer**

```bash
git add prisma/seed-admin.ts package.json
git commit -m "feat(auth): add seed-admin script for first SUPER_ADMIN account creation"
```

---

## Task 9 — Hook useAdminLevel (Frontend)

**Fichiers :** `src/hooks/useAdminLevel.ts`

- [ ] **Créer src/hooks/useAdminLevel.ts**

```typescript
import { useAuthStore } from '../store/auth'

type AdminLevel = 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'ANALYST'

const PERMISSIONS: Record<string, AdminLevel[]> = {
  'validate-users':      ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'],
  'suspend-users':       ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'],
  'manage-promo':        ['SUPER_ADMIN', 'ADMIN'],
  'manage-commission':   ['SUPER_ADMIN', 'ADMIN'],
  'manage-gateways':     ['SUPER_ADMIN', 'ADMIN'],
  'maintenance':         ['SUPER_ADMIN'],
  'manage-admins':       ['SUPER_ADMIN'],
  'view-analytics':      ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'ANALYST'],
}

export function useAdminLevel() {
  const user = useAuthStore((s) => s.user)
  const level = (user?.admin?.level ?? null) as AdminLevel | null

  const can = (action: keyof typeof PERMISSIONS): boolean => {
    if (!level) return false
    return PERMISSIONS[action]?.includes(level) ?? false
  }

  return { level, can }
}
```

- [ ] **Committer**

```bash
cd "/Users/gildasdodji/Desktop/Mouka/IFE FOOD/ADMIN"
git add src/hooks/useAdminLevel.ts
git commit -m "feat(auth): add useAdminLevel hook with permission helper"
```

---

## Task 10 — Migrer auth.ts (Frontend)

**Fichiers :** `src/store/auth.ts`

- [ ] **Remplacer le contenu de src/store/auth.ts**

```typescript
import { create } from 'zustand'
import api from '../services/api'

interface AdminUser {
  id: string
  phone?: string
  email?: string
  name?: string
  firstName?: string
  role: string
  admin?: { level: string }
}

interface AuthStore {
  user: AdminUser | null
  initializing: boolean
  setUser: (user: AdminUser) => void
  logout: () => Promise<void>
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthStore>()((set) => ({
  user: null,
  initializing: true,

  setUser: (user) => set({ user }),

  logout: async () => {
    try {
      await api.post('/auth/admin/logout')
    } catch {
      // Ignorer les erreurs réseau au logout
    }
    set({ user: null })
  },

  initialize: async () => {
    try {
      const user = await api.get<AdminUser>('/auth/admin/me')
      set({ user, initializing: false })
    } catch {
      set({ user: null, initializing: false })
    }
  },
}))
```

- [ ] **Mettre à jour App.tsx pour appeler initialize() au démarrage**

Dans `src/App.tsx`, modifier `ProtectedRoute` pour appeler `initialize()` au montage :

```typescript
import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import { Layout } from './components/layout/Layout'
import { Login } from './pages/auth/Login'
import { Dashboard } from './pages/dashboard/Dashboard'
import { Orders } from './pages/orders/Orders'
import { Users } from './pages/users/Users'
import { Professionals } from './pages/professionals/Professionals'
import { Drivers } from './pages/drivers/Drivers'
import { Catalogue } from './pages/catalogue/Catalogue'
import { Payments } from './pages/payments/Payments'
import { Content } from './pages/content/Content'
import { Settings } from './pages/settings/Settings'
import { Analytics } from './pages/analytics/Analytics'

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, initializing, initialize } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [])

  if (initializing) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full animate-spin"/>
      </div>
    )
  }

  if (!user || user.role !== 'ADMIN') return <Navigate to="/login" replace/>
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login/>}/>
      <Route path="/" element={<ProtectedRoute><Layout/></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace/>}/>
        <Route path="dashboard"     element={<Dashboard/>}/>
        <Route path="orders"        element={<Orders/>}/>
        <Route path="analytics"     element={<Analytics/>}/>
        <Route path="users"         element={<Users/>}/>
        <Route path="professionals" element={<Professionals/>}/>
        <Route path="drivers"       element={<Drivers/>}/>
        <Route path="catalogue"     element={<Catalogue/>}/>
        <Route path="payments"      element={<Payments/>}/>
        <Route path="content"       element={<Content/>}/>
        <Route path="settings"      element={<Settings/>}/>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace/>}/>
    </Routes>
  )
}
```

- [ ] **Committer**

```bash
cd "/Users/gildasdodji/Desktop/Mouka/IFE FOOD/ADMIN"
git add src/store/auth.ts src/App.tsx
git commit -m "feat(auth): migrate auth store from localStorage to cookie-based session"
```

---

## Task 11 — Mettre à jour api.ts (Frontend)

**Fichiers :** `src/services/api.ts`

- [ ] **Remplacer le contenu de src/services/api.ts**

```typescript
import axios, { AxiosRequestConfig } from 'axios'
import { useAuthStore } from '../store/auth'

const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : '/api/v1'

if (!import.meta.env.VITE_API_URL && import.meta.env.PROD) {
  console.error('[API] VITE_API_URL must be defined in production')
}

const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // Envoie les cookies HttpOnly automatiquement
})

const ERROR_MESSAGES: Record<number, string> = {
  400: 'Requête invalide',
  401: 'Session expirée, veuillez vous reconnecter',
  403: 'Accès refusé',
  404: 'Ressource introuvable',
  422: 'Données invalides',
  429: 'Trop de requêtes, veuillez patienter',
  500: 'Erreur serveur, réessayez plus tard',
  503: 'Service temporairement indisponible',
}

// Queue de requêtes en attente pendant un refresh en cours
let _isRefreshing = false
let _pendingQueue: Array<{ resolve: () => void; reject: (e: unknown) => void }> = []

function processPendingQueue(error: unknown) {
  _pendingQueue.forEach(({ resolve, reject }) => error ? reject(error) : resolve())
  _pendingQueue = []
}

api.interceptors.response.use(
  (res) => res.data,
  async (err) => {
    const status: number = err.response?.status
    const originalRequest: AxiosRequestConfig & { _retry?: boolean } = err.config

    if (
      status === 401 &&
      !originalRequest._retry &&
      window.location.pathname !== '/login' &&
      originalRequest.url !== '/auth/admin/refresh'
    ) {
      if (_isRefreshing) {
        // Mettre en queue et attendre que le refresh en cours se termine
        return new Promise((resolve, reject) => {
          _pendingQueue.push({
            resolve: () => resolve(api(originalRequest)),
            reject,
          })
        })
      }

      originalRequest._retry = true
      _isRefreshing = true

      try {
        await api.post('/auth/admin/refresh')
        processPendingQueue(null)
        return api(originalRequest)
      } catch (refreshError) {
        processPendingQueue(refreshError)
        useAuthStore.getState().logout()
        window.location.replace('/login')
        return Promise.reject(refreshError)
      } finally {
        _isRefreshing = false
      }
    }

    const message = ERROR_MESSAGES[status] ?? 'Une erreur est survenue'
    return Promise.reject(new Error(message))
  }
)

export default api
```

- [ ] **Committer**

```bash
cd "/Users/gildasdodji/Desktop/Mouka/IFE FOOD/ADMIN"
git add src/services/api.ts
git commit -m "feat(auth): api client uses cookies (withCredentials) + refresh token queue"
```

---

## Task 12 — Remplacer Login.tsx (Frontend)

**Fichiers :** `src/pages/auth/Login.tsx`

- [ ] **Remplacer le contenu de src/pages/auth/Login.tsx**

```typescript
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'
import api from '../../services/api'
import { Eye, EyeOff, Mail, Lock, Shield, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

type Step = 'login' | 'reset-request' | 'reset-confirm'

export const Login: React.FC = () => {
  const [step, setStep] = useState<Step>('login')

  // Login
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Reset
  const [resetEmail, setResetEmail] = useState('')
  const [resetSessionId, setResetSessionId] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)

  const [loading, setLoading] = useState(false)
  const { setUser } = useAuthStore()
  const nav = useNavigate()

  const handleLogin = async () => {
    if (!email || !password) return
    setLoading(true)
    try {
      const user: any = await api.post('/auth/admin/login', { email, password })
      setUser(user)
      nav('/dashboard')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResetRequest = async () => {
    if (!resetEmail) return
    setLoading(true)
    try {
      const res: any = await api.post('/auth/admin/request-reset', { email: resetEmail })
      setResetSessionId(res.sessionId ?? '')
      setStep('reset-confirm')
      toast.success('Code OTP envoyé sur votre téléphone')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResetConfirm = async () => {
    if (!resetCode || !newPassword) return
    setLoading(true)
    try {
      await api.post('/auth/admin/confirm-reset', {
        email: resetEmail,
        sessionId: resetSessionId,
        code: resetCode,
        newPassword,
      })
      toast.success('Mot de passe réinitialisé ! Connectez-vous.')
      setStep('login')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-brand-green rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-brand-green/30">
            <span className="text-white font-black text-xl">ifè</span>
          </div>
          <h1 className="text-2xl font-black text-slate-100">ifè FOOD Admin</h1>
          <p className="text-slate-400 text-sm font-semibold">
            {step === 'login' ? 'Tableau de bord administrateur' : 'Réinitialisation du mot de passe'}
          </p>
        </div>

        <div className="card p-6 space-y-4">

          {/* ── Step: Login ── */}
          {step === 'login' && <>
            <div>
              <label className="label">Adresse e-mail</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                <input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  type="email"
                  className="input pl-9"
                  placeholder="admin@ifefood.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="label">Mot de passe</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                <input
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  type={showPassword ? 'text' : 'password'}
                  className="input pl-9 pr-10"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            <button
              onClick={handleLogin}
              disabled={loading || !email || !password}
              className="btn-primary w-full justify-center py-3"
            >
              {loading ? <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"/> : 'Se connecter'}
            </button>

            <button
              onClick={() => { setResetEmail(email); setStep('reset-request') }}
              className="text-sm text-slate-400 hover:text-slate-200 w-full text-center font-semibold transition-colors"
            >
              Mot de passe oublié ?
            </button>
          </>}

          {/* ── Step: Reset request ── */}
          {step === 'reset-request' && <>
            <button onClick={() => setStep('login')} className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 font-semibold">
              <ArrowLeft size={14}/> Retour
            </button>
            <div>
              <label className="label">Adresse e-mail admin</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                <input
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  type="email"
                  className="input pl-9"
                  placeholder="admin@ifefood.com"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1.5 font-medium">
                Un code OTP sera envoyé au numéro associé à ce compte.
              </p>
            </div>
            <button
              onClick={handleResetRequest}
              disabled={loading || !resetEmail}
              className="btn-primary w-full justify-center py-3"
            >
              {loading ? '…' : 'Envoyer le code OTP'}
            </button>
          </>}

          {/* ── Step: Reset confirm ── */}
          {step === 'reset-confirm' && <>
            <button onClick={() => setStep('reset-request')} className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 font-semibold">
              <ArrowLeft size={14}/> Retour
            </button>
            <div>
              <label className="label">Code OTP (6 chiffres)</label>
              <input
                value={resetCode}
                onChange={e => setResetCode(e.target.value)}
                maxLength={6}
                className="input text-center text-xl font-black tracking-widest"
                placeholder="000000"
              />
            </div>
            <div>
              <label className="label">Nouveau mot de passe</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                <input
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  type={showNewPassword ? 'text' : 'password'}
                  className="input pl-9 pr-10"
                  placeholder="Min. 8 caractères"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showNewPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>
            <button
              onClick={handleResetConfirm}
              disabled={loading || resetCode.length !== 6 || newPassword.length < 8}
              className="btn-primary w-full justify-center py-3"
            >
              {loading ? '…' : 'Réinitialiser le mot de passe'}
            </button>
          </>}

        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-slate-600 font-semibold">
          <Shield size={12}/> Connexion sécurisée · Ets SWK FAKEYE
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Vérifier que le build TypeScript passe**

```bash
cd "/Users/gildasdodji/Desktop/Mouka/IFE FOOD/ADMIN"
npx tsc --noEmit
```

- [ ] **Committer**

```bash
git add src/pages/auth/Login.tsx
git commit -m "feat(auth): replace OTP login with email+password form and password reset flow"
```

---

## Task 13 — Test end-to-end du flow complet

- [ ] **Démarrer le backend**

```bash
cd "/Users/gildasdodji/Desktop/Mouka/IFE FOOD/BACKEND"
npm run start:dev
```

- [ ] **Démarrer le frontend**

```bash
cd "/Users/gildasdodji/Desktop/Mouka/IFE FOOD/ADMIN"
npm run dev
```

- [ ] **Tester le flow login**
  1. Ouvrir `http://localhost:5173`
  2. Saisir `admin@ifefood.com` / `AdminPass123`
  3. Vérifier redirection vers `/dashboard`
  4. Vérifier dans DevTools → Application → Cookies : présence de `accessToken` avec `HttpOnly` coché
  5. Vérifier absence de token dans `localStorage`

- [ ] **Tester la persistance de session**
  1. Depuis le dashboard, recharger la page (F5)
  2. Vérifier que la session est restaurée sans passer par `/login`

- [ ] **Tester le logout**
  1. Cliquer "Déconnexion" dans la sidebar
  2. Vérifier redirection vers `/login`
  3. Vérifier dans DevTools → Cookies : `accessToken` supprimé

- [ ] **Tester le refresh automatique**
  1. Dans DevTools → Application → Cookies, modifier manuellement la valeur de `accessToken` pour la corrompre
  2. Depuis le dashboard, déclencher une requête (naviguer vers une page)
  3. Vérifier que l'intercepteur tente `/auth/admin/refresh` — si le `refreshToken` est encore valide, la session est restaurée. Sinon, redirect `/login`.

- [ ] **Committer final**

```bash
cd "/Users/gildasdodji/Desktop/Mouka/IFE FOOD/ADMIN"
git add -A
git commit -m "feat(auth): sprint 1 authentication complete — email+password, cookie-based tokens, refresh queue"
```

---

## Checklist de non-régression

- [ ] Le flow OTP mobile (`POST /auth/otp/send`, `POST /auth/otp/verify`) est intact — vérifier via Swagger ou curl que ces endpoints répondent normalement
- [ ] Le `JwtAuthGuard` existant fonctionne toujours pour les apps mobiles (header Bearer)
- [ ] Les routes admin existantes (`/admin/dashboard`, `/admin/orders`, etc.) fonctionnent après connexion admin
- [ ] Aucun token dans `localStorage` après connexion
- [ ] Cookies `HttpOnly` présents dans DevTools après connexion

---

## Variables d'environnement à ajouter sur le VPS

```
SEED_ADMIN_EMAIL=admin@ifefood.com
SEED_ADMIN_PASSWORD=<mot_de_passe_fort>
SEED_ADMIN_PHONE=+229XXXXXXXX
```

Lancer une seule fois après déploiement :
```bash
npm run seed:admin
```
