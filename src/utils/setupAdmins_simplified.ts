import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

/**
 * Setup script to read admin emails from Firebase admins collection
 * Simplified version - no Firebase Auth user creation
 */
export const setupInitialUsers = async () => {
  try {
    console.log('🔍 Checking admin emails in Firebase admins collection...');
    
    // Fetch admin emails from Firebase admins collection
    const adminsRef = collection(db, 'admins');
    const adminsSnapshot = await getDocs(adminsRef);
    
    console.log(`Found ${adminsSnapshot.size} documents in admins collection`);
    
    if (adminsSnapshot.empty) {
      throw new Error('No admins found in Firebase admins collection. Please add admin emails to the admins collection first.');
    }

    let adminCount = 0;
    const adminsList = [];
    
    // Process admin documents from Firebase admins collection
    for (const adminDoc of adminsSnapshot.docs) {
      try {
        const adminData = adminDoc.data();
        console.log('Processing admin document:', adminDoc.id, adminData);
        
        // Try different ways to get email
        let email = '';
        if (adminData.email) {
          email = adminData.email;
        } else if (adminDoc.id.includes('@')) {
          email = adminDoc.id;
        }
        
        console.log(`Extracted email: ${email}`);
        
        if (email && email.includes('@')) {
          const adminInfo = {
            id: adminDoc.id,
            email: email,
            name: adminData.name || email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
            department: adminData.department || 'Administration'
          };
          
          adminsList.push(adminInfo);
          adminCount++;
          console.log(`✅ Admin found: ${email} (${adminInfo.name})`);
        } else {
          console.warn(`⚠️ Could not extract valid email from document ${adminDoc.id}:`, adminData);
        }
      } catch (error) {
        console.error(`❌ Failed to process admin document ${adminDoc.id}:`, error);
      }
    }
    
    console.log('✅ Admin check completed successfully!');
    console.log(`\n📧 Login instructions:`);
    console.log(`Just use your email address to login (no password required)`);
    console.log(`\n👥 Admins found: ${adminCount}`);
    adminsList.forEach(admin => {
      console.log(`  - ${admin.email} (${admin.name})`);
    });
    console.log(`🔗 Firebase project: aintrix-attendance`);
    
    return {
      success: true,
      adminsFound: adminCount,
      adminsList: adminsList,
      message: `Successfully found ${adminCount} admin(s) in Firebase`
    };
    
  } catch (error) {
    console.error('❌ Error checking admins:', error);
    throw error;
  }
};

// Helper function to check if a specific email is in admins collection
export const checkAdminEmail = async (email: string) => {
  try {
    console.log(`🔍 Checking if ${email} exists in admins collection...`);
    
    const adminsRef = collection(db, 'admins');
    const adminsSnapshot = await getDocs(adminsRef);
    
    for (const doc of adminsSnapshot.docs) {
      const data = doc.data();
      if (doc.id === email || data.email === email) {
        console.log(`✅ Found admin: ${email}`);
        return { found: true, data: { id: doc.id, ...data } };
      }
    }
    
    console.log(`❌ Admin ${email} not found`);
    return { found: false, data: null };
  } catch (error) {
    console.error('❌ Error checking admin email:', error);
    throw error;
  }
};
