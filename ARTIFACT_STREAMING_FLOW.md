# 🔄 Artifact Streaming Flow Diagram

**Visual representation of how streaming artifacts are processed**

---

## 📊 Complete Streaming Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND (LLM)                           │
│  Generates response with <jmeArtifact> tags                     │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   Stream Chunks      │
                    │  (ChatStream.ts)     │
                    └──────────┬───────────┘
                               │
                               ▼
        ┌─────────────────────────────────────────────┐
        │  Process JSON Chunks                        │
        │  - Parse SSE format                         │
        │  - Extract type, content                    │
        │  - Handle reasoning tags separately         │
        └─────────────────┬───────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────────────┐
        │  Accumulate Stream Content                 │
        │  - RAF-batched updates (60fps max)         │
        │  - setStream((prev) => prev + chunk)       │
        └─────────────────┬──────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────────────┐
        │  Throttled Artifact Extraction             │
        │  (useChat.tsx - 200ms intervals)           │
        │                                            │
        │  extractArtifactFromStream(stream)         │
        │  - Looks for <jmeArtifact> tags            │
        │  - Extracts metadata (type, title, lang)   │
        │  - Extracts content so far                 │
        │  - Sets isStreaming: true                  │
        └─────────────────┬──────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────────────┐
        │  Set Current Streaming Artifact            │
        │  setCurrentStreamingArtifact(artifact)     │
        │                                            │
        │  Artifact = {                              │
        │    id: 'streaming-artifact',               │
        │    type: 'code',                           │
        │    title: 'Calculator',                    │
        │    content: 'function add...',             │
        │    isStreaming: true  ← Key!               │
        │  }                                         │
        └─────────────────┬──────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────────────┐
        │  ChatMessage Component Receives:           │
        │  - content (with tags)                     │
        │  - isSending: true                         │
        │  - streamingArtifact (optional)            │
        └─────────────────┬──────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────────────┐
        │  Parse Content into Segments               │
        │  (ContentParser.ts)                        │
        │                                            │
        │  parseContentSegments(                     │
        │    content,                                │
        │    messageId,                              │
        │    isStreaming: true  ← Enables detection  │
        │  )                                         │
        └─────────────────┬──────────────────────────┘
                         │
                         ├─────────────┬──────────────┐
                         ▼             ▼              ▼
              ┌──────────────┐ ┌───────────────┐ ┌──────────────┐
              │ Text Segment │ │ Artifact Seg. │ │ Text Segment │
              │              │ │               │ │              │
              │ "Here's the  │ │ isStreaming:  │ │ "Hope this   │
              │  calculator:"│ │ true          │ │  helps!"     │
              └──────┬───────┘ └───────┬───────┘ └──────┬───────┘
                     │                 │                 │
                     ▼                 ▼                 ▼
        ┌────────────────────────────────────────────────────────┐
        │  Render Content Segments                               │
        │  (renderContentSegments in ChatMessage.tsx)            │
        └─────────────────┬──────────────────────────────────────┘
                         │
            ┌────────────┼────────────┐
            ▼            ▼            ▼
    ┌───────────┐  ┌──────────────┐  ┌───────────┐
    │   Text    │  │  Artifact    │  │   Text    │
    │  Render   │  │  Indicator   │  │  Render   │
    │           │  │              │  │           │
    │ [Strip    │  │ [Streaming   │  │ [Normal   │
    │  Tags!]   │  │  Progress]   │  │  Display] │
    └───────────┘  └──────────────┘  └───────────┘
```

---

## 🔍 Detailed: Text Segment Processing

```
┌─────────────────────────────────────────────────────────────┐
│  Text Segment Processing                                    │
│  (segment.type === 'text')                                  │
└──────────────────────────┬──────────────────────────────────┘
                          │
                          ▼
              ┌──────────────────────┐
              │  Get segment.content │
              │                      │
              │  "Here's code:       │
              │  <jmeArtifact...>    │
              │  function add..."    │
              └──────────┬───────────┘
                        │
                        ▼
              ┌──────────────────────┐
              │  Check if streaming  │
              │  & has artifact tags │
              │                      │
              │  isSending?          │
              │  hasArtifactTags()   │
              └──────────┬───────────┘
                        │
            ┌───────────┴───────────┐
            ▼ YES                   ▼ NO
