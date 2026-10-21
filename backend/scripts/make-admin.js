/**
 * Secure User Role Promotion Script
 *
 * Usage:
 *   node backend/scripts/make-admin.js <email>
 *
 * Example:
 *   node backend/scripts/make-admin.js aarav.sharma@student.com
 */

const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const connectDB = require('../config/db');
const User = require('../models/User');

const run = async () => {
  const email = (process.argv[2] || '').toLowerCase().trim();

  if (!email) {
    console.error('\n[Error] Please provide the email address of the user to promote.');
    console.log('\nUsage:');
    console.log('  node backend/scripts/make-admin.js <email>');
    console.log('\nExample:');
    console.log('  node backend/scripts/make-admin.js user@institute.com\n');
    process.exit(1);
  }

  try {
    console.log('[Make Admin] Connecting to database...');
    await connectDB();

    const user = await User.findOne({ email });

    if (!user) {
      console.error(`\n[Error] No user found with email '${email}'. Please register first.\n`);
      process.exit(1);
    }

    if (user.role === 'admin') {
      console.log(`\n[Info] User '${user.name}' (${email}) is already an Administrator.\n`);
      process.exit(0);
    }

    user.role = 'admin';
    await user.save();

    console.log(`\n[Success] User '${user.name}' (${email}) has been successfully granted Administrator privileges!\n`);
    process.exit(0);
  } catch (error) {
    console.error(`\n[Error] Failed to promote user: ${error.message}\n`);
    process.exit(1);
  }
};

run();
