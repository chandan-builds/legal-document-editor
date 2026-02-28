import { generateSnapshotHash, validateSnapshotIntegrity } from './security';

describe('Security Utils', () => {
  it('should generate a consistent SHA256 hash', () => {
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    const hash1 = generateSnapshotHash(data);
    const hash2 = generateSnapshotHash(data);
    
    expect(hash1).toBeDefined();
    expect(hash1.length).toBeGreaterThan(0);
    expect(hash1).toBe(hash2);
  });

  it('should validate integrity correctly', () => {
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    const hash = generateSnapshotHash(data);
    
    const isValid = validateSnapshotIntegrity(data, hash);
    expect(isValid).toBe(true);
  });

  it('should detect tampering', () => {
    const originalData = new Uint8Array([1, 2, 3, 4, 5]);
    const hash = generateSnapshotHash(originalData);
    
    const tamperedData = new Uint8Array([1, 2, 3, 4, 6]); // Changed last byte
    const isValid = validateSnapshotIntegrity(tamperedData, hash);
    
    expect(isValid).toBe(false);
  });
});
