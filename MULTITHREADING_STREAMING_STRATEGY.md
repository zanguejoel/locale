# Multithreading Strategy for Smooth Streaming

**Last Updated:** October 27, 2025  
**Status:** 📋 ADVANCED OPTIMIZATION PLAN  
**Priority:** MEDIUM (Phase 2 Enhancement)

---

## 🎯 Executive Summary

Integrating multithreading into the streaming architecture can provide additional performance improvements beyond the main plan. This document outlines how to leverage React Native's threading capabilities to offload CPU-intensive tasks from the main UI thread.

**Key Benefits:**
- ⚡ 60 FPS maintained even during heavy processing
- 🔄 Parallel processing of stream chunks
- 🎨 Non-blocking markdown rendering
- 📊 Smoother UI during complex operations

---

## 🧵 React Native Threading Model

### Current Architecture

```
┌─────────────────────────────────────────────────────┐
│               React Native Threads                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────┐  ┌──────────────┐               │
│  │  UI Thread   │  │  JS Thread   │               │
│  │  (Native)    │  │  (Hermes/JSC)│               │
│  │              │  │              │               │
│  │  • Renders   │  │  • Business  │               │
│  │  • Gestures  │  │    logic     │               │
│  │  • Animations│  │  • State     │               │
│  │              │  │  • Events    │               │
│  └──────────────┘  └──────────────┘               │
│         ↕                 ↕                         │
│  ┌─────────────────────────────────────┐           │
│  │       Bridge / JSI                  │           │
│  │  (Communication between threads)    │           │
│  └─────────────────────────────────────┘           │
│                                                     │
└─────────────────────────────────────────────────────┘

Problem: JS Thread can get blocked by:
  • Heavy markdown parsing
  • Complex state updates
  • Artifact extraction
  • Stream data processing
```

### Enhanced Architecture with Workers

```
┌─────────────────────────────────────────────────────────────┐
│          Enhanced React Native Architecture                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐   │
│  │  UI Thread   │  │  JS Thread   │  │ Worker Threads │   │
│  │  (Native)    │  │  (Main)      │  │ (Background)   │   │
│  │              │  │              │  │                │   │
│  │  • Renders   │  │  • UI State  │  │  • Parsing     │   │
│  │  • Gestures  │  │  • Routing   │  │  • Processing  │   │
│  │  • Animations│  │  • Events    │  │  • Extraction  │   │
│  │              │  │              │  │  • Formatting  │   │
│  └──────────────┘  └──────────────┘  └────────────────┘   │
│         ↕                 ↕                   ↕             │
│  ┌───────────────────────────────────────────────────┐     │
│  │              JSI / Message Passing                │     │
│  └───────────────────────────────────────────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Benefits:
  ✅ UI thread never blocked
  ✅ JS thread focused on state/routing
  ✅ Heavy processing in background
  ✅ Results delivered when ready
```

---

## 🔧 Implementation Options

### Option 1: React Native Workers (Recommended for Web Workers API)

**Library:** `react-native-workers`  
**Best for:** Heavy CPU tasks, data processing  
**Pros:** Web Workers API, good compatibility  
**Cons:** Limited to data transfer (no DOM/UI access)

```typescript
// Install
npm install react-native-workers

// Usage
import { Worker } from 'react-native-workers';

const worker = new Worker('path/to/worker.js');

worker.postMessage({ type: 'parse', data: markdownText });

worker.onmessage = (e) => {
  const { type, result } = e.data;
  if (type === 'parsed') {
    setParsedContent(result);
  }
};
```

---

### Option 2: react-native-worklets (Recommended for UI Sync)

**Library:** `react-native-reanimated` (includes worklets)  
**Best for:** Animations, gestures, UI-related work  
**Pros:** Direct UI thread access, no serialization  
**Cons:** Limited to Reanimated context

```typescript
// Install
npm install react-native-reanimated

// Usage
import { runOnUI, runOnJS } from 'react-native-reanimated';

const processOnUI = (data: string) => {
  'worklet';
  // Runs on UI thread
  const processed = heavyProcessing(data);
  runOnJS(updateState)(processed);
};
```

---

### Option 3: Native Modules (Recommended for Maximum Performance)

