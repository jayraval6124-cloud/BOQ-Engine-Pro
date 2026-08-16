import { evaluate } from "mathjs";

export interface FormulaVariables {
  Nos?: number;
  L?: number;
  B?: number;
  H?: number;
  D?: number;
  R?: number;
  Dia?: number;
  [key: string]: number | undefined;
}

export interface FormulaResult {
  value: number;
  error?: string;
}

export function evaluateFormula(expression: string, variables: FormulaVariables): FormulaResult {
  try {
    if (!expression || expression.trim() === "") {
      return { value: 0, error: "Empty expression" };
    }

    // Check for missing variables
    const scope: Record<string, number> = {};
    for (const [key, val] of Object.entries(variables)) {
      if (val !== undefined && val !== null && !isNaN(val)) {
        scope[key] = val;
      } else {
        scope[key] = 0;
      }
    }

    const result = evaluate(expression, scope);

    if (typeof result !== "number" || isNaN(result) || !isFinite(result)) {
      return { value: 0, error: "Invalid result" };
    }

    return { value: Math.round(result * 10000) / 10000 };
  } catch (err) {
    return { value: 0, error: err instanceof Error ? err.message : "Formula error" };
  }
}

export function calculateRowQuantity(
  formula: string | null,
  nos: number | null,
  length: number | null,
  breadth: number | null,
  height: number | null
): FormulaResult {
  if (!formula) {
    // Default: Nos × L × B × H (skip nulls)
    const n = nos ?? 1;
    const l = length ?? 1;
    const b = breadth ?? 1;
    const h = height ?? 1;

    // Determine which dimensions are meaningful
    const dims = [length, breadth, height].filter((v) => v !== null && v !== undefined && v > 0);
    let qty = n;
    dims.forEach((d) => { qty *= d!; });
    return { value: Math.round(qty * 10000) / 10000 };
  }

  return evaluateFormula(formula, {
    Nos: nos ?? 1,
    L: length ?? 0,
    B: breadth ?? 0,
    H: height ?? 0,
    D: height ?? 0,
  });
}

export function validateExpression(expression: string): { valid: boolean; error?: string; variables: string[] } {
  try {
    // Extract variable names from expression
    const varRegex = /[A-Za-z][A-Za-z0-9]*/g;
    const matches = expression.match(varRegex) || [];
    const mathFunctions = new Set(["sin", "cos", "tan", "sqrt", "abs", "ceil", "floor", "round", "log", "exp", "pi", "e"]);
    const variables = [...new Set(matches.filter((m) => !mathFunctions.has(m.toLowerCase())))];

    // Try evaluating with dummy values
    const scope: Record<string, number> = {};
    variables.forEach((v) => { scope[v] = 1; });
    evaluate(expression, scope);

    return { valid: true, variables };
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : "Invalid expression", variables: [] };
  }
}

export function extractVariables(expression: string): string[] {
  const { variables } = validateExpression(expression);
  return variables;
}
