import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { validateOpenAIKey, warnIfNoAPIKey, requireValidAPIKey } from './apiKeyValidator';

describe('API Key Validator', () => {
  let originalEnv: string | undefined;
  
  beforeEach(() => {
    // Store original environment variable
    originalEnv = process.env.OPENAI_API_KEY;
  });
  
  afterEach(() => {
    // Restore original environment variable
    if (originalEnv !== undefined) {
      process.env.OPENAI_API_KEY = originalEnv;
    } else {
      delete process.env.OPENAI_API_KEY;
    }
  });

  describe('validateOpenAIKey', () => {
    it('should return valid when API key is properly set', () => {
      process.env.OPENAI_API_KEY = 'sk-test-key-123';
      
      const result = validateOpenAIKey();
      
      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeUndefined();
      expect(result.helpMessage).toBeUndefined();
    });

    it('should return invalid when API key is not set', () => {
      delete process.env.OPENAI_API_KEY;
      
      const result = validateOpenAIKey();
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('OpenAI API key not found');
      expect(result.helpMessage).toContain('OpenAI API Key Required');
      expect(result.helpMessage).toContain('https://platform.openai.com/api-keys');
    });

    it('should return invalid when API key has wrong format', () => {
      process.env.OPENAI_API_KEY = 'invalid-key-format';
      
      const result = validateOpenAIKey();
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Invalid OpenAI API key format');
      expect(result.helpMessage).toContain('should start with');
    });

    it('should accept valid OpenAI API key formats', () => {
      const validKeys = [
        'sk-123456789',
        'sk-abcdefghijk',
        'sk-test_key_123'
      ];
      
      validKeys.forEach(key => {
        process.env.OPENAI_API_KEY = key;
        const result = validateOpenAIKey();
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('warnIfNoAPIKey', () => {
    let consoleSpy: { warn: ReturnType<typeof vi.spyOn>; log: ReturnType<typeof vi.spyOn> };
    
    beforeEach(() => {
      consoleSpy = {
        warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
        log: vi.spyOn(console, 'log').mockImplementation(() => {})
      };
    });
    
    afterEach(() => {
      consoleSpy.warn.mockRestore();
      consoleSpy.log.mockRestore();
    });

    it('should return true and not warn when API key is valid', () => {
      process.env.OPENAI_API_KEY = 'sk-valid-key';
      
      const result = warnIfNoAPIKey();
      
      expect(result).toBe(true);
      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    it('should return false and warn when API key is missing', () => {
      delete process.env.OPENAI_API_KEY;
      
      const result = warnIfNoAPIKey();
      
      expect(result).toBe(false);
      expect(consoleSpy.warn).toHaveBeenCalledWith('⚠️  OpenAI API key not found');
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('AI features disabled'));
    });

    it('should return false and warn when API key format is invalid', () => {
      process.env.OPENAI_API_KEY = 'invalid-format';
      
      const result = warnIfNoAPIKey();
      
      expect(result).toBe(false);
      expect(consoleSpy.warn).toHaveBeenCalledWith('⚠️  Invalid OpenAI API key format');
    });
  });

  describe('requireValidAPIKey', () => {
    let consoleSpy: { error: ReturnType<typeof vi.spyOn>; log: ReturnType<typeof vi.spyOn> };
    let exitSpy: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    
    beforeEach(() => {
      consoleSpy = {
        error: vi.spyOn(console, 'error').mockImplementation(() => {}),
        log: vi.spyOn(console, 'log').mockImplementation(() => {})
      };
      exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('process.exit called');
      }) as never);
    });
    
    afterEach(() => {
      consoleSpy.error.mockRestore();
      consoleSpy.log.mockRestore();
      exitSpy.mockRestore();
    });

    it('should not exit when API key is valid', () => {
      process.env.OPENAI_API_KEY = 'sk-valid-key';
      
      expect(() => requireValidAPIKey()).not.toThrow();
      expect(exitSpy).not.toHaveBeenCalled();
    });

    it('should exit when API key is missing', () => {
      delete process.env.OPENAI_API_KEY;
      
      expect(() => requireValidAPIKey()).toThrow('process.exit called');
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(consoleSpy.error).toHaveBeenCalledWith('❌ OpenAI API key not found');
    });

    it('should exit when API key format is invalid', () => {
      process.env.OPENAI_API_KEY = 'invalid-format';
      
      expect(() => requireValidAPIKey()).toThrow('process.exit called');
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(consoleSpy.error).toHaveBeenCalledWith('❌ Invalid OpenAI API key format');
    });
  });
});
