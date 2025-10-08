# S3 403 Forbidden Error - Image Loading Issue

**Date:** October 8, 2025  
**Status:** 🚨 BACKEND FIX REQUIRED  
**Error:** HTTP 403 when loading generated images  
**Severity:** High - Blocks all image generation features

---

## 🐛 Error Details

### Symptom
Generated images fail to load with error icon (!) in mobile app.

### Console Error
```
ERROR [GeneratedImageItem] Image load error (attempt 2): 
{
  "error": "Download marked as failed because of invalid response status code 403",
  "target": 15049
}
```

### URL Being Requested
```
https://jaiime-files.s3.amazonaws.com/images/gemini_1759777888.880364.png?
  AWSAccessKeyId=AKIAW43KUDMKVWIUHHT6&
  Signature=blPkZ6IiQ3PNVUt9UheyQqMry6s%3D&
  Expires=1759787889
```

### What Happens
1. ✅ User requests image generation
2. ✅ Backend generates image with Gemini
3. ✅ Backend returns S3 presigned URL
4. ✅ Mobile app receives URL
5. ✅ Mobile app tries to load image
6. ❌ S3 returns **403 Forbidden**
7. ❌ Image shows error icon

---

## 🔍 Root Cause Analysis

### HTTP 403 Means
- The URL format is **correct** (not a 404)
- S3 **received** the request (not a network issue)
- S3 **rejected** the request due to permissions

### Possible Causes

#### Cause 1: Invalid Presigned URL Signature ⭐ (Most Likely)
The signature in the URL doesn't match what S3 expects.

**Why this happens:**
```python
# Backend might be doing:
1. Upload image with IAM Role A
2. Generate presigned URL with IAM User B
3. S3 rejects because roles don't match
```

**How to verify:**
```bash
# Try the URL in browser
curl -I "https://jaiime-files.s3.amazonaws.com/images/gemini_..."

# If 403 in browser too → Signature invalid
# If 200 in browser → Mobile app CORS issue
```

#### Cause 2: Wrong IAM Permissions
The AWS credentials used to sign the URL don't have `s3:GetObject` permission.

