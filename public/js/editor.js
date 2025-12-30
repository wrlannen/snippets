/**
 * Editor Module
 * 
 * Manages the CodeMirror editor instance with:
 * - Editor initialization and configuration
 * - Content get/set operations
 * - Font size and family customization
 * - Focus and refresh management
 * - History clearing
 * - Fallback to textarea when CodeMirror is unavailable
 * 
 */

let editor = null;
let fallbackTextarea = null;
const DEFAULT_FONT_COLOR = "#ffffff";

export function initEditor(textarea, { onChange, mode = 'javascript' } = {}) {
  fallbackTextarea = textarea;

  if (typeof CodeMirror === 'undefined' || !textarea) {
    return null;
  }

  editor = CodeMirror.fromTextArea(textarea, {
    lineNumbers: true,
    mode: mode,
    theme: "dracula",
    lineWrapping: true,
    tabSize: 2,
    indentUnit: 2,
    indentWithTabs: false,  // Use spaces, not tabs
    smartIndent: true,      // Context-sensitive indentation
    electricChars: true,    // Auto-reindent on special chars like }
    autoCloseBrackets: {
      pairs: "()[]{}''\"\"``",
      explode: "()[]{}",
      override: true  // Override mode-specific closeBrackets settings
    },
    matchBrackets: true,
    showCursorWhenSelecting: true,  // Show cursor even when selecting
    viewportMargin: Infinity,  // Render entire document for proper scrolling
    extraKeys: {
      "Tab": (cm) => {
        // If something is selected, indent it
        if (cm.somethingSelected()) {
          cm.indentSelection("add");
        } else {
          // Insert spaces instead of tab
          cm.replaceSelection(" ".repeat(cm.getOption("indentUnit")));
        }
      },
      "Shift-Tab": (cm) => cm.indentSelection("subtract")
    }
  });

  editor.on("change", () => {
    if (fallbackTextarea) {
      fallbackTextarea.value = editor.getValue();
    }
    if (onChange) onChange(editor.getValue());
  });

  // Prevent browser save dialog (Cmd/Ctrl+S) - autosave handles persistence
  editor.addKeyMap({
    "Cmd-S": () => { /* no-op */ },
    "Ctrl-S": () => { /* no-op */ },
  });

  return editor;
}

export function getEditorValue() {
  if (editor) {
    return { content: editor.getValue() };
  }
  return { content: fallbackTextarea?.value ?? "" };
}

export function setEditorValue(value) {
  if (editor) {
    editor.setValue(value ?? "");
  } else if (fallbackTextarea) {
    fallbackTextarea.value = value ?? "";
  }
}

export function focusEditor() {
  if (editor) {
    editor.focus();
  } else if (fallbackTextarea) {
    fallbackTextarea.focus();
  }
}

export function refreshEditor() {
  if (editor) {
    editor.refresh();
  }
}

export function clearHistory() {
  if (editor) {
    editor.clearHistory();
  }
}

export function applyFontSettings(settings) {
  const { fontSize, fontFamily } = settings;
  const target = document.querySelector('.CodeMirror') || fallbackTextarea;
  if (target) {
    target.style.fontSize = fontSize + "px";
    target.style.fontFamily = fontFamily;
    target.style.color = DEFAULT_FONT_COLOR;
  }

  if (editor) {
    editor.refresh();
  }
}

/**
 * Changes the editor's syntax highlighting mode.
 * @param {string} mode - CodeMirror mode name (javascript, xml, css, htmlmixed)
 */
export function setEditorMode(mode) {
  if (editor && typeof mode === 'string') {
    editor.setOption('mode', mode);
  }
}

/**
 * Gets the current editor mode.
 * @returns {string} - The current mode name
 */
export function getEditorMode() {
  if (editor) {
    return editor.getOption('mode');
  }
  return 'javascript';
}

