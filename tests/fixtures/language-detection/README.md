# Language Detection Fixture Tests

This directory contains a comprehensive test suite for language detection, with real-world code samples organized by language.

## Structure

```
tests/fixtures/language-detection/
├── javascript/     → 5 fixtures (expected: 'javascript')
├── python/         → 5 fixtures (expected: 'python')
├── sql/            → 5 fixtures (expected: 'sql')
├── shell/          → 3 fixtures (expected: 'shell')
├── markdown/       → 3 fixtures (expected: 'markdown')
├── yaml/           → 3 fixtures (expected: 'yaml')
├── html/           → 3 fixtures (expected: 'htmlmixed')
├── css/            → 3 fixtures (expected: 'css')
├── xml/            → 2 fixtures (expected: 'xml')
└── plaintext/      → 3 fixtures (expected: null)
```

**Total: 35 fixture files**

## Running the Tests

```bash
# Run only language detection fixture tests
npm run test:lang-fixtures

# Run with UI mode for debugging
npx playwright test language-detection-fixtures.spec.js --ui
```

## Adding New Fixtures

To add a new test case:

1. Create a `.txt` file in the appropriate language directory
2. Add realistic code/content that should be detected as that language
3. Run `npm run test:lang-fixtures` to verify

**Guidelines:**
- Use realistic, representative code samples
- Include edge cases (minimal code, comments, mixed content)
- Keep files focused on one language
- Use `.txt` extension for all fixtures

## What Gets Tested

For each fixture file, the test:
1. Loads the content into the editor
2. Waits for autosave (which triggers language detection)
3. Verifies the language selector shows the correct mode

## Debugging Failures

When a test fails, the console output shows:
- Which fixture failed
- Expected vs actual language detection
- Preview of the content

Use this information to improve the detection patterns in `public/js/utils.js` (`detectLanguage()` function).

## Coverage by Language

- **JavaScript**: arrow functions, classes, async/await, React components, destructuring
- **Python**: classes, list comprehensions, decorators, async functions, pandas
- **SQL**: SELECT, INSERT, UPDATE, CREATE TABLE, CTEs
- **Shell**: shebangs, common commands, loops/conditionals
- **Markdown**: headers, lists, code blocks, mixed content
- **YAML**: docker-compose, Kubernetes manifests, GitHub Actions
- **HTML**: DOCTYPE, forms, comments, semantic elements
- **CSS**: selectors, media queries, animations, variables
- **XML**: RSS feeds, configuration files
- **Plain Text**: prose notes, instructions, lists (should not be detected as code)

## Improving Detection

If fixtures consistently fail:

1. Review the failing patterns in `public/js/utils.js` → `detectLanguage()`
2. Adjust detection rules to better handle the edge cases
3. Re-run `npm run test:lang-fixtures` to verify
4. Run full test suite `npm test` to ensure no regressions

## Notes

- This test suite is **excluded from default `npm test`** to keep CI fast
- Run it manually when working on language detection improvements
- Plain text fixtures should detect as `null` (shown as 'null' in the dropdown)
