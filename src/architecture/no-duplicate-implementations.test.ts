/**
 * THE DUPLICATION TRIPWIRE — one idea, one implementation.
 *
 * WHY: "Code multiplications are a real vibe coding hazard and need to be actively
 * tackled." The eslint geometry guard (`.neighbors`/`.diagonals`) is SYNTACTIC and
 * cannot see a re-typed body; the row=6 audit was a one-off. This test is the
 * permanent half: a new copy fails here no matter which file it lands in.
 *
 * WHAT IT DOES (all under `src/**`, test files INCLUDED):
 *   1. Parses every function-like body — `function` declarations, named and
 *      anonymous function expressions, arrow functions (concise or block) and
 *      class/object methods (incl. constructors and accessors).
 *   2. Normalizes it: comments and formatting are dropped (tokenized), every
 *      identifier is blanked to `_` so a RENAME cannot hide a copy, and numeric /
 *      string literals are reduced to their VALUE so `0x6d2b79f5` and `1831565813`
 *      are the same constant.
 *   3. Hashes the normalized body and groups sites by hash.
 *   4. Requires every population of 2+ sites (whose normalized body is at least
 *      `FLOOR` characters) to equal `KNOWN_DUPLICATES` exactly. A new copy fails
 *      naming every site; a folded copy leaves a STALE entry that fails until its
 *      line is deleted.
 *
 * DIRECTION — DELETE-ONLY: `KNOWN_DUPLICATES` entries may only ever be DELETED
 * (when the copies they name are folded into one home). NEVER ADD an entry to
 * bless a new duplicate. A blessing would outlive the duplication it hides.
 *
 * WHAT IT IS NOT — a TRIPWIRE, not a proof:
 *   * It cannot see PARAPHRASES: two implementations of the same idea written
 *     differently are invisible.
 *   * Bodies shorter than `FLOOR` (80) normalized characters are invisible. That
 *     floor is deliberate: blanking identifiers makes two structurally identical
 *     but semantically different bodies collide (e.g. `ORTHO.map(...)` vs
 *     `DIAG.map(...)`), and the floor keeps those false positives out.
 *   * Blanking identifiers erases a difference carried ONLY by a name (a member
 *     name or a referenced constant). A population is therefore a PROMPT to look,
 *     not a verdict — but the default action is still to fold.
 *   * It cannot know intent. If a pair is genuinely irreducible, it goes in
 *     `KNOWN_DUPLICATES` with the reason, and the entry dies when it is folded.
 *
 * THE SCOPE IS CHECKED, NOT PROSE: `MEASURED_SCOPE` is asserted exactly, so the
 * detector cannot silently stop walking files or bodies. Bump it only after
 * confirming the new body is not a copy of an existing one.
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

/**
 * Bodies whose normalized text is shorter than this are invisible. 80 is the
 * floor the row=6 audit used: it keeps structurally identical one-liners that
 * differ only by a blanked name (e.g. `orthoNeighborIds` vs `diagNeighborIds`,
 * 59 chars) out of the population list.
 */
const FLOOR = 80;

/**
 * The detector's checked scope, measured on the tree that introduced this test.
 * `files` = `.ts` files walked under `src/`; `bodies` = every function-like body
 * parsed; `compared` = bodies at or above `FLOOR`, i.e. the ones that can ever
 * form a population. Asserted exactly below — an increase means a body was added,
 * a decrease means the walk or the parser silently lost coverage.
 */
const MEASURED_SCOPE = { files: 43, bodies: 391, compared: 252 } as const;

interface KnownDuplicate {
  /** First 16 hex chars of the sha256 of the normalized body. */
  readonly hash: string;
  /** Every site, as `src/path.ts#functionName` (order-insensitive). */
  readonly sites: readonly string[];
  /** Why this pair is irreducible and where it must eventually be folded. */
  readonly reason: string;
}

/** DELETE-ONLY. See the docstring: delete a line when its copies are folded. */
const KNOWN_DUPLICATES: readonly KnownDuplicate[] = [];

interface Site {
  readonly key: string;
  readonly file: string;
  readonly line: number;
  readonly name: string;
  readonly length: number;
  readonly hash: string;
}

interface Population {
  readonly hash: string;
  readonly length: number;
  readonly sites: readonly Site[];
}