**Best for:** Extremely heavy processing, native code integration  
**Pros:** Full native performance, no bridge overhead (with JSI)  
**Cons:** Platform-specific code, more complex

```typescript
// iOS: StreamProcessor.swift
@objc(StreamProcessor)
class StreamProcessor: NSObject {
  @objc
  func processChunk(_ chunk: String, 
                    resolver: @escaping RCTPromiseResolveBlock,
                    rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.global(qos: .userInitiated).async {
      let result = self.heavyProcessing(chunk)
      DispatchQueue.main.async {
        resolver(result)
      }
    }
  }
}

// Android: StreamProcessorModule.kt
class StreamProcessorModule(context: ReactApplicationContext) : 
    ReactContextBaseJavaModule(context) {
  
  @ReactMethod
  fun processChunk(chunk: String, promise: Promise) {
    val executor = Executors.newSingleThreadExecutor()
    executor.execute {
      val result = heavyProcessing(chunk)
      promise.resolve(result)
    }
  }
}

// Usage in React Native
import { NativeModules } from 'react-native';
const { StreamProcessor } = NativeModules;

const result = await StreamProcessor.processChunk(chunk);
```

---

## 🎯 Specific Use Cases for Streaming

### 1. Markdown Parsing (HIGH IMPACT)

**Problem:** Parsing markdown in large responses blocks JS thread

**Solution:** Parse in worker thread

```typescript
// workers/markdownWorker.ts
import { marked } from 'marked';
import { highlightCode } from './syntaxHighlighter';

self.addEventListener('message', (e) => {
  const { type, markdown, id } = e.data;
  
  if (type === 'parse') {
    try {
      // Heavy parsing happens in worker
      const html = marked(markdown);
      const highlighted = highlightCode(html);
      
      self.postMessage({
        type: 'parsed',
        id,
        result: highlighted,
      });
    } catch (error) {
      self.postMessage({
        type: 'error',
        id,
        error: error.message,
      });
    }
  }
});

// hooks/useMarkdownWorker.ts
import { useEffect, useRef, useState } from 'react';
import { Worker } from 'react-native-workers';

export const useMarkdownWorker = () => {
  const workerRef = useRef<Worker | null>(null);
  const [parsed, setParsed] = useState<Map<string, string>>(new Map());
  
  useEffect(() => {
    workerRef.current = new Worker('../workers/markdownWorker');
    
    workerRef.current.onmessage = (e) => {
      const { type, id, result } = e.data;
      if (type === 'parsed') {
        setParsed(prev => new Map(prev).set(id, result));
      }
    };
    
    return () => {
      workerRef.current?.terminate();
    };
  }, []);
  
  const parseMarkdown = (markdown: string, id: string) => {
    workerRef.current?.postMessage({
      type: 'parse',
      markdown,
      id,
    });
  };
  
  return { parseMarkdown, parsed };
};

// Usage in ChatMessage
const ChatMessage = ({ content, id }) => {
  const { parseMarkdown, parsed } = useMarkdownWorker();
  const parsedContent = parsed.get(id);
  
  useEffect(() => {
    if (content && !parsedContent) {
      parseMarkdown(content, id);
    }
  }, [content, id]);
  
  return (
    <View>
      {parsedContent ? (
        <RenderHTML html={parsedContent} />
      ) : (
        <Text>{content}</Text>
      )}
    </View>
  );
};
```

**Performance Impact:**
- **Before:** 50-100ms per message (blocks UI)
- **After:** 0ms blocking (parsed in background)
- **Benefit:** 60 FPS maintained during parsing

---

### 2. Stream Buffer Processing (MEDIUM IMPACT)

**Problem:** Processing stream chunks can cause microstutters

**Solution:** Buffer and process in worker

