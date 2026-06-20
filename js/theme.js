/* ============================================================
 * theme.js
 *
 * Dark mode toggle with localStorage persistence. The current
 * theme is applied to <html data-theme="..."> so CSS variables
 * can drive every color without rewriting the stylesheet.
 * ============================================================ */

(function (global) {
  'use strict';

  var STORAGE_KEY = 'calculatorRA.theme';

  function getStoredTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function setStoredTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
      /* localStorage unavailable (private mode, quota). Fail silently. */
    }
  }

  function getSystemPreference() {
    if (global.matchMedia && global.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  function resolveInitialTheme() {
    var stored = getStoredTheme();
    if (stored === 'light' || stored === 'dark') return stored;
    return getSystemPreference();
  }

  function applyTheme(theme) {
    var root = document.documentElement;
    root.setAttribute('data-theme', theme);
    var btn = document.querySelector('[data-theme-toggle]');
    if (btn) {
      var label = theme === 'dark' ? 'Light mode' : 'Dark mode';
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
    }
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme') || 'light';
    var next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setStoredTheme(next);
    return next;
  }

  function initTheme() {
    applyTheme(resolveInitialTheme());
  }

  global.Theme = {
    init: initTheme,
    apply: applyTheme,
    toggle: toggleTheme,
    current: function () { return document.documentElement.getAttribute('data-theme') || 'light'; }
  };
})(window);
