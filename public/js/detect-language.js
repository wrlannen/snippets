// Standalone language detection for both browser and Node.js
// No browser APIs, pure function

/**
 * Detects the CodeMirror mode from content patterns.
 * Supports: javascript, python, sql, shell, markdown, yaml, xml, css, htmlmixed, typescript, null (plain text).
 * @param {string} content - The snippet content to analyze
 * @returns {string|null} - The detected mode name
 */
export function detectLanguage(content) {
  if (!content || typeof content !== 'string') return 'javascript';

  const trimmed = content.replaceAll('\r\n', '\n').trim();
  const firstLine = trimmed.split('\n')[0];
  const lines = trimmed.split('\n');

  // Shebang detection (Shell/Python)
  if (trimmed.startsWith('#!/bin/bash') || trimmed.startsWith('#!/bin/sh') || trimmed.startsWith('#!/usr/bin/env bash')) return 'shell';
  if (trimmed.startsWith('#!/usr/bin/env python') || trimmed.startsWith('#!/usr/bin/python')) return 'python';

  // XML detection (must come before HTML, and requires explicit markers)
  if (trimmed.startsWith('<?xml')) return 'xml';
  if (/^<\?|<\w+[^>]*xmlns|<(soap|project|beans|schema|xsl|rss|gpx)[\s>]/i.test(trimmed)) return 'xml';

  // HTML detection (before checking for other tags) - expanded tag list
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<!doctype')) return 'htmlmixed';
  if (/^<(html|head|body|div|span|p|h[1-6]|section|article|nav|main|footer|header|form|input|button|textarea|label|fieldset|legend|table|tr|td|th|details|summary|datalist|option|iframe|video|audio|canvas|meta|link|script|style|svg|circle|rect|path|text|img|a|ul|ol|li)\b/i.test(trimmed)) return 'htmlmixed';
  // Only match HTML tags in body if no code indicators
  if (/<(div|span|p|h[1-6]|section|article|nav|main|footer|header|form|button|table|svg)\b/i.test(trimmed) && !/\b(const|let|var|function|import|export|class\s+\w+\s*\{)\b/.test(trimmed)) return 'htmlmixed';
  if (/<!--.*-->/.test(trimmed) && !/\b(const|let|var|function)\b/.test(trimmed)) return 'htmlmixed';

  // Markdown detection - check for code blocks first (strong indicator)
  if (/^```\w*\n[\s\S]*?```/m.test(trimmed)) return 'markdown';
  // Frontmatter with markdown content after
  if (/^---\s*\n[\s\S]*?\n---\s*\n/.test(trimmed) && /^#{1,6}\s+\w/m.test(trimmed)) return 'markdown';
  // Headers with prose-like content (not code)
  if (/^#{1,6} [A-Z]/.test(firstLine) && !trimmed.includes('{') && !/\bdef\s+\w+|class\s+\w+.*:|\bself\./.test(trimmed)) return 'markdown';
  // Bold/italic markdown (not in code)
  if (/\*\*\w+.*\*\*/.test(trimmed) && !trimmed.includes('{') && !/\bdef\s+|\bclass\s+/.test(trimmed)) return 'markdown';
  // Markdown blockquotes with bold
  if (/^>\s+\*\*/.test(trimmed)) return 'markdown';
  // Markdown with LaTeX math
  if (/^#{1,6}\s/.test(trimmed) && /\$\$[\s\S]+\$\$|\$[^$]+\$/.test(trimmed)) return 'markdown';

  // SQL detection - must have SQL keywords (moved up for higher priority)
  const firstLineUpper = firstLine.trim().toUpperCase();
  if (/^(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|TRUNCATE|WITH)\b/.test(firstLineUpper)) return 'sql';
  if (/\bSELECT\s+[\w*,\s.()]+\s+FROM\b/i.test(trimmed)) return 'sql';
  if (/\bUPDATE\s+\w+\s+SET\b/i.test(trimmed)) return 'sql';
  if (/\bINSERT\s+INTO\s+\w+/i.test(trimmed)) return 'sql';
  if (/\bCREATE\s+(TABLE|INDEX|VIEW|DATABASE|UNIQUE)\b/i.test(trimmed)) return 'sql';
  if (/\b(GROUP\s+BY|ORDER\s+BY|INNER\s+JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|HAVING)\b/i.test(trimmed) && /\bFROM\b/i.test(trimmed)) return 'sql';
  if (/\b(DATE_TRUNC|COUNT|SUM|AVG)\s*\(/i.test(trimmed) && /\bFROM\b/i.test(trimmed)) return 'sql';

  // Python detection - look for Python-specific patterns
  const hasPythonImport = /^import\s+[\w.]+\s*$|^from\s+[\w.]+\s+import\s+/m.test(trimmed);
  const hasPythonDef = /^\s*def\s+\w+\s*\([^)]*\)\s*:/m.test(trimmed);
  const hasAsyncDef = /^\s*async\s+def\s+\w+\s*\(/m.test(trimmed);
  const hasPythonClass = /^\s*class\s+\w+[^{]*:\s*$/m.test(trimmed);
  const hasSelf = /\bself\.\w+/.test(trimmed);
  const hasPythonKeywords = /\b(elif|except|yield|@property|@staticmethod|@classmethod|__init__|__main__|__name__|asyncio|lambda\s+\w+:)\b/.test(trimmed);
  const hasPythonListComp = /\[.+\s+for\s+\w+\s+in\s+.+\]/.test(trimmed);
  const hasPythonLambda = /\blambda\s+\w+.*:/.test(trimmed);
  const hasWithAs = /\bwith\s+\w+.*\s+as\s+\w+:/.test(trimmed);
  const hasIfMain = /if\s+__name__\s*==\s*["']__main__["']:/.test(trimmed);

  if (hasPythonImport && (hasPythonDef || hasAsyncDef || hasPythonClass || hasSelf || hasPythonKeywords || hasPythonListComp || hasPythonLambda)) return 'python';
  if (hasPythonDef || hasAsyncDef) return 'python';
  if (hasPythonClass && !trimmed.includes('{')) return 'python';
  if (hasSelf) return 'python';
  if (hasPythonKeywords) return 'python';
  if (hasWithAs) return 'python';
  if (hasIfMain) return 'python';
  if (hasPythonLambda && !trimmed.includes(';')) return 'python';
  // Python comprehension (list/dict/set) after Python-style comment
  if (/^#\s+\w/.test(firstLine) && hasPythonListComp) return 'python';
  // Python dict comprehension
  if (/\{\w+:\s*\w+.*for\s+\w+\s+in\s+/.test(trimmed)) return 'python';
  // Python-style import at start (import X or from X import Y)
  const hasPythonLibraryPatterns = /\bdf\b|\bpd\b|\bnp\b|\bre\b|\.DataFrame\(|\.findall\(|\.groupby\(|\.search\(|\.sub\(|\.split\(/.test(trimmed);
  if (/^import\s+(pandas|numpy|re|os|sys|json|requests|asyncio)\b/m.test(trimmed)) return 'python';
  if (/^import\s+[\w.]+\s*$/m.test(trimmed) && !trimmed.includes(';') && (hasPythonDef || hasPythonListComp || hasPythonLibraryPatterns)) return 'python';
  if (/^from\s+[\w.]+\s+import\s+/m.test(trimmed) && !trimmed.includes(';')) return 'python';

  // YAML detection - check early for config-like files before shell detection can catch ${} patterns
  const looksLikeYamlConfig = /^\w+:\s*$/m.test(trimmed) && /^\s+-\s+\w+/m.test(trimmed) && !trimmed.includes(';');
  if (looksLikeYamlConfig) return 'yaml';
  if (/^---\s*$/.test(firstLine) && !/^#{1,6}\s+\w/m.test(trimmed)) return 'yaml';

  // Shell detection - look for shell-specific patterns
  // Skip shell detection for template literals (JS)
  const hasTemplateLiteral = /`[^`]*\$\{/.test(trimmed);
  if (!hasTemplateLiteral) {
    if (/\$\{[^}]+\}/.test(trimmed)) return 'shell'; // Variable expansion (not template literals)
  }
  if (/\$\([^)]+\)/.test(trimmed)) return 'shell'; // Command substitution
  if (!hasTemplateLiteral && /\$[@#?!$*0-9]/.test(trimmed)) return 'shell'; // Special variables
  if (/^\s*trap\s+/.test(trimmed)) return 'shell'; // trap command
  if (/^\s*read\s+-[ps]/.test(trimmed)) return 'shell'; // read with options
  if (/\[\[\s+.*\s+\]\]/.test(trimmed)) return 'shell'; // [[ test ]]
  if (/\s(&&|\|\|)\s/.test(trimmed) && !/[{};]/.test(trimmed) && !/\b(const|let|var|function)\b/.test(trimmed)) return 'shell';
  if (/[|][\s]*\n?\s*(grep|awk|sed|sort|uniq|head|tail|cut|wc)\b/.test(trimmed)) return 'shell';
  if (/^\s*(echo|cd|ls|grep|curl|wget|docker|git|sudo|chmod|chown|mkdir|rm|cp|mv|cat|find|read|touch|sleep)\s+/m.test(trimmed) && !/[{};]/.test(trimmed) && !/\b(const|let|var|function)\b/.test(trimmed)) return 'shell';
  if (/^(for\s+\w+\s+in|while\s+\[|if\s+\[\[?|case\s+.*\s+in)/.test(trimmed)) return 'shell';
  if (/\bdocker(-compose)?\s+(build|run|exec|logs|up|down|ps|images)\b/.test(trimmed)) return 'shell';
  if (/\\$\n/.test(trimmed)) return 'shell'; // Line continuation
  if (/\(\)\s*\{/.test(trimmed) && /\becho\b|\brm\b|\btouch\b/.test(trimmed)) return 'shell'; // Shell function

  // JavaScript detection (after Python/Shell to avoid conflicts)
  if (/\b(const|let|var)\s+\w+\s*=/.test(trimmed) && /[{};]/.test(trimmed)) return 'javascript';
  if (/=>\s*[{(]/.test(trimmed) && /[{};]/.test(trimmed)) return 'javascript';
  if (/`[^`]*\$\{/.test(trimmed) && /[{};]/.test(trimmed)) return 'javascript';
  if (/\bfunction\s+\w+\s*\(/.test(trimmed) && /[{};]/.test(trimmed)) return 'javascript';
  if (/\b(async\s+function|await\s+\w)/.test(trimmed) && /[{};]/.test(trimmed)) return 'javascript';
  if (/^\s*(import|export)\s+/.test(trimmed) && /[{};]/.test(trimmed)) return 'javascript';
  if (/\bclass\s+\w+\s*(extends\s+\w+\s*)?\{/.test(trimmed)) return 'javascript';
  if (/\bconstructor\s*\(/.test(trimmed) && /this\./.test(trimmed)) return 'javascript';
  if (/\b(React|useState|useEffect|props)\b/.test(trimmed) && /[{};]/.test(trimmed)) return 'javascript';

  // YAML detection - must have key: value structure without code markers
  // Early YAML detection already done above, continue with more patterns
  // YAML list items with dash followed by key:value
  if (/^\s*-\s+\w+:\s+\S/.test(trimmed) && !trimmed.includes(';')) return 'yaml';
  // YAML top-level keys (common config patterns)
  if (/^(rules|plugins|provider|functions|jobs|services|volumes|networks|steps|stages|env|environment|dependencies):\s*$/m.test(trimmed)) return 'yaml';
  // YAML with nested structure and colons (but no semicolons)
  if (!trimmed.includes(';') && /^\w+:$/m.test(trimmed) && /^\s+-\s+\w+:/m.test(trimmed)) return 'yaml';
  if (!trimmed.includes('{') && !trimmed.includes(';') && !/\bdef\s+|\bclass\s+.*:/.test(trimmed)) {
    const yamlLines = lines.filter(l => /^\s*[a-zA-Z0-9_-]+:\s*(\S|$)/.test(l));
    const hasNestedYaml = lines.some(l => /^\s{2,}[a-zA-Z0-9_-]+:/.test(l));
    if (yamlLines.length >= 3 && (hasNestedYaml || yamlLines.length >= 5)) {
      // Avoid matching plain text with colons - count prose words
      const proseWordCount = (trimmed.match(/\b(is|are|was|were|that|the|and|or|but|in|of|to|for|as|at|by)\b/gi) || []).length;
      if (proseWordCount < 3) return 'yaml';
    }
  }

  // CSS detection
  if (/^[.#]?[\w-]+\s*\{/.test(trimmed)) return 'css';
  if (/^@(import|media|keyframes|charset|font-face|page|supports|container)\b/.test(trimmed)) return 'css';
  if (trimmed.includes('{') && trimmed.includes('}') && /:\s*[^;]+;/.test(trimmed)) {
    const hasCssProps = /\b(display|color|width|height|padding|margin|border|font|background|position|flex|grid|align|justify)\s*:/i.test(trimmed);
    if (hasCssProps && !/\b(const|let|var|function)\b/.test(trimmed)) return 'css';
  }

  // JSON detection
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      JSON.parse(trimmed);
      return 'javascript';
    } catch {
      // Not valid JSON, continue
    }
  }

  // TypeScript/JavaScript detection
  if (/\b(interface\s+\w+|type\s+\w+\s*=|enum\s+\w+|namespace\s+\w+|declare\s+|implements\s+|abstract\s+class)\b/.test(trimmed)) return 'javascript';

  // Plain text detection - look for prose-like patterns
  const hasSentences = (trimmed.match(/[.!?]\s+[A-Z]/g) || []).length >= 2;
  const hasProseIndicators = /\b(the|is|are|was|were|this|that|with|from|and|but|or|in|of|to|for|as|at|by|an|a)\b/i.test(trimmed);
  const hasParagraphs = /\n\n/.test(trimmed) && trimmed.split(/\n\n/).length >= 2;
  const hasCodePatterns = /[{};]|^\s*(function|const|let|var|class|return|if|else)\b/m.test(trimmed);
  
  if (hasSentences && hasProseIndicators && !hasCodePatterns) return null;
  if (hasParagraphs && hasProseIndicators && !hasCodePatterns) return null;
  
  // Smart code vs plain text detection
  const hasCallLikeParens = /\b[A-Za-z_]\w*\([^)]*\)/.test(trimmed);
  const hasOperators = /(===?|!==?|<=|>=|=>|&&|\|\||\+=|-=|\*=|\/=)/.test(trimmed);
  const words = trimmed.split(/\s+/);
  const hasMultipleWords = words.length >= 10;
  const looksLikeCode = hasCodePatterns || (hasCallLikeParens && hasOperators);
  
  if (hasMultipleWords && hasProseIndicators && !looksLikeCode) return null;
  
  return 'javascript';
}
