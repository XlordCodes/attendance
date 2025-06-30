# 🚀 Firebase Setup Troubleshooting Guide

## Issue: Email `kailash.s2376@gmail.com` not working and setup page can't fetch admins

### Step 1: Check Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `aintrix-attendance`
3. Navigate to **Firestore Database**

### Step 2: Fix Security Rules (Most Common Issue)
1. In Firestore, click **Rules** tab
2. Replace existing rules with:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access for development
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```
3. Click **Publish**

### Step 3: Create Admin Document
1. In Firestore, click **Data** tab
2. Click **Start collection**
3. Collection ID: `admins`
4. Document ID: `kailash.s2376@gmail.com`
5. Add fields:
   - `email` (string): `kailash.s2376@gmail.com`
   - `name` (string): `Kailash S`
   - `department` (string): `Administration`
6. Click **Save**

### Step 4: Test the Setup
1. Open: http://localhost:5174/debug
2. Click **Run Full Diagnostic**
3. Check browser console for detailed logs
4. If issues persist, click **Create Test Admin Document**

### Step 5: Run Initial Setup
1. Go to: http://localhost:5174/setup
2. Click **Check Firebase Admins** (should show your admin)
3. Click **Run Initial Setup**

### Step 6: Login Test
1. Go to: http://localhost:5174/
2. Login with:
   - Email: `kailash.s2376@gmail.com`
   - Password: `admin123`

## Quick Test Commands (Browser Console)

Open browser console and run:
```javascript
// Test 1: Basic connection
import('./src/utils/firebaseTests.js').then(m => m.testFirebaseConnection());

// Test 2: Check admins collection  
import('./src/utils/firebaseTests.js').then(m => m.testAdminsCollection());

// Test 3: Create test admin
import('./src/utils/firebaseTests.js').then(m => m.createTestAdminDocument('kailash.s2376@gmail.com'));
```

## Common Error Messages & Solutions

### "Permission denied"
- **Cause:** Firestore security rules blocking access
- **Solution:** Update security rules (Step 2)

### "Collection 'admins' not found"
- **Cause:** No admins collection in Firestore
- **Solution:** Create admin document (Step 3)

### "No admins found in Firebase admins collection"
- **Cause:** Empty admins collection
- **Solution:** Add admin documents (Step 3)

### Firebase connection errors
- **Cause:** Invalid Firebase config or network issues
- **Solution:** Check internet connection and Firebase config

## Verification Checklist

- [ ] Firebase security rules allow read/write
- [ ] Admins collection exists in Firestore
- [ ] Admin document with email `kailash.s2376@gmail.com` exists
- [ ] Firebase config is correct in `firebaseConfig.ts`
- [ ] Internet connection is working
- [ ] No browser console errors

## Need More Help?

1. Open: http://localhost:5174/debug
2. Run all diagnostic tests
3. Check browser console for detailed error messages
4. Take screenshots of any error messages
