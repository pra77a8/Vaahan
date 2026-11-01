import * as dotenv from 'dotenv';
dotenv.config();
import { authenticateUser } from '../src/services/authService';

async function verify() {
  console.log('Testing authenticateUser for approved students:\n');

  const students = [
    'akash@kkwagh.edu.in',
    'pradhangle370125@kkwagh.edu.in',
    'priyanka.shinde@kkwagh.edu.in'
  ];

  for (const email of students) {
    console.log(`Checking ${email}...`);
    const res = await authenticateUser(email, 'password123', 'student');
    if (res.success && res.profile) {
      console.log(`✅ SUCCESS for ${email}:`, {
        id: res.profile.id,
        name: res.profile.fullName,
        role: res.profile.role,
        status: res.profile.status,
        prn: (res.profile as any).prn,
        route: (res.profile as any).transport?.routeName,
        stop: (res.profile as any).transport?.pickupStopName,
        transportStatus: (res.profile as any).transport?.status
      });
    } else {
      console.error(`❌ FAILED for ${email}:`, res.error);
    }
    console.log('----------------------------------------------------');
  }
}

verify().catch(console.error);
