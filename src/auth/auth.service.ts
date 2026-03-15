import { Injectable, OnModuleInit } from '@nestjs/common';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs-extra';
import * as path from 'path';

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');
const JWT_SECRET = process.env.JWT_SECRET ?? 'hl7-jwt-secret-change-in-prod';

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256').toString('hex');
}

@Injectable()
export class AuthService implements OnModuleInit {
  async onModuleInit() {
    await this.ensureDefaultUser();
  }

  private async ensureDefaultUser() {
    if (await fs.pathExists(USERS_FILE)) return;
    await fs.ensureDir(path.dirname(USERS_FILE));
    const salt = crypto.randomBytes(16).toString('hex');
    await fs.writeJson(USERS_FILE, {
      users: [{ username: 'pharma', salt, hash: hashPassword('ivone', salt) }],
    }, { spaces: 2 });
  }

  async validateUser(username: string, password: string): Promise<string | null> {
    const { users } = await fs.readJson(USERS_FILE);
    const user = users.find((u: any) => u.username === username);
    if (!user) return null;
    if (hashPassword(password, user.salt) !== user.hash) return null;
    return jwt.sign({ sub: username }, JWT_SECRET, { expiresIn: '8h' });
  }

  verifyToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch {
      return null;
    }
  }
}
