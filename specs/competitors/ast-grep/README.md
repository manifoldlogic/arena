# ast-grep Competitor

**Paradigm:** Structural AST search
**Model:** Haiku
**Primary tool:** ast-grep (tree-sitter-based structural pattern matching)

## Overview

ast-grep uses tree-sitter grammars to parse source code into ASTs and match structural patterns. Unlike text-based grep, it understands code structure — a pattern like `class $NAME($$$BASES)` matches any Python class definition regardless of formatting, comments, or whitespace.

## Hypothesis

Structural search should excel at enumeration queries (find all classes, functions, imports of a certain shape) and precision queries (find exactly this pattern, not similar text). It should be weaker on semantic queries that require understanding relationships between components, and on queries where the answer is in comments, strings, or configuration files that ast-grep cannot structurally parse.

## Installation

```sh
./competitors/ast-grep/setup.sh
```

Requires `cargo` (Rust toolchain). Installs ast-grep v0.42.0.

## Key Patterns

| Pattern                        | Language   | Matches                      |
| ------------------------------ | ---------- | ---------------------------- |
| `class $NAME($$$BASES)`        | python     | Class definitions with bases |
| `def $FUNC($$$ARGS)`           | python     | Function definitions         |
| `async def $FUNC($$$ARGS)`     | python     | Async function definitions   |
| `from $MODULE import $$$NAMES` | python     | Import-from statements       |
| `class $NAME`                  | typescript | Class definitions            |
| `interface $NAME`              | typescript | Interface definitions        |
| `function $NAME($$$ARGS)`      | typescript | Function declarations        |

## Known Limitations

- Do NOT use `: $$$BODY` after function/class signatures (causes silent parse failure)
- Literal class name patterns may trigger ERROR node warnings
- Zero results can mean "pattern syntax error" or "genuinely not found" — always verify with a simpler pattern
