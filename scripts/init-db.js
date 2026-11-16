const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
function loadEnv() {
    const envPath = path.resolve(process.cwd(), ".env.local");
    if (!fs.existsSync(envPath))
        return;
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
        const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
        if (match && !process.env[match[1]]) {
            process.env[match[1]] = match[2];
        }
    }
}
async function ensureCollection(db, name) {
    const exists = await db.listCollections({ name }).next();
    if (!exists) {
        await db.createCollection(name);
        console.log(`Koleksiyon oluşturuldu: ${name}`);
    }
    else {
        console.log(`Koleksiyon zaten var: ${name}`);
    }
    return db.collection(name);
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
    const users = await ensureCollection(db, "users");
    const vehicles = await ensureCollection(db, "vehicles");
    const fuelentries = await ensureCollection(db, "fuelentries");
    await users.createIndex({ username: 1 }, { unique: true, name: "username_unique" });
    await vehicles.createIndex({ plate: 1 }, { unique: true, name: "plate_unique" });
    await fuelentries.createIndex({ vehicleId: 1 }, { name: "vehicleId_idx" });
    await fuelentries.createIndex({ plate: 1 }, { name: "plate_idx" });
    console.log("İndeksler güncellendi.");
}
main()
    .catch((err) => {
    console.error("Hata:", err.message || err);
    process.exitCode = 1;
})
    .finally(async () => {
    try {
        await mongoose.disconnect();
    }
    catch {
    }
});
