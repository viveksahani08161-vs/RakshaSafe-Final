import 'dotenv/config';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import mongoose from 'mongoose';
import { User, UserRole } from '../models/User.js';
import { hashPassword } from '../utils/password.js';
import { isEmail, isPhone } from '../validators/auth.js';

const rl = readline.createInterface({ input: stdin, output: stdout });

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let password = '';

    function onData(char: string) {
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004': // Ctrl+D
          stdout.write('\n');
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          resolve(password);
          break;
        case '\u0003': // Ctrl+C
          stdout.write('\n');
          stdin.setRawMode(false);
          stdin.pause();
          process.exit(1);
          break;
        case '\u007f': // Backspace
        case '\b':
          if (password.length > 0) {
            password = password.slice(0, -1);
            stdout.write('\b \b');
          }
          break;
        default:
          if (char >= ' ' && char <= '~') {
            password += char;
            stdout.write('*');
          }
      }
    }

    stdin.on('data', onData);
  });
}

async function prompt(question: string): Promise<string> {
  const answer = await rl.question(question);
  return answer.trim();
}

async function main() {
  try {
    const name = await prompt('Enter new admin name: ');
    const email = (await prompt('Enter new admin email: ')).toLowerCase();
    const phone = await prompt('Enter new admin phone: ');
    const password = await promptHidden('Enter new admin password: ');

    // Validate using existing validators
    const issues: Array<{ field: string; message: string }> = [];

    if (name.length < 2 || name.length > 100) {
      issues.push({ field: 'name', message: 'Name must be between 2 and 100 characters.' });
    }
    if (!isEmail(email)) {
      issues.push({ field: 'email', message: 'A valid email address is required.' });
    }
    if (!isPhone(phone)) {
      issues.push({ field: 'phone', message: 'A valid phone number is required.' });
    }
    if (password.length < 8 || password.length > 128) {
      issues.push({ field: 'password', message: 'Password must be between 8 and 128 characters.' });
    }

    if (issues.length > 0) {
      console.error('\nValidation failed:');
      for (const issue of issues) {
        console.error(`  ${issue.field}: ${issue.message}`);
      }
      process.exit(1);
    }

    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/rakshasafe';
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });

    // Find existing admin
    const admin = await User.findOne({ role: UserRole.ADMIN });
    if (!admin) {
      console.error('No existing admin account found.');
      process.exit(1);
    }

    // Check for email/phone conflicts with other users
    const conflict = await User.findOne({
      $or: [{ email }, { phone }],
      _id: { $ne: admin._id },
    });
    if (conflict) {
      console.error('Another account already uses this email or phone.');
      process.exit(1);
    }

    // Hash password and update
    const passwordHash = await hashPassword(password);

    admin.name = name;
    admin.email = email;
    admin.phone = phone;
    admin.passwordHash = passwordHash;
    // Role stays ADMIN
    await admin.save();

    console.log('\nAdmin account updated successfully.');
    console.log(`Name: ${admin.name}`);
    console.log(`Email: ${admin.email}`);
    console.log(`Phone: ${admin.phone}`);
    console.log('Role: ADMIN');
  } catch (err) {
    console.error('Update failed:', (err as Error).message);
    process.exit(1);
  } finally {
    rl.close();
    await mongoose.disconnect();
  }
}

main();