/**
 * Secure Administrator Creation Script
 *
 * Usage:
 *   node backend/scripts/create-admin.js <email> <password> [name] [phone]
 *
 * Examples:
 *   node backend/scripts/create-admin.js admin@example.com MyStrongPassword123 "Institute Admin" 9876500000
 *   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=MySecret node backend/scripts/create-admin.js
 */

const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const connectDB = require('../config/db');
const User = require('../models/User');

const run = async () => {
  const args = process.argv.slice(2);

  const email = (args[0] || process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const password = args[1] || process.env.ADMIN_PASSWORD || '';
  const name = args[2] || process.env.ADMIN_NAME || 'Institute Administrator';
  const phone = args[3] || process.env.ADMIN_PHONE || undefined;

  if (!email || !password) {
    console.error('\n[Error] Missing required arguments.');
    console.log('\nUsage:');
    console.log('  node backend/scripts/create-admin.js <email> <password> [name] [phone]');
    console.log('\nExample:');
    console.log('  node backend/scripts/create-admin.js admin@example.com SecurePass123 "Admin Name" 9876500000\n');
    process.exit(1);
  }

  if (password.length < 6) {
    console.error('\n[Error] Password must be at least 6 characters long.\n');
    process.exit(1);
  }

  try {
    console.log('[Create Admin] Connecting to database...');
    await connectDB();

    const passwordHash = await User.hashPassword(password);
    let user = await User.findOne({ email });

    if (user) {
      user.role = 'admin';
      user.passwordHash = passwordHash;
      user.name = name;
      if (phone) user.phone = phone;
      await user.save();
      console.log(`\n[Success] Existing user '${email}' was successfully promoted to Administrator!`);
    } else {
      user = await User.create({
        name,
        email,
        passwordHash,
        role: 'admin',
        phone
      });
      console.log(`\n[Success] New Administrator account '${email}' created successfully!`);
    }

    console.log(`[Details] Name: ${user.name} | Role: ${user.role}\n`);
    process.exit(0);
  } catch (error) {
    console.error(`\n[Error] Failed to create administrator: ${error.message}\n`);
    process.exit(1);
  }
};

run();
