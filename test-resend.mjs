
import dotenv from 'dotenv';
import { Resend } from 'resend';
import path from 'node:path';

// Explicitly load .env.local from the current project directory
const envResult = dotenv.config({
  path: path.resolve(process.cwd(), '.env.local'),
});

if (envResult.error) {
  console.error('Could not load .env.local:', envResult.error.message);
  process.exit(1);
}

console.log('Starting FIDES email test...');
console.log(
  'API key loaded:',
  process.env.RESEND_API_KEY ? 'YES' : 'NO'
);

if (!process.env.RESEND_API_KEY) {
  console.error('RESEND_API_KEY is missing from .env.local');
  process.exit(1);
}

const resend = new Resend(process.env.RESEND_API_KEY);

async function testEmail() {
  try {
    const { data, error } = await resend.emails.send({
      from: 'FIDES Test <onboarding@resend.dev>',
      to: ['janroecostan5@gmail.com'],
      subject: 'FIDES - Resend Email Test',
      html: '<h2>Hello from FIDES!</h2><p>Resend is working!</p>',
    });

    if (error) {
      console.error('EMAIL FAILED:', error);
      return;
    }

    console.log('EMAIL SENT SUCCESSFULLY!');
    console.log('Email ID:', data.id);

  } catch (err) {
    console.error('UNEXPECTED ERROR:', err);
  }
}

testEmail();
