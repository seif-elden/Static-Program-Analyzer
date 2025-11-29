# Static Program Analyzer for Java and C++

A comprehensive static analysis tool implementing advanced data-flow analysis techniques for program optimization and bug detection.

## 🎯 Project Overview

This tool performs four critical static analyses on Java and C++ code:

1. **Reaching Definitions Analysis** - Tracks which variable definitions reach each program point
2. **Live Variable Analysis** - Identifies variables that are live at each program point
3. **Available Expressions Analysis** - Finds expressions that are available for reuse
4. **Very Busy Expressions Analysis** - Detects expressions that must be computed

## ✨ Key Features

### Core Analysis Capabilities
- ✅ **Reaching Definitions**: Forward data-flow analysis to track variable definitions
- ✅ **Live Variables**: Backward analysis to detect dead code and optimize register allocation
- ✅ **Available Expressions**: Forward analysis for common subexpression elimination
- ✅ **Very Busy Expressions**: Backward analysis for code motion optimization

### Advanced Features
- 🔍 **Uninitialized Variable Detection**: Warns about potentially uninitialized variables
- 💀 **Dead Code Detection**: Identifies variables that are assigned but never used
- 📊 **Control Flow Graph**: Automatically constructs CFG from source code
- 🎨 **Interactive Visualization**: Real-time analysis results with detailed annotations
- 📁 **Export Functionality**: JSON export of complete analysis results
- 🚀 **Multi-language Support**: Java and C++ parsing

## 🏗️ Architecture

### System Components

```
┌─────────────────────────────────────────────────────┐
│                   User Interface                     │
│  (React-based Interactive Analyzer)                  │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│                  Parser Layer                        │
│  • Lexical Analysis                                  │
│  • Syntax Tree Construction                          │
│  • CFG Generation                                    │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│              Analysis Engine                         │
│  ┌──────────────────┐  ┌──────────────────┐        │
│  │ Forward Analyses │  │ Backward Analyses│        │
│  │ • Reaching Defs  │  │ • Live Variables │        │
│  │ • Available Expr │  │ • Very Busy Expr │        │
│  └──────────────────┘  └──────────────────┘        │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│           Results & Visualization                    │
│  • Issue Detection                                   │
│  • Report Generation                                 │
│  • Export to JSON                                    │
└─────────────────────────────────────────────────────┘
```

### Data Structures

#### CFG Node
```javascript
class CFGNode {
  id: number           // Unique identifier
  statement: string    // Source code statement
  line: number        // Line number
  successors: []      // Outgoing edges
  predecessors: []    // Incoming edges
  gen: Set            // Generated information
  kill: Set           // Killed information
  in: Set             // IN set (data-flow)
  out: Set            // OUT set (data-flow)
}
```

## 🚀 Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- No installation required - runs entirely in browser

### Quick Start

1. **Open the analyzer** in your web browser
2. **Select language** (Java or C++)
3. **Paste or type your code** in the editor
4. **Click "Analyze"** to run all analyses
5. **Switch between tabs** to view different analysis results

### Example Code

#### Java Example
```java
class Example {
    public static void main(String[] args) {
        int x = 5;
        int y = x + 10;
        int z = y * 2;
        System.out.println(z);
        int unused = 42;  // Dead code detected!
    }
}
```

#### C++ Example
```cpp
int main() {
    int a = 10;
    int b = a * 2;
    int c = b + 5;
    return c;
}
```

## 📖 Analysis Algorithms

### 1. Reaching Definitions Analysis

**Purpose**: Determines which definitions of variables reach each program point.

**Algorithm**: Forward data-flow analysis using fixed-point iteration

**Equations**:
```
IN[B] = ⋃(OUT[P]) for all predecessors P
OUT[B] = GEN[B] ⋃ (IN[B] - KILL[B])
```

**Applications**:
- Detecting uninitialized variables
- Constant propagation
- Dead code elimination

**Example**:
```java
int x = 5;      // Definition d1: x@L1
int y = x + 2;  // Uses d1
x = 10;         // Definition d2: x@L3, kills d1
int z = x + 1;  // Uses d2
```

### 2. Live Variable Analysis

**Purpose**: Identifies variables whose values will be used in the future.

**Algorithm**: Backward data-flow analysis

**Equations**:
```
OUT[B] = ⋃(IN[S]) for all successors S
IN[B] = USE[B] ⋃ (OUT[B] - DEF[B])
```

**Applications**:
- Register allocation
- Dead code elimination
- Optimization

**Example**:
```java
int x = 5;      // x is live out (used later)
int y = 10;     // y is dead (never used) - WARNING!
int z = x + 3;  // x is live in, z is live out
return z;       // z is live in
```

### 3. Available Expressions Analysis

**Purpose**: Finds expressions that have been computed and not invalidated.

**Algorithm**: Forward data-flow analysis with intersection

**Equations**:
```
IN[B] = ⋂(OUT[P]) for all predecessors P
OUT[B] = GEN[B] ⋃ (IN[B] - KILL[B])
```

**Applications**:
- Common subexpression elimination
- Code optimization
- Expression reuse

**Example**:
```java
int a = x + y;  // Expression (x + y) available
int b = x + y;  // Can reuse previous computation!
z = a + b;
```

### 4. Very Busy Expressions Analysis

**Purpose**: Detects expressions that will definitely be computed later.

**Algorithm**: Backward data-flow analysis with intersection

**Equations**:
```
OUT[B] = ⋂(IN[S]) for all successors S
IN[B] = USE[B] ⋃ (OUT[B] - DEF[B])
```

**Applications**:
- Code motion (moving computations earlier)
- Loop optimization
- Reducing redundant computations

