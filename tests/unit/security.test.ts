// N-09 API キーなどの秘密が、ソースと公開するファイルに入っていない
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

const TEXT = new Set(['.ts', '.js', '.json', '.html', '.css', '.md', '.yml', '.webmanifest', '.txt', '.svg']);
const SECRETS: [string, RegExp][] = [
  ['Google API キー', /AIza[0-9A-Za-z_-]{35}/],
  ['OpenAI / Anthropic のキー', /\bsk-(ant-)?[A-Za-z0-9_-]{20,}/],
  ['GitHub のトークン', /\bgh[pousr]_[A-Za-z0-9]{36}\b/],
  ['秘密鍵', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['キーの書き込み', /\b(api[_-]?key|secret|token)\b\s*[:=]\s*['"][A-Za-z0-9_\-]{16,}['"]/i],
];

function files(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return TEXT.has(extname(name)) ? [path] : [];
  });
}

describe('N-09 秘密が入っていない', () => {
  const targets = ['src', 'public', 'docs', 'scripts', 'dist', '.github'].flatMap(files).concat(['index.html']);
  it(`${targets.length} 個のファイルを調べる`, () => {
    const found: string[] = [];
    for (const path of targets) {
      const text = readFileSync(path, 'utf8');
      for (const [label, re] of SECRETS) if (re.test(text)) found.push(`${path}: ${label}`);
    }
    expect(found).toEqual([]);
  });
});