**Check IAM policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::jaiime-files/images/*"
    }
  ]
}
```

#### Cause 3: Image Uploaded with Wrong Permissions
Image was uploaded without public-read or with object-level ACL that blocks access.

**Check upload code:**
```python
# ❌ Wrong - no ACL specified
s3_client.put_object(
    Bucket='jaiime-files',
    Key=f'images/{filename}',
    Body=image_bytes
)

# ✅ Correct - with proper ACL
s3_client.put_object(
    Bucket='jaiime-files',
    Key=f'images/{filename}',
    Body=image_bytes,
    ACL='private'  # Use presigned URLs for private
)
```

#### Cause 4: S3 Bucket Policy Blocks Access
The bucket policy might block GetObject even with valid presigned URLs.

**Check bucket policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::jaiime-files/*"
      // ❌ This would block presigned URLs too
    }
  ]
}
```

#### Cause 5: Clock Skew
Backend server time differs from AWS time by more than 15 minutes.

**Check:**
```bash
# On backend server
date -u  # Should match AWS time
```

#### Cause 6: URL Encoding Issue
The signature might be getting corrupted during URL encoding/transmission.

---

## 🛠️ How to Fix (Backend)

### Step 1: Verify Image Exists

```bash
# Check if image is actually in S3
aws s3 ls s3://jaiime-files/images/ | grep gemini_1759777888.880364.png
```

**If not found:** Backend isn't uploading images properly.  
**If found:** Continue to Step 2.

---

### Step 2: Check IAM Credentials

**What credentials are being used?**

```python
# In your image generation code, find:
import boto3

# Are you using:
s3_client = boto3.client('s3')  # Uses default credentials
# OR
s3_client = boto3.client(
    's3',
    aws_access_key_id='AKIAW43KUDMKVWIUHHT6',
    aws_secret_access_key='...'
)
```

**Verify these credentials have GetObject permission:**
```bash
aws iam get-user-policy --user-name <your-user> --policy-name <policy-name>
```

---

### Step 3: Fix Presigned URL Generation

**Current code probably looks like:**
```python
# ❌ WRONG - Missing parameters
presigned_url = s3_client.generate_presigned_url(
    'get_object',
    Params={'Bucket': 'jaiime-files', 'Key': key},
    ExpiresIn=3600
)
```

**Should be:**
```python
# ✅ CORRECT - With proper parameters
presigned_url = s3_client.generate_presigned_url(
    'get_object',
    Params={
        'Bucket': 'jaiime-files',
        'Key': key,
        'ResponseContentType': 'image/png'  # Important for mobile
    },
    ExpiresIn=3600,  # 1 hour
    HttpMethod='GET'
)
```

---

### Step 4: Ensure Upload and Signing Use Same Credentials

**Pattern to follow:**
```python
def upload_and_get_url(image_bytes, filename):
    # Use SAME client for both operations
    s3_client = boto3.client('s3')
    
    # 1. Upload
    key = f'images/{filename}'
    s3_client.put_object(
        Bucket='jaiime-files',
        Key=key,
        Body=image_bytes,
        ContentType='image/png',
        ACL='private'  # Keep private, use presigned URLs
    )
    
    # 2. Generate presigned URL with SAME client
    presigned_url = s3_client.generate_presigned_url(
        'get_object',
        Params={
            'Bucket': 'jaiime-files',
            'Key': key
        },
        ExpiresIn=3600
    )
    
    return presigned_url
```

---

### Step 5: Test the URL

**In your backend code, add logging:**
```python
# After generating URL
print(f"Generated presigned URL: {presigned_url}")

# Test the URL immediately
import requests
test_response = requests.head(presigned_url)
print(f"URL test status: {test_response.status_code}")

if test_response.status_code != 200:
    print(f"ERROR: URL is invalid! Status: {test_response.status_code}")
    print(f"Headers: {test_response.headers}")
```

**If this test fails with 403, the problem is in URL generation.**  
**If this test succeeds, the problem is in mobile app network/CORS.**

---

## 🔧 Backend Code Locations to Check

### File: `routers/chat.py` (or similar)

Look for the image generation endpoint:

```python
@router.post("/chat")
async def chat_endpoint(...):
    # ...
    if generate_image == "always":
        # 🔍 FIND THIS CODE
        image_url = await generate_image_with_ai(prompt)
        
        additional_data = [{
            "data_type": "img",
            "s3_url": image_url,  # ← This URL is returning 403
            "file_path": f"s3://jaiime-files/images/{filename}"
        }]
```

### File: Image generation function

```python
async def generate_image_with_ai(prompt: str):
    # 1. Call OpenAI/Gemini API
    image_bytes = await generate_with_api(prompt)
    
    # 2. Upload to S3
    filename = f"gemini_{time.time()}.png"
    s3_url = upload_to_s3(image_bytes, filename)  # 🔍 CHECK THIS FUNCTION
    
    return s3_url

def upload_to_s3(image_bytes, filename):
    # 🔍 THIS IS WHERE THE BUG IS
    s3_client = boto3.client('s3')
    
    # Upload
    key = f'images/{filename}'
    s3_client.put_object(...)  # Check parameters
    
    # Generate URL
    url = s3_client.generate_presigned_url(...)  # Check this
    
    return url
```

---

## 🧪 How to Test the Fix

### Backend Test
```python
# In a test file or Python REPL
from your_image_module import generate_image_with_ai

# Generate image
url = await generate_image_with_ai("test cat")
print(f"URL: {url}")

# Test URL immediately
import requests
response = requests.get(url)
print(f"Status: {response.status_code}")  # Should be 200

if response.status_code == 200:
    with open('test.png', 'wb') as f:
        f.write(response.content)
    print("✅ Image downloaded successfully!")
else:
    print(f"❌ Failed with status {response.status_code}")
```

### Mobile App Test
1. Generate an image
2. Check console for `🚫 403 FORBIDDEN` message
3. If fixed, image should load successfully
4. Should see: `[Image Loaded Successfully]` in console

---

## 📊 Quick Diagnosis Flowchart

```
Is the URL working in browser?
  ↓
  NO → Backend presigned URL issue
  |     ↓
  |     Check IAM permissions
  |     Check signature generation
  |     Check same credentials for upload/sign
  ↓
  YES → Mobile app CORS/network issue
        ↓
        Check S3 CORS configuration
        Check mobile app network permissions
        Check SSL certificates
```

---

## 🔐 S3 CORS Configuration (If URL works in browser)

If the URL works in browser but not in mobile app, add CORS:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": [],
    "MaxAgeSeconds": 3000
  }
]
```

**How to add:**
```bash
aws s3api put-bucket-cors \
  --bucket jaiime-files \
  --cors-configuration file://cors.json
```

---

## ✅ Success Criteria

After fix is applied:

- [ ] Backend generates presigned URL
- [ ] Backend tests URL immediately (gets 200)
- [ ] Mobile app receives URL
- [ ] Mobile app loads image successfully (no 403)
- [ ] Console shows: `[Image Loaded Successfully]`
- [ ] Image displays in chat with ✨ Generated badge
- [ ] No error icon (!)
- [ ] Download/share buttons work

---

## 📝 Summary

**Problem:** S3 returns 403 Forbidden when mobile app tries to load generated images  
**Root Cause:** Invalid presigned URL signature or wrong IAM permissions  
**Impact:** All image generation features broken  
**Owner:** Backend team  
**Priority:** High  

**Required Actions:**
1. Verify image upload to S3 succeeds
2. Check IAM credentials have GetObject permission
3. Ensure upload and URL signing use same credentials
4. Test presigned URLs immediately after generation
5. Fix signature generation if needed
6. Add CORS if URL works in browser but not mobile

---

**Status:** 🔴 Blocking - Image generation unusable until fixed  
**Workaround:** None - requires backend fix  
**ETA:** Depends on backend team availability

