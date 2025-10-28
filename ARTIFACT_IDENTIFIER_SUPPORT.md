# ✅ Artifact `identifier` Attribute Support Added

**Date:** October 28, 2025  
**Status:** ✅ **COMPLETE**

---

## 🎯 What Was Added

Support for the `identifier` attribute in artifact tags, as seen in the format:

```xml
<jmeArtifact identifier="bangladesh-visit-flowchart" type="mermaid" title="Bangladesh Visit Planning Flowchart">
flowchart TD
    A[Plan Bangladesh Visit] --> B{Have Valid Passport?}
    ...
</jmeArtifact>
```

---

## 📦 Changes Made

### 1. **ContentParser.ts** ✅

**Complete Artifacts:**
```typescript
const identifierMatch = attributeString.match(/identifier=["']([^"']+)["']/);

// Use identifier if provided, otherwise generate one
const artifactId = identifierMatch 
  ? `${messageId}-${identifierMatch[1]}`
  : `${messageId}-artifact-${artifactIndex}`;

const artifact: Artifact = {
  id: artifactId,  // e.g., "msg-123-bangladesh-visit-flowchart"
  type: typeMatch[1] as ArtifactType,
  title: titleMatch[1],
  content: artifactContent,
  ...
};
```

**Streaming Artifacts:**
```typescript
const identifierMatch = attributeString.match(/identifier=["']([^"']+)["']/);

// Use identifier if provided
const artifactId = identifierMatch 
  ? `${messageId}-${identifierMatch[1]}-streaming`
  : `${messageId}-artifact-${artifactIndex}-streaming`;
```

---

### 2. **ArtifactParser.ts** ✅

**Stream Extraction:**
```typescript
const identifierMatch = attributeString.match(/identifier=["']([^"']+)["']/);

// Use identifier if provided, otherwise generate based on completion state
const artifactId = identifierMatch
  ? (isComplete ? `artifact-${identifierMatch[1]}` : `streaming-${identifierMatch[1]}`)
  : (isComplete ? `artifact-${Date.now()}` : 'streaming-artifact');
```

**Message Extraction:**
```typescript
const identifierMatch = attributeString.match(/identifier=["']([^"']+)["']/);

// Use identifier if provided
const artifactId = identifierMatch 
  ? `${messageId}-${identifierMatch[1]}`
  : `${messageId}-artifact-${artifacts.length}`;
```

---

## 🎨 Example with Your Artifact

### Input Tag:
```xml
<jmeArtifact identifier="bangladesh-visit-flowchart" type="mermaid" title="Bangladesh Visit Planning Flowchart">
flowchart TD
    A[Plan Bangladesh Visit] --> B{Have Valid Passport?}
    B -->|No| C[Apply for/Renew Passport]
    ...
</jmeArtifact>
```

### During Streaming:

**Parsed Artifact Object:**
```typescript
{
  id: "streaming-bangladesh-visit-flowchart",
  type: "mermaid",
  title: "Bangladesh Visit Planning Flowchart",
  content: "flowchart TD\n    A[Plan...",
  isStreaming: true,
  messageId: "streaming"
}
```

**Display:**
- ✅ Text content: Clean, no raw tags
- ✅ Artifact indicator appears
- ✅ Title: "Bangladesh Visit Planning Flowchart"
- ✅ Type: "Diagram" (from mermaid)
- ✅ Progress bar animating

### After Streaming Completes:

**Parsed Artifact Object:**
```typescript
{
  id: "msg-123-bangladesh-visit-flowchart",
  type: "mermaid",
  title: "Bangladesh Visit Planning Flowchart",
  content: "flowchart TD\n    A[Plan Bangladesh...",
  isStreaming: false,
  messageId: "msg-123"
}
```

**Display:**
- ✅ Artifact indicator with full content
- ✅ Status: "Tap to view"
- ✅ Tappable to open full diagram

---

## 🔍 Attribute Priority

The parser now handles attributes in this order:

| Priority | Attribute | Purpose | Required |
|----------|-----------|---------|----------|
| 1 | `type` | Artifact type | ✅ Yes |
| 2 | `title` | Display title | ✅ Yes |
| 3 | `identifier` | Custom ID | ❌ Optional |
| 4 | `language` | Code language | ❌ Optional |

**If `identifier` is present:** Used for consistent artifact IDs  
**If `identifier` is missing:** Auto-generated sequential IDs

---

## ✨ Benefits of Identifier Support

1. **Consistent IDs** - Same identifier across sessions
2. **Better Tracking** - Easier to reference specific artifacts
3. **Deduplication** - Identify duplicate artifacts by identifier
4. **Backend Control** - Backend can set meaningful IDs
5. **Backward Compatible** - Works with or without identifier

---

## 🧪 Testing

### With Identifier:
```xml
<jmeArtifact identifier="my-code" type="code" title="My Code">
function test() {}
</jmeArtifact>
```
**Result:** `id = "msg-123-my-code"`

### Without Identifier:
```xml
<jmeArtifact type="code" title="My Code">
function test() {}
</jmeArtifact>
```
**Result:** `id = "msg-123-artifact-0"`

### Streaming with Identifier:
```xml
<jmeArtifact identifier="my-code" type="code" title="My Code">
function test() {
```
**Result:** `id = "msg-123-my-code-streaming"`

---

## 📊 Complete Supported Attributes

| Attribute | Example | Purpose |
|-----------|---------|---------|
| `identifier` | `"bangladesh-visit-flowchart"` | Custom artifact ID |
| `type` | `"mermaid"` | Artifact type |
| `title` | `"Bangladesh Visit Planning"` | Display title |
| `language` | `"javascript"` | Code language |

**All attributes are optional except `type` and `title`.**

---

## 🔄 Flow with Identifier

```
Backend generates:
<jmeArtifact identifier="unique-id" type="mermaid" title="Chart">

↓ Streaming starts

Parser extracts identifier: "unique-id"
Creates ID: "streaming-unique-id"
Strips tags from display
Shows indicator with progress

↓ Streaming completes

Parser re-extracts with message ID
Creates ID: "msg-123-unique-id"
Shows final indicator with "Tap to view"
```

---

## ✅ Verification Checklist

Test with your Bangladesh flowchart:

- [ ] Send artifact with identifier
- [ ] Verify no raw tags visible during streaming
- [ ] Check artifact indicator appears
- [ ] Confirm title shows correctly
- [ ] Verify type shows as "Diagram"
- [ ] Check console logs show identifier:
  ```
  [ArtifactParser] Parsed - identifier: bangladesh-visit-flowchart
  [ArtifactParser] ✅ Created artifact: msg-123-bangladesh-visit-flowchart
  ```
- [ ] Tap indicator to view full mermaid diagram
- [ ] Verify ID consistency across re-renders

---

## 🎯 Summary

✅ **Identifier attribute now fully supported**  
✅ **Works with all artifact types (code, mermaid, markdown, etc.)**  
✅ **Backward compatible with auto-generated IDs**  
✅ **Handles both streaming and complete artifacts**  
✅ **Tags still stripped during streaming (no flash)**  

Your Bangladesh flowchart artifact will now:
1. ✅ Have consistent ID: `bangladesh-visit-flowchart`
2. ✅ Display smoothly without raw tags
3. ✅ Show progress during streaming
4. ✅ Be tappable to view full diagram

---

**Ready to use! 🎉**

