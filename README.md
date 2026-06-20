# CalculatorRA

A professional scientific calculator built with vanilla JavaScript, HTML, and CSS. No dependencies, no build step — just open `index.html` in a modern browser.

The original design language (clean white surface, orange `#ff6200` accents, Poppins typography, rounded corners, subtle shadows) is preserved, with a full dark mode that follows the same accent system.

![CalculatorRA screenshot placeholder](docs/screenshot.png)

## Features

- Safe expression parser — no `eval()`, no `new Function()`. Expressions are tokenized and run through a recursive-descent parser that produces an AST, so untrusted input cannot escape into the host environment.
- Trigonometric functions (`sin`, `cos`, `tan`, `asin`, `acos`, `atan`, plus reciprocal `sec`/`csc`/`cot`) with a DEG/RAD toggle.
- Hyperbolic functions (`sinh`, `cosh`, `tanh`).
- Logarithms (`ln`, `log`, `log(x, base)`), exponentials (`exp`, `e^x`, `10^x`), and powers (`x^y`, `x^2`, `sqrt`, `cbrt`).
- Factorial with gamma function — works for non-integers via the Lanczos approximation.
- Complex number support — operations that would otherwise be undefined (such as `sqrt(-1)` or `asin(2)`) automatically return a complex result.
- Unit conversion helpers (`c2f`, `f2c`, `m2ft`, `ft2m`, `kg2lb`, `lb2kg`, `l2gal`, `gal2l`, `deg2rad`, `rad2deg`).
- Persistent history backed by `localStorage`, capped at 100 entries. Click any entry to reload the expression.
- Full keyboard support — number keys, operators, `Enter` to evaluate, `Escape` to clear, `Backspace` to delete.
- Dark mode toggle that respects the system preference on first visit and persists the user's choice.
- Scientific notation toggle for results.
- Copy result to clipboard.
- Responsive layout that works from phone to desktop.

## Usage

### Running locally

The project is a static site, so any of the following will work:

```bash
# Python 3
python3 -m http.server 8000

# Node (with npx)
npx serve .
```

Then open `http://localhost:8000` in your browser.

You can also open `index.html` directly with `file://` — most browsers allow it for this project because no modules are used.

### Basic arithmetic

```
2 + 2
(3 + 4) * 5
2^10
sqrt(2)
```

### Functions

```
sin(pi / 2)      # 1
log(1000)        # 3 (log base 10)
ln(e)            # 1
5!               # 120
(0.5)!           # ~0.886 via gamma function
sqrt(-1)         # 1i (complex)
asin(2)          # 1.5707... - 1.3169...i (complex)
```

### Unit conversions

```
c2f(100)         # 212
m2ft(1)          # 3.28084
kg2lb(50)        # 110.231
```

### Operators

| Symbol | Operation    | Example   |
|--------|--------------|-----------|
| `+`    | Addition     | `2 + 3`   |
| `-`    | Subtraction  | `7 - 4`   |
| `*`    | Multiplication | `6 * 7` |
| `/`    | Division     | `8 / 2`   |
| `^`    | Power        | `2 ^ 10`  |
| `%`    | Modulo       | `17 % 5`  |
| `!`    | Factorial    | `5!`      |
| `()`   | Grouping     | `(2+3)*4` |

## Keyboard shortcuts

| Key                | Action                       |
|--------------------|------------------------------|
| `0`-`9`, `.`       | Insert digit / decimal       |
| `+` `-` `*` `/`    | Insert operator              |
| `^` `%` `!`        | Insert power, modulo, factorial |
| `(` `)`            | Insert parentheses           |
| `,`                | Argument separator           |
| `Enter` or `=`     | Evaluate                     |
| `Backspace`        | Delete last character        |
| `Escape` or `Del`  | Clear all                    |

The keyboard handler does not fire while typing inside a text input.

## Architecture

```
calculatorRA/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── math-engine.js   Safe parser + gamma + complex arithmetic
│   ├── theme.js         Dark mode + localStorage persistence
│   ├── history.js       History list with click-to-reload
│   ├── keyboard.js      Global keyboard handler
│   └── calculator.js    UI controller — wires everything together
├── README.md
├── LICENSE
└── .gitignore
```

### How the math engine works

1. **Tokenize** — the input string is split into `num`, `ident`, `op`, `lp`, `rp`, and `comma` tokens.
2. **Parse** — a recursive-descent parser produces an AST. Operator precedence: `+`/`-` lowest, then `*`/`/`/`%`, then `^` (right-associative), then unary, then postfix `!`.
3. **Evaluate** — the AST is evaluated bottom-up. Real numbers are returned as JavaScript `number` values; operations that would produce an imaginary component (such as `sqrt(-1)`) return a `{re, im}` complex object instead of throwing.

The gamma function uses the Lanczos approximation with reflection for arguments below 0.5. This is accurate to about 15 significant digits for typical inputs.

## Tech stack

- HTML5
- CSS3 with custom properties for theming
- Vanilla JavaScript (ES5-compatible) — no transpilation, no bundler
- Poppins from Google Fonts

## Browser support

CalculatorRA targets modern evergreen browsers:

- Chrome / Edge 90+
- Firefox 88+
- Safari 14+

## License

Released under the MIT License. See [LICENSE](LICENSE) for the full text.

## Credits

Designed and built by Rishvanth Amsaraj.
