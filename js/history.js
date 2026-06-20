/* ============================================================
 * history.js
 *
 * Persistent calculation history backed by localStorage. Entries
 * are capped to keep storage small. The UI is rendered into a
 * container element and clicking an entry re-loads its
 * expression into the calculator.
 * ============================================================ */

(function (global) {
  'use strict';

  var STORAGE_KEY = 'calculatorRA.history';
  var MAX_ENTRIES = 100;

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function save(entries) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (e) {
      /* storage failure — silently drop the write */
    }
  }

  function add(expression, result) {
    var entries = load();
    entries.unshift({
      expression: String(expression),
      result: String(result),
      ts: Date.now()
    });
    if (entries.length > MAX_ENTRIES) entries = entries.slice(0, MAX_ENTRIES);
    save(entries);
    return entries;
  }

  function clear() {
    save([]);
    return [];
  }

  function all() {
    return load();
  }

  function escape(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function render(container, options) {
    options = options || {};
    var onPick = options.onPick || function () {};
    var entries = load();
    if (!entries.length) {
      container.innerHTML = '<div class="history-empty">No calculations yet</div>';
      return;
    }
    var html = entries.map(function (e) {
      return (
        '<button type="button" class="history-entry" data-expression="' +
        escape(e.expression) + '">' +
          '<div class="history-expression">' + escape(e.expression) + '</div>' +
          '<div class="history-result">= ' + escape(e.result) + '</div>' +
        '</button>'
      );
    }).join('');
    container.innerHTML = html;
    var buttons = container.querySelectorAll('.history-entry');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function () {
        var expr = this.getAttribute('data-expression');
        onPick(expr);
      });
    }
  }

  global.History = {
    add: add,
    clear: clear,
    all: all,
    render: render
  };
})(window);
