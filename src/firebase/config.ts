// Import Firebase configuration from services
import { auth, db } from '../services/firebaseConfig';

// Export the real Firebase instances
export { auth, db };

export default { auth, db };