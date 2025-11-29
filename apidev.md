# API Reference & Extension Guide

## Developer Documentation for Static Program Analyzer

---

## Table of Contents

1. [Core API](#core-api)
2. [Extension Points](#extension-points)
3. [Adding New Analyses](#adding-new-analyses)
4. [Custom Issue Detectors](#custom-issue-detectors)
5. [Parser Extensions](#parser-extensions)
6. [Examples](#examples)

---

## Core API

### CFGNode Class

The fundamental node in the Control Flow Graph.

```javascript
class CFGNode {
  /**
   * Create a CFG node
   * @param {number} id - Unique node identifier
   * @param {string} statement - Source code statement
   * @param {number} line - Line number in source
   */
  constructor(id, statement, line) {
    this.id = id;
    this.statement = statement;
    this.line = line;
    this.successors = [];
    this.predecessors = [];
    this.gen = new Set();
    this.kill = new Set();
    this.in = new Set();
    this.out = new Set();
  }
}
```

**Properties**:
- `id` (number): Unique identifier for the node
- `statement` (string): The actual code statement
- `line` (number): Line number in source file
- `successors` (CFGNode[]): Outgoing edges
- `predecessors` (CFGNode[]): Incoming edges
- `gen` (Set): Generated information for analysis
- `kill` (Set): Killed information for analysis
- `in` (Set): Information flowing into node
- `out` (Set): Information flowing out of node

**Methods**:
None (data structure only)

---

### Parsing Functions

#### parseCode(code, language)

Parse source code into CFG nodes.

```javascript
/**
 * Parse source code into CFG
 * @param {string} code - Source code to parse
 * @param {string} language - 'java' or 'cpp'
 * @returns {CFGNode[]} Array of CFG nodes
 */
const parseCode = (code, language) => {
  // Implementation
};
```

**Parameters**:
- `code` (string): Source code text
- `language` (string): Programming language identifier

**Returns**: Array of CFGNode objects

**Example**:
```javascript
const code = "int x = 5;\nint y = x;";
const nodes = parseCode(code, 'java');
console.log(nodes.length); // 4 (ENTRY, 2 statements, EXIT)
```

---

#### extractVarInfo(statement)

Extract variable information from a statement.

```javascript
/**
 * Extract variables and determine statement type
 * @param {string} statement - Source code statement
 * @returns {Object} Variable information
 */
const extractVarInfo = (statement) => {
  // Implementation
};
```

**Returns**:
```javascript
{
  type: 'decl' | 'assign' | 'use',
  defined: string | null,  // Variable being defined
  used: string[]           // Variables being used
}
```

**Example**:
```javascript
extractVarInfo("int x = 5");
// Returns: { type: 'decl', defined: 'x', used: [] }

extractVarInfo("y = x + z");
// Returns: { type: 'assign', defined: 'y', used: ['x', 'z'] }

extractVarInfo("System.out.println(x)");
// Returns: { type: 'use', defined: null, used: ['x'] }
```

---

#### extractExpressions(statement)

Extract binary expressions from a statement.

```javascript
/**
 * Extract expressions for analysis
 * @param {string} statement - Source code statement
 * @returns {string[]} Array of expressions
 */
const extractExpressions = (statement) => {
  // Implementation
};
```

**Returns**: Array of expression strings

**Example**:
```javascript
extractExpressions("int a = x + y");
// Returns: ["x + y"]

extractExpressions("int b = a + b * c");
// Returns: ["a + b", "b * c"]
```

---

### Analysis Functions

#### reachingDefinitionsAnalysis(nodes)

Perform reaching definitions analysis.

```javascript
/**
 * Reaching definitions analysis
 * @param {CFGNode[]} nodes - CFG nodes to analyze
 * @returns {Object[]} Analysis results
 */
const reachingDefinitionsAnalysis = (nodes) => {
  // Implementation
};
```

**Algorithm**: Forward, may analysis with union

**Returns**:
```javascript
[
  {
    line: number,
    statement: string,
    reaching: string[],  // e.g., ['x@L1', 'y@L2']
    issues: Issue[]
  },
  // ...
]
```

**Example**:
```javascript
const nodes = parseCode(code, 'java');
const results = reachingDefinitionsAnalysis(nodes);
console.log(results[0].reaching); // ['x@L1']
```

---

#### liveVariableAnalysis(nodes)

Perform live variable analysis.

```javascript
/**
 * Live variable analysis
 * @param {CFGNode[]} nodes - CFG nodes to analyze
 * @returns {Object[]} Analysis results
 */
const liveVariableAnalysis = (nodes) => {
  // Implementation
};
```

**Algorithm**: Backward, may analysis with union

**Returns**:
```javascript
[
  {
    line: number,
    statement: string,
    liveIn: string[],   // Variables live at entry
    liveOut: string[],  // Variables live at exit
    issues: Issue[]
  },
  // ...
]
```

**Example**:
```javascript
const results = liveVariableAnalysis(nodes);
console.log(results[0].liveOut); // ['x', 'y']
```

---

#### availableExpressionsAnalysis(nodes)

Perform available expressions analysis.

```javascript
/**
 * Available expressions analysis
 * @param {CFGNode[]} nodes - CFG nodes to analyze
 * @returns {Object[]} Analysis results
 */
const availableExpressionsAnalysis = (nodes) => {
  // Implementation
};
```

**Algorithm**: Forward, must analysis with intersection

**Returns**:
```javascript
[
  {
    line: number,
    statement: string,
    availableIn: string[],   // e.g., ['x + y', 'a * b']
    availableOut: string[],
    issues: Issue[]
  },
  // ...
]
```

---

#### veryBusyExpressionsAnalysis(nodes)

Perform very busy expressions analysis.

```javascript
/**
 * Very busy expressions analysis
 * @param {CFGNode[]} nodes - CFG nodes to analyze
 * @returns {Object[]} Analysis results
 */
const veryBusyExpressionsAnalysis = (nodes) => {
  // Implementation
};
```

**Algorithm**: Backward, must analysis with intersection

**Returns**:
```javascript
[
  {
    line: number,
    statement: string,
    busyIn: string[],
    busyOut: string[],
    issues: Issue[]
  },
  // ...
]
```

---

### Utility Functions

#### setsEqual(a, b)

Check if two sets are equal.

```javascript
/**
 * Compare two sets for equality
 * @param {Set} a - First set
 * @param {Set} b - Second set
 * @returns {boolean} True if equal
 */
const setsEqual = (a, b) => {
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
};
```

**Example**:
```javascript
const set1 = new Set(['a', 'b']);
const set2 = new Set(['b', 'a']);
console.log(setsEqual(set1, set2)); // true
```

---

#### setIntersection(a, b)

Compute intersection of two sets.

```javascript
/**
 * Compute set intersection
 * @param {Set} a - First set
 * @param {Set} b - Second set
 * @returns {Set} Intersection
 */
const setIntersection = (a, b) => {
  const result = new Set();
  for (const item of a) {
    if (b.has(item)) result.add(item);
  }
  return result;
};
```

**Example**:
```javascript
const set1 = new Set([1, 2, 3]);
const set2 = new Set([2, 3, 4]);
console.log(setIntersection(set1, set2)); // Set {2, 3}
```

---

## Extension Points

### Adding New Analyses

To add a new data-flow analysis:

#### Step 1: Define Analysis Function

```javascript
const myNewAnalysis = (nodes) => {
  const results = [];
  
  // Step 1: Initialize GEN and KILL
  nodes.forEach(node => {
    if (node.statement === 'ENTRY' || node.statement === 'EXIT') 
      return;
    
    // Define what this node generates
    node.gen = computeGen(node);
    
    // Define what this node kills
    node.kill = computeKill(node);
  });
  
  // Step 2: Fixed-point iteration
  let changed = true;
  let iterations = 0;
  
  while (changed && iterations < 100) {
    changed = false;
    iterations++;
    
    // For forward analysis:
    for (const node of nodes) {
      // Compute IN from predecessors
      const oldIn = new Set(node.in);
      node.in = computeIn(node.predecessors);
      if (!setsEqual(oldIn, node.in)) changed = true;
      
      // Compute OUT using transfer function
      const oldOut = new Set(node.out);
      node.out = transferFunction(node.gen, node.in, node.kill);
      if (!setsEqual(oldOut, node.out)) changed = true;
    }
    
    // For backward analysis, iterate in reverse
  }
  
  // Step 3: Collect results
  nodes.forEach(node => {
    if (node.statement === 'ENTRY' || node.statement === 'EXIT') 
      return;
    
    results.push({
      line: node.line,
      statement: node.statement,
      analysisData: extractAnalysisData(node),
      issues: detectIssues(node)
    });
  });
  
  return results;
};
```

#### Step 2: Register in UI

```javascript
// In the main component
const analyzeCode = () => {
  // ... existing code ...
  
  const myNew = myNewAnalysis(nodes);
  
  setAnalysisResults({
    reaching,
    live,
    available,
    busy,
    myNew  // Add your analysis
  });
};
```

#### Step 3: Add UI Tab

```javascript
// Add tab definition
const tabs = [
  // ... existing tabs ...
  { id: 'mynew', icon: MyIcon, label: 'My Analysis' }
];

// Add rendering logic
if (activeTab === 'mynew') {
  // Render your analysis results
}
```

---

### Custom Issue Detectors

Create custom issue detection logic:

```javascript
/**
 * Custom issue detector
 * @param {CFGNode} node - Node to check
 * @param {Set} analysisData - Relevant data-flow information
 * @returns {Issue[]} Detected issues
 */
const myIssueDetector = (node, analysisData) => {
  const issues = [];
  
  // Example: Detect a specific pattern
  if (conditionMet(node, analysisData)) {
    issues.push({
      type: 'warning',  // or 'error', 'info'
      message: 'Description of the issue'
    });
  }
  
  return issues;
};
```

**Issue Object Structure**:
```javascript
{
  type: 'error' | 'warning' | 'info',
  message: string
}
```

---

### Parser Extensions

#### Adding Support for New Statement Types

```javascript
const extractVarInfoExtended = (statement) => {
  const base = extractVarInfo(statement);
  
  // Add custom pattern matching
  if (statement.includes('for')) {
    return handleForLoop(statement);
  }
  
  if (statement.includes('while')) {
    return handleWhileLoop(statement);
  }
  
  return base;
};
```

#### Custom Expression Extractors

```javascript
const extractComplexExpressions = (statement) => {
  // Handle function calls
  const funcCalls = statement.match(/\w+\([^)]*\)/g);
  
  // Handle array accesses
  const arrayAccess = statement.match(/\w+\[\w+\]/g);
  
  // Handle member access
  const memberAccess = statement.match(/\w+\.\w+/g);
  
  return [...funcCalls, ...arrayAccess, ...memberAccess];
};
```

---

## Examples

### Example 1: Constant Propagation Analysis

```javascript
const constantPropagationAnalysis = (nodes) => {
  const results = [];
  
  // Initialize constant map for each node
  nodes.forEach(node => {
    node.constants = new Map();
  });
  
  // Forward analysis
  let changed = true;
  while (changed) {
    changed = false;
    
    for (const node of nodes) {
      if (node.statement === 'ENTRY') continue;
      
      // Merge constants from predecessors
      const oldConstants = new Map(node.constants);
      node.constants.clear();
      
      for (const pred of node.predecessors) {
        pred.constants.forEach((value, variable) => {
          if (node.constants.has(variable)) {
            // Multiple values → not constant
            if (node.constants.get(variable) !== value) {
              node.constants.set(variable, 'NOT_CONSTANT');
            }
          } else {
            node.constants.set(variable, value);
          }
        });
      }
      
      // Apply current statement
      const info = extractVarInfo(node.statement);
      if (info.type === 'decl' && isConstant(info.used)) {
        const value = evaluateConstant(statement);
        node.constants.set(info.defined, value);
      }
      
      if (!mapsEqual(oldConstants, node.constants)) {
        changed = true;
      }
    }
  }
  
  // Collect results
  nodes.forEach(node => {
    if (node.statement === 'ENTRY' || node.statement === 'EXIT') 
      return;
    
    results.push({
      line: node.line,
      statement: node.statement,
      constants: Array.from(node.constants.entries()),
      issues: detectConstantIssues(node)
    });
  });
  
  return results;
};
```

### Example 2: Taint Analysis

```javascript
const taintAnalysis = (nodes, sources, sinks) => {
  const results = [];
  
  // Mark source nodes
  nodes.forEach(node => {
    const info = extractVarInfo(node.statement);
    if (sources.includes(info.defined)) {
      node.tainted = new Set([info.defined]);
    } else {
      node.tainted = new Set();
    }
  });
  
  // Forward propagation
  let changed = true;
  while (changed) {
    changed = false;
    
    for (const node of nodes) {
      const oldTainted = new Set(node.tainted);
      
      // Propagate from predecessors
      for (const pred of node.predecessors) {
        pred.tainted.forEach(v => node.tainted.add(v));
      }
      
      // Taint defined variable if uses tainted
      const info = extractVarInfo(node.statement);
      if (info.defined && info.used.some(v => node.tainted.has(v))) {
        node.tainted.add(info.defined);
      }
      
      if (!setsEqual(oldTainted, node.tainted)) {
        changed = true;
      }
    }
  }
  
  // Check sinks
  nodes.forEach(node => {
    const info = extractVarInfo(node.statement);
    const issues = [];
    
    if (sinks.some(sink => node.statement.includes(sink))) {
      info.used.forEach(v => {
        if (node.tainted.has(v)) {
          issues.push({
            type: 'error',
            message: `Tainted variable '${v}' reaches sink`
          });
        }
      });
    }
    
    if (node.statement !== 'ENTRY' && node.statement !== 'EXIT') {
      results.push({
        line: node.line,
        statement: node.statement,
        tainted: Array.from(node.tainted),
        issues
      });
    }
  });
  
  return results;
};

// Usage:
const sources = ['userInput', 'request'];
const sinks = ['execute', 'eval'];
const results = taintAnalysis(nodes, sources, sinks);
```

### Example 3: Dead Code Elimination Transformer

```javascript
const eliminateDeadCode = (code) => {
  // Parse and analyze
  const nodes = parseCode(code, 'java');
  const liveResults = liveVariableAnalysis(nodes);
  
  // Filter out dead code
  const optimizedLines = [];
  
  nodes.forEach((node, idx) => {
    if (node.statement === 'ENTRY' || node.statement === 'EXIT') 
      return;
    
    const result = liveResults.find(r => r.line === node.line);
    const isDead = result.issues.some(i => 
      i.message.includes('Dead code')
    );
    
    if (!isDead) {
      optimizedLines.push(node.statement);
    }
  });
  
  return optimizedLines.join('\n');
};

// Usage:
const original = `
int x = 5;
int y = 10;
int z = x + 1;
`;

const optimized = eliminateDeadCode(original);
console.log(optimized);
// Output:
// int x = 5;
// int z = x + 1;
```

---

## Best Practices

### 1. Analysis Design

✅ **DO**:
- Follow the data-flow framework pattern
- Use appropriate meet operations (∪ or ∩)
- Choose correct direction (forward/backward)
- Implement proper convergence checks

❌ **DON'T**:
- Mix forward and backward in same analysis
- Forget to handle ENTRY/EXIT nodes
- Skip convergence detection
- Modify shared data structures

### 2. Performance

✅ **DO**:
- Use Sets for O(1) operations
- Copy sets when comparing
- Return early when possible
- Limit iterations (max 100)

❌ **DON'T**:
- Use arrays for data-flow sets
- Mutate shared state
- Create unnecessary copies
- Iterate without bounds

### 3. Error Handling

✅ **DO**:
- Validate input parameters
- Handle edge cases (empty programs)
- Provide meaningful error messages
- Fail gracefully

❌ **DON'T**:
- Assume valid input
- Crash on malformed code
- Hide errors silently
- Return undefined

---

## Testing Your Extensions

```javascript
// Test your new analysis
const testNewAnalysis = () => {
  const testCases = [
    {
      name: "Basic Test",
      code: "int x = 5;",
      expected: { /* ... */ }
    },
    // More test cases...
  ];
  
  testCases.forEach(test => {
    const nodes = parseCode(test.code, 'java');
    const results = myNewAnalysis(nodes);
    
    assert.deepEqual(results, test.expected, test.name);
  });
};
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Nov 2025 | Initial release |
| 1.1 | TBD | Branch support |
| 2.0 | TBD | Loop analysis |

---

## Contributing

To contribute extensions:

1. Fork the project
2. Create feature branch
3. Implement extension
4. Add tests
5. Update documentation
6. Submit pull request

---

## Support

**Documentation**: See README.md and USER_MANUAL.md  
**Issues**: Contact course instructor  
**Questions**: Use course forum

---

**API Version**: 1.0  
**Last Updated**: November 29, 2025  
**Maintained By**: Development Team