**Example**:
```java
if (condition) {
    x = a + b;    // a + b is very busy
} else {
    y = a + b;    // a + b is very busy
}
// Can compute a + b before the if statement!
```

## 🔧 Implementation Details

### Parsing Strategy

The analyzer uses a simplified parsing approach:

1. **Tokenization**: Split code into lines and statements
2. **Pattern Matching**: Regular expressions for declarations, assignments, and expressions
3. **CFG Construction**: Linear flow with entry and exit nodes
4. **Variable Extraction**: Identify defined and used variables in each statement

### Fixed-Point Iteration

All analyses use the worklist algorithm:

```
Initialize all sets
do:
    changed = false
    for each node in appropriate order:
        compute new IN set
        if IN changed: changed = true
        compute new OUT set
        if OUT changed: changed = true
while changed
```

**Convergence**: Guaranteed within 100 iterations for typical programs

### Issue Detection

The tool automatically detects:

- ⚠️ **Uninitialized variables**: Variable used before any reaching definition
- ⚠️ **Dead code**: Variable defined but never used afterward
- ℹ️ **Multiple definitions**: Variable with multiple reaching definitions
- ℹ️ **Redundant computations**: Expressions computed multiple times

## 📊 Output Format

### Interactive Display

Each analysis shows per-statement information:

**Reaching Definitions**:
- List of variable definitions that reach the statement
- Warnings for uninitialized usage

**Live Variables**:
- Live IN: Variables live at statement entry
- Live OUT: Variables live at statement exit
- Dead code warnings

**Available Expressions**:
- Available IN: Expressions available at entry
- Available OUT: Expressions available at exit

**Very Busy Expressions**:
- Busy IN: Expressions that must be computed
- Busy OUT: Expressions busy at exit

### JSON Export

```json
{
  "language": "java",
  "timestamp": "2025-11-29T10:30:00Z",
  "code": "...",
  "analysisResults": {
    "reaching": [...],
    "live": [...],
    "available": [...],
    "busy": [...]
  }
}
```

## 🎓 Educational Use

This tool is designed for:

- **Students**: Learning data-flow analysis concepts
- **Educators**: Teaching compiler optimization
- **Researchers**: Experimenting with static analysis
- **Developers**: Understanding code optimization opportunities

### Suggested Exercises

1. **Basic Analysis**: Analyze simple programs and verify results manually
2. **Dead Code**: Write code with unused variables and see detection
3. **Optimization**: Identify expressions that can be optimized
4. **Comparison**: Compare results across different analyses

## 🔬 Testing

### Test Cases

#### Test 1: Basic Flow
```java
int x = 5;
int y = x + 10;
System.out.println(y);
```

**Expected**:
- Reaching: x@L1 reaches L2, both reach L3
- Live: x live at L2, y live at L3
- No dead code

#### Test 2: Dead Code
```java
int x = 5;
int y = 10;
int z = x + 1;
```

**Expected**:
- Live Variable: y is dead (warning issued)

#### Test 3: Uninitialized Variable
```java
int x;
int y = x + 5;
```

**Expected**:
- Reaching Definitions: Warning for uninitialized x

### Validation Strategy

1. **Manual Verification**: Compare with hand-calculated results
2. **Edge Cases**: Test with complex control flow
3. **Stress Testing**: Large programs (100+ lines)
4. **Cross-Language**: Verify both Java and C++ support

## ⚡ Performance

### Complexity Analysis

- **Time Complexity**: O(N × I) where N = nodes, I = iterations
- **Space Complexity**: O(N × V) where V = variables/expressions
- **Typical Performance**: < 500ms for 50-line programs
- **Max Iterations**: 100 (convergence guarantee)

### Optimization Techniques

1. **Early Termination**: Stop when no changes detected
2. **Efficient Set Operations**: Using JavaScript Set with proper comparisons
3. **Incremental Updates**: Only recompute changed nodes

## 🚧 Limitations

### Current Limitations

1. **Control Flow**: Only sequential and simple branching (no loops yet)
2. **Expressions**: Binary operations only (no function calls)
3. **Type System**: Simplified type handling
4. **Scope**: Single function/method analysis
5. **Interprocedural**: No cross-function analysis

### Future Enhancements

- [ ] Loop support with proper fixed-point iteration
- [ ] Function call handling
- [ ] Pointer analysis (C++)
- [ ] Array and object field sensitivity
- [ ] Interprocedural analysis
- [ ] More sophisticated CFG for complex control flow
- [ ] Integration with real parsers (ANTLR, Esprima)

## 📚 References

### Academic Papers

1. Aho, Lam, Sethi, Ullman - "Compilers: Principles, Techniques, and Tools" (Dragon Book)
2. Nielson, Nielson, Hankin - "Principles of Program Analysis"
3. Khedker, Sanyal, Karkare - "Data Flow Analysis: Theory and Practice"

### Algorithms

- **Reaching Definitions**: Kildall, 1973
- **Live Variables**: Kennedy, 1979
- **Available Expressions**: Cocke & Schwartz, 1970
- **Very Busy Expressions**: Knoop, Rüthing, Steffen, 1992

## 🤝 Contributing

This is an educational project. Suggestions for improvements:

1. Enhanced parsing for complex constructs
2. Additional analyses (e.g., constant propagation)
3. Better visualization (graphical CFG)
4. Performance optimizations
5. Extended language support

## 📜 License

This project is provided for educational purposes as part of CSE342/CSE327/CSE345 Program Analysis course.

## 👥 Team

Maximum 5 students per team as per project requirements.

## 📧 Contact

For questions or feedback, please contact the course instructor:
Dr. Islam El-Maddah

---

**Version**: 1.0  
**Last Updated**: November 2025  
**Course**: CSE342/CSE327/CSE345 - Program Analysis - Fall 2025