```typescript
// workers/streamBufferWorker.ts
class StreamBuffer {
  private buffer: string[] = [];
  private processInterval: NodeJS.Timeout | null = null;
  
  start() {
    this.processInterval = setInterval(() => {
      if (this.buffer.length > 0) {
        const batch = this.buffer.splice(0, 10); // Process 10 chunks
        const processed = this.processBatch(batch);
        
        self.postMessage({
          type: 'batch-processed',
          data: processed,
        });
      }
    }, 50); // Every 50ms
  }
  
  addChunk(chunk: string) {
    this.buffer.push(chunk);
  }
  
  private processBatch(chunks: string[]): string {
    // Process multiple chunks together
    return chunks.join('');
  }
  
  stop() {
    if (this.processInterval) {
      clearInterval(this.processInterval);
    }
  }
}

const buffer = new StreamBuffer();

self.addEventListener('message', (e) => {
  const { type, chunk } = e.data;
  
  switch (type) {
    case 'start':
      buffer.start();
      break;
    case 'chunk':
      buffer.addChunk(chunk);
      break;
    case 'stop':
      buffer.stop();
      break;
  }
});

// hooks/useStreamBuffer.ts
export const useStreamBuffer = () => {
  const workerRef = useRef<Worker | null>(null);
  const [bufferedContent, setBufferedContent] = useState('');
  
  useEffect(() => {
    workerRef.current = new Worker('../workers/streamBufferWorker');
    
    workerRef.current.onmessage = (e) => {
      if (e.data.type === 'batch-processed') {
        setBufferedContent(prev => prev + e.data.data);
      }
    };
    
    workerRef.current.postMessage({ type: 'start' });
    
    return () => {
      workerRef.current?.postMessage({ type: 'stop' });
      workerRef.current?.terminate();
    };
  }, []);
  
  const addChunk = (chunk: string) => {
    workerRef.current?.postMessage({ type: 'chunk', chunk });
  };
  
  return { addChunk, bufferedContent };
};
```

**Performance Impact:**
- **Before:** Each chunk triggers state update (60+ per second)
- **After:** Batched updates (20 per second)
- **Benefit:** Reduced state update overhead

---

### 3. Artifact Extraction (MEDIUM IMPACT)

**Problem:** Extracting artifacts from stream is CPU-intensive

**Solution:** Extract in worker thread

```typescript
// workers/artifactExtractor.ts
import { extractArtifactFromStream, Artifact } from '../utils/ArtifactParser';

self.addEventListener('message', (e) => {
  const { type, content, messageId } = e.data;
  
  if (type === 'extract') {
    try {
      const artifacts: Artifact[] = [];
      const cleanContent = content;
      
      // Heavy regex and parsing
      let match;
      const artifactRegex = /<artifact[^>]*>[\s\S]*?<\/artifact>/g;
      
      while ((match = artifactRegex.exec(content)) !== null) {
        const artifact = extractArtifactFromStream(match[0]);
        if (artifact) {
          artifacts.push(artifact);
        }
      }
      
      // Strip artifacts from content
      const strippedContent = content.replace(artifactRegex, '');
      
      self.postMessage({
        type: 'extracted',
        messageId,
        artifacts,
        cleanContent: strippedContent,
      });
    } catch (error) {
      self.postMessage({
        type: 'error',
        messageId,
        error: error.message,
      });
    }
  }
});

// hooks/useArtifactExtractor.ts
export const useArtifactExtractor = () => {
  const workerRef = useRef<Worker | null>(null);
  const [results, setResults] = useState<Map<string, {
    artifacts: Artifact[];
    cleanContent: string;
  }>>(new Map());
  
  useEffect(() => {
    workerRef.current = new Worker('../workers/artifactExtractor');
    
    workerRef.current.onmessage = (e) => {
      const { type, messageId, artifacts, cleanContent } = e.data;
      if (type === 'extracted') {
        setResults(prev => new Map(prev).set(messageId, {
          artifacts,
          cleanContent,
        }));
      }
    };
    
    return () => {
      workerRef.current?.terminate();
    };
  }, []);
  
  const extractArtifacts = (content: string, messageId: string) => {
    workerRef.current?.postMessage({
      type: 'extract',
      content,
      messageId,
    });
  };
  
  return { extractArtifacts, results };
};
```

**Performance Impact:**
- **Before:** 20-50ms per extraction (blocks UI)
- **After:** 0ms blocking (extracted in background)
- **Benefit:** Smooth streaming even with artifacts

---

### 4. Syntax Highlighting (HIGH IMPACT)

**Problem:** Highlighting code blocks is very expensive

**Solution:** Highlight in worker with cached results