interface Scope {
  readonly files: number;
  readonly bodies: number;
  readonly compared: number;
}

type FunctionLike =
  | ts.FunctionDeclaration
  | ts.FunctionExpression
  | ts.ArrowFunction
  | ts.MethodDeclaration
  | ts.GetAccessorDeclaration
  | ts.SetAccessorDeclaration
  | ts.ConstructorDeclaration;

const HERE = dirname(fileURLToPath(import.meta.url));
/** `<tree>/src/architecture/` -> `<tree>`. Never hardcode a main-repo path. */
const ROOT = resolve(HERE, '..', '..');

const DIRECTION =
  'DIRECTION (DELETE-ONLY): a KNOWN_DUPLICATES entry may only ever be DELETED, when the ' +
  'copies it names are folded into one home. NEVER add an entry to bless a new duplicate.';

const SCOPE_HELP =
  'SCOPE CHANGED — the tripwire no longer walks the coverage it was calibrated for. This is ' +
  'the detector guarding itself, not a code failure. If you added or removed a function-like ' +
  'body (including an arrow callback), update MEASURED_SCOPE and confirm it is not a copy of ' +
  'an existing body. If you did NOT touch the code, the walk or the parser lost coverage: fix it.';

const DUPLICATE_HELP =
  'DUPLICATE IMPLEMENTATION FOUND — one idea must have one implementation. WHAT TO DO: fold ' +
  'each copy below into its canonical home (reuse it, do not re-type it). If two sites are ' +
  'genuinely irreducible, add a KNOWN_DUPLICATES entry with the hash, the exact site keys and ' +
  'the reason it must stay. ' +
  DIRECTION;

const STALE_HELP =
  'STALE INVENTORY ENTRY — the entry below no longer names a live 2+-site population (the copy ' +
  'was folded, or the site set moved). WHAT TO DO: DELETE that line from KNOWN_DUPLICATES. ' +
  DIRECTION;

function isFunctionLike(node: ts.Node): node is FunctionLike {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node) ||
    ts.isConstructorDeclaration(node)
  );
}

function walkTsFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    if (statSync(abs).isDirectory()) found.push(...walkTsFiles(abs));
    else if (entry.endsWith('.ts')) found.push(abs);
  }
  return found.sort();
}

/**
 * Tokenize the body only. Comments are trivia and are skipped by the scanner, so
 * they cannot hide a copy; identifiers collapse to `_`; literals collapse to their
 * value. Tokens are joined with one space, collapsing all whitespace.
 */
function normalizeBody(sf: ts.SourceFile, body: ts.Node): string {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, sf.text);
  scanner.setTextPos(body.getStart(sf));
  const end = body.getEnd();
  const parts: string[] = [];
  for (let kind = scanner.scan(); kind !== ts.SyntaxKind.EndOfFileToken; kind = scanner.scan()) {
    if (scanner.getTokenStart() >= end) break;
    if (kind === ts.SyntaxKind.Identifier) parts.push('_');
    else if (kind === ts.SyntaxKind.NumericLiteral) parts.push(String(scanner.getTokenValue()));
    else if (
      kind === ts.SyntaxKind.StringLiteral ||
      kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral
    ) {
      parts.push(JSON.stringify(scanner.getTokenValue()));
    } else parts.push(scanner.getTokenText());
  }
  return parts.join(' ');
}

/** A human-readable name. Anonymous arrows borrow the binding they are assigned to. */
function functionName(node: FunctionLike, sf: ts.SourceFile): string {
  if (ts.isConstructorDeclaration(node)) return 'constructor';
  const named = node as { readonly name?: ts.Node };
  if (named.name !== undefined) return named.name.getText(sf);
  const parent = node.parent;
  if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) return parent.name.text;
  if (ts.isPropertyAssignment(parent) && ts.isIdentifier(parent.name)) return parent.name.text;
  return '<anonymous>';
}

