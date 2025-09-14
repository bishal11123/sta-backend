import mongoose from "mongoose";

// Academic Record Schema
const academicRecordSchema = new mongoose.Schema({
  type: { type: String, required: true },
  schoolName: { type: String, required: true },
  from: { type: Date, required: true },
  to: { type: Date, required: true },
  faculty: { type: String, default: "" },
  address: { type: String, default: "" },
});

// Family Member Schema
const familyMemberSchema = new mongoose.Schema({
  relationship: { type: String, required: true },
  name: { type: String, required: true },
  contact: { type: String, required: true},
  dob: { type: Date, required: true},
  address: { type: String, required: true },
  occupation: { type: String, required: true },
  isSponsor: { type: Boolean, default: false },
});

// Work Experience Schema
const workExperienceSchema = new mongoose.Schema({
  company: { type: String, required: true },
  position: { type: String, required: true },
  from: { type: Date, required: true },
  to: { type: Date, required: true },
  address: { type: String, required: true },
});

// Document Schema
const documentSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  filePath: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
});

// Main Student Schema
const studentSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, required: true},
    sex: { type: String, enum: ["Male", "Female", "Other"], required: true },
    dob: { type: Date },
    pob: { type: String, trim: true, default: "" },
    email: { type: String, lowercase: true },
    currAdd: { type: String, default: "" },
    tempAdd: { type: String, default: "" },
    perAdd: { type: String, default: "" },
    passNum: { type: String, default: "" },
    passDoi: { type: Date },
    passDoe: { type: Date },
    COEStatus: {
      type: String,
      enum: ["Pending", "Applied", "Received"],
      default: "Pending",
    },
    remarks: { type: String, default: "" },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class" },
    profileImage: { type: String, default: "" },

    academicRecords: { type: [academicRecordSchema], default: [] },
    familyMembers: { type: [familyMemberSchema], default: [] },
    workExperiences: { type: [workExperienceSchema], default: [] },
    documents: { type: [documentSchema], default: [] },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Safe virtual age
studentSchema.virtual("age").get(function () {
  if (!this.dob) return null;
  return Math.floor((Date.now() - this.dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
});

// Indexes
studentSchema.index({ email: 1 }, { unique: true, sparse: true });
studentSchema.index({ phone: 1 }, { unique: true, sparse: true });
studentSchema.index({ firstName: 1, lastName: 1 });

export default mongoose.model("Student", studentSchema);
