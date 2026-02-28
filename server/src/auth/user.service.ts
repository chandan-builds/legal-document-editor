import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';

const SALT_ROUNDS = 12;

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new user with hashed password
   */
  async create(data: {
    email: string;
    password: string;
    displayName: string;
    role: UserRole;
    organizationId?: string;
  }) {
    // Check if user already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        displayName: data.displayName,
        role: data.role,
        organizationId: data.organizationId,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        organizationId: true,
        isActive: true,
        createdAt: true,
      },
    });

    this.logger.log(`User created: ${user.email} (${user.role})`);
    return user;
  }

  /**
   * Find user by email (includes password hash for auth validation)
   */
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Find user by ID (excludes password hash)
   */
  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        organizationId: true,
        avatarUrl: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Validate password against stored hash
   */
  async validatePassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  /**
   * Search users by email or display name
   */
  async searchUsers(query: string) {
    if (!query || query.length < 2) {
      return [];
    }
    return this.prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: query, mode: 'insensitive' } },
          { displayName: { contains: query, mode: 'insensitive' } },
        ],
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
      },
      take: 10,
    });
  }
}