function collect(): { readonly files: readonly string[]; readonly sites: readonly Site[] } {
  const files = walkTsFiles(join(ROOT, 'src'));
  const sites: Site[] = [];
  for (const abs of files) {
    const text = readFileSync(abs, 'utf8');
    const sf = ts.createSourceFile(abs, text, ts.ScriptTarget.Latest, true);
    const visit = (node: ts.Node): void => {
      if (isFunctionLike(node) && node.body !== undefined) {
        const normalized = normalizeBody(sf, node.body);
        const rel = relative(ROOT, abs).split('\\').join('/');
        const name = functionName(node, sf);
        sites.push({
          key: `${rel}#${name}`,
          file: rel,
          line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
          name,
          length: normalized.length,
          hash: createHash('sha256').update(normalized).digest('hex').slice(0, 16),
        });
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return { files: files.map((abs) => relative(ROOT, abs).split('\\').join('/')), sites };
}

function buildPopulations(sites: readonly Site[]): readonly Population[] {
  const byHash = new Map<string, Site[]>();
  for (const site of sites) {
    if (site.length < FLOOR) continue;
    const bucket = byHash.get(site.hash);
    if (bucket === undefined) byHash.set(site.hash, [site]);
    else bucket.push(site);
  }
  const populations: Population[] = [];
  for (const [hash, group] of byHash) {
    const first = group[0];
    if (first !== undefined && group.length >= 2) {
      populations.push({ hash, length: first.length, sites: group });
    }
  }
  return populations.sort((a, b) => a.hash.localeCompare(b.hash));
}

function describePopulation(population: Population): string {
  const where = population.sites.map((site) => `    ${site.file}:${site.line}#${site.name}`);
  return `  hash ${population.hash}  length ${population.length}\n${where.join('\n')}`;
}

const WALK = collect();
const FILES = WALK.files;
const SITES = WALK.sites;
const POPULATIONS = buildPopulations(SITES);

describe('no duplicate implementations', () => {
  it('tests the tree it lives in, not a hardcoded path', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as { name?: string };
    expect(pkg.name).toBe('blaster-master');
    expect(statSync(join(ROOT, 'src')).isDirectory()).toBe(true);
    expect(FILES.length).toBeGreaterThan(0);
    expect(FILES.every((file) => file.startsWith('src/'))).toBe(true);
  });

  it('walks a checked scope that cannot silently collapse', () => {
    const scope: Scope = {
      files: FILES.length,
      bodies: SITES.length,
      compared: SITES.filter((site) => site.length >= FLOOR).length,
    };
    console.log(
      `[dup-tripwire] floor=${FLOOR} files=${scope.files} bodies=${scope.bodies} compared=${scope.compared} populations=${POPULATIONS.length}`,
    );
    expect(scope, SCOPE_HELP).toEqual(MEASURED_SCOPE);
  });

  it('fails on every duplicate implementation outside the inventory', () => {
    const known = new Set(KNOWN_DUPLICATES.map((entry) => entry.hash));
    const unlisted = POPULATIONS.filter((population) => !known.has(population.hash));
    expect(unlisted.map(describePopulation), DUPLICATE_HELP).toEqual([]);
  });

  it('fails on every stale inventory entry until its line is deleted', () => {
    const byHash = new Map(POPULATIONS.map((population) => [population.hash, population] as const));
    const stale: string[] = [];
    for (const entry of KNOWN_DUPLICATES) {
      const population = byHash.get(entry.hash);
      if (population === undefined) {
        stale.push(`  hash ${entry.hash}: no live 2+-site population\n    ${entry.sites.join('\n    ')}`);
        continue;
      }
      const live = population.sites.map((site) => site.key).sort();
      const claimed = [...entry.sites].sort();
      if (live.join('|') !== claimed.join('|')) {
        stale.push(
          `  hash ${entry.hash}: site set changed\n    live:    ${live.join(', ')}\n    claimed: ${claimed.join(', ')}`,
        );
      }
    }
    expect(stale, STALE_HELP).toEqual([]);
  });

  it('keeps the inventory well-formed', () => {
    const hashes = KNOWN_DUPLICATES.map((entry) => entry.hash);
    expect(new Set(hashes).size, 'two KNOWN_DUPLICATES entries share a hash').toBe(hashes.length);
    const emptyReason = KNOWN_DUPLICATES.filter((entry) => entry.reason.trim().length === 0);
    expect(emptyReason.length, 'every KNOWN_DUPLICATES entry needs a reason').toBe(0);
  });
});
