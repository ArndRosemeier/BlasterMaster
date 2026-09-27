import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['dist/**', 'node_modules/**', 'worktrees/**', '.gate-logs/**'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // The rule's geometry has exactly ONE home: `src/game/engine/board.ts`
    // (today the only 4 reads of these arrays in non-test source live there).
    // Anywhere else in non-test source, reading them re-derives the rule —
    // exactly the duplication `threshold`/`blastTargets` exist to prevent —
    // so it is an error. Tests still assert geometry directly (`**/*.test.ts`
    // is exempt, as is the one home).
    files: ['src/**/*.ts'],
    ignores: ['**/*.test.ts', 'src/game/engine/board.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[property.name='neighbors']",
          message:
            'The rule geometry lives only in src/game/engine/board.ts: use threshold(cell), blastTargets(cell), isCritical(cell) or isNearCritical(cell) instead of reading .neighbors.',
        },
        {
          selector: "MemberExpression[property.name='diagonals']",
          message:
            'The rule geometry lives only in src/game/engine/board.ts: use threshold(cell) or blastTargets(cell) instead of reading .diagonals.',
        },
      ],
    },
  },
  {
    // The AI's judgement is derived from the engine's rule primitives, never
    // from the board's adjacency arrays. Reading `.neighbors` / `.diagonals` /
    // `.deep` here re-derives the rule inside `src/game/ai`, which is exactly
    // the duplication the primitives exist to prevent — so it is an error, and
    // the allowed vocabulary is named in the message. This block is deliberately
    // LAST: for `src/game/ai/**` it wins over the repo-wide block above, so AI
    // code additionally may not read `.deep` (a display flag the view may read).
    files: ['src/game/ai/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[property.name='neighbors']",
          message:
            'AI rule-blindness: find the rule primitive in src/game/engine/board.ts instead of reading .neighbors — use threshold(cell), blastTargets(cell), isCritical(cell) or isNearCritical(cell).',
        },
        {
          selector: "MemberExpression[property.name='diagonals']",
          message:
            'AI rule-blindness: find the rule primitive in src/game/engine/board.ts instead of reading .diagonals — use threshold(cell) or blastTargets(cell).',
        },
        {
          selector: "MemberExpression[property.name='deep']",
          message:
            'AI rule-blindness: find the rule primitive in src/game/engine/board.ts instead of reading .deep — use threshold(cell) or isNearCritical(cell).',
        },
      ],
    },
  },
);
