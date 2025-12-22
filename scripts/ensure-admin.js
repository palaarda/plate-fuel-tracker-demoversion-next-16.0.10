const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2];
    }
  }
}

async function main() {
  loadEnv();

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || "hmf2";
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "admin1234";
  const name = process.env.ADMIN_NAME || "Demo Admin";

  if (!uri) {
    throw new Error("MONGODB_URI tanımlı değil. .env.local dosyasını kontrol edin.");
  }

  const conn = await mongoose.connect(uri, { dbName });
  const db = conn.connection.db;
  const users = db.collection("users");

  const passwordHash = await bcrypt.hash(password, 10);

  const result = await users.findOneAndUpdate(
    { username },
    {
      $set: {
        username,
        name,
        passwordHash,
        role: "super_admin",
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, returnDocument: "after" }
  );

  console.log(
    result.lastErrorObject?.updatedExisting
      ? "Admin kullanıcı güncellendi (super_admin)."
      : "Admin kullanıcı oluşturuldu (super_admin)."
  );
}

main()
  .catch((err) => {
    console.error("Hata:", err.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch (e) {
      /* boş */
    }
  });

