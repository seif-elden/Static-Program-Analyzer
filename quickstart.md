# Quick Start Guide - Static Program Analyzer

## 🚀 Get Started in 5 Minutes

This guide will have you analyzing programs in no time!

---

## Option 1: Use Online (Recommended)

**No installation required!** The analyzer runs entirely in your web browser.

### Step 1: Open the Tool
Simply open the provided HTML file in any modern web browser:
- Chrome (recommended)
- Firefox
- Safari
- Edge

### Step 2: Start Analyzing
The tool is ready to use immediately with example code already loaded!

---

## Option 2: Local Development Setup

For developers who want to modify or extend the tool:

### Prerequisites
```bash
# Required
- Node.js 18+ (for development only)
- Modern web browser
- Text editor (VS Code recommended)
```

### Quick Setup
```bash
# 1. Create project directory
mkdir static-analyzer
cd static-analyzer

# 2. Create index.html
# Copy the artifact code into index.html

# 3. Open in browser
# Double-click index.html or:
open index.html  # macOS
start index.html # Windows
xdg-open index.html # Linux
```

**That's it!** No npm install, no build process, no server needed.

---

## Your First Analysis

### Example 1: Detect Dead Code

```java
// 1. Paste this code into the editor:
class Example {
    public static void main(String[] args) {
        int x = 5;
        int y = 10;      // This is dead code!
        int z = x + 1;
        System.out.println(z);
    }
}

// 2. Click "Analyze"

// 3. Switch to "Live Variables" tab

// 4. Look for the warning:
// ⚠️ "Dead code: Variable 'y' is never used"
```

### Example 2: Find Uninitialized Variables

```java
// 1. Paste this code:
class Example {
    public static void main(String[] args) {
        int x;           // Declared but not initialized
        int y = x + 5;   // Uses uninitialized x!
        System.out.println(y);
    }
}

// 2. Click "Analyze"

// 3. Check "Reaching Definitions" tab

// 4. See the warning:
// ⚠️ "Variable 'x' may be uninitialized"
```

### Example 3: Optimize Expressions

```java
// 1. Paste this code:
class Example {
    public static void main(String[] args) {
        int a = x + y;
        int b = x + y;   // Recomputes same expression!
        int c = a + b;
        System.out.println(c);
    }
}

// 2. Click "Analyze"

// 3. Check "Available Expressions" tab

// 4. Line 2 shows:
// ℹ️ "Expression 'x + y' is available"
// You can reuse 'a' instead of recomputing!
```

---

## Interface Tour (2 Minutes)

### Main Screen Layout

```
┌────────────────────────────────────────────────────┐
│  Static Program Analyzer            [Language ▼]   │
│  [Analyze] [Export]                                 │
├──────────────────────┬─────────────────────────────┤
│                      │                             │
│  CODE EDITOR         │  ANALYSIS RESULTS           │
│                      │                             │
│  Your code here...   │  [Tabs for analyses]        │
│                      │  - Reaching Defs            │
│                      │  - Live Variables           │
│                      │  - Available Expr           │
│                      │  - Very Busy Expr           │
│                      │                             │
└──────────────────────┴─────────────────────────────┘
```

### Controls

1. **Language Selector**: Choose Java or C++
2. **Analyze Button**: Run all four analyses
3. **Export Button**: Download results as JSON
4. **Analysis Tabs**: Switch between different analysis types

### Results Display

Each result shows:
- **Line Number**: Where the statement is located
- **Statement**: The actual code
- **Analysis Data**: Sets (IN, OUT, GEN, KILL, etc.)
- **Issues**: Warnings, errors, or information

---

## Understanding the Results

### Tab 1: Reaching Definitions

**Shows**: Which variable definitions reach each program point

**Look For**:
- ⚠️ Uninitialized variables
- ℹ️ Multiple reaching definitions

**Example Result**:
```
Line 2: int y = x + 10;
┌─────────────────────────────┐
│ Reaching Definitions: x@L1  │
│ ✓ All variables initialized │
└─────────────────────────────┘
```

### Tab 2: Live Variables

**Shows**: Which variables are still needed later

**Look For**:
- ⚠️ Dead code (unused variables)

**Example Result**:
```
Line 2: int y = 10;
┌─────────────────────────────┐
│ Live IN:  (none)            │
│ Live OUT: (none)            │
│ ⚠️ Dead code: 'y' never used│
└─────────────────────────────┘
```

### Tab 3: Available Expressions

**Shows**: Expressions that can be reused

**Look For**:
- ℹ️ Redundant computations

**Example Result**:
```
Line 3: int c = x + y;
┌─────────────────────────────┐
│ Available IN: x + y         │
│ ℹ️ Can reuse previous result│
└─────────────────────────────┘
```

### Tab 4: Very Busy Expressions

**Shows**: Expressions that must be computed later

**Look For**:
- ℹ️ Code motion opportunities

---

## Common Tasks

### Task 1: Check Your Code for Issues

```bash
1. Write or paste your code
2. Click "Analyze"
3. Check each tab for warnings
4. Fix issues and re-analyze
5. Repeat until clean!
```

### Task 2: Learn Data-Flow Analysis

```bash
1. Start with simple examples
2. Predict what analysis should show
3. Run analyzer to verify
4. Compare with your expectations
5. Read documentation for details
```

### Task 3: Export Results

```bash
1. Analyze your code
2. Click "Export"
3. JSON file downloads automatically
4. Use in reports or other tools
```

### Task 4: Compare Analyses

```bash
1. Analyze a program
2. Switch between tabs
3. Notice how different analyses
   provide different insights
4. Understand the relationships
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl/Cmd + A | Select all code |
| Ctrl/Cmd + C | Copy code |
| Ctrl/Cmd + V | Paste code |
| Ctrl/Cmd + Enter | Run analysis |

---

## Troubleshooting

### Problem: Analysis doesn't start

**Solutions**:
- Check that you have code in the editor
- Ensure JavaScript is enabled
- Try refreshing the page
- Check browser console for errors

### Problem: Unexpected results

**Solutions**:
- Verify code syntax is correct
- Check for typos in variable names
- Try simplifying the code
- Read the algorithm descriptions

### Problem: Performance issues

**Solutions**:
- Reduce code size (< 100 lines)
- Simplify complex expressions
- Close other browser tabs
- Use a modern browser

### Problem: Export doesn't work

**Solutions**:
- Run analysis first
- Check browser download settings
- Allow pop-ups if blocked
- Try different browser

---

## Tips for Best Results

### ✅ DO:
- Use clear, meaningful variable names
- Write one statement per line
- Start with simple examples
- Read the warnings carefully
- Experiment with different code patterns

### ❌ DON'T:
- Mix multiple languages
- Use unsupported syntax (loops, etc.)
- Write overly complex expressions
- Ignore warnings without understanding
- Expect production-compiler features

---

## Example Workflows

### Workflow 1: Student Learning

```
Goal: Understand reaching definitions

1. Read textbook example
2. Enter code into analyzer
3. Run analysis
4. Compare with textbook solution
5. Experiment with variations
6. Build intuition
```

### Workflow 2: Code Review

```
Goal: Find potential bugs

1. Paste function code
2. Run analysis
3. Check "Live Variables" for dead code
4. Check "Reaching Defs" for uninitialized vars
5. Fix issues in original code
6. Verify fixes work
```

### Workflow 3: Optimization

```
Goal: Improve performance

1. Analyze existing code
2. Check "Available Expressions"
3. Identify redundant computations
4. Refactor to eliminate waste
5. Re-analyze to verify
6. Measure actual performance gain
```

---

## Next Steps

### Beginner Path
1. ✅ Complete "Your First Analysis" above
2. 📖 Read USER_MANUAL.md sections 1-4
3. 🧪 Try the provided examples
4. 💡 Experiment with your own code
5. 📚 Learn about each analysis type

### Intermediate Path
1. ✅ Understand all four analyses
2. 📖 Read TECHNICAL_DOCUMENTATION.md Part 1-2
3. 🧪 Work through test cases
4. 💡 Try complex examples
5. 📚 Compare with compiler output

### Advanced Path
1. ✅ Master all features
2. 📖 Read complete technical docs
3. 🧪 Write your own test cases
4. 💡 Extend the analyzer
5. 📚 Research advanced analyses

---

## Resources

### Documentation
- **README.md**: Project overview and architecture
- **USER_MANUAL.md**: Complete usage guide
- **TECHNICAL_DOCUMENTATION.md**: Algorithm details (3 parts)
- **PROJECT_REPORT.md**: Comprehensive project report

### Learning Materials
- Dragon Book: Chapter 9 (Data-Flow Analysis)
- Course lectures and slides
- Online compiler tutorials
- Academic papers in references

### Support
- Course instructor: Dr. Islam El-Maddah
- Office hours: [See course schedule]
- Discussion forum: [Course platform]
- Email: [Course contact]

---

## FAQ

**Q: Do I need to install anything?**  
A: No! It runs entirely in your web browser.

**Q: What browsers are supported?**  
A: Chrome, Firefox, Safari, and Edge (latest versions).

**Q: Can I use this for my assignments?**  
A: Yes! That's what it's designed for.

**Q: How do I save my work?**  
A: Copy your code to a file, or use the Export button for results.

**Q: Can I analyze C++ code?**  
A: Yes! Select C++ from the language dropdown.

**Q: Why doesn't it support loops?**  
A: This is v1.0 focused on core concepts. Loops coming in v2.0!

**Q: Is this open source?**  
A: It's an educational project for the course.

**Q: Can I modify the code?**  
A: Yes! The architecture is designed to be extensible.

---

## Summary

**You're now ready to use the Static Program Analyzer!**

**Quick Reminder**:
1. Open in browser
2. Paste code
3. Click "Analyze"
4. Explore results
5. Fix issues
6. Learn and improve!

**Need Help?**
- Check USER_MANUAL.md for detailed instructions
- Read TECHNICAL_DOCUMENTATION.md for algorithms
- Contact instructor with questions

---

**Happy Analyzing! 🎉**

*Last Updated: November 2025*  
*Version: 1.0*  
*Course: CSE342/CSE327/CSE345 - Program Analysis*