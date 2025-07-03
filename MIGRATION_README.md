# Firestore Attendance Data Migration

This migration script transforms your attendance data from the old structure to a new global structure.

## Migration Overview

**From (Old Structure):**
```
users/{uid}/attendance/{date}
```

**To (New Structure):**
```
globalAttendance/{date}/records/{userName}
```

## Prerequisites

1. **Firebase Admin SDK**: You need a service account key file
2. **Node.js**: Version 14 or higher
3. **Backup**: Create a backup of your Firestore database before running

## Setup Instructions

### 1. Install Dependencies

```bash
npm install firebase-admin
# For TypeScript version:
npm install -D typescript @types/node ts-node
```

### 2. Get Service Account Key

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Save the JSON file as `serviceAccountKey.json` in your project root
4. Update the import path in the migration script

### 3. Update the Script

Edit the migration script and change this line:
```javascript
const serviceAccount = require('./serviceAccountKey.json');
```

## Running the Migration

### Option 1: JavaScript Version
```bash
node migrate-attendance-data.js
```

### Option 2: TypeScript Version
```bash
npx ts-node migrate-attendance-data.ts
```

## What the Script Does

1. **Reads all users** from the `users` collection
2. **Extracts user names** from the `name` field (falls back to `displayName` or generates a default)
3. **Reads all attendance records** from each user's `attendance` subcollection
4. **Copies all data** to the new structure: `globalAttendance/{date}/records/{userName}`
5. **Adds metadata** like `originalUserId`, `migratedAt`, etc.
6. **Verifies the migration** by comparing document counts
7. **Provides cleanup option** (commented out by default)

## New Data Structure

After migration, your data will look like this:

```
globalAttendance/
  ├── 2025-07-01/
  │   └── records/
  │       ├── Mohamed Yousuf/
  │       │   ├── clockIn: Timestamp
  │       │   ├── clockOut: Timestamp
  │       │   ├── totalHours: number
  │       │   ├── status: string
  │       │   ├── originalUserId: string
  │       │   ├── userName: string
  │       │   └── ... (all other fields)
  │       └── John Doe/
  │           └── ... (attendance data)
  ├── 2025-07-02/
  │   └── records/
  │       └── ... (users' attendance for this date)
  └── 2025-07-03/
      └── records/
          └── ... (users' attendance for this date)
```

## Safety Features

- **Verification**: Compares old and new document counts
- **Error handling**: Continues migration even if individual records fail
- **Logging**: Detailed progress and error reporting
- **No deletion**: Old data remains intact unless you run the cleanup function

## After Migration

1. **Update your application code** to use the new structure
2. **Test thoroughly** with the new data structure
3. **Run cleanup** (optional) to remove old data once you're confident

## Cleanup (Optional)

Uncomment this line in the migration script to delete old data:
```javascript
// await cleanupOldData();
```

⚠️ **WARNING**: Only run cleanup after thoroughly testing your application with the new structure!

## Troubleshooting

### Common Issues

1. **Permission errors**: Ensure your service account has Firestore read/write permissions
2. **Rate limiting**: The script includes delays, but you might need to add more for large datasets
3. **Memory issues**: For very large datasets, consider processing in batches

### Support

If you encounter issues:
1. Check the console output for specific error messages
2. Verify your service account permissions
3. Ensure your Firestore security rules allow the operations
4. Test with a small subset of data first

## Example Service Account Permissions

Your service account needs these roles:
- Cloud Datastore User
- Firebase Admin SDK Service Agent

## Batch Processing (For Large Datasets)

If you have a large amount of data, consider modifying the script to process in batches:

```javascript
// Process users in batches of 10
const batchSize = 10;
for (let i = 0; i < usersSnapshot.docs.length; i += batchSize) {
  const batch = usersSnapshot.docs.slice(i, i + batchSize);
  await Promise.all(batch.map(processUser));
  console.log(`Processed batch ${Math.floor(i/batchSize) + 1}`);
}
```
