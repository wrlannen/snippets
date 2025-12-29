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

export function initEditor(textarea, { onChange } = {}) {
  fallbackTextarea = textarea;

  if (typeof CodeMirror === 'undefined' || !textarea) {
    return null;
  }

  editor = CodeMirror.fromTextArea(textarea, {
    lineNumbers: true,
    mode: "javascript",
    theme: "dracula",
    lineWrapping: true,
    tabSize: 2,
    indentUnit: 2,
    autoCloseBrackets: true,
    matchBrackets: true,
    viewportMargin: Infinity  // Render entire document for proper scrolling
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
