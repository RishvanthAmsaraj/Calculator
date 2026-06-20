/* ============================================================
 * math-engine.js
 *
 * A safe expression evaluator for the calculator. We never use
 * eval() or new Function(); instead we tokenize the input and
 * run a recursive-descent parser that produces an AST, then
 * evaluate the AST. The engine supports complex numbers via a
 * small {re, im} representation so things like asin(2) or
 * sqrt(-1) do not throw — they return a complex value.
 * ============================================================ */

(function (global) {
  'use strict';

  // ---------- Complex number helpers ----------
  function C(re, im) { return { re: re, im: im || 0 }; }
  function isC(x) { return x && typeof x.re === 'number' && typeof x.im === 'number'; }
  function cAdd(a, b) { return C(a.re + b.re, a.im + b.im); }
  function cSub(a, b) { return C(a.re - b.re, a.im - b.im); }
  function cMul(a, b) {
    return C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
  }
  function cDiv(a, b) {
    var d = b.re * b.re + b.im * b.im;
    if (d === 0) throw new Error('Division by zero');
    return C((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
  }
  function cNeg(a) { return C(-a.re, -a.im); }
  function cPow(a, b) {
    // exp(b * log(a))
    return cExp(cMul(cLog(a), b));
  }
  function cAbs(a) { return Math.hypot(a.re, a.im); }
  function cArg(a) { return Math.atan2(a.im, a.re); }
  function cExp(a) {
    var er = Math.exp(a.re);
    return C(er * Math.cos(a.im), er * Math.sin(a.im));
  }
  function cLog(a) {
    var r = cAbs(a);
    if (r === 0) throw new Error('log(0) undefined');
    return C(Math.log(r), cArg(a));
  }
  function cSqrt(a) {
    var r = cAbs(a);
    var theta = cArg(a);
    var sr = Math.sqrt(r);
    var st = theta / 2;
    return C(sr * Math.cos(st), sr * Math.sin(st));
  }
  function cSin(a) { return C(Math.sin(a.re) * Math.cosh(a.im), Math.cos(a.re) * Math.sinh(a.im)); }
  function cCos(a) { return C(Math.cos(a.re) * Math.cosh(a.im), -Math.sin(a.re) * Math.sinh(a.im)); }
  function cTan(a) { return cDiv(cSin(a), cCos(a)); }
  function cAsin(a) {
    // asin(z) = -i * log(i*z + sqrt(1 - z^2))
    var one = C(1, 0);
    var iz = C(-a.im, a.re);
    var s = cSqrt(cSub(one, cMul(a, a)));
    return cMul(C(0, -1), cLog(cAdd(iz, s)));
  }
  function cAcos(a) {
    // acos(z) = pi/2 - asin(z)
    return cSub(C(Math.PI / 2, 0), cAsin(a));
  }
  function cAtan(a) {
    // atan(z) = (i/2) * log((i - z)/(i + z))
    var i = C(0, 1);
    return cMul(cDiv(C(0, 0.5), C(1, 0)), cLog(cDiv(cSub(i, a), cAdd(i, a))));
  }
  function cSinh(a) { return C(Math.sinh(a.re) * Math.cos(a.im), Math.cosh(a.re) * Math.sin(a.im)); }
  function cCosh(a) { return C(Math.cosh(a.re) * Math.cos(a.im), Math.sinh(a.re) * Math.sin(a.im)); }
  function cTanh(a) {
    var sp = cSinh(a), cp = cCosh(a);
    return cDiv(sp, cp);
  }

  // Promote a real to complex only when we need to (e.g. asin(2))
  function asC(x) { return isC(x) ? x : C(x, 0); }
  function toReal(x) {
    if (isC(x)) {
      if (Math.abs(x.im) > 1e-10) {
        throw new Error('Complex result: ' + formatComplex(x));
      }
      return x.re;
    }
    return x;
  }

  function formatComplex(z) {
    var r = roundTo(z.re, 10);
    var i = roundTo(z.im, 10);
    if (Math.abs(i) < 1e-12) return String(r);
    if (Math.abs(r) < 1e-12) return i + 'i';
    return r + (i >= 0 ? ' + ' : ' - ') + Math.abs(i) + 'i';
  }

  function roundTo(n, sig) {
    if (!isFinite(n)) return n;
    if (n === 0) return 0;
    var d = sig - Math.floor(Math.log10(Math.abs(n))) - 1;
    var m = Math.pow(10, d);
    return Math.round(n * m) / m;
  }

  // ---------- Constants ----------
  var CONSTANTS = {
    pi: Math.PI,
    e: Math.E,
    phi: (1 + Math.sqrt(5)) / 2
  };

  // ---------- Gamma function (Lanczos approximation) ----------
  // Falls back to integer factorial for non-negative integers.
  function gamma(z) {
    if (typeof z !== 'number') throw new Error('gamma() expects a number');
    // For integers: 0! = 1, 1! = 1, n! = n*(n-1)! for n >= 1
    // For half-integers and beyond, use Lanczos.
    var g = 7;
    var c = [
      0.99999999999980993,
      676.520368121885,
      -1259.1392167224028,
      771.32342877765313,
      -176.61502916214059,
      12.507343278686905,
      -0.13857109526572012,
      9.9843695780195716e-6,
      1.5056327351493116e-7
    ];
    if (z < 0.5) {
      // Reflection: gamma(z) * gamma(1-z) = pi / sin(pi*z)
      return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
    }
    z -= 1;
    var x = c[0];
    for (var i = 1; i < g + 2; i++) x += c[i] / (z + i);
    var t = z + g + 0.5;
    return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
  }

  function factorial(x) {
    // Accept real numbers; if non-integer, use gamma(x+1).
    if (typeof x !== 'number' || isNaN(x)) throw new Error('Factorial of non-number');
    if (x < 0) throw new Error('Factorial undefined for negative numbers');
    if (Math.abs(x - Math.round(x)) < 1e-12 && x <= 170) {
      var n = Math.round(x);
      var r = 1;
      for (var i = 2; i <= n; i++) r *= i;
      return r;
    }
    return gamma(x + 1);
  }

  // ---------- Tokenizer ----------
  // Produces tokens: number, ident, op, lparen, rparen, comma
  function tokenize(input) {
    var tokens = [];
    var i = 0;
    var n = input.length;
    while (i < n) {
      var ch = input[i];
      if (ch === ' ' || ch === '\t') { i++; continue; }
      if (ch === '(' || ch === ')' || ch === ',') {
        tokens.push({ t: ch === '(' ? 'lp' : ch === ')' ? 'rp' : 'comma', v: ch });
        i++;
        continue;
      }
      // Operators (multi-char first)
      if ('+-*/^%!'.indexOf(ch) !== -1) {
        tokens.push({ t: 'op', v: ch });
        i++;
        continue;
      }
      // Numbers: digits, optional decimal, optional exponent
      if ((ch >= '0' && ch <= '9') || ch === '.') {
        var j = i;
        while (j < n && ((input[j] >= '0' && input[j] <= '9') || input[j] === '.')) j++;
        // Exponent
        if (j < n && (input[j] === 'e' || input[j] === 'E')) {
          j++;
          if (j < n && (input[j] === '+' || input[j] === '-')) j++;
          while (j < n && (input[j] >= '0' && input[j] <= '9')) j++;
        }
        var num = parseFloat(input.substring(i, j));
        if (isNaN(num)) throw new Error('Bad number near "' + input.substring(i, j) + '"');
        tokens.push({ t: 'num', v: num });
        i = j;
        continue;
      }
      // Identifiers: functions and constants (allow letters and underscore)
      if (/[A-Za-z_]/.test(ch)) {
        var k = i;
        while (k < n && /[A-Za-z0-9_]/.test(input[k])) k++;
        var name = input.substring(i, k);
        tokens.push({ t: 'ident', v: name });
        i = k;
        continue;
      }
      throw new Error('Unexpected character: ' + ch);
    }
    return tokens;
  }

  // ---------- Parser (recursive descent) ----------
  // Grammar:
  //   expr   := term (('+'|'-') term)*
  //   term   := power (('*'|'/') power)*
  //   power  := unary ('^' unary)*    // right-associative
  //   unary  := ('+'|'-') unary | postfix
  //   postfix:= primary ('!')*
  //   primary:= number | ident | ident '(' args ')' | '(' expr ')'
  //   args   := expr (',' expr)*
  function Parser(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }
  Parser.prototype.peek = function () { return this.tokens[this.pos]; };
  Parser.prototype.consume = function (t) {
    var tok = this.tokens[this.pos];
    if (!tok || tok.t !== t) throw new Error('Expected ' + t);
    this.pos++;
    return tok;
  };
  Parser.prototype.parse = function () {
    var node = this.expr();
    if (this.pos < this.tokens.length) throw new Error('Unexpected: ' + this.tokens[this.pos].v);
    return node;
  };
  Parser.prototype.expr = function () {
    var left = this.term();
    while (this.peek() && this.peek().t === 'op' && (this.peek().v === '+' || this.peek().v === '-')) {
      var op = this.consume('op').v;
      var right = this.term();
      left = { n: 'bin', op: op, a: left, b: right };
    }
    return left;
  };
  Parser.prototype.term = function () {
    var left = this.power();
    while (this.peek() && this.peek().t === 'op' && (this.peek().v === '*' || this.peek().v === '/' || this.peek().v === '%')) {
      var op = this.consume('op').v;
      var right = this.power();
      left = { n: 'bin', op: op, a: left, b: right };
    }
    return left;
  };
  Parser.prototype.power = function () {
    var left = this.unary();
    if (this.peek() && this.peek().t === 'op' && this.peek().v === '^') {
      this.consume('op');
      var right = this.power(); // right-associative
      return { n: 'bin', op: '^', a: left, b: right };
    }
    return left;
  };
  Parser.prototype.unary = function () {
    var tok = this.peek();
    if (tok && tok.t === 'op' && (tok.v === '+' || tok.v === '-')) {
      this.consume('op');
      return { n: 'unary', op: tok.v, a: this.unary() };
    }
    return this.postfix();
  };
  Parser.prototype.postfix = function () {
    var node = this.primary();
    while (this.peek() && this.peek().t === 'op' && this.peek().v === '!') {
      this.consume('op');
      node = { n: 'factorial', a: node };
    }
    return node;
  };
  Parser.prototype.primary = function () {
    var tok = this.peek();
    if (!tok) throw new Error('Unexpected end of expression');
    if (tok.t === 'num') {
      this.consume('num');
      return { n: 'num', v: tok.v };
    }
    if (tok.t === 'lp') {
      this.consume('lp');
      var e = this.expr();
      this.consume('rp');
      return e;
    }
    if (tok.t === 'ident') {
      this.consume('ident');
      var name = tok.v;
      // Constants
      if (Object.prototype.hasOwnProperty.call(CONSTANTS, name)) {
        return { n: 'num', v: CONSTANTS[name] };
      }
      // Function call
      if (this.peek() && this.peek().t === 'lp') {
        this.consume('lp');
        var args = [];
        if (!(this.peek() && this.peek().t === 'rp')) {
          args.push(this.expr());
          while (this.peek() && this.peek().t === 'comma') {
            this.consume('comma');
            args.push(this.expr());
          }
        }
        this.consume('rp');
        return { n: 'call', name: name, args: args };
      }
      throw new Error('Unknown identifier: ' + name);
    }
    throw new Error('Unexpected token: ' + tok.v);
  };

  // ---------- Evaluator ----------
  function evaluate(node, opts) {
    opts = opts || {};
    var angleMode = opts.angleMode || 'rad';
    var toRad = function (x) { return x; };
    var fromRad = function (x) { return x; };
    if (angleMode === 'deg') {
      toRad = function (x) { return x * Math.PI / 180; };
      fromRad = function (x) { return x * 180 / Math.PI; };
    }
    switch (node.n) {
      case 'num': return node.v;
      case 'unary':
        var v = evaluate(node.a, opts);
        if (node.op === '-') return isC(v) ? cNeg(v) : -v;
        return v;
      case 'bin': {
        var a = evaluate(node.a, opts);
        var b = evaluate(node.b, opts);
        switch (node.op) {
          case '+': return isC(a) || isC(b) ? cAdd(asC(a), asC(b)) : a + b;
          case '-': return isC(a) || isC(b) ? cSub(asC(a), asC(b)) : a - b;
          case '*': return isC(a) || isC(b) ? cMul(asC(a), asC(b)) : a * b;
          case '/':
            if (!isC(b) && b === 0) throw new Error('Division by zero');
            if (isC(b) && b.re === 0 && b.im === 0) throw new Error('Division by zero');
            return isC(a) || isC(b) ? cDiv(asC(a), asC(b)) : a / b;
          case '%': {
            if (isC(a) || isC(b)) throw new Error('Modulo on complex numbers not supported');
            if (b === 0) throw new Error('Division by zero');
            return a % b;
          }
          case '^': return powMixed(a, b);
        }
        throw new Error('Unknown operator: ' + node.op);
      }
      case 'factorial': {
        var f = evaluate(node.a, opts);
        if (isC(f)) throw new Error('Factorial of complex number');
        return factorial(f);
      }
      case 'call': {
        var args = node.args.map(function (a) { return evaluate(a, opts); });
        return callFunction(node.name, args, toRad, fromRad);
      }
    }
    throw new Error('Bad node');
  }

  function powMixed(a, b) {
    // a^b, with complex-aware handling
    if (isC(a) || isC(b)) {
      // 0^negative is undefined
      if (isC(a) && a.re === 0 && a.im === 0) {
        if (isC(b) || b < 0) throw new Error('0^negative undefined');
        return C(0, 0);
      }
      return cPow(asC(a), asC(b));
    }
    // Real path
    if (a === 0 && b < 0) throw new Error('0^negative undefined');
    if (a < 0 && !Number.isInteger(b)) {
      // Negative base with non-integer exponent: fall back to complex
      return cPow(asC(a), asC(b));
    }
    return Math.pow(a, b);
  }

  // ---------- Function table ----------
  function callFunction(name, args, toRad, fromRad) {
    var n = args.length;
    // trig — always work in radians internally, convert at the boundary
    function trig(name, realFn) {
      if (n !== 1) throw new Error(name + '() expects 1 argument');
      var x = args[0];
      if (isC(x)) {
        if (name === 'sin') return cSin(x);
        if (name === 'cos') return cCos(x);
        if (name === 'tan') return cTan(x);
        if (name === 'asin') return cAsin(x);
        if (name === 'acos') return cAcos(x);
        if (name === 'atan') return cAtan(x);
      }
      if (name === 'sin') return realFn(toRad(x));
      if (name === 'cos') return realFn(toRad(x));
      if (name === 'tan') return realFn(toRad(x));
      // Inverses return radians natively; convert back if user wants degrees
      // If the real result is NaN (e.g. asin(2)), promote to complex.
      if (name === 'asin') {
        var r = Math.asin(x);
        if (isNaN(r)) return cAsin(C(x, 0));
        return fromRad(r);
      }
      if (name === 'acos') {
        r = Math.acos(x);
        if (isNaN(r)) return cAcos(C(x, 0));
        return fromRad(r);
      }
      if (name === 'atan') return fromRad(Math.atan(x));
    }
    switch (name) {
      case 'sin': return trig('sin', Math.sin);
      case 'cos': return trig('cos', Math.cos);
      case 'tan': return trig('tan', Math.tan);
      case 'asin': return trig('asin', Math.asin);
      case 'acos': return trig('acos', Math.acos);
      case 'atan': return trig('atan', Math.atan);
      case 'sinh': {
        if (n !== 1) throw new Error('sinh() expects 1 argument');
        var x = args[0];
        return isC(x) ? cSinh(x) : Math.sinh(x);
      }
      case 'cosh': {
        if (n !== 1) throw new Error('cosh() expects 1 argument');
        var x = args[0];
        return isC(x) ? cCosh(x) : Math.cosh(x);
      }
      case 'tanh': {
        if (n !== 1) throw new Error('tanh() expects 1 argument');
        var x = args[0];
        return isC(x) ? cTanh(x) : Math.tanh(x);
      }
      case 'sec': {
        if (n !== 1) throw new Error('sec() expects 1 argument');
        var x = args[0];
        var c = isC(x) ? cCos(x) : Math.cos(toRad(x));
        if (isC(c)) { if (c.re === 0 && c.im === 0) throw new Error('sec undefined'); return cDiv(C(1, 0), c); }
        if (c === 0) throw new Error('sec undefined');
        return 1 / c;
      }
      case 'csc': {
        if (n !== 1) throw new Error('csc() expects 1 argument');
        var x = args[0];
        var s = isC(x) ? cSin(x) : Math.sin(toRad(x));
        if (isC(s)) { if (s.re === 0 && s.im === 0) throw new Error('csc undefined'); return cDiv(C(1, 0), s); }
        if (s === 0) throw new Error('csc undefined');
        return 1 / s;
      }
      case 'cot': {
        if (n !== 1) throw new Error('cot() expects 1 argument');
        var x = args[0];
        var s = isC(x) ? cSin(x) : Math.sin(toRad(x));
        if (isC(s)) { if (s.re === 0 && s.im === 0) throw new Error('cot undefined'); return cDiv(s, cCos(x)); }
        if (s === 0) throw new Error('cot undefined');
        return 1 / Math.tan(toRad(x));
      }
      case 'log': {
        if (n === 1) {
          var x = args[0];
          if (isC(x)) return cLog(x);
          if (x <= 0) throw new Error('log undefined for non-positive');
          return Math.log10(x);
        }
        if (n === 2) {
          var base = args[1];
          var val = args[0];
          if (base <= 0 || base === 1) throw new Error('log base must be > 0 and != 1');
          if (val <= 0) throw new Error('log undefined for non-positive');
          return Math.log(val) / Math.log(base);
        }
        throw new Error('log() takes 1 or 2 arguments');
      }
      case 'ln': {
        if (n !== 1) throw new Error('ln() expects 1 argument');
        var x = args[0];
        if (isC(x)) return cLog(x);
        if (x <= 0) throw new Error('ln undefined for non-positive');
        return Math.log(x);
      }
      case 'exp': {
        if (n !== 1) throw new Error('exp() expects 1 argument');
        var x = args[0];
        return isC(x) ? cExp(x) : Math.exp(x);
      }
      case 'sqrt': {
        if (n !== 1) throw new Error('sqrt() expects 1 argument');
        var x = args[0];
        if (isC(x)) return cSqrt(x);
        if (x < 0) return cSqrt(C(x, 0));
        return Math.sqrt(x);
      }
      case 'cbrt': {
        if (n !== 1) throw new Error('cbrt() expects 1 argument');
        return Math.cbrt(args[0]);
      }
      case 'abs': {
        if (n !== 1) throw new Error('abs() expects 1 argument');
        var x = args[0];
        return isC(x) ? cAbs(x) : Math.abs(x);
      }
      case 'round': {
        if (n === 1) return Math.round(args[0]);
        if (n === 2) {
          var p = Math.pow(10, args[1]);
          return Math.round(args[0] * p) / p;
        }
        throw new Error('round() takes 1 or 2 arguments');
      }
      case 'floor': {
        if (n !== 1) throw new Error('floor() expects 1 argument');
        return Math.floor(args[0]);
      }
      case 'ceil': {
        if (n !== 1) throw new Error('ceil() expects 1 argument');
        return Math.ceil(args[0]);
      }
      case 'min': {
        if (n === 0) throw new Error('min() needs at least 1 argument');
        return Math.min.apply(null, args);
      }
      case 'max': {
        if (n === 0) throw new Error('max() needs at least 1 argument');
        return Math.max.apply(null, args);
      }
      case 'pow': {
        if (n !== 2) throw new Error('pow() expects 2 arguments');
        return powMixed(args[0], args[1]);
      }
      case 'gamma': {
        if (n !== 1) throw new Error('gamma() expects 1 argument');
        if (isC(args[0])) throw new Error('gamma of complex not supported');
        return gamma(args[0]);
      }
      case 'fact': {
        if (n !== 1) throw new Error('fact() expects 1 argument');
        return factorial(args[0]);
      }
      // Unit conversions
      case 'deg2rad': return args[0] * Math.PI / 180;
      case 'rad2deg': return args[0] * 180 / Math.PI;
      case 'c2f': return args[0] * 9 / 5 + 32;
      case 'f2c': return (args[0] - 32) * 5 / 9;
      case 'm2ft': return args[0] * 3.28084;
      case 'ft2m': return args[0] / 3.28084;
      case 'kg2lb': return args[0] * 2.20462;
      case 'lb2kg': return args[0] / 2.20462;
      case 'l2gal': return args[0] * 0.264172;
      case 'gal2l': return args[0] / 0.264172;
    }
    throw new Error('Unknown function: ' + name);
  }

  // ---------- Public API ----------
  function evaluateExpression(input, opts) {
    if (typeof input !== 'string') throw new Error('Expression must be a string');
    // Normalize display symbols into parser tokens
    var normalized = input
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-') // unicode minus
      .replace(/π/g, 'pi')
      .replace(/√/g, 'sqrt')
      .replace(/\s+/g, ' ')
      .trim();
    if (normalized === '') throw new Error('Empty expression');
    var tokens = tokenize(normalized);
    if (tokens.length === 0) throw new Error('Empty expression');
    var parser = new Parser(tokens);
    var ast = parser.parse();
    return evaluate(ast, opts || {});
  }

  function formatResult(value, opts) {
    opts = opts || {};
    var sci = opts.scientific;
    if (isC(value)) return formatComplex(value);
    if (typeof value !== 'number') return String(value);
    if (isNaN(value)) return 'NaN';
    if (!isFinite(value)) return value > 0 ? 'Infinity' : '-Infinity';
    if (sci) {
      // Force scientific notation
      var s = value.toExponential(10);
      // Trim trailing zeros from mantissa
      s = s.replace(/(\.\d*?)0+e/, '$1e').replace(/\.e/, 'e');
      return s;
    }
    // Auto: scientific for very large or very small numbers
    if (value !== 0 && (Math.abs(value) >= 1e16 || Math.abs(value) < 1e-9)) {
      return value.toExponential(10).replace(/(\.\d*?)0+e/, '$1e').replace(/\.e/, 'e');
    }
    // Strip trailing zeros from decimal numbers
    var out = String(roundTo(value, 12));
    if (out.indexOf('.') !== -1) out = out.replace(/0+$/, '').replace(/\.$/, '');
    return out;
  }

  global.MathEngine = {
    evaluate: evaluateExpression,
    format: formatResult,
    // Exposed for tests
    tokenize: tokenize,
    gamma: gamma,
    factorial: factorial
  };
})(typeof window !== 'undefined' ? window : globalThis);
