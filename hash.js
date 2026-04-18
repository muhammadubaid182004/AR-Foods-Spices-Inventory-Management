import bcrypt from 'bcrypt';

const input = process.argv[2];

if (!input) {
  console.log("Usage: node hash.js <your_string>");
  process.exit(1);
}

const saltRounds = 10;

try {
  const hash = await bcrypt.hash(input, saltRounds);
  console.log("Original:", input);
  console.log("Hash:", hash);
} catch (err) {
  console.error("Error:", err);
}