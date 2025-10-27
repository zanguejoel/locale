/**
 * Color Conversion Utilities Tests
 */

import {
  hslToRgb,
  hslToHex,
  hslToRgbString,
  hslStringToHex,
  hexToRgba,
} from '../../utils/colorConversion';

describe('colorConversion', () => {
  describe('hslToRgb', () => {
    it('should convert pure red correctly', () => {
      const [r, g, b] = hslToRgb(0, 100, 50);
      expect(r).toBe(255);
      expect(g).toBe(0);
      expect(b).toBe(0);
    });

    it('should convert pure green correctly', () => {
      const [r, g, b] = hslToRgb(120, 100, 50);
      expect(r).toBe(0);
      expect(g).toBe(255);
      expect(b).toBe(0);
    });

    it('should convert pure blue correctly', () => {
      const [r, g, b] = hslToRgb(240, 100, 50);
      expect(r).toBe(0);
      expect(g).toBe(0);
      expect(b).toBe(255);
    });

    it('should convert achromatic colors (grays)', () => {
      const [r1, g1, b1] = hslToRgb(0, 0, 0); // Black
      expect(r1).toBe(0);
      expect(g1).toBe(0);
      expect(b1).toBe(0);

      const [r2, g2, b2] = hslToRgb(0, 0, 50); // Gray
      expect(r2).toBe(128);
      expect(g2).toBe(128);
      expect(b2).toBe(128);

      const [r3, g3, b3] = hslToRgb(0, 0, 100); // White
      expect(r3).toBe(255);
      expect(g3).toBe(255);
      expect(b3).toBe(255);
    });

    it('should convert complex colors correctly', () => {
      // Light blue (approximately)
      const [r, g, b] = hslToRgb(200, 50, 60);
      expect(r).toBeGreaterThan(100);
      expect(g).toBeGreaterThan(150);
      expect(b).toBeGreaterThan(180);
    });

    it('should handle edge cases', () => {
      // Full saturation, full lightness
      const [r1, g1, b1] = hslToRgb(180, 100, 100);
      expect(r1).toBe(255);
      expect(g1).toBe(255);
      expect(b1).toBe(255);

      // Full saturation, no lightness
      const [r2, g2, b2] = hslToRgb(180, 100, 0);
      expect(r2).toBe(0);
      expect(g2).toBe(0);
      expect(b2).toBe(0);
    });
  });

  describe('hslToHex', () => {
    it('should convert red to hex', () => {
      expect(hslToHex(0, 100, 50)).toBe('#ff0000');
    });

    it('should convert green to hex', () => {
      expect(hslToHex(120, 100, 50)).toBe('#00ff00');
    });

    it('should convert blue to hex', () => {
      expect(hslToHex(240, 100, 50)).toBe('#0000ff');
    });

    it('should convert white to hex', () => {
      expect(hslToHex(0, 0, 100)).toBe('#ffffff');
    });

    it('should convert black to hex', () => {
      expect(hslToHex(0, 0, 0)).toBe('#000000');
    });

    it('should pad single digit hex values', () => {
      // Very dark color that might have single digit hex values
      const hex = hslToHex(0, 100, 2);
      expect(hex).toHaveLength(7);
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  describe('hslToRgbString', () => {
    it('should convert to RGB string format', () => {
      expect(hslToRgbString(0, 100, 50)).toBe('rgb(255, 0, 0)');
    });

    it('should convert green to RGB string', () => {
      expect(hslToRgbString(120, 100, 50)).toBe('rgb(0, 255, 0)');
    });

    it('should convert blue to RGB string', () => {
      expect(hslToRgbString(240, 100, 50)).toBe('rgb(0, 0, 255)');
    });

    it('should convert gray to RGB string', () => {
      expect(hslToRgbString(0, 0, 50)).toBe('rgb(128, 128, 128)');
    });
  });

  describe('hslStringToHex', () => {
    it('should convert HSL string to hex', () => {
      expect(hslStringToHex('0 100% 50%')).toBe('#ff0000');
    });

    it('should handle different hue values', () => {
      expect(hslStringToHex('120 100% 50%')).toBe('#00ff00');
      expect(hslStringToHex('240 100% 50%')).toBe('#0000ff');
    });

    it('should handle varied saturation and lightness', () => {
      const hex = hslStringToHex('200 50% 60%');
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
      expect(hex).toHaveLength(7);
    });

    it('should parse HSL string with spaces correctly', () => {
      const hex1 = hslStringToHex('180 50% 50%');
      const hex2 = hslStringToHex('180  50%  50%'); // Extra spaces
      expect(hex1).toMatch(/^#[0-9a-f]{6}$/);
      expect(hex2).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  describe('hexToRgba', () => {
    it('should convert hex to RGBA with alpha', () => {
      expect(hexToRgba('#ff0000', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
    });

    it('should handle full opacity', () => {
      expect(hexToRgba('#00ff00', 1)).toBe('rgba(0, 255, 0, 1)');
    });

    it('should handle full transparency', () => {
      expect(hexToRgba('#0000ff', 0)).toBe('rgba(0, 0, 255, 0)');
    });

    it('should handle various hex colors', () => {
      expect(hexToRgba('#ffffff', 0.8)).toBe('rgba(255, 255, 255, 0.8)');
      expect(hexToRgba('#000000', 0.3)).toBe('rgba(0, 0, 0, 0.3)');
    });

    it('should handle partial alpha values', () => {
      expect(hexToRgba('#60a5fa', 0.25)).toBe('rgba(96, 165, 250, 0.25)');
      expect(hexToRgba('#60a5fa', 0.75)).toBe('rgba(96, 165, 250, 0.75)');
    });

    it('should parse lowercase and uppercase hex correctly', () => {
      expect(hexToRgba('#FF0000', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
      expect(hexToRgba('#ff0000', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
    });
  });

  describe('Color conversion consistency', () => {
    it('should maintain consistency across different conversion methods', () => {
      const h = 213;
      const s = 94;
      const l = 68;

      const [r, g, b] = hslToRgb(h, s, l);
      const hex = hslToHex(h, s, l);
      const rgbString = hslToRgbString(h, s, l);

      // Check that RGB values match across methods
      expect(rgbString).toBe(`rgb(${r}, ${g}, ${b})`);
      
      // Check that hex matches RGB values
      const hexR = parseInt(hex.slice(1, 3), 16);
      const hexG = parseInt(hex.slice(3, 5), 16);
      const hexB = parseInt(hex.slice(5, 7), 16);
      
      expect(hexR).toBe(r);
      expect(hexG).toBe(g);
      expect(hexB).toBe(b);
    });

    it('should handle HSL string conversion consistently', () => {
      const hslString = '213 94% 68%';
      const hex = hslStringToHex(hslString);
      
      // Should produce valid hex color
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
      expect(hex).toHaveLength(7);
      
      // Should match direct conversion
      const directHex = hslToHex(213, 94, 68);
      expect(hex).toBe(directHex);
    });
  });
});