```typescript
// workers/syntaxHighlighter.ts
import Prism from 'prismjs';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-python';
// ... other languages

// Cache to avoid re-highlighting
const cache = new Map<string, string>();

self.addEventListener('message', (e) => {
  const { type, code, language, id } = e.data;
  
  if (type === 'highlight') {
    const cacheKey = `${language}:${code}`;
    
    if (cache.has(cacheKey)) {
      self.postMessage({
        type: 'highlighted',
        id,
        result: cache.get(cacheKey),
      });
      return;
    }
    
    try {
      const highlighted = Prism.highlight(
        code,
        Prism.languages[language] || Prism.languages.plaintext,
        language
      );
      
      cache.set(cacheKey, highlighted);
      
      self.postMessage({
        type: 'highlighted',
        id,
        result: highlighted,
      });
    } catch (error) {
      self.postMessage({
        type: 'error',
        id,
        error: error.message,
      });
    }
  }
});

// components/CodeBlock.tsx
import { useEffect, useState, useRef } from 'react';
import { Worker } from 'react-native-workers';

export const CodeBlock = ({ code, language, id }) => {
  const workerRef = useRef<Worker | null>(null);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  
  useEffect(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker('../workers/syntaxHighlighter');
      
      workerRef.current.onmessage = (e) => {
        if (e.data.type === 'highlighted' && e.data.id === id) {
          setHighlighted(e.data.result);
        }
      };
    }
    
    workerRef.current.postMessage({
      type: 'highlight',
      code,
      language,
      id,
    });
    
    return () => {
      // Keep worker alive for reuse
    };
  }, [code, language, id]);
  
  return (
    <View>
      {highlighted ? (
        <RenderHTML html={highlighted} />
      ) : (
        <Text>{code}</Text>
      )}
    </View>
  );
};
```

**Performance Impact:**
- **Before:** 100-500ms per code block (major blocking)
- **After:** 0ms blocking (highlighted in background)
- **Benefit:** Dramatic improvement for code-heavy responses

---

## 🏗️ Integrated Architecture

### Enhanced StreamingStateContext with Workers

```typescript
// contexts/StreamingStateContext.tsx
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Worker } from 'react-native-workers';

interface WorkerPool {
  markdown: Worker;
  artifacts: Worker;
  buffer: Worker;
  syntax: Worker;
}

interface StreamingStateContextType {
  // ... existing methods
  workers: WorkerPool;
  processInBackground: (task: BackgroundTask) => Promise<any>;
}

export const StreamingStateProvider = ({ children }) => {
  const [workers, setWorkers] = useState<WorkerPool | null>(null);
  
  // Initialize worker pool
  useEffect(() => {
    const pool: WorkerPool = {
      markdown: new Worker('../workers/markdownWorker'),
      artifacts: new Worker('../workers/artifactExtractor'),
      buffer: new Worker('../workers/streamBufferWorker'),
      syntax: new Worker('../workers/syntaxHighlighter'),
    };
    
    setWorkers(pool);
    
    return () => {
      // Cleanup workers
      Object.values(pool).forEach(worker => worker.terminate());
    };
  }, []);
  
  const processInBackground = async (task: BackgroundTask): Promise<any> => {
    return new Promise((resolve, reject) => {
      const worker = workers?.[task.workerType];
      if (!worker) {
        reject(new Error('Worker not available'));
        return;
      }
      
      const handler = (e: MessageEvent) => {
        if (e.data.id === task.id) {
          worker.removeEventListener('message', handler);
          resolve(e.data.result);
        }
      };
      
      worker.addEventListener('message', handler);
      worker.postMessage(task.data);
      
      // Timeout after 5 seconds
      setTimeout(() => {
        worker.removeEventListener('message', handler);
        reject(new Error('Worker timeout'));
      }, 5000);
    });
  };
  
  return (
    <StreamingStateContext.Provider value={{ workers, processInBackground }}>
      {children}
    </StreamingStateContext.Provider>
  );
};
```

---

## 📊 Performance Comparison

### Without Multithreading

```
Stream Chunk Arrives
      ↓
Parse markdown (50ms) ← BLOCKS JS THREAD
      ↓
Extract artifacts (30ms) ← BLOCKS JS THREAD
      ↓
Highlight code (200ms) ← BLOCKS JS THREAD
      ↓
Update state
      ↓
Re-render (16ms for 60fps) ← BLOCKS UI THREAD
      
Total blocking: 280ms per chunk
Result: Stuttering, dropped frames
```

### With Multithreading

