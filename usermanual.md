# Static Program Analyzer - User Manual

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [User Interface Guide](#user-interface-guide)
4. [Analysis Types](#analysis-types)
5. [Interpreting Results](#interpreting-results)
6. [Common Use Cases](#common-use-cases)
7. [Tips and Best Practices](#tips-and-best-practices)
8. [Troubleshooting](#troubleshooting)
9. [FAQ](#faq)

## Introduction

Welcome to the Static Program Analyzer! This tool helps you understand how your code behaves by performing sophisticated data-flow analysis. Whether you're a student learning compiler design or a developer optimizing code, this manual will guide you through every feature.

### What Can This Tool Do?

- ✅ **Find bugs** before running your code
- ✅ **Optimize** your programs by identifying inefficiencies
- ✅ **Understand** complex data flow patterns
- ✅ **Learn** compiler optimization techniques interactively

## Getting Started

### Step 1: Opening the Analyzer

Simply open the tool in your web browser. No installation or setup required!

### Step 2: Your First Analysis

Let's analyze a simple program:

1. Make sure **Java** is selected in the language dropdown
2. The default code is already loaded
3. Click the **"Analyze"** button
4. Watch as the tool analyzes your code in real-time!

### Step 3: Exploring Results

Click through the four tabs at the top of the results panel:
- **Reaching Defs** - See which variable definitions flow where
- **Live Variables** - Identify which variables are still needed
- **Available Expr** - Find reusable expressions
- **Very Busy Expr** - Discover expressions that must be computed

## User Interface Guide

### Main Components

```
┌─────────────────────────────────────────────────────────┐
│  Static Program Analyzer                     [Language▼]│
│  Advanced data-flow analysis for Java and C++           │
├─────────────────────────┬───────────────────────────────┤
│  CODE EDITOR            │  ANALYSIS RESULTS             │
│                         │                               │
│  [Analyze] [Export]     │  [Tabs for each analysis]    │
│                         │                               │
│  ┌───────────────────┐  │  ┌─────────────────────────┐ │
│  │                   │  │  │ Line-by-line results    │ │
│  │  Your code here   │  │  │ with issues highlighted │ │
│  │                   │  │  │                         │ │
│  │                   │  │  │                         │ │
│  └───────────────────┘  │  └─────────────────────────┘ │
│                         │                               │
└─────────────────────────┴───────────────────────────────┘
│  [Analysis Type Cards - Brief Descriptions]             │
└─────────────────────────────────────────────────────────┘
```

### Control Panel

#### Language Selector
- **Java**: For `.java` files
- **C++**: For `.cpp` files

**Tip**: The analyzer adapts its parsing based on your selection!

#### Analyze Button
- Click to run all four analyses
- Takes 0.5-2 seconds depending on code size
- Shows "Analyzing..." while processing

#### Export Button
- Appears after analysis completes
- Downloads JSON file with complete results
- Useful for documentation and sharing

### Code Editor

**Features**:
- Monospace font for better readability
- Line numbers (implied by results)
- Paste your own code or modify examples
- Supports multi-line programs

**Supported Code Patterns**:
```java
// Variable declarations with initialization
int x = 5;
int y = 10;

// Assignments with expressions
x = y + 3;
z = x * y;

// Binary operations
result = a + b;
value = x * y;

// Print statements (recognized but not analyzed)
System.out.println(x);
```

### Results Panel

Each result block shows:

```
┌─────────────────────────────────────────────┐
│ Line 2                                       │
│ int y = x + 10;                             │
│                                              │
│ [Analysis-specific information here]         │
│                                              │
│ ⚠️ Issues (if any)                          │
└─────────────────────────────────────────────┘
```

**Color Coding**:
- 🔴 **Red** - Errors (severe issues)
- 🟡 **Yellow** - Warnings (potential problems)
- 🔵 **Blue** - Information (helpful insights)
- 🟢 **Green** - Success (no issues)

## Analysis Types

### 1. Reaching Definitions Analysis

**What It Does**: Shows which variable assignments can "reach" each line of code.

**Example**:
```java
int x = 5;      // Definition: x@L1
int y = x;      // x@L1 reaches here
x = 10;         // Definition: x@L3 (kills x@L1)
int z = x;      // Only x@L3 reaches here
```

**Reading Results**:
```
Line 4: int z = x;
┌────────────────────────────────────┐
│ Reaching Definitions: x@L3         │
│                                    │
│ ✓ All used variables are defined  │
└────────────────────────────────────┘
```

**Common Issues Detected**:
- ⚠️ "Variable 'x' may be uninitialized"
  - **Meaning**: Variable used before being assigned
  - **Fix**: Add initialization before use

- ℹ️ "Variable 'x' has multiple reaching definitions"
  - **Meaning**: Multiple possible values at this point
  - **Impact**: Makes optimization harder

**When to Use**:
- Debugging initialization issues
- Understanding data dependencies
- Finding definition-use chains

### 2. Live Variable Analysis

**What It Does**: Identifies variables whose values will be used later in the program.

**Example**:
```java
int x = 5;      // x is LIVE (used on line 2)
int y = x + 1;  // x is LIVE IN, y is LIVE OUT
int z = y * 2;  // y is LIVE IN, z is LIVE OUT
return z;       // z is LIVE IN
int w = 10;     // w is DEAD (never used!) ⚠️
```

**Reading Results**:
```
Line 2: int y = x + 1;
┌────────────────────────────────────┐
│ Live IN:  x                        │
│ Live OUT: y                        │
│                                    │
│ ✓ No issues detected               │
└────────────────────────────────────┘

Line 5: int w = 10;
┌────────────────────────────────────┐
│ Live IN:  (none)                   │
│ Live OUT: (none)                   │
│                                    │
│ ⚠️ Dead code: Variable 'w' is     │
│    never used after this definition│
└────────────────────────────────────┘
```

**Common Issues Detected**:
- ⚠️ "Dead code: Variable 'x' is never used after this definition"
  - **Meaning**: Assignment is wasteful
  - **Fix**: Remove the assignment or use the variable
  - **Impact**: Wastes CPU cycles and memory

**When to Use**:
- Finding dead code
- Optimizing register allocation
- Reducing memory usage
- Code cleanup

### 3. Available Expressions Analysis

**What It Does**: Finds expressions that have already been computed and can be reused.

**Example**:
```java
int a = x + y;    // Computes x + y
int b = x + y;    // Could reuse previous result! ⚠️
int c = a + b;    // New expression
x = 5;            // Kills (x + y)
int d = x + y;    // Must recompute
```

**Reading Results**:
```
Line 2: int b = x + y;
┌────────────────────────────────────┐
│ Available IN:  x + y               │
│ Available OUT: x + y               │
│                                    │
│ ℹ️ Expression 'x + y' is available│
│    Consider reusing previous value │
└────────────────────────────────────┘
```

**Optimization Opportunity**:
```java
// BEFORE (inefficient)
int a = x + y;
int b = x + y;    // Recomputes!

// AFTER (optimized)
int a = x + y;
int b = a;        // Reuses result
```

**When to Use**:
- Eliminating redundant computations
- Common Subexpression Elimination (CSE)
- Performance optimization
- Reducing CPU usage

### 4. Very Busy Expressions Analysis

**What It Does**: Identifies expressions that MUST be computed on all future paths.

**Example**:
```java
if (condition) {
    x = a + b;    // Uses a + b
} else {
    y = a + b;    // Uses a + b
}
// a + b is VERY BUSY before the if!
// Can move computation here:
int temp = a + b;
if (condition) {
    x = temp;
} else {
    y = temp;
}
```

**Reading Results**:
```
Line 1: if (condition) {
┌────────────────────────────────────┐
│ Busy IN:  a + b                    │
│ Busy OUT: a + b                    │
│                                    │
│ ℹ️ Expression 'a + b' is very busy│
│    Consider computing earlier      │
└────────────────────────────────────┘
```

**Optimization Opportunity**:
- **Code Motion**: Move busy expressions to earlier program points
- **Reduce Duplication**: Compute once instead of multiple times
- **Loop Optimization**: Move invariant expressions outside loops

**When to Use**:
- Code motion optimization
- Loop optimization
- Reducing code size
- Improving performance

## Interpreting Results

### Understanding the Output

Each line of code gets analyzed with context-specific information:

#### Example: Complete Analysis

```java
int x = 5;
int y = x + 10;
int z = y * 2;
System.out.println(z);
```

**Reaching Definitions Results**:
```
Line 1: int x = 5;
  Reaching: (none - this is the first definition)

Line 2: int y = x + 10;
  Reaching: x@L1 (the value of x from line 1)

Line 3: int z = y * 2;
  Reaching: x@L1, y@L2

Line 4: System.out.println(z);
  Reaching: x@L1, y@L2, z@L3
```

**Live Variables Results**:
```
Line 1: int x = 5;
  Live IN:  (none)
  Live OUT: x (needed by line 2)

Line 2: int y = x + 10;
  Live IN:  x
  Live OUT: y (needed by line 3)

Line 3: int z = y * 2;
  Live IN:  y
  Live OUT: z (needed by line 4)

Line 4: System.out.println(z);
  Live IN:  z
  Live OUT: (none - end of program)
```

### Issue Severity Levels

#### 🔴 Errors (Critical)
- Must be fixed
- Will cause runtime failures
- Example: Using null pointers (in extended version)

#### 🟡 Warnings (Important)
- Should be addressed
- May cause bugs or inefficiency
- Examples:
  - Uninitialized variables
  - Dead code
  - Unused values

#### 🔵 Information (Helpful)
- Optimization opportunities
- Code insights
- Examples:
  - Multiple definitions
  - Available expressions
  - Very busy expressions

#### 🟢 Success (Good)
- No issues detected
- Code is clean at this point

### Common Patterns

#### Pattern 1: Sequential Definitions
```java
int x = 5;     // Defines x@L1
int y = x + 1; // Uses x@L1, defines y@L2
int z = y + 1; // Uses y@L2, defines z@L3
```
**✓ Good**: Clean, linear data flow

#### Pattern 2: Dead Code
```java
int x = 5;     // Defines x@L1
x = 10;        // Redefines - L1 never used! ⚠️
int y = x;     // Only uses x@L2
```
**⚠️ Warning**: First assignment is wasted

#### Pattern 3: Uninitialized Usage
```java
int x;         // Declaration only
int y = x + 5; // Uses uninitialized x! ⚠️
```
**⚠️ Warning**: Undefined behavior

## Common Use Cases

### Use Case 1: Finding Dead Code

**Goal**: Identify and remove unused computations

**Steps**:
1. Write or paste your code
2. Run analysis
3. Switch to **Live Variables** tab
4. Look for warnings: "Variable 'x' is never used"
5. Remove or fix the identified statements

**Example**:
```java
// BEFORE
int calculateTotal() {
    int x = 10;
    int y = 20;        // ⚠️ Dead code!
    int z = x + 5;
    int w = z * 2;     // ⚠️ Dead code!
    return z;
}

// AFTER (cleaned up)
int calculateTotal() {
    int x = 10;
    int z = x + 5;
    return z;
}
```

### Use Case 2: Detecting Uninitialized Variables

**Goal**: Catch potential bugs before runtime

**Steps**:
1. Input your code
2. Run analysis
3. Check **Reaching Definitions** tab
4. Look for warnings: "Variable 'x' may be uninitialized"
5. Add proper initialization

**Example**:
```java
// BEFORE (buggy)
int calculateSum() {
    int total;           // Not initialized!
    int count = 10;
    return total + count; // ⚠️ Warning!
}

// AFTER (fixed)
int calculateSum() {
    int total = 0;       // Properly initialized
    int count = 10;
    return total + count; // ✓ No warning
}
```

### Use Case 3: Optimizing Expressions

**Goal**: Eliminate redundant computations

**Steps**:
1. Input your code
2. Run analysis
3. Check **Available Expressions** tab
4. Find expressions computed multiple times
5. Refactor to compute once

**Example**:
```java
// BEFORE (inefficient)
int area = width * height;
int volume = width * height * depth; // Recomputes width * height

// AFTER (optimized)
int baseArea = width * height;       // Compute once
int area = baseArea;
int volume = baseArea * depth;        // Reuse
```

### Use Case 4: Learning Compiler Optimization

**Goal**: Understand how compilers optimize code

**Steps**:
1. Write test cases with known patterns
2. Predict what the analysis should show
3. Run analysis and verify
4. Compare with actual compiler output

**Educational Examples**:

**Example 1: Constant Propagation Opportunity**
```java
int x = 5;
int y = x + 3;  // Can propagate: y = 8
int z = y * 2;  // Can propagate: z = 16
```

**Example 2: Common Subexpression**
```java
int a = b + c;
int d = b + c;  // Same expression - CSE opportunity
```

**Example 3: Dead Code After Return**
```java
return x;
int y = 10;     // Unreachable - dead code
```

## Tips and Best Practices

### Writing Code for Analysis

#### ✅ DO:
- Use clear variable names
- Write one statement per line
- Initialize variables before use
- Keep functions focused and simple

#### ❌ DON'T:
- Mix multiple operations in one line (for now)
- Use uninitialized variables
- Create unnecessarily complex expressions
- Write code that depends on undefined behavior

### Getting Better Results

#### 1. **Start Simple**
```java
// Good starting point
int x = 5;
int y = x + 10;
return y;
```

#### 2. **Add Complexity Gradually**
```java
// Build up step by step
int x = 5;
int y = x + 10;
int z = y * 2;
int result = z - x;
return result;
```

#### 3. **Test Edge Cases**
```java
// Test uninitialized variables
int x;
int y = x + 1;  // Will trigger warning

// Test dead code
int a = 10;
a = 20;         // First value never used

// Test expression reuse
int b = x + y;
int c = x + y;  // Same expression
```

### Interpreting Complex Results

When you see many warnings:

1. **Prioritize** by severity (errors → warnings → info)
2. **Group** related issues together
3. **Fix** one category at a time
4. **Re-analyze** after each fix
5. **Verify** the issue is resolved

### Performance Tips

For large programs (50+ lines):

- Analysis may take 1-2 seconds
- Break into smaller functions if too slow
- Focus on critical sections first
- Use export feature to save results

## Troubleshooting

### Problem: Analysis Takes Too Long

**Symptoms**: "Analyzing..." message doesn't complete

**Solutions**:
1. Refresh the page and try again
2. Reduce code size (max ~100 lines)
3. Simplify complex expressions
4. Check for syntax errors

### Problem: Unexpected Results

**Symptoms**: Results don't match your expectations

**Solutions**:
1. Verify code syntax is correct
2. Check for typos in variable names
3. Ensure statements are on separate lines
4. Review the algorithm descriptions
5. Try a simpler version first

### Problem: No Issues Detected (But You Expected Some)

**Possible Reasons**:
1. Your code is actually clean! ✓
2. The issue type isn't supported yet
3. Code pattern not recognized

**What to Do**:
- Manually review the data-flow sets
- Try different analysis tabs
- Simplify the problematic section

### Problem: Too Many Warnings

**Approach**:
1. Don't panic - warnings are helpful!
2. Focus on "Dead code" warnings first
3. Then fix "Uninitialized" warnings
4. Finally review "Info" messages
5. Re-analyze after each batch of fixes

### Problem: Can't Export Results

**Solutions**:
1. Run analysis first (click "Analyze")
2. Wait for completion
3. Check browser download settings
4. Try a different browser

## FAQ

### General Questions

**Q: Which language should I use?**  
A: Java and C++ are both supported with similar syntax. Choose based on your needs.

**Q: How accurate is the analysis?**  
A: Very accurate for supported patterns. The tool uses proven algorithms from compiler theory.

**Q: Can I use this for production code?**  
A: This is an educational tool. For production, use industrial-strength analyzers like SonarQube or Coverity.

**Q: Does it support loops?**  
A: Currently supports sequential code. Loop support planned for future versions.

**Q: What about function calls?**  
A: Single-function analysis only. Interprocedural analysis is a future enhancement.

### Analysis-Specific Questions

**Q: What's the difference between Available and Very Busy expressions?**  
A:
- **Available**: Expression HAS been computed (looking backward)
- **Very Busy**: Expression WILL be computed (looking forward)

**Q: Why does it say a variable is dead if I use it later?**  
A: Check if the path to the use is actually reachable. The variable might be redefined before use.

**Q: What does "multiple reaching definitions" mean?**  
A: The variable could have different values at that point depending on which path was taken.

**Q: How do I fix "uninitialized variable" warnings?**  
A: Add an initialization: `int x = 0;` instead of just `int x;`

### Technical Questions

**Q: What algorithm does it use?**  
A: Fixed-point iteration with worklist, standard in compiler textbooks.

**Q: How many iterations does it take?**  
A: Typically 2-5 for simple programs, max 100 iterations enforced.

**Q: Why doesn't it support X feature?**  
A: This is an educational tool focused on core concepts. Many features are simplified intentionally.

**Q: Can I see the Control Flow Graph?**  
A: Not in the current UI, but it's generated internally. Future versions may visualize it.

### Troubleshooting Questions

**Q: Analysis failed - what do I do?**  
A: Check for syntax errors, simplify your code, and try again.

**Q: Results seem wrong - is there a bug?**  
A: Verify your understanding of the algorithm first. If still wrong, try a simpler example.

**Q: Can I report bugs or suggest features?**  
A: Provide feedback to your course instructor.

## Quick Reference Card

### Keyboard Shortcuts
- **Ctrl/Cmd + A**: Select all code
- **Ctrl/Cmd + C**: Copy code
- **Ctrl/Cmd + V**: Paste code

### Analysis Summary

| Analysis | Direction | Purpose | Key Output |
|----------|-----------|---------|------------|
| Reaching Definitions | Forward | Track definitions | Which defs reach here |
| Live Variables | Backward | Find live vars | Is variable needed later |
| Available Expressions | Forward | Find computed exprs | Can reuse expression |
| Very Busy Expressions | Backward | Find must-compute | Should compute earlier |

### Issue Quick Guide

| Icon | Meaning | Action Required |
|------|---------|-----------------|
| 🔴 | Error | Must fix immediately |
| 🟡 | Warning | Should fix soon |
| 🔵 | Info | Consider optimizing |
| 🟢 | Success | No action needed |

### Common Fixes

| Issue | Fix |
|-------|-----|
| Uninitialized variable | Add initialization |
| Dead code | Remove or use variable |
| Redundant computation | Reuse previous result |
| Multiple definitions | Clarify control flow |

---

## Getting Help

### Resources

1. **README.md** - Project overview and architecture
2. **TECHNICAL_DOCUMENTATION.md** - Algorithm details
3. **Course Materials** - Refer to your textbook
4. **Instructor** - Dr. Islam El-Maddah

### Support

For course-related questions:
- Ask during office hours
- Post on course forum
- Email the instructor

---

**Thank you for using the Static Program Analyzer!**

We hope this tool helps you learn data-flow analysis and write better code.

*Version 1.0 - November 2025*