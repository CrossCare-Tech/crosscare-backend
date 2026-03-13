import bcrypt from "bcryptjs";
async function hashPassword(password) {
  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log("Hashed Password:", hashedPassword);
    return hashedPassword;
  } catch (error) {
    console.error("Error hashing password:", error);
  }
}

// Example usage
const userPassword = "12345678";
hashPassword(userPassword);

console.log(hashPassword);
