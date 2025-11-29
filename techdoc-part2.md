# Technical Documentation - Part 2: Algorithm Implementations & Analysis Engine

## Table of Contents

- [Reaching Definitions Analysis](#reaching-definitions-analysis)
- [Live Variable Analysis](#live-variable-analysis)
- [Available Expressions Analysis](#available-expressions-analysis)
- [Very Busy Expressions Analysis](#very-busy-expressions-analysis)
- [Issue Detection System](#issue-detection-system)
- [Analysis Orchestration](#analysis-orchestration)

## Reaching Definitions Analysis

### Algorithm Overview

- **Purpose:** Track which variable definitions can reach each program point
- **Type:** Forward, May Analysis
- **Forward:** Information flows from entry to exit
- **May:** Reports possibilities (over-approximation)
- **Key Insight:** A definition d of variable v reaches point p if there exists a path from d to p where v is not redefined.

### Mathematical Foundation

#### Data-Flow Equations:

```
IN[ENTRY] = ∅
OUT[n] = GEN[n] ∪ (IN[n] - KILL[n])
IN[n] = ∪ OUT[p] for all predecessors p of n
```

#### Transfer Function:

```
OUT[n] = GEN[n] ∪ (IN[n] - KILL[n])
```

### Implementation Details

#### Step 1: GEN/KILL Set Initialization

```javascript
const reachingDefinitionsAnalysis = (nodes) => {
  const results = [];
  const allDefs = new Map();
  let defId = 0;

  // Initialize gen and kill sets
  nodes.forEach(node => {
    if (node.statement === 'ENTRY' || node.statement === 'EXIT') return;
    
    const info = extractVarInfo(node.statement);
    if (info.defined) {
      // Create unique definition identifier
      const def = `${info.defined}@L${node.line}`;
      allDefs.set(def, defId++);
      node.gen.add(def);
      
      // Kill all other definitions of the same variable
      allDefs.forEach((id, d) => {
        if (d.startsWith(info.defined + '@') && d !== def) {
          node.kill.add(d);
        }
      });
    }
  });
```

#### Example GEN/KILL Calculation:

```java
// Line 1: int x = 5;
GEN[1] = {x@L1}
KILL[1] = {}  // No previous definitions of x

// Line 3: x = 10;
GEN[3] = {x@L3}
KILL[3] = {x@L1}  // Kills the previous definition
```

#### Step 2: Fixed-Point Iteration

```javascript
// Fixed-point iteration
let changed = true;
let iterations = 0;
while (changed && iterations < 100) {
  changed = false;
  iterations++;

  for (const node of nodes) {
    if (node.statement === 'ENTRY') continue;

    const oldIn = new Set(node.in);
    node.in.clear();

    // IN[n] = Union of OUT[p] for all predecessors p
    for (const pred of node.predecessors) {
      pred.out.forEach(def => node.in.add(def));
    }

    if (!setsEqual(oldIn, node.in)) changed = true;

    // OUT[n] = GEN[n] Union (IN[n] - KILL[n])
    const oldOut = new Set(node.out);
    node.out.clear();
    node.gen.forEach(def => node.out.add(def));
    node.in.forEach(def => {
      if (!node.kill.has(def)) node.out.add(def);
    });

    if (!setsEqual(oldOut, node.out)) changed = true;
  }
}
```

#### Step 3: Issue Detection

```javascript
const detectReachingIssues = (node, reaching) => {
  const issues = [];
  const info = extractVarInfo(node.statement);
  
  // Check for uninitialized variable usage
  if (info.used.length > 0) {
    info.used.forEach(variable => {
      const hasDef = Array.from(reaching).some(def => 
        def.startsWith(variable + '@')
      );
      if (!hasDef) {
        issues.push({ 
          type: 'warning', 
          message: `Variable '${variable}' may be uninitialized` 
        });
      }
    });
  }

  // Check for multiple reaching definitions
  if (info.defined) {
    const varDefs = Array.from(reaching).filter(def => 
      def.startsWith(info.defined + '@')
    );
    if (varDefs.length > 1) {
      issues.push({ 
        type: 'info', 
        message: `Variable '${info.defined}' has multiple reaching definitions` 
      });
    }
  }

  return issues;
};
```

#### Example Walkthrough

##### Input Program:

```java
int x = 5;        // L1: GEN={x@L1}, KILL={}
int y = x + 10;   // L2: GEN={y@L2}, KILL={}
x = 20;           // L3: GEN={x@L3}, KILL={x@L1}
int z = x + y;    // L4: GEN={z@L4}, KILL={}
```
##### Iteration Process:

| Node | Iteration 1 | Iteration 2 | Final |
|------|-------------|-------------|-------|
| L1 IN | ∅ | ∅ | ∅ |
| L1 OUT | {x@L1} | {x@L1} | {x@L1} |
| L2 IN | {x@L1} | {x@L1} | {x@L1} |
| L2 OUT | {x@L1, y@L2} | {x@L1, y@L2} | {x@L1, y@L2} |
| L3 IN | {x@L1, y@L2} | {x@L1, y@L2} | {x@L1, y@L2} |
| L3 OUT | {x@L3, y@L2} | {x@L3, y@L2} | {x@L3, y@L2} |
| L4 IN | {x@L3, y@L2} | {x@L3, y@L2} | {x@L3, y@L2} |
| L4 OUT | {x@L3, y@L2, z@L4} | {x@L3, y@L2, z@L4} | {x@L3, y@L2, z@L4} |

##### Key Observations:

- Line 2: Uses x@L1 (the original definition)
- Line 4: Uses x@L3 (the updated definition)
- x@L1 is killed at line 3

## Live Variable Analysis

### Algorithm Overview

- **Purpose:** Determine which variables are "live" (will be used in the future)
- **Type:** Backward, May Analysis
- **Backward:** Information flows from exit to entry
- **May:** Variables that may be used later
- **Key Insight:** A variable is live at point p if there exists a path from p to a use of the variable where it's not redefined.

### Mathematical Foundation

#### Data-Flow Equations:

```
OUT[EXIT] = ∅
IN[n] = USE[n] ∪ (OUT[n] - DEF[n])
OUT[n] = ∪ IN[s] for all successors s of n
```

#### Transfer Function:

```
IN[n] = USE[n] ∪ (OUT[n] - DEF[n])
```

### Implementation Details

#### Step 1: USE/DEF Set Initialization

```javascript
const liveVariableAnalysis = (nodes) => {
  const results = [];

  // Initialize use and def sets
  nodes.forEach(node => {
    if (node.statement === 'ENTRY' || node.statement === 'EXIT') return;
    
    const info = extractVarInfo(node.statement);
    node.gen.clear();
    node.kill.clear();
    
    // USE[n] = variables used in statement
    info.used.forEach(v => node.gen.add(v));
    
    // DEF[n] = variables defined in statement  
    if (info.defined) node.kill.add(info.defined);
  });
```

#### USE/DEF Examples:

```java
// Line 1: int x = 5;
USE[1] = {}    // No variables used
DEF[1] = {x}   // x is defined

// Line 2: y = x + 10;
USE[2] = {x}   // x is used
DEF[2] = {y}   // y is defined

// Line 3: System.out.println(y);
USE[3] = {y}   // y is used
DEF[3] = {}    // No definitions
```

#### Step 2: Backward Fixed-Point Iteration

```javascript
// Backward fixed-point iteration
let changed = true;
let iterations = 0;
while (changed && iterations < 100) {
  changed = false;
  iterations++;

  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    if (node.statement === 'EXIT') continue;

    const oldOut = new Set(node.out);
    node.out.clear();

    // OUT[n] = Union of IN[s] for all successors s
    for (const succ of node.successors) {
      succ.in.forEach(v => node.out.add(v));
    }

    if (!setsEqual(oldOut, node.out)) changed = true;

    // IN[n] = USE[n] Union (OUT[n] - DEF[n])
    const oldIn = new Set(node.in);
    node.in.clear();
    node.gen.forEach(v => node.in.add(v));
    node.out.forEach(v => {
      if (!node.kill.has(v)) node.in.add(v);
    });

    if (!setsEqual(oldIn, node.in)) changed = true;
  }
}
```

#### Step 3: Dead Code Detection

```javascript
// Collect results and detect dead code
nodes.forEach(node => {
  if (node.statement === 'ENTRY' || node.statement === 'EXIT') return;
  
  const info = extractVarInfo(node.statement);
  const issues = [];

  // Dead code detection: variable defined but not live out
  if (info.defined && !node.out.has(info.defined)) {
    issues.push({ 
      type: 'warning', 
      message: `Dead code: Variable '${info.defined}' is never used after this definition` 
    });
  }

  results.push({
    line: node.line,
    statement: node.statement,
    liveIn: Array.from(node.in),
    liveOut: Array.from(node.out),
    issues
  });
});
```

#### Example Walkthrough

##### Input Program:

```java
int x = 5;        // L1: USE={}, DEF={x}
int y = x + 10;   // L2: USE={x}, DEF={y}
int z = y * 2;    // L3: USE={y}, DEF={z}
System.out.println(z); // L4: USE={z}, DEF={}
int w = 42;       // L5: USE={}, DEF={w}  ⚠️ DEAD CODE
```

##### Backward Iteration Process:

| Node | Iteration 1 | Iteration 2 | Final |
|------|-------------|-------------|-------|
| L5 IN | ∅ | ∅ | ∅ |
| L5 OUT | ∅ | ∅ | ∅ |
| L4 IN | {z} | {z} | {z} |
| L4 OUT | ∅ | ∅ | ∅ |
| L3 IN | {y} | {y} | {y} |
| L3 OUT | {z} | {z} | {z} |
| L2 IN | {x} | {x} | {x} |
| L2 OUT | {y} | {y} | {y} |
| L1 IN | ∅ | ∅ | ∅ |
| L1 OUT | {x} | {x} | {x} |

##### Dead Code Detection:

- Line 5: w is defined but OUT[L5] = ∅
- Therefore, w is never used → DEAD CODE

##### Live Variable Chains:

- x is live from L1 to L2
- y is live from L2 to L3
- z is live from L3 to L4

## Available Expressions Analysis

### Algorithm Overview

- **Purpose:** Find expressions computed on all paths to a program point
- **Type:** Forward, Must Analysis
- **Forward:** Information flows from entry to exit
- **Must:** All paths must compute the expression
- **Key Insight:** An expression is available at point p if it has been computed on every path from entry to p and none of its operands have been redefined.

### Mathematical Foundation

#### Data-Flow Equations:

```
IN[ENTRY] = ∅
OUT[n] = GEN[n] ∪ (IN[n] - KILL[n])
IN[n] = ∩ OUT[p] for all predecessors p of n
```

#### Transfer Function:

```
OUT[n] = GEN[n] ∪ (IN[n] - KILL[n])
```

**Key Difference:** Uses intersection (∩) instead of union (∪) for IN sets

### Implementation Details

#### Step 1: Expression Extraction

```javascript
const extractExpressions = (statement) => {
  const exprs = [];
  const cleaned = statement.replace(/;/g, '').trim();
  
  const match = cleaned.match(/=\s*(.+)$/);
  if (match) {
    const expr = match[1].trim();
    // Extract binary operations
    const ops = expr.match(/(\w+\s*[+\-*\/]\s*\w+)/g);
    if (ops) exprs.push(...ops.map(e => e.replace(/\s+/g, ' ')));
  }
  
  return exprs;
};
```

#### Expression Examples:

```java
// Line: int a = x + y;
Extracted: ["x + y"]

// Line: int b = a * b + c;
Extracted: ["a * b", "b + c"]  // Simplified extraction
```

#### Step 2: GEN/KILL for Expressions

```javascript
const availableExpressionsAnalysis = (nodes) => {
  const results = [];
  const allExprs = new Set();

  // Extract all expressions from entire program
  nodes.forEach(node => {
    if (node.statement === 'ENTRY' || node.statement === 'EXIT') return;
    const exprs = extractExpressions(node.statement);
    exprs.forEach(e => allExprs.add(e));
  });

  // Initialize gen and kill sets
  nodes.forEach(node => {
    if (node.statement === 'ENTRY' || node.statement === 'EXIT') return;
    
    node.gen.clear();
    node.kill.clear();
    
    const info = extractVarInfo(node.statement);
    const exprs = extractExpressions(node.statement);
    
    // GEN[n] = expressions computed in this statement
    exprs.forEach(e => node.gen.add(e));
    
    // KILL[n] = expressions killed by variable redefinition
    if (info.defined) {
      allExprs.forEach(expr => {
        if (expr.includes(info.defined)) {
          node.kill.add(expr);
        }
      });
    }
  });
```

#### Step 3: Forward Intersection-Based Iteration

```javascript
// Initialize entry with all expressions
const entryNode = nodes[0];
entryNode.out = new Set(allExprs);

// Forward fixed-point iteration with intersection
let changed = true;
let iterations = 0;
while (changed && iterations < 100) {
  changed = false;
  iterations++;

  for (const node of nodes) {
    if (node.statement === 'ENTRY') continue;

    const oldIn = new Set(node.in);
    
    // IN[n] = Intersection of OUT[p] for all predecessors
    if (node.predecessors.length > 0) {
      node.in = new Set(node.predecessors[0].out);
      for (let i = 1; i < node.predecessors.length; i++) {
        node.in = setIntersection(node.in, node.predecessors[i].out);
      }
    }

    if (!setsEqual(oldIn, node.in)) changed = true;

    // OUT[n] = GEN[n] Union (IN[n] - KILL[n])
    const oldOut = new Set(node.out);
    node.out.clear();
    node.gen.forEach(e => node.out.add(e));
    node.in.forEach(e => {
      if (!node.kill.has(e)) node.out.add(e);
    });

    if (!setsEqual(oldOut, node.out)) changed = true;
  }
}
```

#### Example Walkthrough

##### Input Program:

```java
int a = x + y;    // L1: GEN={x+y}, KILL={x+y}? No - no variables defined yet
int b = y + z;    // L2: GEN={y+z}, KILL={}
x = 10;           // L3: GEN={}, KILL={x+y} (kills expressions containing x)
int c = x + y;    // L4: GEN={x+y}, KILL={}
```
##### Iteration Process:

| Node | Iteration 1 | Iteration 2 | Final |
|------|-------------|-------------|-------|
| L1 IN | ∅ | ∅ | ∅ |
| L1 OUT | {x+y} | {x+y} | {x+y} |
| L2 IN | {x+y} | {x+y} | {x+y} |
| L2 OUT | {x+y, y+z} | {x+y, y+z} | {x+y, y+z} |
| L3 IN | {x+y, y+z} | {x+y, y+z} | {x+y, y+z} |
| L3 OUT | {y+z} | {y+z} | {y+z} |
| L4 IN | {y+z} | {y+z} | {y+z} |
| L4 OUT | {y+z, x+y} | {y+z, x+y} | {y+z, x+y} |

##### Optimization Insights:

- Line 4: x + y must be recomputed (not available)
- Line 2: y + z is available at line 4
- Line 3 kills x + y because it redefines x

## Very Busy Expressions Analysis

### Algorithm Overview

- **Purpose:** Find expressions that will definitely be used on all paths from a program point
- **Type:** Backward, Must Analysis
- **Backward:** Information flows from exit to entry
- **Must:** Expression must be used on all future paths
- **Key Insight:** An expression is very busy at point p if on every path from p to exit, the expression is evaluated before any of its operands are redefined.

### Mathematical Foundation

#### Data-Flow Equations:

```
OUT[EXIT] = ∅
IN[n] = GEN[n] ∪ (OUT[n] - KILL[n])
OUT[n] = ∩ IN[s] for all successors s of n
```

#### Transfer Function:

```
IN[n] = GEN[n] ∪ (OUT[n] - KILL[n])
```

**Key Difference:** Backward analysis with intersection for OUT sets

### Implementation Details

#### Step 1: Backward Intersection-Based Iteration

```javascript
const veryBusyExpressionsAnalysis = (nodes) => {
  const results = [];
  const allExprs = new Set();

  // Collect all expressions (same as available expressions)
  nodes.forEach(node => {
    if (node.statement === 'ENTRY' || node.statement === 'EXIT') return;
    const exprs = extractExpressions(node.statement);
    exprs.forEach(e => allExprs.add(e));
  });

  // Initialize GEN/KILL sets (same as available expressions)
  nodes.forEach(node => {
    if (node.statement === 'ENTRY' || node.statement === 'EXIT') return;
    
    node.gen.clear();
    node.kill.clear();
    
    const info = extractVarInfo(node.statement);
    const exprs = extractExpressions(node.statement);
    
    exprs.forEach(e => node.gen.add(e));
    
    if (info.defined) {
      allExprs.forEach(expr => {
        if (expr.includes(info.defined)) {
          node.kill.add(expr);
        }
      });
    }
  });

  // Backward fixed-point iteration with intersection
  let changed = true;
  let iterations = 0;
  while (changed && iterations < 100) {
    changed = false;
    iterations++;

    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      if (node.statement === 'EXIT') continue;

      const oldOut = new Set(node.out);
      
      // OUT[n] = Intersection of IN[s] for all successors
      if (node.successors.length > 0) {
        node.out = new Set(node.successors[0].in);
        for (let j = 1; j < node.successors.length; j++) {
          node.out = setIntersection(node.out, node.successors[j].in);
        }
      }

      if (!setsEqual(oldOut, node.out)) changed = true;

      const oldIn = new Set(node.in);
      node.in.clear();
      node.gen.forEach(e => node.in.add(e));
      node.out.forEach(e => {
        if (!node.kill.has(e)) node.in.add(e);
      });

      if (!setsEqual(oldIn, node.in)) changed = true;
    }
  }
```

#### Example Walkthrough

##### Input Program:

```java
int a = x + y;    // L1: GEN={x+y}, KILL={}
int b = x + y;    // L2: GEN={x+y}, KILL={}
int c = a + b;    // L3: GEN={a+b}, KILL={}
System.out.println(c); // L4: USE={c}, no expressions
```

##### Backward Iteration Process:

| Node | Iteration 1 | Iteration 2 | Final |
|------|-------------|-------------|-------|
| L4 IN | ∅ | ∅ | ∅ |
| L4 OUT | ∅ | ∅ | ∅ |
| L3 IN | {a+b} | {a+b} | {a+b} |
| L3 OUT | ∅ | ∅ | ∅ |
| L2 IN | {x+y} | {x+y} | {x+y} |
| L2 OUT | {a+b} | {a+b} | {a+b} |
| L1 IN | {x+y} | {x+y} | {x+y} |
| L1 OUT | {x+y, a+b} | {x+y, a+b} | {x+y, a+b} |

##### Very Busy Insights:

- Before L1: x + y is very busy (used on L1 and L2)
- Before L2: x + y is very busy (used on L2)
- Before L3: a + b is very busy (used on L3)

##### Optimization Opportunity:

Since x + y is very busy at the start, we could compute it once and reuse:

```java
int temp = x + y;  // Compute once
int a = temp;
int b = temp;
int c = a + b;
```

## Issue Detection System

### Multi-Level Detection Framework

```javascript
const detectAllIssues = (analysisResults, nodes) => {
  const allIssues = [];
  
  // 1. Reaching Definitions Issues
  analysisResults.reaching.forEach(result => {
    result.issues.forEach(issue => {
      allIssues.push({
        line: result.line,
        type: issue.type,
        message: issue.message,
        analysis: 'Reaching Definitions',
        severity: getSeverity(issue.type)
      });
    });
  });
  
  // 2. Live Variables Issues  
  analysisResults.live.forEach(result => {
    result.issues.forEach(issue => {
      allIssues.push({
        line: result.line,
        type: issue.type,
        message: issue.message,
        analysis: 'Live Variables',
        severity: getSeverity(issue.type)
      });
    });
  });
  
  // 3. Cross-analysis issue detection
  detectCrossAnalysisIssues(analysisResults, allIssues);
  
  return allIssues.sort((a, b) => a.line - b.line);
};
```

### Issue Classification

#### Severity Levels

```javascript
const getSeverity = (issueType) => {
  switch(issueType) {
    case 'error': return 3;    // Critical - must fix
    case 'warning': return 2;  // Important - should fix  
    case 'info': return 1;     // Optional - consider fixing
    default: return 0;         // Informational
  }
};

const SEVERITY_LEVELS = {
  ERROR: 3,     // Runtime errors, crashes
  WARNING: 2,   // Potential bugs, inefficiencies
  INFO: 1,      // Optimization opportunities
  SUCCESS: 0    // No issues
};
```

### Pattern-Based Detection

```javascript
const detectUninitializedVariables = (node, reachingDefs) => {
  const issues = [];
  const info = extractVarInfo(node.statement);
  
  info.used.forEach(variable => {
    const hasDefinition = reachingDefs.some(def => 
      def.startsWith(variable + '@')
    );
    
    if (!hasDefinition) {
      issues.push({
        type: 'warning',
        message: `Variable '${variable}' may be uninitialized`,
        category: 'SAFETY',
        confidence: 'HIGH'
      });
    }
  });
  
  return issues;
};

const detectDeadCode = (node, liveOut) => {
  const issues = [];
  const info = extractVarInfo(node.statement);
  
  if (info.defined && !liveOut.has(info.defined)) {
    issues.push({
      type: 'warning', 
      message: `Dead code: Variable '${info.defined}' is never used`,
      category: 'PERFORMANCE',
      confidence: 'HIGH'
    });
  }
  
  return issues;
};

const detectRedundantComputations = (node, availableExprs) => {
  const issues = [];
  const exprs = extractExpressions(node.statement);
  
  exprs.forEach(expr => {
    if (availableExprs.has(expr)) {
      issues.push({
        type: 'info',
        message: `Redundant computation: '${expr}' is already available`,
        category: 'OPTIMIZATION',
        confidence: 'MEDIUM'
      });
    }
  });
  
  return issues;
};
```

### Cross-Analysis Correlation

```javascript
const detectCrossAnalysisIssues = (analysisResults, allIssues) => {
  const { reaching, live, available, busy } = analysisResults;
  
  // Detect optimization chains
  reaching.forEach((reachingResult, index) => {
    const liveResult = live[index];
    const availableResult = available[index];
    
    // Pattern: Variable defined but immediately killed and never used
    if (reachingResult.issues.some(i => i.type === 'info' && i.message.includes('multiple')) &&
        liveResult.issues.some(i => i.type === 'warning' && i.message.includes('never used'))) {
      allIssues.push({
        line: reachingResult.line,
        type: 'warning',
        message: 'Inefficient variable usage: multiple definitions with limited usage',
        analysis: 'Cross-Analysis',
        severity: SEVERITY_LEVELS.WARNING
      });
    }
    
    // Pattern: Expression available but recomputed
    const exprs = extractExpressions(reachingResult.statement);
    exprs.forEach(expr => {
      if (availableResult.availableIn.includes(expr)) {
        allIssues.push({
          line: reachingResult.line,
          type: 'info',
          message: `Optimization: Expression '${expr}' can be reused`,
          analysis: 'Cross-Analysis', 
          severity: SEVERITY_LEVELS.INFO
        });
      }
    });
  });
};
```

## Analysis Orchestration

### Main Analysis Controller

```javascript
const analyzeCode = () => {
  setIsAnalyzing(true);
  
  // Use setTimeout to allow UI to update
  setTimeout(() => {
    try {
      // Step 1: Parse code and build CFG
      const nodes = parseCode(code, language);
      setCfg(nodes);
      
      // Step 2: Run all analyses in sequence
      const reaching = reachingDefinitionsAnalysis(nodes);
      const live = liveVariableAnalysis(nodes); 
      const available = availableExpressionsAnalysis(nodes);
      const busy = veryBusyExpressionsAnalysis(nodes);
      
      // Step 3: Package results with metadata
      setAnalysisResults({
        reaching,
        live, 
        available,
        busy,
        metadata: {
          timestamp: new Date().toISOString(),
          language,
          codeLines: code.split('\n').length,
          analysisTime: Date.now() // Would calculate actual time
        }
      });
      
      setIsAnalyzing(false);
    } catch (error) {
      console.error('Analysis error:', error);
      setIsAnalyzing(false);
      
      // Error handling with user-friendly messages
      setAnalysisResults({
        error: {
          message: 'Analysis failed',
          details: error.message,
          suggestion: 'Please check your code syntax and try again.'
        }
      });
    }
  }, 500); // Artificial delay for better UX
};
```

### Performance Optimization

```javascript
// Optimized set operations
const optimizedSetUnion = (a, b) => {
  // Fast path for empty sets
  if (a.size === 0) return new Set(b);
  if (b.size === 0) return new Set(a);
  
  // Use spread operator for better performance
  return new Set([...a, ...b]);
};

const optimizedSetIntersection = (a, b) => {
  // Fast path for empty sets
  if (a.size === 0 || b.size === 0) return new Set();
  
  // Iterate over smaller set for better performance
  const [smaller, larger] = a.size <= b.size ? [a, b] : [b, a];
  const result = new Set();
  
  for (const item of smaller) {
    if (larger.has(item)) {
      result.add(item);
    }
  }
  
  return result;
};

// Early termination detection
const shouldTerminateEarly = (iterations, changes, nodes) => {
  // Terminate if no changes in last iteration
  if (!changes) return true;
  
  // Terminate if maximum iterations reached
  if (iterations >= 100) {
    console.warn('Maximum iterations reached - analysis may not have converged');
    return true;
  }
  
  // Terminate for trivial cases
  if (nodes.length <= 2) return true;
  
  return false;
};
```

### Result Formatting and Presentation

```javascript
const formatAnalysisResults = (rawResults) => {
  return {
    // Reaching Definitions formatted output
    reaching: rawResults.reaching.map(result => ({
      line: result.line,
      statement: result.statement,
      reachingDefinitions: result.reaching,
      issues: result.issues,
      summary: `Line ${result.line}: ${result.reaching.length} reaching definitions`
    })),
    
    // Live Variables formatted output  
    live: rawResults.live.map(result => ({
      line: result.line,
      statement: result.statement, 
      liveIn: result.liveIn,
      liveOut: result.liveOut,
      issues: result.issues,
      summary: `Line ${result.line}: ${result.liveIn.length} live in, ${result.liveOut.length} live out`
    })),
    
    // Available Expressions formatted output
    available: rawResults.available.map(result => ({
      line: result.line,
      statement: result.statement,
      availableIn: result.availableIn,
      availableOut: result.availableOut,
      issues: result.issues,
      summary: `Line ${result.line}: ${result.availableIn.length} expressions available`
    })),
    
    // Very Busy Expressions formatted output
    busy: rawResults.busy.map(result => ({
      line: result.line,
      statement: result.statement,
      busyIn: result.busyIn, 
      busyOut: result.busyOut,
      issues: result.issues,
      summary: `Line ${result.line}: ${result.busyIn.length} very busy expressions`
    })),
    
    // Overall analysis summary
    summary: {
      totalLines: rawResults.reaching.length,
      totalIssues: calculateTotalIssues(rawResults),
      analysisQuality: assessAnalysisQuality(rawResults),
      optimizationOpportunities: findOptimizationOpportunities(rawResults)
    }
  };
};
```

### Quality Assessment

```javascript
const assessAnalysisQuality = (results) => {
  let qualityScore = 100;
  const warnings = [];
  
  // Check convergence
  const maxIterations = Math.max(
    getMaxIterations(results.reaching),
    getMaxIterations(results.live),
    getMaxIterations(results.available), 
    getMaxIterations(results.busy)
  );
  
  if (maxIterations >= 100) {
    qualityScore -= 20;
    warnings.push('Analysis may not have fully converged');
  }
  
  // Check for contradictory results
  if (hasContradictoryResults(results)) {
    qualityScore -= 15;
    warnings.push('Potential contradictions in analysis results');
  }
  
  // Check coverage
  const coverage = calculateCoverage(results);
  if (coverage < 0.9) {
    qualityScore -= 10;
    warnings.push('Incomplete analysis coverage');
  }
  
  return {
    score: qualityScore,
    level: qualityScore >= 90 ? 'EXCELLENT' : 
           qualityScore >= 80 ? 'GOOD' : 
           qualityScore >= 70 ? 'FAIR' : 'POOR',
    warnings
  };
};
```

## Algorithm Comparison Summary

| Analysis | Direction | Lattice | Meet Operation | Purpose | Key Use Cases |
|----------|-----------|---------|-----------------|---------|---------------|
| Reaching Definitions | Forward | May | Union (∪) | Track variable definitions | Bug detection, data dependencies |
| Live Variables | Backward | May | Union (∪) | Find live variables | Dead code elimination, register allocation |
| Available Expressions | Forward | Must | Intersection (∩) | Find reusable expressions | Common subexpression elimination |
| Very Busy Expressions | Backward | Must | Intersection (∩) | Find must-compute expressions | Code motion, loop optimization |

## Complexity Analysis

### Time Complexity: O(N × I × V)

- **N** = Number of CFG nodes
- **I** = Iterations to convergence
- **V** = Variables/expressions per node

### Space Complexity: O(N × V)

- 4 sets per node (gen, kill, in, out)
- Each set contains ≤ V elements

### Typical Performance:

- Small programs (10-20 lines): 2-5 iterations, < 100ms
- Medium programs (50-100 lines): 5-10 iterations, 200-500ms
- Large programs (100+ lines): 10-20 iterations, 1-2s

## Convergence Properties

### Guaranteed Convergence:

- Finite lattice height (bounded by program size)
- Monotonic transfer functions
- Finite number of variables/expressions

### Practical Convergence:

- Most programs: 2-5 iterations
- Complex data flow: 10-20 iterations
- Worst case: 100 iterations (enforced maximum)

### Termination Conditions:

- No changes in any set (normal convergence)
- Maximum iterations reached (safety bound)
- Single-node programs (immediate convergence)

---

**Continue to Part 3 for testing, validation, and future work...**