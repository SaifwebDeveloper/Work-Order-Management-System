"use strict";

require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env") });

const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const { User, Setting, InventoryItem } = require("../models");
const { DEFAULT_SETTINGS } = require("../constants");

const SEED_USERS = [
  { username: "admin", password: "admin123", full_name: "Muhammad Asif Khan", role: "nrtc_admin" },
  { username: "p3c", password: "p3c123", full_name: "Sqn Ldr (R) Tariq Mehmood", role: "p3c" },
  { username: "prod.officer", password: "prod123", full_name: "Engr. Usman Ghani", role: "production", section: null },
  { username: "prod.emp", password: "prod123", full_name: "Muhammad Bilal", role: "production", section: "alternator" },
  { username: "prod.cable", password: "prod123", full_name: "Abdul Rehman", role: "production", section: "cable" },
  { username: "finance", password: "finance123", full_name: "Muhammad Farhan Siddiqui", role: "finance" },
];

const SEED_INVENTORY = [
  ["ALT-1001", "Alternator Assembly 24V 65A (MIL Spec)", "Nos", 185000],
  ["ALT-1002", "Alternator Rotor Assembly", "Nos", 92000],
  ["ALT-1003", "Alternator Stator Coil Set", "Set", 64500],
  ["ALT-1004", "Voltage Regulator 28V", "Nos", 18500],
  ["ALT-1005", "Rectifier Diode Pack", "Set", 12800],
  ["ALT-1006", "Bearing Set 6205/6203 (Alternator)", "Set", 3400],
  ["CBL-2001", "Coaxial Cable RG-213/U (per meter)", "Mtr", 640],
  ["CBL-2002", "Cable Connector N-Type (Male)", "Nos", 1450],
  ["CBL-2003", "Cable Connector N-Type (Female)", "Nos", 1450],
  ["CBL-2004", "Heat Shrink Sleeve Kit", "Set", 2200],
  ["AT-3001", "VHF Antenna Folded Dipole 30-88 MHz", "Nos", 34500],
  ["AT-3002", "HF Antenna Wire Element 2.5MHz", "Nos", 15800],
  ["AT-3003", "Antenna Tuning Unit (ATU) Assembly", "Nos", 88500],
  ["AT-3004", "Coil Assembly for ATU", "Nos", 26700],
  ["AT-3005", "Insulator Strain Type", "Nos", 3900],
  ["MEC-4001", "Ball Bearing 6205-2RS", "Nos", 1250],
  ["MEC-4002", "Ball Bearing 6306-2RS", "Nos", 1680],
  ["MEC-4003", "Oil Seal Set (Gearbox)", "Set", 4750],
  ["MEC-4004", "Gasket Kit (Engine/Generator)", "Set", 5900],
  ["MEC-4005", "V-Belt Set B-Section", "Set", 3150],
  ["INS-5001", "Earthing Rod Copper 16mm x 3M", "Nos", 5500],
  ["INS-5002", "Earthing Pit Cover (CI)", "Nos", 2800],
  ["INS-5003", "Lightning Arrester 9kV", "Nos", 12400],
  ["INS-5004", "Insulating Mat 3ft x 6ft", "Nos", 8600],
  ["INS-5005", "Cable Lug Copper 50mm", "Nos", 320],
  ["ELE-6001", "Diesel Engine Fuel Filter", "Nos", 4200],
  ["ELE-6002", "Lube Oil Filter Element", "Nos", 3850],
  ["ELE-6003", "Battery 12V 120AH (Maintenance Free)", "Nos", 26500],
  ["ELE-6004", "Battery Charger 24V 30A", "Nos", 48000],
  ["ELE-6005", "Control Panel Circuit Board", "Nos", 35600],
  ["ELE-6006", "AVR Unit (Automatic Voltage Regulator)", "Nos", 52800],
  ["ELE-6007", "Hour Meter / Instruments Kit", "Set", 9800],
];

async function run() {
  await connectDB();
  console.log("Seeding…");

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await Setting.updateOne({ key }, { $setOnInsert: { value } }, { upsert: true });
  }

  for (const u of SEED_USERS) {
    const existing = await User.findOne({ username: u.username });
    if (!existing) {
      await User.create({
        username: u.username,
        password_hash: await bcrypt.hash(u.password, 10),
        full_name: u.full_name,
        role: u.role,
        section: u.section ?? null,
      });
      console.log(`  user ${u.username} (${u.role})`);
    }
  }

  for (const [store_code, description, unit, unit_price] of SEED_INVENTORY) {
    await InventoryItem.updateOne(
      { store_code },
      { $set: { description, unit, unit_price } },
      { upsert: true }
    );
  }
  console.log(`  inventory: ${SEED_INVENTORY.length} items`);
  console.log("Seed complete.");
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
