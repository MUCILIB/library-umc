import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { AuthController } from '../controller/auth.controller';
import { AuthService } from '../service/auth.service';
import { UserService } from '../service/user.service';

vi.mock('../../audit/service/audit.service', () => ({
  default: {
    createLog: vi.fn().mockResolvedValue(undefined),
  },
}));

const app = express();
app.use(express.json());

const authController = new AuthController();
// Mocking Express Routes agar tidak perlu memanggil Router asli
app.post('/register', (req, res, next) => authController.register(req, res, next));
app.post('/login', (req, res, next) => authController.loginCredential(req, res, next));
app.delete('/users/:id', (req, res, next) => {
  req.user = { id: 'actor-super-admin-id', role: 'super_admin' } as any;
  return authController.deleteUser(req, res, next);
});

describe('AuthController Unit Tests', () => {
  beforeEach(() => {
    // Membersihkan spy/mock sebelumnya agar tiap test independen
    vi.restoreAllMocks();
  });

  describe('POST /register', () => {
    it('harus merespon 400 jika validasi Zod gagal (email salah & password pendek)', async () => {
      const response = await request(app).post('/register').send({
        email: 'invalid-email',
        name: '',
        password: '123'
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation Error');
      // Memastikan pesan error Zod menangkap field yang salah
      expect(response.body.data.fieldErrors).toHaveProperty('email');
      expect(response.body.data.fieldErrors).toHaveProperty('name');
      expect(response.body.data.fieldErrors).toHaveProperty('password');
    });

    it('harus merespon 201 dan return data jika berhasil lolos validasi', async () => {
      // Kita merekayasa (Mocking) Service agar TIDAK menyentuh database asli
      const mockResult = {
        id: "mock-id-123",
        name: "Test User",
        email: "test@example.com",
        role: "member",
        hasCompletedProfile: false,
      };
      const registerSpy = vi.spyOn(AuthService.prototype, 'registerWithCredentials')
        .mockResolvedValueOnce(mockResult as any);

      const response = await request(app).post('/register').send({
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123'
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Registrasi berhasil');
      expect(response.body.data).toEqual(mockResult);
      
      // Memastikan Service dipanggil 1x dengan argument yang benar
      expect(registerSpy).toHaveBeenCalledTimes(1);
      expect(registerSpy).toHaveBeenCalledWith('Test User', 'test@example.com', 'password123');
    });
  });

  describe('POST /login', () => {
    it('harus merespon 400 jika email tidak diisi saat login', async () => {
      const response = await request(app).post('/login').send({
        password: 'password123'
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.data.fieldErrors).toHaveProperty('email');
    });

    it('harus merespon 200 dengan token jika login berhasil', async () => {
      const mockResult = {
        user: { id: "123", email: "test@example.com" },
        token: "jwt-token-abcd"
      };

      const loginSpy = vi.spyOn(AuthService.prototype, 'loginWithCredentials')
        .mockResolvedValueOnce(mockResult as any);

      const response = await request(app).post('/login').send({
        email: 'test@example.com',
        password: 'password123'
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login berhasil');
      expect(response.body.data).toEqual(mockResult);

      expect(loginSpy).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  describe('DELETE /users/:id', () => {
    it('harus merespon 400 jika service mengembalikan error (misal menghapus diri sendiri)', async () => {
      vi.spyOn(UserService, 'deleteUser').mockResolvedValueOnce({
        success: false,
        message: 'Super admin tidak bisa menghapus akun dirinya sendiri',
        data: null
      });

      const response = await request(app).delete('/users/actor-super-admin-id');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Super admin tidak bisa menghapus akun dirinya sendiri');
    });

    it('harus merespon 200 dan mengembalikan user yang dihapus jika berhasil', async () => {
      const mockDeleted = {
        id: 'target-user-123',
        name: 'User To Delete',
        email: 'target@example.com',
        role: 'student',
        deletedAt: new Date().toISOString()
      };

      vi.spyOn(UserService, 'deleteUser').mockResolvedValueOnce({
        success: true,
        message: 'User berhasil dihapus',
        data: mockDeleted as any
      });

      const response = await request(app).delete('/users/target-user-123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User berhasil dihapus');
      expect(response.body.data).toEqual(mockDeleted);
    });
  });
});
