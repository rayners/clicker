/**
 * Expressions in a game definition: conditions and formulas written as short strings (`made >= 2000 and
 * has('jingle')`), parsed once by jsep and evaluated against only the names and functions a game allows. Nothing is
 * ever run as code.
 * @module
 */
import jsep from 'jsep';

// Words as well as symbols, so definitions read like sentences. jsep's settings are global; these only add operators.
jsep.addBinaryOp('or', 1);
jsep.addBinaryOp('and', 2);
jsep.addUnaryOp('not');

/** A mistake in an expression: an unknown name, a forbidden construct, or a syntax error, with where it is. */
export class ExprError extends Error {}

/** What an expression may read: values by name, and the game's own functions. */
export interface ExprScope {
  value(name: string): number;
  call(fn: string, args: readonly (number | string | boolean)[]): number | boolean;
}

/** A compiled expression: the names it reads, and how to evaluate it against a scope. */
export interface Expr {
  source: string;
  names: readonly string[];
  evaluate(scope: ExprScope): number | boolean;
}

type Value = number | string | boolean;
type Node = jsep.Expression;

const MATH: Record<string, (...args: number[]) => number> = {
  min: Math.min,
  max: Math.max,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  abs: Math.abs,
};

const BINARY: Record<string, (a: Value, b: Value) => Value> = {
  '+': (a, b) => Number(a) + Number(b),
  '-': (a, b) => Number(a) - Number(b),
  '*': (a, b) => Number(a) * Number(b),
  '/': (a, b) => Number(a) / Number(b),
  '%': (a, b) => Number(a) % Number(b),
  '<': (a, b) => Number(a) < Number(b),
  '<=': (a, b) => Number(a) <= Number(b),
  '>': (a, b) => Number(a) > Number(b),
  '>=': (a, b) => Number(a) >= Number(b),
  '==': (a, b) => a === b,
  '!=': (a, b) => a !== b,
};
const LOGICAL = new Set(['and', 'or', '&&', '||']);

/** Compiles `source`, checking every name against `names` and every call against the game's `functions`. */
export function compile(source: string, options: { names: ReadonlySet<string> | ((name: string) => boolean); functions?: readonly string[] }): Expr {
  const known = typeof options.names === 'function' ? options.names : (n: string) => (options.names as ReadonlySet<string>).has(n);
  const functions = new Set(options.functions ?? []);
  let tree: Node;
  try {
    tree = jsep(source);
  } catch (e) {
    const err = e as Error & { index?: number };
    throw new ExprError(`${err.message.replace(/ at character \d+$/, '')} at column ${(err.index ?? 0) + 1} in "${source}"`);
  }
  const names: string[] = [];
  const at = (name: string) => `at column ${source.indexOf(name) + 1} in "${source}"`;

  /** A dotted name (`autoclipper.rate`) from member access, or null for anything else. */
  const dotted = (node: Node): string | null => {
    if (node.type === 'Identifier') return node.name as string;
    if (node.type === 'MemberExpression' && !node.computed) {
      const object = dotted(node.object as Node);
      const property = (node.property as Node).type === 'Identifier' ? ((node.property as Node).name as string) : null;
      return object && property ? `${object}.${property}` : null;
    }
    return null;
  };

  /** Checks the tree once, collecting names; evaluation then trusts it. */
  const check = (node: Node): void => {
    switch (node.type) {
      case 'Literal':
        return;
      case 'Identifier':
      case 'MemberExpression': {
        const name = dotted(node);
        if (!name || name === 'this' || name.startsWith('this.')) throw new ExprError(`only plain names are allowed ${at(source)}`);
        if (name === 'true' || name === 'false') return;
        if (!known(name)) throw new ExprError(`unknown name "${name}" ${at(name)}`);
        if (!names.includes(name)) names.push(name);
        return;
      }
      case 'BinaryExpression':
        if (!(node.operator as string in BINARY) && !LOGICAL.has(node.operator as string)) throw new ExprError(`unknown operator "${node.operator}" ${at(node.operator as string)}`);
        check(node.left as Node);
        check(node.right as Node);
        return;
      case 'UnaryExpression':
        if (!['-', '+', '!', 'not'].includes(node.operator as string)) throw new ExprError(`unknown operator "${node.operator}" ${at(node.operator as string)}`);
        check(node.argument as Node);
        return;
      case 'ConditionalExpression':
        check(node.test as Node);
        check(node.consequent as Node);
        check(node.alternate as Node);
        return;
      case 'CallExpression': {
        const fn = (node.callee as Node).type === 'Identifier' ? ((node.callee as Node).name as string) : null;
        if (!fn || (!(fn in MATH) && !functions.has(fn))) throw new ExprError(`unknown function "${fn ?? '?'}" ${at(fn ?? '(')}`);
        (node.arguments as Node[]).forEach(check);
        return;
      }
      default:
        throw new ExprError(`"${node.type}" is not allowed ${at(source)}`);
    }
  };
  check(tree);

  const run = (node: Node, scope: ExprScope): Value => {
    switch (node.type) {
      case 'Literal':
        return node.value as Value;
      case 'Identifier':
      case 'MemberExpression': {
        const name = dotted(node)!;
        return name === 'true' ? true : name === 'false' ? false : scope.value(name);
      }
      case 'BinaryExpression': {
        const op = node.operator as string;
        if (op === 'and' || op === '&&') return Boolean(run(node.left as Node, scope)) && Boolean(run(node.right as Node, scope));
        if (op === 'or' || op === '||') return Boolean(run(node.left as Node, scope)) || Boolean(run(node.right as Node, scope));
        return BINARY[op]!(run(node.left as Node, scope), run(node.right as Node, scope));
      }
      case 'UnaryExpression': {
        const v = run(node.argument as Node, scope);
        return node.operator === '-' ? -Number(v) : node.operator === '+' ? Number(v) : !v;
      }
      case 'ConditionalExpression':
        return run(node.test as Node, scope) ? run(node.consequent as Node, scope) : run(node.alternate as Node, scope);
      case 'CallExpression': {
        const fn = (node.callee as Node).name as string;
        const args = (node.arguments as Node[]).map((a) => run(a, scope));
        return fn in MATH ? MATH[fn]!(...args.map(Number)) : scope.call(fn, args);
      }
      default:
        throw new ExprError(`"${node.type}" is not allowed`);
    }
  };

  return {
    source,
    names,
    evaluate: (scope) => {
      const v = run(tree, scope);
      return typeof v === 'string' ? Number(v) : v;
    },
  };
}
