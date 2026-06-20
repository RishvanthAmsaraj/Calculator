/* ============================================================
 * calculator.js
 *
 * UI controller. Wires DOM buttons, the keyboard handler, the
 * history panel, and the theme toggle to the math engine.
 * ============================================================ */

(function () {
  'use strict';

  var MAX_INPUT = 200;
  var state = {
    expression: '',
    lastResult: null,
    justEvaluated: false,
    angleMode: 'rad',   // 'rad' | 'deg'
    scientific: false  // scientific notation on the result
  };

  // ---------- DOM lookups (done after DOMContentLoaded) ----------
  var els = {};

  function $(id) { return document.getElementById(id); }

  function bindElements() {
    els.expression = $('expression');
    els.result = $('result');
    els.historyPanel = $('history-panel');
    els.historyList = $('history-list');
    els.historyToggle = $('history-toggle');
    els.historyClear = $('history-clear');
    els.toggleFunctions = $('functions-button');
    els.scientificPanel = $('scientific-functions');
    els.themeToggle = $('theme-toggle');
    els.angleToggle = $('angle-toggle');
    els.sciToggle = $('sci-toggle');
    els.copyBtn = $('copy-btn');
    els.calcRoot = $('calculator-container');
    els.acBtn = document.querySelector('[data-action="clear"]');
  }

  // ---------- Rendering ----------
  function renderExpression() {
    els.expression.textContent = state.expression || '';
    els.expression.scrollLeft = els.expression.scrollWidth;
  }

  function renderResult() {
    var text;
    if (state.lastResult === null) text = '0';
    else if (state.lastResult instanceof Error) text = state.lastResult.message;
    else text = MathEngine.format(state.lastResult, { scientific: state.scientific });
    els.result.textContent = text;
  }

  function renderAngleMode() {
    if (!els.angleToggle) return;
    els.angleToggle.textContent = state.angleMode === 'deg' ? 'DEG' : 'RAD';
    els.angleToggle.setAttribute('aria-pressed', state.angleMode === 'deg' ? 'true' : 'false');
  }

  function renderScientific() {
    if (!els.sciToggle) return;
    els.sciToggle.textContent = state.scientific ? 'SCI' : 'FIX';
    els.sciToggle.setAttribute('aria-pressed', state.scientific ? 'true' : 'false');
  }

  // ---------- Actions ----------
  function append(value) {
    if (state.justEvaluated) {
      // After evaluation, starting a new expression replaces the previous result.
      if (/[0-9.(πe]/.test(value) || value === 'pi' || value === 'e') {
        state.expression = '';
      }
      state.justEvaluated = false;
    }
    if (state.expression.length >= MAX_INPUT) return;
    state.expression += value;
    renderExpression();
  }

  function clearAll() {
    state.expression = '';
    state.lastResult = null;
    state.justEvaluated = false;
    renderExpression();
    renderResult();
  }

  function deleteLast() {
    if (state.justEvaluated) {
      // Backspace after evaluation clears, like most calculators.
      clearAll();
      return;
    }
    // Strip one logical character (handles multi-char tokens like "pi", "sqrt")
    var s = state.expression;
    if (!s) return;
    // Try longest tokens first
    var tokens = ['sqrt', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh', 'pi'];
    for (var i = 0; i < tokens.length; i++) {
      if (s.slice(-tokens[i].length) === tokens[i]) {
        state.expression = s.slice(0, -tokens[i].length);
        renderExpression();
        return;
      }
    }
    state.expression = s.slice(0, -1);
    renderExpression();
  }

  function toggleSign() {
    // Toggle sign of the last number or wrap the whole expression.
    var s = state.expression;
    if (!s) {
      state.expression = '-';
      renderExpression();
      return;
    }
    // Match the trailing number (possibly with sign)
    var m = s.match(/(-?\d+(\.\d+)?(e-?\d+)?)$/i);
    if (m) {
      var num = m[1];
      var start = m.index;
      if (num.indexOf('-') === 0) {
        state.expression = s.slice(0, start) + num.slice(1);
      } else {
        state.expression = s.slice(0, start) + '-' + num;
      }
    } else {
      state.expression = s + '-';
    }
    renderExpression();
  }

  function evaluate() {
    if (!state.expression) return;
    try {
      var value = MathEngine.evaluate(state.expression, { angleMode: state.angleMode });
      state.lastResult = value;
      History.add(state.expression, MathEngine.format(value, { scientific: state.scientific }));
      refreshHistory();
    } catch (e) {
      state.lastResult = new Error(e.message);
    }
    state.justEvaluated = true;
    renderExpression();
    renderResult();
  }

  function copyResult() {
    var text = els.result.textContent;
    if (!text || text === '0' || text === 'Error') return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(showCopied).catch(fallbackCopy);
    } else {
      fallbackCopy();
    }
  }

  function fallbackCopy() {
    var ta = document.createElement('textarea');
    ta.value = els.result.textContent;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); showCopied(); } catch (e) {}
    document.body.removeChild(ta);
  }

  function showCopied() {
    if (!els.copyBtn) return;
    var original = els.copyBtn.textContent;
    els.copyBtn.textContent = 'Copied';
    setTimeout(function () { els.copyBtn.textContent = original; }, 1200);
  }

  // ---------- History UI ----------
  function refreshHistory() {
    History.render(els.historyList, {
      onPick: function (expr) {
        state.expression = expr;
        state.justEvaluated = false;
        renderExpression();
      }
    });
  }

  function toggleHistory() {
    var open = els.historyPanel.classList.toggle('open');
    els.historyToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) refreshHistory();
  }

  // ---------- Event wiring ----------
  function onButtonClick(e) {
    var btn = e.target.closest('button[data-value], button[data-action]');
    if (!btn) return;
    var value = btn.getAttribute('data-value');
    var action = btn.getAttribute('data-action');
    if (action) {
      switch (action) {
        case 'clear': return clearAll();
        case 'delete': return deleteLast();
        case 'toggle-sign': return toggleSign();
        case 'copy': return copyResult();
      }
    }
    if (value === null) return;
    handleValue(value);
  }

  function handleValue(value) {
    switch (value) {
      case '=': return evaluate();
      case 'C': return clearAll();
      case 'DEL': return deleteLast();
      case '+/-': return toggleSign();
      case 'pi': return append('pi');
      case 'e': return append('e');
      case 'sqrt': return append('sqrt(');
      case 'x^y': return append('^');
      case 'y^x': return append('^');
      case 'x^2': return append('^2');
      case 'e^x': return append('e^');
      case '10^x': return append('10^');
      case '1/x': return append('1/');
      case 'n!': return append('!');
      case 'ln': return append('ln(');
      case 'log': return append('log(');
      // Functions that take a single argument and need parens
      case 'sin': case 'cos': case 'tan':
      case 'sec': case 'csc': case 'cot':
      case 'asin': case 'acos': case 'atan':
      case 'sinh': case 'cosh': case 'tanh':
      case 'cbrt': case 'abs': case 'round':
        return append(value + '(');
      default: return append(value);
    }
  }

  function toggleFunctions() {
    var wrapper = $('scientific-functions-wrapper');
    var open = wrapper.classList.toggle('open');
    els.toggleFunctions.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function toggleAngle() {
    state.angleMode = state.angleMode === 'deg' ? 'rad' : 'deg';
    try { localStorage.setItem('calculatorRA.angle', state.angleMode); } catch (e) {}
    renderAngleMode();
  }

  function toggleScientific() {
    state.scientific = !state.scientific;
    try { localStorage.setItem('calculatorRA.sci', state.scientific ? '1' : '0'); } catch (e) {}
    renderScientific();
    renderResult();
  }

  function loadPreferences() {
    try {
      var a = localStorage.getItem('calculatorRA.angle');
      if (a === 'deg' || a === 'rad') state.angleMode = a;
      var s = localStorage.getItem('calculatorRA.sci');
      if (s === '1') state.scientific = true;
      if (s === '0') state.scientific = false;
    } catch (e) {}
  }

  function init() {
    bindElements();
    loadPreferences();
    Theme.init();
    renderExpression();
    renderResult();
    renderAngleMode();
    renderScientific();

    if (els.calcRoot) {
      els.calcRoot.addEventListener('click', onButtonClick);
    }
    if (els.toggleFunctions) els.toggleFunctions.addEventListener('click', toggleFunctions);
    if (els.historyToggle) els.historyToggle.addEventListener('click', toggleHistory);
    if (els.historyClear) els.historyClear.addEventListener('click', function () {
      History.clear();
      refreshHistory();
    });
    if (els.themeToggle) {
      els.themeToggle.addEventListener('click', function () { Theme.toggle(); });
    }
    if (els.angleToggle) els.angleToggle.addEventListener('click', toggleAngle);
    if (els.sciToggle) els.sciToggle.addEventListener('click', toggleScientific);

    KeyboardSupport.attach({
      append: append,
      equals: evaluate,
      clear: clearAll,
      delete: deleteLast
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