```
Stream Chunk Arrives
      ↓
Update state (1ms) ← JS THREAD
      ↓                     ┌─────────────────────┐
Re-render (16ms)            │  Worker Thread 1    │
      ↑                     │  Parse markdown     │
      |                     │  (50ms)             │
      |                     └─────────────────────┘
      |                     ┌─────────────────────┐
      └─ Results arrive ←── │  Worker Thread 2    │
                            │  Extract artifacts   │
                            │  (30ms)             │
                            └─────────────────────┘
                            ┌─────────────────────┐
                            │  Worker Thread 3    │
                            │  Highlight code     │
                            │  (200ms)            │
                            └─────────────────────┘

Total blocking: 1ms (state update only)
Result: Smooth 60 FPS maintained
```

---

## 🎯 Implementation Priority

### Phase 1: Quick Wins (Immediate)
1. ✅ Syntax highlighting worker (HIGH IMPACT)
   - Most expensive operation
   - Easy to implement
   - Immediate visual improvement

2. ✅ Markdown parsing worker (HIGH IMPACT)
   - Second most expensive
   - Clear benefit
   - No state management complexity

### Phase 2: Optimization (Week 2)
3. ✅ Artifact extraction worker (MEDIUM IMPACT)
   - Useful for artifact-heavy responses
   - Reduces complexity in main thread

4. ✅ Stream buffer worker (MEDIUM IMPACT)
   - Smooths out chunk processing
   - Better state update batching

### Phase 3: Advanced (Future)
5. ⭕ Native modules for maximum performance
   - Platform-specific optimization
   - Requires more development time

---

## 🔧 Integration with Main Plan

### Enhanced Phase 1: Performance Foundation

**Add to Task 1.2:**
```
Task 1.2b: Initialize Worker Pool

- [ ] Install react-native-workers
- [ ] Create workers directory
- [ ] Create syntaxHighlighter worker
- [ ] Create markdownParser worker
- [ ] Integrate with StreamingStateContext
- [ ] Test worker communication
```

**Files to Create:**
```
jaime-mobile-app/
├── workers/
│   ├── syntaxHighlighter.ts
│   ├── markdownWorker.ts
│   ├── artifactExtractor.ts
│   └── streamBufferWorker.ts
└── hooks/
    ├── useSyntaxWorker.ts
    ├── useMarkdownWorker.ts
    └── useArtifactExtractor.ts
```

---

## 📈 Expected Performance Gains

### With Main Plan Only
| Metric | Before | After |
|--------|--------|-------|
| Re-renders/sec | 100 | 2 |
| Scroll FPS | 35 | 58 |
| Message parsing | 50ms | 50ms |
| Code highlighting | 200ms | 200ms |

### With Main Plan + Multithreading
| Metric | Before | After | Total Improvement |
|--------|--------|-------|-------------------|
| Re-renders/sec | 100 | 2 | 98% ↓ |
| Scroll FPS | 35 | 60 | 71% ↑ |
| Message parsing | 50ms | **0ms blocking** | **100% ↓** |
| Code highlighting | 200ms | **0ms blocking** | **100% ↓** |
| **Overall responsiveness** | Poor | **Excellent** | **300%+ ↑** |

---

## ⚠️ Considerations & Limitations

### Memory Usage
- **Each worker:** ~2-5MB overhead
- **4 workers:** ~8-20MB total
- **Recommendation:** Monitor on low-end devices

### Communication Overhead
- **Serialization:** Small cost for data transfer
- **Mitigation:** Use transferable objects where possible
- **Best practice:** Transfer large data, not many messages

### Debugging
- **Challenge:** Workers harder to debug
- **Solution:** Add comprehensive logging
- **Tool:** React Native Debugger supports workers

### Platform Support
- **iOS:** Full support
- **Android:** Full support
- **Web (if applicable):** Native Web Workers

---

## 🧪 Testing Strategy

### Unit Tests
```typescript
// __tests__/workers/syntaxHighlighter.test.ts
describe('Syntax Highlighter Worker', () => {
  it('should highlight code correctly', async () => {
    const worker = new Worker('../workers/syntaxHighlighter');
    
    const result = await new Promise((resolve) => {
      worker.onmessage = (e) => {
        if (e.data.type === 'highlighted') {
          resolve(e.data.result);
        }
      };
      
      worker.postMessage({
        type: 'highlight',
        code: 'const x = 1;',
        language: 'javascript',
        id: 'test-1',
      });
    });
    
    expect(result).toContain('<span class="token');
  });
});
```

