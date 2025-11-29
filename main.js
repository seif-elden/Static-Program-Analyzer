import React, { useState, useEffect } from 'react';
import { Play, Download, AlertCircle, CheckCircle, Info, FileText, GitBranch, Activity, Code } from 'lucide-react';

const StaticAnalyzer = () => {
  const [code, setCode] = useState(`class Example {
    public static void main(String[] args) {
        int x = 5;
        int y = x + 10;
        int z = y * 2;
        System.out.println(z);
        int unused = 42;
    }
}`);
  
  const [language, setLanguage] = useState('java');
  const [analysisResults, setAnalysisResults] = useState(null);
  const [activeTab, setActiveTab] = useState('reaching');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [cfg, setCfg] = useState(null);

  // CFG Node class
  class CFGNode {
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

  // Parser for simplified Java/C++
  const parseCode = (code, lang) => {
    const lines = code.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const nodes = [];
    let nodeId = 0;

    const entry = new CFGNode(nodeId++, 'ENTRY', 0);
    nodes.push(entry);
    let currentNode = entry;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip declarations and structural elements
      if (line.includes('class ') || line.includes('public static') || 
          line === '{' || line === '}' || line.includes('void main')) {
        continue;
      }

      const node = new CFGNode(nodeId++, line, i + 1);
      currentNode.successors.push(node);
      node.predecessors.push(currentNode);
      nodes.push(node);
      currentNode = node;
    }

    const exit = new CFGNode(nodeId++, 'EXIT', lines.length + 1);
    currentNode.successors.push(exit);
    exit.predecessors.push(currentNode);
    nodes.push(exit);

    return nodes;
  };

  // Extract variable from statement
  const extractVarInfo = (statement) => {
    // Remove semicolons and extra whitespace
    const cleaned = statement.replace(/;/g, '').trim();
    
    // Declaration: int x = 5
    const declMatch = cleaned.match(/(?:int|float|double|String|char)\s+(\w+)\s*=\s*(.+)/);
    if (declMatch) {
      const variable = declMatch[1];
      const expr = declMatch[2];
      const usedVars = expr.match(/\b[a-zA-Z_]\w*\b/g)?.filter(v => v !== variable) || [];
      return { type: 'decl', defined: variable, used: usedVars };
    }

    // Assignment: x = y + z
    const assignMatch = cleaned.match(/(\w+)\s*=\s*(.+)/);
    if (assignMatch) {
      const variable = assignMatch[1];
      const expr = assignMatch[2];
      const usedVars = expr.match(/\b[a-zA-Z_]\w*\b/g)?.filter(v => v !== variable) || [];
      return { type: 'assign', defined: variable, used: usedVars };
    }

    // Expression or print statement
    const usedVars = cleaned.match(/\b[a-zA-Z_]\w*\b/g)?.filter(v => 
      !['int', 'float', 'double', 'String', 'System', 'println', 'out'].includes(v)
    ) || [];
    
    return { type: 'use', defined: null, used: usedVars };
  };

  // Reaching Definitions Analysis
  const reachingDefinitionsAnalysis = (nodes) => {
    const results = [];
    const allDefs = new Map();
    let defId = 0;

    // Initialize gen and kill sets
    nodes.forEach(node => {
      if (node.statement === 'ENTRY' || node.statement === 'EXIT') return;
      
      const info = extractVarInfo(node.statement);
      if (info.defined) {
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

    // Collect results
    nodes.forEach(node => {
      if (node.statement === 'ENTRY' || node.statement === 'EXIT') return;
      results.push({
        line: node.line,
        statement: node.statement,
        reaching: Array.from(node.in),
        issues: detectReachingIssues(node, node.in)
      });
    });

    return results;
  };

  const detectReachingIssues = (node, reaching) => {
    const issues = [];
    const info = extractVarInfo(node.statement);
    
    // Check for uninitialized variable usage
    if (info.used.length > 0) {
      info.used.forEach(variable => {
        const hasDef = Array.from(reaching).some(def => def.startsWith(variable + '@'));
        if (!hasDef) {
          issues.push({ type: 'warning', message: `Variable '${variable}' may be uninitialized` });
        }
      });
    }

    // Check for multiple reaching definitions
    if (info.defined) {
      const varDefs = Array.from(reaching).filter(def => 
        def.startsWith(info.defined + '@')
      );
      if (varDefs.length > 1) {
        issues.push({ type: 'info', message: `Variable '${info.defined}' has multiple reaching definitions` });
      }
    }

    return issues;
  };

  // Live Variable Analysis
  const liveVariableAnalysis = (nodes) => {
    const results = [];

    // Initialize use and def sets
    nodes.forEach(node => {
      if (node.statement === 'ENTRY' || node.statement === 'EXIT') return;
      
      const info = extractVarInfo(node.statement);
      node.gen.clear();
      node.kill.clear();
      
      info.used.forEach(v => node.gen.add(v));
      if (info.defined) node.kill.add(info.defined);
    });

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

    // Collect results and detect dead code
    nodes.forEach(node => {
      if (node.statement === 'ENTRY' || node.statement === 'EXIT') return;
      
      const info = extractVarInfo(node.statement);
      const issues = [];

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

    return results;
  };

  // Available Expressions Analysis
  const availableExpressionsAnalysis = (nodes) => {
    const results = [];
    const allExprs = new Set();

    // Extract all expressions
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
      
      exprs.forEach(e => node.gen.add(e));
      
      if (info.defined) {
        allExprs.forEach(expr => {
          if (expr.includes(info.defined)) {
            node.kill.add(expr);
          }
        });
      }
    });

    // Initialize entry with all expressions
    const entryNode = nodes[0];
    entryNode.out = new Set(allExprs);

    // Forward fixed-point iteration
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

    nodes.forEach(node => {
      if (node.statement === 'ENTRY' || node.statement === 'EXIT') return;
      results.push({
        line: node.line,
        statement: node.statement,
        availableIn: Array.from(node.in),
        availableOut: Array.from(node.out),
        issues: []
      });
    });

    return results;
  };

  // Very Busy Expressions Analysis
  const veryBusyExpressionsAnalysis = (nodes) => {
    const results = [];
    const allExprs = new Set();

    nodes.forEach(node => {
      if (node.statement === 'ENTRY' || node.statement === 'EXIT') return;
      const exprs = extractExpressions(node.statement);
      exprs.forEach(e => allExprs.add(e));
    });

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

    nodes.forEach(node => {
      if (node.statement === 'ENTRY' || node.statement === 'EXIT') return;
      results.push({
        line: node.line,
        statement: node.statement,
        busyIn: Array.from(node.in),
        busyOut: Array.from(node.out),
        issues: []
      });
    });

    return results;
  };

  // Helper functions
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

  const setsEqual = (a, b) => {
    if (a.size !== b.size) return false;
    for (const item of a) {
      if (!b.has(item)) return false;
    }
    return true;
  };

  const setIntersection = (a, b) => {
    const result = new Set();
    for (const item of a) {
      if (b.has(item)) result.add(item);
    }
    return result;
  };

  const analyzeCode = () => {
    setIsAnalyzing(true);
    
    setTimeout(() => {
      try {
        const nodes = parseCode(code, language);
        setCfg(nodes);
        
        const reaching = reachingDefinitionsAnalysis(nodes);
        const live = liveVariableAnalysis(nodes);
        const available = availableExpressionsAnalysis(nodes);
        const busy = veryBusyExpressionsAnalysis(nodes);
        
        setAnalysisResults({
          reaching,
          live,
          available,
          busy
        });
        
        setIsAnalyzing(false);
      } catch (error) {
        console.error('Analysis error:', error);
        setIsAnalyzing(false);
      }
    }, 500);
  };

  const getIssueIcon = (type) => {
    switch(type) {
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'info': return <Info className="w-4 h-4 text-blue-500" />;
      default: return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  const renderResults = () => {
    if (!analysisResults) return null;

    const data = {
      reaching: analysisResults.reaching,
      live: analysisResults.live,
      available: analysisResults.available,
      busy: analysisResults.busy
    }[activeTab];

    return (
      <div className="space-y-4">
        {data.map((result, idx) => (
          <div key={idx} className="border border-gray-700 rounded-lg p-4 bg-gray-800">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-gray-400">Line {result.line}</span>
                </div>
                <code className="text-sm text-gray-200 font-mono">{result.statement}</code>
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              {activeTab === 'reaching' && (
                <div className="bg-gray-900 rounded p-2">
                  <span className="text-purple-400 font-semibold">Reaching Definitions:</span>
                  <div className="ml-4 mt-1 text-gray-300">
                    {result.reaching.length > 0 ? result.reaching.join(', ') : 'None'}
                  </div>
                </div>
              )}
              
              {activeTab === 'live' && (
                <>
                  <div className="bg-gray-900 rounded p-2">
                    <span className="text-green-400 font-semibold">Live IN:</span>
                    <span className="ml-2 text-gray-300">
                      {result.liveIn.length > 0 ? result.liveIn.join(', ') : 'None'}
                    </span>
                  </div>
                  <div className="bg-gray-900 rounded p-2">
                    <span className="text-blue-400 font-semibold">Live OUT:</span>
                    <span className="ml-2 text-gray-300">
                      {result.liveOut.length > 0 ? result.liveOut.join(', ') : 'None'}
                    </span>
                  </div>
                </>
              )}
              
              {activeTab === 'available' && (
                <>
                  <div className="bg-gray-900 rounded p-2">
                    <span className="text-cyan-400 font-semibold">Available IN:</span>
                    <span className="ml-2 text-gray-300">
                      {result.availableIn.length > 0 ? result.availableIn.join(', ') : 'None'}
                    </span>
                  </div>
                  <div className="bg-gray-900 rounded p-2">
                    <span className="text-teal-400 font-semibold">Available OUT:</span>
                    <span className="ml-2 text-gray-300">
                      {result.availableOut.length > 0 ? result.availableOut.join(', ') : 'None'}
                    </span>
                  </div>
                </>
              )}
              
              {activeTab === 'busy' && (
                <>
                  <div className="bg-gray-900 rounded p-2">
                    <span className="text-orange-400 font-semibold">Busy IN:</span>
                    <span className="ml-2 text-gray-300">
                      {result.busyIn.length > 0 ? result.busyIn.join(', ') : 'None'}
                    </span>
                  </div>
                  <div className="bg-gray-900 rounded p-2">
                    <span className="text-amber-400 font-semibold">Busy OUT:</span>
                    <span className="ml-2 text-gray-300">
                      {result.busyOut.length > 0 ? result.busyOut.join(', ') : 'None'}
                    </span>
                  </div>
                </>
              )}
              
              {result.issues && result.issues.length > 0 && (
                <div className="mt-2 space-y-1">
                  {result.issues.map((issue, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 bg-gray-900 rounded">
                      {getIssueIcon(issue.type)}
                      <span className="text-gray-300 text-xs">{issue.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const exportResults = () => {
    const report = {
      language,
      timestamp: new Date().toISOString(),
      code,
      analysisResults
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'analysis-report.json';
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Static Program Analyzer
          </h1>
          <p className="text-gray-400">Advanced data-flow analysis for Java and C++</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="space-y-4">
            <div className="flex gap-4 items-center">
              <select 
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="java">Java</option>
                <option value="cpp">C++</option>
              </select>
              
              <button
                onClick={analyzeCode}
                disabled={isAnalyzing}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4" />
                {isAnalyzing ? 'Analyzing...' : 'Analyze'}
              </button>
              
              {analysisResults && (
                <button
                  onClick={exportResults}
                  className="flex items-center gap-2 px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Source Code</label>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full h-96 p-4 bg-gray-800 border border-gray-700 rounded-lg font-mono text-sm focus:outline-none focus:border-blue-500 resize-none"
                spellCheck="false"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex gap-2 border-b border-gray-700">
              {[
                { id: 'reaching', icon: GitBranch, label: 'Reaching Defs' },
                { id: 'live', icon: Activity, label: 'Live Variables' },
                { id: 'available', icon: CheckCircle, label: 'Available Expr' },
                { id: 'busy', icon: Code, label: 'Very Busy Expr' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-b-2 border-blue-500 text-blue-400'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="h-96 overflow-y-auto bg-gray-800 border border-gray-700 rounded-lg p-4">
              {analysisResults ? renderResults() : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Run analysis to see results</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <h3 className="font-semibold text-purple-400 mb-2">Reaching Definitions</h3>
            <p className="text-gray-400 text-xs">Tracks which variable definitions reach each program point</p>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <h3 className="font-semibold text-green-400 mb-2">Live Variables</h3>
            <p className="text-gray-400 text-xs">Identifies variables whose values may be used in the future</p>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <h3 className="font-semibold text-cyan-400 mb-2">Available Expressions</h3>
            <p className="text-gray-400 text-xs">Finds expressions computed on all paths to a program point</p>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <h3 className="font-semibold text-orange-400 mb-2">Very Busy Expressions</h3>
            <p className="text-gray-400 text-xs">Detects expressions that will definitely be used later</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaticAnalyzer;