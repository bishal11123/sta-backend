import express from "express";
import Student from "../models/Student.js";
import Class from "../models/Class.js";
import multer from "multer";
import path from "path";
import sharp from "sharp";
import fs from "fs";
import PDFDocument from "pdfkit";


const router = express.Router();

/* ===========================
   CREATE REQUIRED FOLDERS
=========================== */
["uploads/profile-images", "uploads/documents"].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

/* ===========================
   ENUM VALIDATION
=========================== */
const validCOEStatus = ["Pending", "Applied", "Received"];
function validateCOEStatus(data) {
  if (!validCOEStatus.includes(data.COEStatus)) data.COEStatus = "Pending";
}

/* ===========================
   MULTER STORAGE
=========================== */
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/profile-images"),
  filename: (req, file, cb) => cb(null, `${req.params.id || Date.now()}${path.extname(file.originalname)}`),
});
const uploadProfile = multer({ storage: profileStorage });

const docStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/documents"),
  filename: (req, file, cb) => cb(null, `${req.params.id || Date.now()}${path.extname(file.originalname)}`),
});
const uploadDoc = multer({ storage: docStorage });

/* ===========================
   HELPERS
=========================== */
function parseJSONField(field, fallback = []) {
  try {
    return field ? JSON.parse(field) : fallback;
  } catch {
    return fallback;
  }
}

function parseStudentData(body, file, existing = {}) {
  return {
    firstName: body.firstName ?? existing.firstName,
    lastName: body.lastName ?? existing.lastName,
    phone: body.phone ?? existing.phone,
    sex: body.sex ?? existing.sex,
    dob: body.dob ? new Date(body.dob) : existing.dob,
    pob: body.pob ?? existing.pob,
    email: body.email ?? existing.email,
    currAdd: body.currAdd ?? existing.currAdd,
    tempAdd: body.tempAdd ?? existing.tempAdd,
    perAdd: body.perAdd ?? existing.perAdd,
    passNum: body.passNum ?? existing.passNum,
    passDoi: body.passDoi ? new Date(body.passDoi) : existing.passDoi,
    passDoe: body.passDoe ? new Date(body.passDoe) : existing.passDoe,
    COEStatus: body.COEStatus ?? existing.COEStatus,
    remarks: body.remarks ?? existing.remarks,
    classId: body.classId ?? existing.classId,
    profileImage: file ? file.filename : existing.profileImage,
    academicRecords: parseJSONField(body.academicRecords, existing.academicRecords),
    familyMembers: parseJSONField(body.familyMembers, existing.familyMembers),
    workExperiences: parseJSONField(body.workExperiences, existing.workExperiences),
    documents: parseJSONField(body.documents, existing.documents),
  };
}

/* ===========================
   ROUTES
=========================== */

// GET all students
router.get("/", async (req, res) => {
  try {
    const students = await Student.find().populate("classId");
    res.json(students);
  } catch (err) {
    console.error("GET students error:", err);
    res.status(500).json({ message: err.message });
  }
});

// GET summary
router.get("/summary", async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const pendingCoe = await Student.countDocuments({ COEStatus: "Pending" });
    const appliedCoe = await Student.countDocuments({ COEStatus: "Applied" });
    const receivedCoe = await Student.countDocuments({ COEStatus: "Received" });

    res.json({ totalStudents, pendingCoe, appliedCoe, receivedCoe });
  } catch (err) {
    console.error("Summary error:", err);
    res.status(500).json({ message: err.message });
  }
});

router.get("/search", async (req, res) => {
  try {
    const q = req.query.q?.trim();
    if (!q) return res.json([{ id: null, name: "Not found" }]);

    const results = await Student.find({
      $or: [
        { firstName: { $regex: q, $options: "i" } },
        { lastName: { $regex: q, $options: "i" } },
      ],
    }).limit(10);

    if (!results.length) return res.json([{ id: null, name: "Not found" }]);

    res.json(results.map(s => ({ id: s._id, name: `${s.firstName} ${s.lastName}` })));
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json([{ id: null, name: "Not found" }]);
  }
});



// GET single student
router.get("/:id", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).populate("classId");
    if (!student) return res.status(404).json({ message: "Student not found" });
    res.json(student);
  } catch (err) {
    console.error("GET student by ID error:", err);
    res.status(500).json({ message: err.message });
  }
});

// CREATE student
router.post("/", uploadProfile.single("profileImage"), async (req, res) => {
  try {
    validateCOEStatus(req.body);
    const studentData = parseStudentData(req.body, req.file);
    const student = new Student(studentData);
    await student.save();

    if (student.classId) {
      await Class.findByIdAndUpdate(student.classId, { $addToSet: { students: student._id } });
    }

    res.status(201).json({ student });
  } catch (err) {
    console.error("Create student error:", err);
    res.status(400).json({ message: err.message });
  }
});

// DELETE student
router.delete("/:id", async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    // Remove student reference from class (if any)
    if (student.classId) {
      await Class.findByIdAndUpdate(student.classId, {
        $pull: { students: student._id },
      });
    }

    res.json({ message: "Student deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ message: err.message });
  }
});


// UPDATE student
router.put("/:id", uploadProfile.single("profileImage"), async (req, res) => {
  try {
    validateCOEStatus(req.body);
    const existing = await Student.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Student not found" });

    const updateData = parseStudentData(req.body, req.file, existing);

    // Delete old profile image if replaced
    if (req.file && existing.profileImage) {
      const oldPath = path.resolve("uploads/profile-images", existing.profileImage);
      if (fs.existsSync(oldPath)) await fs.promises.unlink(oldPath);
    }

    const updated = await Student.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json({ student: updated });
  } catch (err) {
    console.error("Update student error:", err);
    res.status(400).json({ message: err.message });
  }
});

// UPLOAD profile image
// UPLOAD profile image separately
router.put("/:id/profile-image", uploadProfile.single("profileImage"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No image uploaded" });

  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    // Delete old image if exists
    if (student.profileImage) {
      const oldPath = path.join("uploads/profile-images", student.profileImage);
      if (fs.existsSync(oldPath)) {
        await fs.promises.unlink(oldPath);
      }
    }

    // Resize new image
    const ext = path.extname(req.file.originalname);
    const resizedName = `${req.file.filename}-resized${ext}`;
    const resizedPath = path.join("uploads/profile-images", resizedName);

    await sharp(req.file.path).resize(300, 300).toFile(resizedPath);
    await fs.promises.unlink(req.file.path);

    // Update profileImage and save without validating other fields
    student.profileImage = resizedName;
    await student.save({ validateBeforeSave: false }); // <- skip validation

    res.json({ student });
  } catch (err) {
    console.error("Error uploading profile image:", err);
    res.status(500).json({ message: err.message });
  }
});


// UPLOAD multiple documents
router.post("/:id/documents", uploadDoc.array("documents"), async (req, res) => {
  if (!req.files || req.files.length === 0)
    return res.status(400).json({ message: "No documents uploaded" });

  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    req.files.forEach(file => {
      student.documents.push({
        fileName: file.filename,
        filePath: `/uploads/documents/${file.filename}`,
      });
    });

    // Skip validation to prevent unrelated errors
    await student.save({ validateBeforeSave: false });

    res.status(201).json({ student });
  } catch (err) {
    console.error("Error uploading documents:", err);
    res.status(500).json({ message: err.message });
  }
});





router.get("/:id/profile", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).lean(); // plain JS object
    if (!student) return res.status(404).send("Student not found");

    const doc = new PDFDocument({ margin: 50, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=profile_${student.firstName}_${student.lastName}.pdf`
    );

    doc.pipe(res);

    // Header
    doc.fontSize(18).text("Student Profile", { align: "center" }).moveDown(1);

    // Profile Image
    if (student.profileImage) {
      const imagePath = path.join("uploads/profile-images", student.profileImage);
      if (fs.existsSync(imagePath)) {
        doc.image(imagePath, doc.page.width / 2 - 50, doc.y, { width: 100, height: 100 });
        doc.moveDown(6);
      }
    }

    // Personal Info
    const info = [
      ["Full Name", `${student.firstName} ${student.lastName}`],
      ["Email", student.email || "N/A"],
      ["Phone", student.phone || "N/A"],
      ["Sex", student.sex],
      ["DOB", student.dob ? new Date(student.dob).toDateString() : "N/A"],
      ["POB", student.pob || "N/A"],
      ["Current Address", student.currAdd || "N/A"],
    ];
    info.forEach(([label, value]) => {
      doc.fontSize(12).text(`${label}: ${value}`);
    });
    doc.moveDown(1);

    // Family Members Table
    if (student.familyMembers.length) {
      doc.fontSize(14).text("Family Members", { underline: true }).moveDown(0.5);
      drawTable(doc, ["Name", "Relation", "Contact", "DOB", "Occupation"], student.familyMembers.map(m => [
        m.name, m.relationship, m.contact, m.dob ? new Date(m.dob).toDateString() : "", m.occupation
      ]));
      doc.moveDown(1);
    }

    // Academic Records Table
    if (student.academicRecords.length) {
      doc.fontSize(14).text("Academic Records", { underline: true }).moveDown(0.5);
      drawTable(doc, ["Type", "School", "Faculty", "From", "To"], student.academicRecords.map(a => [
        a.type, a.schoolName, a.faculty || "", a.from ? new Date(a.from).getFullYear() : "", a.to ? new Date(a.to).getFullYear() : ""
      ]));
      doc.moveDown(1);
    }

    // Remarks
    if (student.remarks) {
      doc.fontSize(14).text("Remarks", { underline: true }).moveDown(0.5);
      doc.fontSize(12).text(student.remarks);
    }

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).send("Error generating PDF");
  }
});

// Simple table helper
function drawTable(doc, headers, rows, startY) {
  const columnWidth = doc.page.width / headers.length - 10;
  let y = startY || doc.y;

  // Header
  headers.forEach((h, i) => {
    doc.font("Helvetica-Bold").text(h, 50 + i * columnWidth, y, { width: columnWidth });
  });
  y += 20;

  // Rows
  rows.forEach(row => {
    row.forEach((cell, i) => {
      doc.font("Helvetica").text(cell || "", 50 + i * columnWidth, y, { width: columnWidth });
    });
    y += 20;
  });

  return y;
}




// Serve uploads
router.use("/uploads/profile-images", express.static(path.join("uploads/profile-images")));
router.use("/uploads/documents", express.static(path.join("uploads/documents")));

export default router;