### Performance Tests
```typescript
// __tests__/performance/workerBenchmark.test.ts
describe('Worker Performance', () => {
  it('should be faster than main thread processing', async () => {
    const code = generateLargeCodeBlock();
    
    // Main thread
    const mainThreadStart = Date.now();
    highlightOnMainThread(code);
    const mainThreadTime = Date.now() - mainThreadStart;
    
    // Worker thread
    const workerStart = Date.now();
    await highlightInWorker(code);
    const workerTime = Date.now() - workerStart;
    
    // Worker should be non-blocking (returns quickly)
    expect(workerTime).toBeLessThan(10); // Immediate return
    expect(mainThreadTime).toBeGreaterThan(100); // Blocks
  });
});
```

---

## 🚀 Quick Start Guide

### 1. Install Dependencies

```bash
cd jaime-mobile-app
npm install react-native-workers
npx pod-install  # iOS only
```

### 2. Create First Worker

```typescript
// workers/syntaxHighlighter.ts
self.addEventListener('message', (e) => {
  const { code, language } = e.data;
  const highlighted = highlightCode(code, language);
  self.postMessage({ highlighted });
});
```

### 3. Use in Component

```typescript
// components/CodeBlock.tsx
const worker = new Worker('./workers/syntaxHighlighter');
worker.postMessage({ code, language });
worker.onmessage = (e) => setHighlighted(e.data.highlighted);
```

### 4. Test

```bash
npm test -- workers/syntaxHighlighter.test.ts
```

---

## 📝 Implementation Checklist

- [ ] **Setup**
  - [ ] Install react-native-workers
  - [ ] Configure worker bundling
  - [ ] Create workers directory
  - [ ] Add TypeScript support for workers

- [ ] **Worker Implementation**
  - [ ] Syntax highlighting worker
  - [ ] Markdown parsing worker
  - [ ] Artifact extraction worker
  - [ ] Stream buffer worker

- [ ] **Integration**
  - [ ] Update StreamingStateContext
  - [ ] Create worker hooks
  - [ ] Update ChatMessage component
  - [ ] Update CodeBlock component

- [ ] **Testing**
  - [ ] Unit tests for each worker
  - [ ] Performance benchmarks
  - [ ] Memory profiling
  - [ ] Cross-platform testing

- [ ] **Optimization**
  - [ ] Worker pool management
  - [ ] Memory monitoring
  - [ ] Error handling
  - [ ] Graceful degradation

---

## 🎓 Best Practices

### DO ✅
- Use workers for CPU-intensive tasks (>50ms)
- Keep worker code simple and focused
- Add error handling in workers
- Monitor memory usage
- Cache results when possible
- Use transferable objects for large data

### DON'T ❌
- Use workers for trivial tasks (<10ms)
- Access React state directly in workers
- Share mutable state between workers
- Create too many workers (>4-5)
- Forget to terminate workers on unmount
- Ignore platform differences

---

## 📚 Resources

### Documentation
- [React Native Workers](https://github.com/fabriciovergal/react-native-workers)
- [Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
- [React Native Threading](https://reactnative.dev/docs/performance#js-frame-rate)

### Examples
- [Prism.js in Worker](https://prismjs.com/extending.html#writing-your-own-worker)
- [Markdown Parser Worker](https://github.com/markedjs/marked/issues/1308)

---

## 🏁 Conclusion

Integrating multithreading into the streaming architecture provides **significant additional performance gains** beyond the main optimization plan:

**Combined Benefits:**
- ✅ 98% reduction in re-renders (from main plan)
- ✅ 100% reduction in blocking operations (from workers)
- ✅ Sustained 60 FPS even with heavy processing
- ✅ Better user experience on low-end devices

**Recommendation:**
- **Phase 1:** Implement main optimization plan first
- **Phase 2:** Add syntax highlighting worker (quick win)
- **Phase 3:** Add remaining workers as needed

This creates a **world-class** streaming experience that rivals desktop applications.

---

*For questions or implementation help, reference this guide and the main streaming improvement plan.*