┌──────────────────────┐   ┌─────────────────┐
│  Strip Tags!         │   │  Render as-is   │
│                      │   │                 │
│  stripStreaming      │   │  <Markdown>     │
│  ArtifactTags()      │   │    {content}    │
│                      │   │  </Markdown>    │
│  Returns: "Here's    │   └─────────────────┘
│  code:"              │
│  (tags removed!)     │
└──────────┬───────────┘
          │
          ▼
┌──────────────────────┐
│  Render cleaned text │
│                      │
│  <Markdown>          │
│    {cleanedText}     │
│  </Markdown>         │
└──────────────────────┘
```

---

## 🎨 Detailed: Artifact Indicator Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Artifact Segment Processing                                │
│  (segment.type === 'artifact')                              │
└──────────────────────────┬──────────────────────────────────┘
                          │
                          ▼
              ┌──────────────────────┐
              │  segment.artifact    │
              │                      │
              │  {                   │
              │    id: '...',        │
              │    title: 'Calc',    │
              │    content: 'fn..', │
              │    isStreaming: true │
              │  }                   │
              └──────────┬───────────┘
                        │
                        ▼
              ┌──────────────────────┐
              │  ArtifactIndicator   │
              │  Component           │
              └──────────┬───────────┘
                        │
            ┌───────────┴───────────┐
            ▼                       ▼
┌──────────────────────┐   ┌─────────────────┐
│  Calculate Progress  │   │  Generate       │
│                      │   │  Preview Text   │
│  contentLength       │   │                 │
│  / avgLength * 100   │   │  First 60 chars │
│                      │   │  of content     │
│  e.g., 68%           │   │                 │
└──────────┬───────────┘   └────────┬────────┘
          │                         │
          └────────┬────────────────┘
                  │
                  ▼
      ┌───────────────────────┐
      │  Render Indicator     │
      │                       │
      │  ┌─────────────────┐  │
      │  │ [Icon] Title    │  │
      │  │ Preview text... │  │
      │  │ [Progress Bar]  │  │
      │  │ Generating...   │  │
      │  └─────────────────┘  │
      └───────────────────────┘
```

---

## ⚡ Real-Time Updates During Streaming

```
Time: 0ms
┌─────────────────────────────────────┐
│ Stream Content: ""                  │
│ Artifacts: []                       │
│ Display: [Loading dots]             │
└─────────────────────────────────────┘

Time: 100ms
┌─────────────────────────────────────┐
│ Stream Content:                     │
│ "Here's a calculator:               │
│  <jmeArtifact type='code'           │
│  title='Calculator'>                │
│                                     │
│ Artifacts: [{                       │
│   title: 'Calculator',              │
│   content: '',                      │
│   isStreaming: true                 │
│ }]                                  │
│                                     │
│ Display:                            │
│ ├─ Text: "Here's a calculator:"     │
│ └─ [Artifact Indicator]             │
│    └─ "Generating..." (0%)          │
└─────────────────────────────────────┘

Time: 300ms
┌─────────────────────────────────────┐
│ Stream Content:                     │
│ "Here's a calculator:               │
│  <jmeArtifact type='code'           │
│  title='Calculator'>                │
│  function add(a, b) {               │
│    return a                         │
│                                     │
│ Artifacts: [{                       │
│   title: 'Calculator',              │
│   content: 'function add(a, b) {...',│
│   isStreaming: true                 │
│ }]                                  │
│                                     │
│ Display:                            │
│ ├─ Text: "Here's a calculator:"     │
│ └─ [Artifact Indicator]             │
│    ├─ Preview: "function add..."    │
│    └─ "Generating..." (35%)         │
└─────────────────────────────────────┘

Time: 500ms
┌─────────────────────────────────────┐
│ Stream Content:                     │
│ "Here's a calculator:               │
│  <jmeArtifact type='code'           │
│  title='Calculator'>                │
│  function add(a, b) {               │
│    return a + b;                    │
│  }                                  │
│  </jmeArtifact>                     │
│                                     │
│ Artifacts: [{                       │
│   title: 'Calculator',              │
│   content: 'function add(a, b) {...',│
│   isStreaming: false                │
│ }]                                  │
│                                     │
│ Display:                            │
│ ├─ Text: "Here's a calculator:"     │
│ └─ [Artifact Indicator]             │
│    ├─ Preview: "function add..."    │
│    └─ [●] "Tap to view" (complete)  │
└─────────────────────────────────────┘
```

