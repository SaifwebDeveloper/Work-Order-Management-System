"use strict";

const mongoose = require("mongoose");
const { Schema } = mongoose;

// ------------------------------------------------------------------- User
const userSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    password_hash: { type: String, required: true },
    full_name: { type: String, required: true },
    role: { type: String, required: true, enum: ["nrtc_admin", "p3c", "production", "finance"] },
    section: { type: String, default: null },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    is_active: { type: Boolean, default: true },
    must_change_password: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// --------------------------------------------------------------- Settings
const settingSchema = new Schema(
  { key: { type: String, required: true, unique: true }, value: { type: String, default: "" } },
  { timestamps: false }
);

// --------------------------------------------------------------- Inventory
const inventorySchema = new Schema(
  {
    store_code: { type: String, required: true, unique: true, trim: true },
    description: { type: String, required: true },
    unit: { type: String, default: "Nos" },
    unit_price: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);
inventorySchema.index({ store_code: "text", description: "text" });

// ------------------------------------------------------------- WorkOrder
const workOrderSchema = new Schema(
  {
    wo_number: { type: Number, required: true, unique: true },
    wo_date: { type: String, required: true }, // YYYY-MM-DD
    customer_name: { type: String, required: true },
    customer_tag: { type: String, default: "" },
    reference_number: { type: String, default: "" },
    contract_number: { type: String, default: "" },
    under_warranty: { type: Boolean, default: false },
    nrtc_check_remarks: { type: String, default: "" },
    status: {
      type: String,
      required: true,
      enum: [
        "draft",
        "pending_p3c",
        "pending_production",
        "pending_nrtc_check",
        "pending_finance",
        "pending_nrtc_final",
        "completed",
      ],
      default: "draft",
    },
    created_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// -------------------------------------------------------------- Equipment
const equipmentSchema = new Schema(
  {
    wo_id: { type: Schema.Types.ObjectId, ref: "WorkOrder", required: true, index: true },
    name: { type: String, required: true },
    serial_number: { type: String, default: "" },
    defect: { type: String, default: "" },
    quantity: { type: Number, default: 1 },
    unit: { type: String, default: "Nos" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// ------------------------------------------------------------- Attachment
const attachmentSchema = new Schema(
  {
    wo_id: { type: Schema.Types.ObjectId, ref: "WorkOrder", required: true, index: true },
    original_name: { type: String, required: true },
    stored_name: { type: String, required: true },
    mime: { type: String, default: "" },
    size: { type: Number, default: 0 },
    kind: { type: String, default: "work_order" }, // work_order | gatepass
    uploaded_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// --------------------------------------------------------- P3C Endorsement
const p3cEndorsementSchema = new Schema(
  {
    wo_id: { type: Schema.Types.ObjectId, ref: "WorkOrder", required: true, unique: true },
    ref_no: { type: String, default: "" },
    ref_date: { type: String, default: "" },
    remarks: { type: String, default: "" },
    verified: { type: Boolean, default: false },
    p3c_ref_number: { type: String, default: "" },
    endorsed_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    endorsed_at: { type: Date, default: null },
    forwarded_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// -------------------------------------------------------------- WoSection
const woSectionSchema = new Schema(
  {
    wo_id: { type: Schema.Types.ObjectId, ref: "WorkOrder", required: true, index: true },
    section: { type: String, required: true },
    status: { type: String, enum: ["pending", "in_progress", "submitted"], default: "pending" },
    submitted_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    submitted_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);
woSectionSchema.index({ wo_id: 1, section: 1 }, { unique: true });

// ---------------------------------------------------------- ProductionItem
const productionItemSchema = new Schema(
  {
    wo_id: { type: Schema.Types.ObjectId, ref: "WorkOrder", required: true, index: true },
    equipment_id: { type: Schema.Types.ObjectId, ref: "Equipment", required: true },
    section: { type: String, required: true },
    fault: { type: String, default: "" },
    part_description: { type: String, default: "" },
    store_code: { type: String, default: "" },
    qty: { type: Number, default: 1 },
    unit: { type: String, default: "Nos" },
    unit_price: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
    remarks: { type: String, default: "" },
    created_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// ----------------------------------------------------------- LabourCharge
const labourChargeSchema = new Schema(
  {
    wo_id: { type: Schema.Types.ObjectId, ref: "WorkOrder", required: true, index: true },
    section: { type: String, required: true },
    description: { type: String, required: true },
    hours: { type: Number, default: 0 },
    rate: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
    remarks: { type: String, default: "" },
    created_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// ------------------------------------------------------------- FinanceCost
const financeCostSchema = new Schema(
  {
    wo_id: { type: Schema.Types.ObjectId, ref: "WorkOrder", required: true, unique: true },
    cost_sheet_no: { type: String, default: "" },
    cost_sheet_date: { type: String, default: "" },
    component_amount: { type: Number, default: 0 },
    component_gst: { type: Number, default: 0 },
    labour_base: { type: Number, default: 0 },
    labour_gst: { type: Number, default: 0 },
    ic_costing: { type: Number, default: 0 },
    total_amount: { type: Number, default: 0 },
    remarks: { type: String, default: "" },
    submitted_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    submitted_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// ---------------------------------------------------------------- Gatepass
const gatepassSchema = new Schema(
  {
    wo_id: { type: Schema.Types.ObjectId, ref: "WorkOrder", required: true, index: true },
    gp_number: { type: String, required: true, unique: true },
    issued_to: { type: String, required: true },
    designation: { type: String, default: "" },
    basis_through: { type: String, default: "" },
    vehicle_no: { type: String, default: "" },
    returnable: { type: Boolean, default: true },
    expected_return_date: { type: String, default: "" },
    remarks: { type: String, default: "" },
    qr_token: { type: String, required: true },
    issued_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// ------------------------------------------------------------ GatepassItem
const gatepassItemSchema = new Schema(
  {
    gatepass_id: { type: Schema.Types.ObjectId, ref: "Gatepass", required: true, index: true },
    equipment_id: { type: Schema.Types.ObjectId, ref: "Equipment", default: null },
    sr_no: { type: Number, required: true },
    description: { type: String, required: true },
    serial_number: { type: String, default: "" },
    quantity: { type: Number, default: 1 },
    unit: { type: String, default: "Nos" },
    remarks: { type: String, default: "" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// ------------------------------------------------------------ Notification
const notificationSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", default: null }, // null => role broadcast
    role: { type: String, default: null },
    title: { type: String, required: true },
    message: { type: String, default: "" },
    link: { type: String, default: "" },
    is_read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// ------------------------------------------------------------- WoTimeline
const woTimelineSchema = new Schema(
  {
    wo_id: { type: Schema.Types.ObjectId, ref: "WorkOrder", required: true, index: true },
    stage: { type: String, default: "" },
    action: { type: String, required: true },
    notes: { type: String, default: "" },
    actor_id: { type: Schema.Types.ObjectId, ref: "User", default: null },
    actor_name: { type: String, default: "" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

module.exports = {
  User: mongoose.model("User", userSchema),
  Setting: mongoose.model("Setting", settingSchema),
  InventoryItem: mongoose.model("InventoryItem", inventorySchema),
  WorkOrder: mongoose.model("WorkOrder", workOrderSchema),
  Equipment: mongoose.model("Equipment", equipmentSchema),
  Attachment: mongoose.model("Attachment", attachmentSchema),
  P3CEndorsement: mongoose.model("P3CEndorsement", p3cEndorsementSchema),
  WoSection: mongoose.model("WoSection", woSectionSchema),
  ProductionItem: mongoose.model("ProductionItem", productionItemSchema),
  LabourCharge: mongoose.model("LabourCharge", labourChargeSchema),
  FinanceCost: mongoose.model("FinanceCost", financeCostSchema),
  Gatepass: mongoose.model("Gatepass", gatepassSchema),
  GatepassItem: mongoose.model("GatepassItem", gatepassItemSchema),
  Notification: mongoose.model("Notification", notificationSchema),
  WoTimeline: mongoose.model("WoTimeline", woTimelineSchema),
};
