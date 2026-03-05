/**
 * Tests for src/utils/helpers.ts — Mustache-to-angle-bracket variable conversion.
 *
 * These functions convert {{variable}} syntax (Postman/Bruno format)
 * to <<variable>> syntax (Fetchy's internal format) during imports.
 */
import { describe, it, expect } from 'vitest';
import { convertMustacheToAngleBrackets, convertMustacheVarsDeep } from '../src/utils/helpers';

// ─── convertMustacheToAngleBrackets ──────────────────────────────────────────

describe('convertMustacheToAngleBrackets', () => {
  it('converts a single {{variable}}', () => {
    expect(convertMustacheToAngleBrackets('{{host}}')).toBe('<<host>>');
  });

  it('converts multiple variables in a string', () => {
    expect(convertMustacheToAngleBrackets('https://{{host}}:{{port}}/api'))
      .toBe('https://<<host>>:<<port>>/api');
  });

  it('handles variables with underscores', () => {
    expect(convertMustacheToAngleBrackets('{{my_var}}')).toBe('<<my_var>>');
  });

  it('handles variables with hyphens', () => {
    expect(convertMustacheToAngleBrackets('{{my-var}}')).toBe('<<my-var>>');
  });

  it('leaves string unchanged when no variables present', () => {
    expect(convertMustacheToAngleBrackets('plain text')).toBe('plain text');
  });

  it('leaves <<existing>> angle bracket variables unchanged', () => {
    expect(convertMustacheToAngleBrackets('<<already>>')).toBe('<<already>>');
  });

  it('handles empty string', () => {
    expect(convertMustacheToAngleBrackets('')).toBe('');
  });

  it('handles consecutive variables', () => {
    expect(convertMustacheToAngleBrackets('{{a}}{{b}}')).toBe('<<a>><<b>>');
  });
});

// ─── convertMustacheVarsDeep ─────────────────────────────────────────────────

describe('convertMustacheVarsDeep', () => {
  it('converts strings', () => {
    expect(convertMustacheVarsDeep('{{host}}')).toBe('<<host>>');
  });

  it('recursively converts object values', () => {
    const input = { url: 'https://{{host}}/api', name: 'Test' };
    const result = convertMustacheVarsDeep(input);
    expect(result).toEqual({ url: 'https://<<host>>/api', name: 'Test' });
  });

  it('recursively converts array elements', () => {
    const input = ['{{a}}', '{{b}}', 'plain'];
    const result = convertMustacheVarsDeep(input);
    expect(result).toEqual(['<<a>>', '<<b>>', 'plain']);
  });

  it('handles deeply nested structures', () => {
    const input = {
      level1: {
        level2: {
          value: '{{deep_var}}',
        },
        arr: ['{{item}}'],
      },
    };
    const result = convertMustacheVarsDeep(input);
    expect(result.level1.level2.value).toBe('<<deep_var>>');
    expect(result.level1.arr[0]).toBe('<<item>>');
  });

  it('returns non-string primitives as-is', () => {
    expect(convertMustacheVarsDeep(42)).toBe(42);
    expect(convertMustacheVarsDeep(true)).toBe(true);
    expect(convertMustacheVarsDeep(null)).toBeNull();
  });

  it('does not mutate the original object', () => {
    const input = { url: '{{host}}' };
    const result = convertMustacheVarsDeep(input);
    expect(input.url).toBe('{{host}}');
    expect(result.url).toBe('<<host>>');
  });
});
