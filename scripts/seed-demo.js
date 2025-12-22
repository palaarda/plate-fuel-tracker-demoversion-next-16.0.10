const fs = require("fs");
const path = require("path");
const { ObjectId } = require("mongodb");
const mongoose = require("mongoose");

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

  if (!uri) {
    throw new Error("MONGODB_URI tanımlı değil. .env.local dosyasını kontrol edin.");
  }

  const conn = await mongoose.connect(uri, { dbName });
  const db = conn.connection.db;

  const vehicleRes = await db.collection("vehicles").insertOne({
    plate: "DEMO-001",
    makeModel: "Demo Araç",
    odometer: 0,
    driverName: "Demo Kullanıcı",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await db.collection("fuelentries").insertOne({
    vehicleId: new ObjectId(vehicleRes.insertedId),
    plate: "DEMO-001",
    liters: 0,
    amount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log("Demo kayıtlar eklendi. Koleksiyonlar Compass'ta görünecek.");
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

