# Technical Documentation - Part 1: Architecture & Core Algorithms

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Core Data Structures](#core-data-structures)
3. [Parser Implementation](#parser-implementation)
4. [CFG Construction](#cfg-construction)
5. [Data-Flow Framework](#data-flow-framework)

---

## System Architecture

### Overview

The Static Program Analyzer is built on a modular architecture that separates concerns into distinct layers:

```
┌─────────────────────────────────────────────────┐
│            Presentation Layer (React)            │
│  - User Interface Components                     │
│  - Result Visualization                          │
│  - Export Functionality                          │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│              Analysis Orchestrator               │
│  - Coordinates all analyses                      │
│  - Manages analysis state                        │
│  - Triggers visualizations                       │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│                Parser Layer                      │
│  - Tokenization                                  │
│  - Statement Classification                      │
│  - Variable Extraction                           │
│  - Expression Parsing                            │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│             CFG Construction Layer               │
│  - Node Creation                                 │
│  - Edge Construction                             │
│  - Predecessor/Successor Management              │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│           Data-Flow Analysis Engine              │
│  ┌──────────────────┬─────────────────────┐     │
│  │ Forward Analyses │ Backward Analyses   │     │
│  │ - Reaching Defs  │ - Live Variables    │     │
│  │ - Available Expr │ - Very Busy Expr    │     │
│  └──────────────────┴─────────────────────┘     │
│  - Fixed-Point Iteration                         │
│  - Set Operations                                │
│  - Convergence Detection                         │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│           Issue Detection & Reporting            │
│  - Pattern Matching                              │
│  - Severity Classification                       │
│  - Message Generation                            │
└─────────────────────────────────────────────────┘
```

### Component Responsibilities

#### 1. Presentation Layer
**Technology**: React with Hooks (useState)

**Responsibilities**:
- Render code editor with syntax support
- Display analysis tabs (Reaching, Live, Available, Busy)
- Show line-by-line results with color coding
- Handle user interactions (analyze, export, tab switching)
- Manage UI state (loading, results, active tab)

**Key Components**:
```javascript
StaticAnalyzer (Main Component)
├── CodeEditor (Text input area)
├── ControlPanel (Language selector, buttons)
├── ResultsTabs (Analysis type tabs)
├── ResultsDisplay (Line-by-line output)
└── IssueIndicators (Icons and messages)
```

#### 2. Analysis Orchestrator
**Responsibilities**:
- Parse code into CFG
- Execute all four analyses in sequence
- Aggregate results
- Trigger issue detection
- Format output for display

**Main Function**:
```javascript
const analyzeCode = () => {
  // 1. Parse code
  const nodes = parseCode(code, language);
  
  // 2. Build CFG
  setCfg(nodes);
  
  // 3. Run analyses
  const reaching = reachingDefinitionsAnalysis(nodes);
  const live = liveVariableAnalysis(nodes);
  const available = availableExpressionsAnalysis(nodes);
  const busy = veryBusyExpressionsAnalysis(nodes);
  
  // 4. Package results
  setAnalysisResults({ reaching, live, available, busy });
};
```

#### 3. Parser Layer
**Responsibilities**:
- Tokenize source code
- Identify statement types
- Extract variables and expressions
- Handle Java and C++ syntax differences

**Supported Patterns**:
```javascript
// Variable declarations
int x = 5;
float y = 3.14;
String name = "test";

// Assignments
x = y + 10;
result = a * b;

// Expressions
System.out.println(x);
cout << x;
```

#### 4. CFG Construction
**Responsibilities**:
- Create entry and exit nodes
- Build intermediate nodes for statements
- Connect nodes with edges (successors/predecessors)
- Initialize data-flow sets

#### 5. Data-Flow Engine
**Responsibilities**:
- Implement fixed-point iteration
- Compute GEN and KILL sets
- Calculate IN and OUT sets
- Detect convergence

---

## Core Data Structures

### CFGNode Class

The fundamental building block of the analyzer:

```javascript
class CFGNode {
  constructor(id, statement, line) {
    // Identity
    this.id = id;              // Unique integer identifier
    this.statement = statement; // Source code string
    this.line = line;          // Line number in source
    
    // Graph structure
    this.successors = [];      // Array of CFGNode
    this.predecessors = [];    // Array of CFGNode
    
    // Data-flow sets (for all analyses)
    this.gen = new Set();      // Generated information
    this.kill = new Set();     // Killed information
    this.in = new Set();       // Information flowing in
    this.out = new Set();      // Information flowing out
  }
}
```

**Design Rationale**:
- **Sets over Arrays**: O(1) membership testing, automatic deduplication
- **Bidirectional Edges**: Supports both forward and backward analysis
- **Generic Sets**: Same structure works for all analysis types
- **Immutable IDs**: Ensures node identity throughout analysis

### Graph Structure

```
Example CFG for:
  int x = 5;
  int y = x + 10;
  return y;

┌─────────────┐
│   ENTRY     │ id: 0
└─────────────┘
      ↓
┌─────────────┐
│ int x = 5   │ id: 1, line: 1
└─────────────┘
      ↓
┌─────────────┐
│int y = x+10 │ id: 2, line: 2
└─────────────┘
      ↓
┌─────────────┐
│  return y   │ id: 3, line: 3
└─────────────┘
      ↓
┌─────────────┐
│    EXIT     │ id: 4
└─────────────┘
```

### Variable Information Structure

```javascript
{
  type: 'decl' | 'assign' | 'use',
  defined: string | null,      // Variable being defined
  used: string[]               // Variables being used
}

// Examples:
// int x = 5;
{ type: 'decl', defined: 'x', used: [] }

// y = x + z;
{ type: 'assign', defined: 'y', used: ['x', 'z'] }

// System.out.println(x);
{ type: 'use', defined: null, used: ['x'] }
```

---

## Parser Implementation

### Parsing Strategy

The parser uses a **pattern-matching approach** suitable for educational purposes:

1. **Line-based tokenization**
2. **Regular expression matching**
3. **Statement classification**
4. **Variable and expression extraction**

### Code: parseCode Function

```javascript
const parseCode = (code, lang) => {
  // Step 1: Tokenization
  const lines = code
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);
  
  const nodes = [];
  let nodeId = 0;
  
  // Step 2: Create ENTRY node
  const entry = new CFGNode(nodeId++, 'ENTRY', 0);
  nodes.push(entry);
  let currentNode = entry;
  
  // Step 3: Process each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip non-executable lines
    if (shouldSkipLine(line)) continue;
    
    // Create node
    const node = new CFGNode(nodeId++, line, i + 1);
    
    // Connect to previous node
    currentNode.successors.push(node);
    node.predecessors.push(currentNode);
    
    nodes.push(node);
    currentNode = node;
  }
  
  // Step 4: Create EXIT node
  const exit = new CFGNode(nodeId++, 'EXIT', lines.length + 1);
  currentNode.successors.push(exit);
  exit.predecessors.push(currentNode);
  nodes.push(exit);
  
  return nodes;
};

const shouldSkipLine = (line) => {
  return line.includes('class ') ||
         line.includes('public static') ||
         line === '{' ||
         line === '}' ||
         line.includes('void main');
};
```

### Variable Extraction

```javascript
const extractVarInfo = (statement) => {
  const cleaned = statement.replace(/;/g, '').trim();
  
  // Pattern 1: Declaration with initialization
  // Matches: int x = 5
  const declMatch = cleaned.match(
    /(?:int|float|double|String|char)\s+(\w+)\s*=\s*(.+)/
  );
  
  if (declMatch) {
    const variable = declMatch[1];
    const expr = declMatch[2];
    const usedVars = extractVariables(expr, variable);
    return {
      type: 'decl',
      defined: variable,
      used: usedVars
    };
  }
  
  // Pattern 2: Assignment
  // Matches: x = y + z
  const assignMatch = cleaned.match(/(\w+)\s*=\s*(.+)/);
  
  if (assignMatch) {
    const variable = assignMatch[1];
    const expr = assignMatch[2];
    const usedVars = extractVariables(expr, variable);
    return {
      type: 'assign',
      defined: variable,
      used: usedVars
    };
  }
  
  // Pattern 3: Use only (e.g., print statement)
  const usedVars = extractVariables(cleaned);
  return {
    type: 'use',
    defined: null,
    used: usedVars
  };
};

const extractVariables = (expr, exclude = null) => {
  // Find all identifiers
  const vars = expr.match(/\b[a-zA-Z_]\w*\b/g) || [];
  
  // Filter out keywords and excluded variable
  const keywords = ['int', 'float', 'double', 'String', 'System', 'println', 'out'];
  
  return vars.filter(v => 
    !keywords.includes(v) && v !== exclude
  );
};
```

### Expression Extraction

```javascript
const extractExpressions = (statement) => {
  const exprs = [];
  const cleaned = statement.replace(/;/g, '').trim();
  
  // Find right-hand side of assignment
  const match = cleaned.match(/=\s*(.+)$/);
  if (!match) return exprs;
  
  const rhs = match[1].trim();
  
  // Extract binary operations
  // Matches patterns like: a + b, x * y, etc.
  const operations = rhs.match(/(\w+\s*[+\-*\/]\s*\w+)/g);
  
  if (operations) {
    // Normalize spacing
    operations.forEach(op => {
      const normalized = op.replace(/\s+/g, ' ');
      exprs.push(normalized);
    });
  }
  
  return exprs;
};

// Examples:
// "x + y" → ["x + y"]
// "a + b * c" → ["a + b", "b * c"] (simplified)
// "x + y + z" → ["x + y", "y + z"]
```

---

## CFG Construction

### Building the Control Flow Graph

The CFG represents program structure with:
- **Nodes**: Program statements
- **Edges**: Control flow between statements
- **Entry/Exit**: Special nodes for boundaries

### Construction Algorithm

```javascript
Algorithm: BuildCFG(code)
Input: Source code as string
Output: List of CFGNode objects

1. Initialize:
   nodes = []
   nodeId = 0
   
2. Create ENTRY node:
   entry = new CFGNode(nodeId++, 'ENTRY', 0)
   current = entry
   
3. For each line in code:
   a. Skip structural lines (class, braces, etc.)
   b. Create node for statement
   c. Connect: current → new node
   d. Update current = new node
   
4. Create EXIT node:
   exit = new CFGNode(nodeId++, 'EXIT', lastLine + 1)
   Connect: current → exit
   
5. Return nodes
```

### Edge Management

**Forward Edges** (successors):
```javascript
node.successors.push(nextNode);
```

**Backward Edges** (predecessors):
```javascript
nextNode.predecessors.push(node);
```

**Bidirectional Linking**:
```javascript
const connect = (from, to) => {
  from.successors.push(to);
  to.predecessors.push(from);
};
```

### Example CFG Construction

```java
// Input code:
int x = 5;
int y = x + 10;
int z = y * 2;

// Resulting CFG nodes:
Node 0: ENTRY
  successors: [1]
  predecessors: []

Node 1: int x = 5
  successors: [2]
  predecessors: [0]

Node 2: int y = x + 10
  successors: [3]
  predecessors: [1]

Node 3: int z = y * 2
  successors: [4]
  predecessors: [2]

Node 4: EXIT
  successors: []
  predecessors: [3]
```

---

## Data-Flow Framework

### General Framework

All four analyses follow the same pattern:

```
1. Initialize GEN and KILL sets for each node
2. Initialize IN and OUT sets
3. Iterate until fixed point:
   a. Compute IN set from predecessors/successors
   b. Compute OUT set using transfer function
   c. Check for changes
4. Collect results and detect issues
```

### Mathematical Foundation

**Transfer Function**:
```
OUT[n] = GEN[n] ∪ (IN[n] - KILL[n])
```

**Fixed-Point Equation**:
```
IN[n] = Meet(OUT[p]) for all predecessors/successors p
```

Where Meet can be:
- **Union (∪)**: Forward, may analysis (Reaching Definitions)
- **Intersection (∩)**: Forward, must analysis (Available Expressions)
- **Union (∪)**: Backward, may analysis (Live Variables)
- **Intersection (∩)**: Backward, must analysis (Very Busy Expressions)

### Set Operations Implementation

```javascript
// Set equality check
const setsEqual = (a, b) => {
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
};

// Set union
const setUnion = (a, b) => {
  const result = new Set(a);
  b.forEach(item => result.add(item));
  return result;
};

// Set intersection
const setIntersection = (a, b) => {
  const result = new Set();
  a.forEach(item => {
    if (b.has(item)) result.add(item);
  });
  return result;
};

// Set difference
const setDifference = (a, b) => {
  const result = new Set();
  a.forEach(item => {
    if (!b.has(item)) result.add(item);
  });
  return result;
};
```

### Convergence Detection

```javascript
let changed = true;
let iterations = 0;
const MAX_ITERATIONS = 100;

while (changed && iterations < MAX_ITERATIONS) {
  changed = false;
  iterations++;
  
  for (const node of nodes) {
    // Save old values
    const oldIn = new Set(node.in);
    const oldOut = new Set(node.out);
    
    // Compute new values
    computeInSet(node);
    computeOutSet(node);
    
    // Check for changes
    if (!setsEqual(oldIn, node.in)) changed = true;
    if (!setsEqual(oldOut, node.out)) changed = true;
  }
}

// iterations: typically 2-5 for simple programs
// MAX_ITERATIONS: safety bound for complex cases
```

### Why It Converges

**Theoretical Guarantee**:
- Monotonic framework (sets only grow or stay same)
- Finite lattice (bounded number of variables/expressions)
- Meet operation satisfies lattice properties
- Fixed-point theorem guarantees convergence

**Practical Convergence**:
- Most programs: 2-5 iterations
- Complex programs: 10-20 iterations
- Worst case: 100 iterations (enforced maximum)

---

## Implementation Notes

### Performance Characteristics

| Operation | Complexity | Notes |
|-----------|------------|-------|
| Parse code | O(n) | n = lines of code |
| Build CFG | O(n) | Linear traversal |
| Initialize sets | O(n × v) | v = variables |
| Fixed-point | O(i × n × v) | i = iterations |
| Issue detection | O(n) | Per-node check |

### Memory Usage

```
Total Memory = O(n × v)

Where:
- n = number of CFG nodes
- v = number of variables/expressions
- Each node stores 4 sets (gen, kill, in, out)
- Each set contains variable names or expressions
```

### Optimization Opportunities

1. **Worklist Algorithm**: Only reprocess changed nodes
2. **Strongly Connected Components**: Analyze SCCs separately
3. **Sparse Sets**: Use bit vectors for large variable counts
4. **Lazy Evaluation**: Compute sets on demand

---

**Continue to Part 2 for detailed algorithm implementations...**