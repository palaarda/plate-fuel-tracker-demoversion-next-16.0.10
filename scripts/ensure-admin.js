const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_BYTES = 72;
const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,32}$/;
const WEAK_PASSWORDS = new Set([
  "admin1234",
  "admin12345",
  "administrator",
  "password",
  "password123",
  "123456789012",
  "qwerty123456",
  "changeme",
]);

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, "$2");
    }
  }
}

function requireEnv(name) {
  const value = (process.env[name] || "").trim();
  if (!value) {
    throw new Error(`${name} tanımlı değil. .env.local dosyasını veya ortam değişkenlerini kontrol edin.`);
  }
  return value;
}

function validatePassword(password, username) {
  const problems = [];
  if (password.length < MIN_PASSWORD_LENGTH) {
    problems.push(`en az ${MIN_PASSWORD_LENGTH} karakter olmalı`);
  }
  if (Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES) {
    problems.push(`en fazla ${MAX_PASSWORD_BYTES} bayt olmalı`);
  }
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((re) => re.test(password));
  if (classes.length < 3) {
    problems.push("küçük harf, büyük harf, rakam ve sembolden en az üçünü içermeli");
  }
  if (WEAK_PASSWORDS.has(password.toLowerCase())) {
    problems.push("yaygın/varsayılan bir şifre olmamalı");
  }
  if (password.toLowerCase().includes(username.toLowerCase())) {
    problems.push("kullanıcı adını içermemeli");
  }
  if (problems.length) {
    throw new Error(`ADMIN_PASSWORD güvensiz: ${problems.join("; ")}.`);
  }
}

async function main() {
  loadEnv();

  const resetPassword = process.argv.includes("--reset-password");
  const uri = requireEnv("MONGODB_URI");
  const dbName = (process.env.MONGODB_DB || "hmf2").trim();
  const username = requireEnv("ADMIN_USERNAME");
  const password = requireEnv("ADMIN_PASSWORD");
  const name = (process.env.ADMIN_NAME || username).trim();

  if (!USERNAME_PATTERN.test(username)) {
    throw new Error("ADMIN_USERNAME 3-32 karakter olmalı ve yalnızca harf, rakam, nokta, alt çizgi, tire içermeli.");
  }
  validatePassword(password, username);

  const conn = await mongoose.connect(uri, { dbName });
  const users = conn.connection.db.collection("users");

  const existing = await users.findOne({ username }, { projection: { _id: 1 } });

  if (existing && !resetPassword) {
    console.log(
      `"${username}" kullanıcısı zaten mevcut; hiçbir değişiklik yapılmadı. ` +
        "Şifreyi güncellemek için --reset-password bayrağını kullanın."
    );
    return;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const now = new Date();

  if (existing) {
    await users.updateOne(
      { _id: existing._id },
      { $set: { passwordHash, passwordChangedAt: now, updatedAt: now } }
    );
    console.log(`"${username}" kullanıcısının şifresi güncellendi; mevcut oturumları sonlandırıldı.`);
    return;
  }

  await users.insertOne({
    username,
    name,
    passwordHash,
    role: "super_admin",
    createdAt: now,
    updatedAt: now,
  });
  console.log(`"${username}" yönetici hesabı oluşturuldu (super_admin).`);
  console.log("Güvenlik için ADMIN_PASSWORD değerini artık .env.local dosyasından kaldırabilirsiniz.");
}

main()
  .catch((err) => {
    console.error("Hata:", err.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch {}
  });
