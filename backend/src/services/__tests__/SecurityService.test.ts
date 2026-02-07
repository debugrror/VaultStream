import { SecurityService } from '../SecurityService';

describe('SecurityService', () => {
  describe('generateSignedUrl', () => {
    it('should generate a valid signed URL', () => {
      const videoId = 'test-video-123';
      const resource = 'master.m3u8';
      const expiresIn = 3600;

      const token = SecurityService.generateSignedUrl(videoId, resource, undefined, expiresIn);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should include userId in payload when provided', () => {
      const videoId = 'test-video-123';
      const resource = 'master.m3u8';
      const userId = 'user-456';

      const token = SecurityService.generateSignedUrl(videoId, resource, userId);
      const payload = SecurityService.validateSignedUrl(token);

      expect(payload.userId).toBe(userId);
      expect(payload.resource).toBe(resource);
    });
  });

  describe('validateSignedUrl', () => {
    it('should validate a correct token', () => {
      const videoId = 'test-video-123';
      const resource = 'master.m3u8';
      const token = SecurityService.generateSignedUrl(videoId, resource);

      const payload = SecurityService.validateSignedUrl(token);

      expect(payload.videoId).toBe(videoId);
      expect(payload.resource).toBe(resource);
    });

    it('should reject tampered token', () => {
      const videoId = 'test-video-123';
      const resource = 'master.m3u8';
      const token = SecurityService.generateSignedUrl(videoId, resource);
      const tamperedToken = token.slice(0, -5) + 'xxxxx';

      expect(() => {
        SecurityService.validateSignedUrl(tamperedToken);
      }).toThrow();
    });

    it('should reject expired token', () => {
      const videoId = 'test-video-123';
      const resource = 'master.m3u8';
      const token = SecurityService.generateSignedUrl(videoId, resource, undefined, -1);

      expect(() => {
        SecurityService.validateSignedUrl(token);
      }).toThrow();
    });
  });

  describe('hashPassphrase', () => {
    it('should hash a passphrase', async () => {
      const passphrase = 'MySecurePass123';
      const hash = await SecurityService.hashPassphrase(passphrase);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(passphrase);
      expect(hash.length).toBeGreaterThan(20);
    });

    it('should reject weak passphrase', async () => {
      const weakPassphrase = 'abc';

      await expect(SecurityService.hashPassphrase(weakPassphrase)).rejects.toThrow(
        'Passphrase must be at least 4 characters'
      );
    });
  });

  describe('verifyPassphrase', () => {
    it('should verify correct passphrase', async () => {
      const passphrase = 'MySecurePass123';
      const hash = await SecurityService.hashPassphrase(passphrase);

      const isValid = await SecurityService.verifyPassphrase(passphrase, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect passphrase', async () => {
      const passphrase = 'MySecurePass123';
      const hash = await SecurityService.hashPassphrase(passphrase);

      const isValid = await SecurityService.verifyPassphrase('WrongPassword', hash);
      expect(isValid).toBe(false);
    });
  });
});