---

## 🛡️ Tag Stripping Logic

```
Input Stream Content:
"Here's the code:
<jmeArtifact type='code' title='Example'>
function test() {
  console.log('hello');
}
</jmeArtifact>
Hope this helps!"

┌─────────────────────────────────────────┐
│  parseContentSegments(content, id, true)│
└──────────────────┬──────────────────────┘
                  │
                  ▼
    ┌─────────────────────────────┐
    │  Find complete artifacts    │
    │  Regex: /<jmeArtifact...>   │
    │         ...                 │
    │         <\/jmeArtifact>/g   │
    └──────────┬──────────────────┘
              │
              ▼
    ┌─────────────────────────────┐
    │  Extract segments:          │
    │                             │
    │  1. Text: "Here's the code:"│
    │     (before artifact)        │
    │                             │
    │  2. Artifact:               │
    │     - title: 'Example'      │
    │     - content: 'function...'│
    │     - isStreaming: false    │
    │                             │
    │  3. Text: "Hope this helps!"│
    │     (after artifact)        │
    └──────────┬──────────────────┘
              │
              ▼
    ┌─────────────────────────────┐
    │  Render each segment:       │
    │                             │
    │  Segment 1 (text):          │
    │  ├─ Check: hasArtifactTags()│
    │  ├─ Result: false           │
    │  └─ Render: "Here's..."     │
    │                             │
    │  Segment 2 (artifact):      │
    │  └─ Render: ArtifactIndicator│
    │                             │
    │  Segment 3 (text):          │
    │  ├─ Check: hasArtifactTags()│
    │  ├─ Result: false           │
    │  └─ Render: "Hope this..."  │
    └─────────────────────────────┘
```

---

## 🚨 Edge Case: Streaming Detection

```
Scenario: Artifact still streaming (no closing tag)

Input Stream Content:
"<jmeArtifact type='code' title='Calc'>
function add(a, b) {
  return a + b"
(no closing tag yet!)

┌─────────────────────────────────────────┐
│  parseContentSegments(content, id, true)│
│  isStreaming parameter: TRUE            │
└──────────────────┬──────────────────────┘
                  │
                  ▼
    ┌─────────────────────────────┐
    │  Look for complete artifacts│
    │  Result: NONE FOUND         │
    └──────────┬──────────────────┘
              │
              ▼
    ┌─────────────────────────────┐
    │  Check isStreaming flag     │
    │  Result: TRUE               │
    │  → Look for partial tags!   │
    └──────────┬──────────────────┘
              │
              ▼
    ┌─────────────────────────────┐
    │  Regex: /<jmeArtifact...>   │
    │         ([\s\S]*)$          │
    │  (match to end of string)   │
    │                             │
    │  Found! Extract streaming   │
    │  artifact                   │
    └──────────┬──────────────────┘
              │
              ▼
    ┌─────────────────────────────┐
    │  Create Artifact:           │
    │  {                          │
    │    id: '...-streaming',     │
    │    title: 'Calc',           │
    │    content: 'function...',  │
    │    isStreaming: true  ←KEY! │
    │  }                          │
    └──────────┬──────────────────┘
              │
              ▼
    ┌─────────────────────────────┐
    │  Render:                    │
    │  [Artifact Indicator]       │
    │  with streaming progress    │
    └─────────────────────────────┘
```

---

## 🎯 Key Takeaways

1. **Streaming Detection**
   - Parser checks `isStreaming` flag
   - Looks for partial tags: `/<jmeArtifact...>([\s\S]*)$/`
   - Creates artifact with `isStreaming: true`

2. **Tag Stripping**
   - Text segments checked for artifact tags
   - If found + streaming → strip with `stripStreamingArtifactTags()`
   - Prevents raw tag display

3. **Progress Updates**
   - Throttled extraction every 200ms
   - RAF-batched stream updates (60fps max)
   - Smooth indicator animations

4. **Segment Order**
   - Original content order preserved
   - Text → Artifact → Text maintained
   - Clean, intuitive display

---

**Flow Complete! ✅**

Raw tags are intercepted at multiple points to ensure they never reach the user's screen.

