/* ============================================================
 * keyboard.js
 *
 * Global keyboard support. Maps physical keys to calculator
 * actions through a single handler. The handler is enabled only
 * when an input field is not focused.
 * ============================================================ */

(function (global) {
  'use strict';

  function isTypingTarget(el) {
    if (!el) return false;
    var tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (el.isContentEditable) return true;
    return false;
  }

  // Returns the calculator action for a KeyboardEvent, or null.
  function mapEvent(e) {
    var k = e.key;

    // Direct text keys
    if (k >= '0' && k <= '9') return { type: 'append', value: k };
    if (k === '.') return { type: 'append', value: '.' };

    switch (k) {
      case '+': return { type: 'append', value: '+' };
      case '-': return { type: 'append', value: '-' };
      case '*': return { type: 'append', value: '*' };
      case '/': return { type: 'append', value: '/' };
      case '^': return { type: 'append', value: '^' };
      case '%': return { type: 'append', value: '%' };
      case '(': return { type: 'append', value: '(' };
      case ')': return { type: 'append', value: ')' };
      case ',': return { type: 'append', value: ',' };
      case '!': return { type: 'append', value: '!' };
      case 'Enter':
      case '=':
        return { type: 'equals' };
      case 'Escape':
        return { type: 'clear' };
      case 'Backspace':
        return { type: 'delete' };
      case 'Delete':
        return { type: 'clear' };
      case 'c':
      case 'C':
        if (e.ctrlKey || e.metaKey) return null;
        return { type: 'clear' };
      case 'p':
      case 'P':
        if (!e.ctrlKey && !e.metaKey) return { type: 'append', value: 'pi' };
        return null;
      case 'e':
        if (!e.ctrlKey && !e.metaKey) return { type: 'append', value: 'e' };
        return null;
    }

    if (e.shiftKey) {
      switch (k) {
        case '9': return { type: 'append', value: '(' };
        case '0': return { type: 'append', value: ')' };
      }
    }

    return null;
  }

  function attach(handlers) {
    document.addEventListener('keydown', function (e) {
      if (isTypingTarget(document.activeElement)) return;
      var action = mapEvent(e);
      if (!action) return;
      e.preventDefault();
      switch (action.type) {
        case 'append': handlers.append(action.value); break;
        case 'equals': handlers.equals(); break;
        case 'clear': handlers.clear(); break;
        case 'delete': handlers.delete(); break;
      }
    });
  }

  global.KeyboardSupport = { attach: attach };
})(window);
