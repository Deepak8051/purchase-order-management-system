import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import * as nodemailer from 'nodemailer';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';

import { User, UserRole } from './entities/user.entity';

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  organizationId?: number | null;
  dateOfBirth: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', {
        email: email.trim().toLowerCase(),
      })
      .getOne();
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
    });
  }

  async findAll(): Promise<Omit<User, 'passwordHash'>[]> {
    const users = await this.userRepository.find({
      order: { id: 'DESC' },
    });

    return users.map(({ passwordHash: _passwordHash, ...user }) => user);
  }

  async create(input: CreateUserInput): Promise<User> {
    const email = input.email.trim().toLowerCase();

    const existingUser = await this.findByEmail(email);

    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = this.userRepository.create({
      name: input.name.trim(),
      email,
      passwordHash,
      role: input.role,
      organizationId: input.organizationId ?? null,
      dateOfBirth: input.dateOfBirth,
      isActive: true,
    });

    const savedUser = await this.userRepository.save(user);

    const { passwordHash: _passwordHash, ...safeUser } = savedUser;

    return safeUser as User;
  }
  async searchUsers(searchKey?: string): Promise<User[]> {
    const query = this.userRepository
      .createQueryBuilder('user')
      .orderBy('user.id', 'DESC');

    if (searchKey?.trim()) {
      query.andWhere(
        `(
        LOWER(user.name) LIKE LOWER(:keyword)
        OR LOWER(user.email) LIKE LOWER(:keyword)
        OR LOWER(user.role) LIKE LOWER(:keyword)
      )`,
        { keyword: `%${searchKey.trim()}%` },
      );
    }

    return query.getMany();
  }

  async updateUser(id: number, dto: UpdateUserDto): Promise<Partial<User>> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.email) {
      const email = dto.email.trim().toLowerCase();
      const existing = await this.userRepository.findOne({
        where: { email },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException('Email is already in use');
      }

      user.email = email;
    }

    if (dto.name !== undefined) user.name = dto.name.trim();
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.organizationId !== undefined) {
      user.organizationId = dto.organizationId;
    }
    if (dto.dateOfBirth !== undefined) {
      user.dateOfBirth = dto.dateOfBirth || null;
    }

    const saved = await this.userRepository.save(user);
    const { passwordHash: _passwordHash, ...safeUser } = saved;
    return safeUser;
  }

  async updateStatus(id: number, isActive: boolean): Promise<Partial<User>> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isActive = isActive;

    const saved = await this.userRepository.save(user);
    const { passwordHash: _passwordHash, ...safeUser } = saved;
    return safeUser;
  }

  async changePassword(
    userId: number,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :userId', { userId })
      .getOne();

    if (!user) throw new NotFoundException('User not found');

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);

    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.userRepository.save(user);

    return { message: 'Password changed successfully' };
  }

  async requestPasswordReset(emailInput: string): Promise<{ message: string }> {
    const email = emailInput.trim().toLowerCase();
    const user = await this.userRepository.findOne({ where: { email } });

    // Do not reveal whether the account exists.
    const message =
      'If an active account matches that email, password reset instructions will be sent.';

    if (!user || !user.isActive) return { message };

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');

    await this.userRepository.update(user.id, {
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    const frontendUrl = process.env.FRONTEND_URL;
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT || 587);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM;

    if (!frontendUrl || !smtpHost || !smtpUser || !smtpPass || !smtpFrom) {
      throw new Error('Password-reset email configuration is incomplete');
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;

    await transporter.sendMail({
      from: smtpFrom,
      to: user.email,
      subject: 'POMS password reset',
      text: `Use this link to reset your POMS password. It expires in 15 minutes: ${resetUrl}`,
      html: `
      <p>A password reset was requested for your POMS account.</p>
      <p><a href="${resetUrl}">Reset password</a></p>
      <p>This link expires in 15 minutes. If you did not request this, ignore this email.</p>
    `,
    });

    return { message };
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordResetTokenHash')
      .addSelect('user.passwordResetExpiresAt')
      .where('user.passwordResetTokenHash = :tokenHash', { tokenHash })
      .getOne();

    if (
      !user ||
      !user.passwordResetExpiresAt ||
      user.passwordResetExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException('Reset link is invalid or expired');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;

    await this.userRepository.save(user);

    return { message: 'Password reset successfully' };
  }
}
