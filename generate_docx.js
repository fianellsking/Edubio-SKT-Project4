const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, ImageRun, ShadingType } = require('docx');

const imagePath = 'C:\\Users\\vones\\.gemini\\antigravity-cli\\brain\\6a22eccb-fbad-42ee-a412-d4594c3a8cb1\\physics_sine_wave_diagram_1782380696999.jpg';
let imageBuffer = null;
try {
    imageBuffer = fs.readFileSync(imagePath);
} catch (e) {
    console.warn("Could not load diagram image:", e);
}

// Helper to create regular paragraph
function createPara(text, options = {}) {
    return new Paragraph({
        alignment: options.align || AlignmentType.LEFT,
        spacing: { after: options.after || 120, line: 276 }, // 1.15 line spacing
        children: [
            new TextRun({
                text: text,
                font: "TH Sarabun New",
                size: options.size || 32, // 16pt default for Thai documents
                bold: options.bold || false,
                color: options.color || "000000",
                italics: options.italics || false
            })
        ]
    });
}

// Helper for bullet points
function createBullet(text, boldPrefix = "") {
    const runs = [];
    if (boldPrefix) {
        runs.push(new TextRun({ text: boldPrefix + " ", font: "TH Sarabun New", size: 32, bold: true, color: "000000" }));
    }
    runs.push(new TextRun({ text: text, font: "TH Sarabun New", size: 32, color: "000000" }));
    
    return new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 80, line: 276 },
        children: runs
    });
}

// Helper for Heading 1
function createH1(text) {
    return new Paragraph({
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.LEFT,
        spacing: { before: 300, after: 150 },
        children: [
            new TextRun({
                text: text,
                font: "TH Sarabun New",
                size: 40, // 20pt
                bold: true,
                color: "1E3A8A" // Dark Blue
            })
        ]
    });
}

// Helper for Heading 2
function createH2(text) {
    return new Paragraph({
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.LEFT,
        spacing: { before: 240, after: 120 },
        children: [
            new TextRun({
                text: text,
                font: "TH Sarabun New",
                size: 36, // 18pt
                bold: true,
                color: "1D4ED8"
            })
        ]
    });
}

// Helper for problem answer (Black text as requested, NOT red)
function createAnswerPara(ansText) {
    return new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 100, after: 200 },
        children: [
            new TextRun({ text: "คำตอบ: ", font: "TH Sarabun New", size: 32, bold: true, color: "000000" }),
            new TextRun({ text: ansText, font: "TH Sarabun New", size: 32, bold: true, color: "000000" }) // Standard black
        ]
    });
}

const doc = new Document({
    sections: [{
        properties: {},
        children: [
            // Title
            new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 100 },
                children: [
                    new TextRun({ text: "ใบความรู้และแบบฝึกหัดวิชาฟิสิกส์ ชั้นมัธยมศึกษาปีที่ 5", font: "TH Sarabun New", size: 44, bold: true, color: "1E3A8A" })
                ]
            }),
            new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 300 },
                children: [
                    new TextRun({ text: "หน่วยการเรียนรู้ที่ 1: คลื่นกล (Mechanical Waves)", font: "TH Sarabun New", size: 38, bold: true, color: "3B82F6" })
                ]
            }),

            // Image inclusion
            ...(imageBuffer ? [
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 },
                    children: [
                        new ImageRun({
                            data: imageBuffer,
                            transformation: { width: 500, height: 281 },
                            type: 'jpg'
                        })
                    ]
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 300 },
                    children: [
                        new TextRun({ text: "รูปที่ 1: ส่วนประกอบของคลื่นกลชนิดคลื่นตามขวาง", font: "TH Sarabun New", size: 28, italics: true, color: "4B5563" })
                    ]
                })
            ] : []),

            // Section 1
            createH1("ส่วนที่ 1: ความหมายและการเกิดคลื่น"),
            createPara("คลื่น (Wave) คือ ปรากฏการณ์ที่เกิดจากการรบกวนแหล่งกำเนิดหรือตัวกลาง ทำให้เกิดการถ่ายโอนพลังงานจากจุดหนึ่งไปยังอีกจุดหนึ่ง โดยที่อนุภาคของตัวกลางไม่ได้เคลื่อนที่ลอยไปพร้อมกับคลื่น แต่จะสั่นกลับไปกลับมารอบตำแหน่งสมดุล"),
            
            createH2("1. การจำแนกประเภทของคลื่น"),
            createPara("เราสามารถจำแนกคลื่นตามเกณฑ์ต่าง ๆ ได้ 3 หลักการสำคัญ ดังนี้:", { bold: true }),
            
            createPara("ก. จำแนกตามการใช้ตัวกลางในการถ่ายโอนพลังงาน:", { bold: true, color: "1E40AF" }),
            createBullet("คือ คลื่นที่ต้องอาศัยตัวกลางในการถ่ายโอนพลังงาน หากไม่มีตัวกลางจะไม่สามารถเดินทางได้ เช่น คลื่นเสียง, คลื่นน้ำ, คลื่นในเส้นเชือก", "1. คลื่นกล (Mechanical Wave)"),
            createBullet("คือ คลื่นที่ไม่ต้องอาศัยตัวกลาง สามารถเดินทางผ่านสุญญากาศได้ เช่น แสงสว่าง, คลื่นวิทยุ, ไมโครเวฟ, รังสีเอกซ์", "2. คลื่นแม่เหล็กไฟฟ้า (EM Wave)"),

            createPara("ข. จำแนกตามทิศทางการสั่นของอนุภาคตัวกลาง:", { bold: true, color: "1E40AF" }),
            createBullet("อนุภาคตัวกลางสั่นในทิศตั้งฉากกับทิศการเคลื่อนที่ของคลื่น เช่น คลื่นบนเส้นเชือก, คลื่นผิวน้ำ, แสง", "1. คลื่นตามขวาง (Transverse Wave)"),
            createBullet("อนุภาคตัวกลางสั่นในทิศขนานกับทิศการเคลื่อนที่ของคลื่น เกิดช่วงอัดและช่วงขยาย เช่น คลื่นเสียงในอากาศ", "2. คลื่นตามยาว (Longitudinal Wave)"),

            createPara("ค. จำแนกตามความต่อเนื่องในการรบกวนตัวกลาง:", { bold: true, color: "1E40AF" }),
            createBullet("เกิดจากแหล่งกำเนิดรบกวนตัวกลางในช่วงเวลาสั้น ๆ เกิดลูกคลื่นเพียง 1-2 ลูก", "1. คลื่นดล (Pulse Wave)"),
            createBullet("เกิดจากแหล่งกำเนิดรบกวนตัวกลางอย่างต่อเนื่องเป็นจังหวะสม่ำเสมอ เกิดขบวนคลื่นแผ่ออกไปหลายลูกคลื่น", "2. คลื่นต่อเนื่อง (Continuous Wave)"),

            // Section 2
            createH1("ส่วนที่ 2: การถ่ายโอนพลังงานและการเคลื่อนที่แบบฮาร์มอนิกอย่างง่าย"),
            createPara("ขณะที่คลื่นเคลื่อนที่ผ่านตัวกลาง จะทำให้อนุภาคของตัวกลางมีการเปลี่ยนแปลงตำแหน่งในแนวดิ่ง ซึ่งเป็นการเคลื่อนที่แบบฮาร์มอนิกอย่างง่าย (Simple Harmonic Motion: SHM)"),
            createPara("สมการความสัมพันธ์ระหว่างตำแหน่งแนวดิ่ง (y) กับเวลา (t):", { bold: true }),
            createPara("y = A sin(ωt)   หรือ   y = A cos(ωt)", { align: AlignmentType.CENTER, bold: true, size: 36, color: "7E22CE" }),
            createPara("เมื่อ ω = 2πf คือความถี่เชิงมุมของการสั่น (rad/s)", { align: AlignmentType.CENTER, size: 28, italics: true }),

            // Section 3
            createH1("ส่วนที่ 3: ส่วนประกอบสำคัญของคลื่น (Wave Anatomy)"),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({
                        children: ["ส่วนประกอบ", "สัญลักษณ์", "ความหมายและนิยามทางฟิสิกส์", "หน่วย SI"].map(h => new TableCell({
                            shading: { fill: "DBEAFE", type: ShadingType.CLEAR },
                            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: h, font: "TH Sarabun New", size: 32, bold: true })] })]
                        }))
                    }),
                    ...[
                        ["สันคลื่น (Crest)", "-", "ตำแหน่งสูงสุดของคลื่น (การกระจัดบวกมีค่ามากที่สุด)", "-"],
                        ["ท้องคลื่น (Trough)", "-", "ตำแหน่งต่ำสุดของคลื่น (การกระจัดลบมีค่ามากที่สุด)", "-"],
                        ["แอมพลิจูด (Amplitude)", "A", "ขนาดของการกระจัดสูงสุดวัดจากแนวสมดุล (บอกพลังงาน)", "เมตร (m)"],
                        ["ความยาวคลื่น (Wavelength)", "λ", "ระยะทางที่คลื่นเคลื่อนที่ครบ 1 รอบพอดี", "เมตร (m)"],
                        ["คาบ (Period)", "T", "เวลาที่คลื่นเคลื่อนที่ผ่านจุดใดจุดหนึ่งครบ 1 ลูกคลื่น", "วินาที (s)"],
                        ["ความถี่ (Frequency)", "f", "จำนวนลูกคลื่นที่เคลื่อนที่ผ่านจุดหนึ่งในเวลา 1 วินาที", "เฮิรตซ์ (Hz)"]
                    ].map(row => new TableRow({
                        children: row.map((cell, idx) => new TableCell({
                            children: [new Paragraph({ alignment: idx === 2 ? AlignmentType.LEFT : AlignmentType.CENTER, children: [new TextRun({ text: cell, font: "TH Sarabun New", size: 30 })] })]
                        }))
                    }))
                ]
            }),
            createPara("ความสัมพันธ์พื้นฐานระหว่างคาบและความถี่: f = 1 / T", { bold: true, color: "047857" }),

            // Section 4
            createH1("ส่วนที่ 4: อัตราเร็วของคลื่น (Wave Speed)"),
            createPara("ในตัวกลางเดียวกัน คลื่นจะเคลื่อนที่ด้วยอัตราเร็วคงที่เสมอ จากนิยามพื้นฐาน v = s / t เมื่อพิจารณาคลื่นเคลื่อนที่ครบ 1 ลูกคลื่นพอดี จะได้ s = λ และ t = T จึงได้สมการสำคัญที่สุดประจำบทเรียน:"),
            createPara("v = f λ", { align: AlignmentType.CENTER, bold: true, size: 48, color: "B45309" }),
            createPara("เมื่อ v = อัตราเร็ว (m/s), f = ความถี่ (Hz), λ = ความยาวคลื่น (m)", { align: AlignmentType.CENTER, size: 28 }),
            createPara("⭐ กฎสำคัญ: อัตราเร็วของคลื่นขึ้นอยู่กับคุณสมบัติของตัวกลางเท่านั้น หากเปลี่ยนความถี่ ความยาวคลื่นจะปรับตามเพื่อให้ v คงที่เสมอ", { bold: true, color: "DC2626" }),

            // Section 5: Problems
            createH1("ส่วนที่ 5: แบบฝึกหัดทบทวนและโจทย์คำนวณ (พร้อมเฉลยละเอียด)"),

            createH2("ข้อที่ 1"),
            createPara("โจทย์: คลื่นบนเส้นเชือกขบวนหนึ่งสั่นด้วยความถี่คงที่ อนุภาคของเชือกสั่นขึ้นลงโดยใช้เวลาครบ 1 รอบเท่ากับ 0.2 วินาที และวัดระยะห่างระหว่างสันคลื่นที่อยู่ติดกันได้ 0.8 เมตร จงหาอัตราเร็วของคลื่นบนเส้นเชือกนี้", { bold: true }),
            createBullet("จากโจทย์ ทราบคาบการสั่น T = 0.2 s และความยาวคลื่น λ = 0.8 m", "วิธีทำ:"),
            createBullet("จากสูตร v = λ / T"),
            createBullet("แทนค่า v = 0.8 / 0.2 = 4 m/s"),
            createAnswerPara("อัตราเร็วของคลื่นบนเส้นเชือกมีค่าเท่ากับ 4 เมตร/วินาที"),

            createH2("ข้อที่ 2"),
            createPara("โจทย์: ในการสะบัดเส้นเชือกยาวเพื่อให้เกิดคลื่นต่อเนื่อง พบว่าเมื่อเวลาผ่านไป 0.5 วินาที เกิดคลื่นเคลื่อนที่ไปได้จำนวน 2.5 ลูกคลื่นพอดี และวัดความยาวคลื่นได้ 20 เซนติเมตร จงหาอัตราเร็วของคลื่นนี้", { bold: true }),
            createBullet("หาคาบ T = เวลา / จำนวนรอบ = 0.5 / 2.5 = 0.2 s", "วิธีทำ:"),
            createBullet("ทราบความยาวคลื่น λ = 20 cm = 0.2 m"),
            createBullet("จากสูตร v = λ / T = 0.2 / 0.2 = 1 m/s"),
            createAnswerPara("อัตราเร็วของคลื่นบนเส้นเชือกนี้คือ 1 เมตร/วินาที"),

            createH2("ข้อที่ 3"),
            createPara("โจทย์: คลื่นขบวนหนึ่งกำลังเคลื่อนที่ผ่านตัวกลางด้วยความเร็ว 20 เมตร/วินาที โดยอนุภาคของตัวกลางมีความถี่ในการสั่น 50 เฮิรตซ์ จงหาความยาวคลื่นของคลื่นขบวนนี้", { bold: true }),
            createBullet("จากโจทย์ v = 20 m/s และ f = 50 Hz", "วิธีทำ:"),
            createBullet("จากสมการ v = f λ จะได้ λ = v / f"),
            createBullet("แทนค่า λ = 20 / 50 = 0.4 m"),
            createAnswerPara("ความยาวคลื่นมีค่าเท่ากับ 0.4 เมตร"),

            createH2("ข้อที่ 4"),
            createPara("โจทย์: แหล่งกำเนิดคลื่นผิวน้ำสั่นด้วยความถี่ 20 รอบ/วินาที พบว่าสันคลื่นน้ำ 5 สันติดต่อกันอยู่ห่างกันเป็นระยะ 20 เซนติเมตร จงหาอัตราเร็วของคลื่นผิวน้ำนี้", { bold: true }),
            createBullet("ความถี่ f = 20 Hz", "วิธีทำ:"),
            createBullet("สันคลื่น 5 สันติดต่อกัน จะมีช่วงคลื่นทั้งหมด = 5 - 1 = 4 ช่วงคลื่น (4λ)"),
            createBullet("จะได้ 4λ = 20 cm ดังนั้น λ = 5 cm = 0.05 m"),
            createBullet("หาอัตราเร็วจาก v = f λ = 20 * 0.05 = 1 m/s"),
            createAnswerPara("อัตราเร็วของคลื่นผิวน้ำเท่ากับ 1 เมตร/วินาที"),

            createH2("ข้อที่ 5"),
            createPara("โจทย์: ชะม้อยยืนอยู่ริมตลิ่ง สังเกตเห็นคลื่นผิวน้ำจำนวน 20 ลูกคลื่น ในเวลา 10 วินาที และทราบว่าอัตราเร็วคลื่นเท่ากับ 10 เมตร/วินาที อยากทราบว่าสันคลื่นสองสันที่อยู่ติดกันห่างกันเท่าใด", { bold: true }),
            createBullet("สันคลื่นที่อยู่ติดกันห่างกัน หมายถึงหาค่าความยาวคลื่น (λ)", "วิธีทำ:"),
            createBullet("หาความถี่จาก f = จำนวนลูกคลื่น / เวลา = 20 / 10 = 2 Hz"),
            createBullet("จากสูตร λ = v / f = 10 / 2 = 5 m"),
            createAnswerPara("สันคลื่นที่อยู่ติดกันห่างกันระยะ 5 เมตร"),

            createH2("ข้อที่ 6"),
            createPara("โจทย์: เมื่อโยนก้อนหินลงน้ำ ทำให้เกิดคลื่นผิวน้ำ 3 ลูกแล่นตามกันมา หากตำแหน่งที่ก้อนหินตกห่างจากฝั่งไป 10 เมตร พบว่าคลื่นลูกแรกมาถึงฝั่งใช้เวลา 5.0 วินาที และลูกถัดไปมาถึงเมื่อเวลา 5.5 และ 6.0 วินาทีตามลำดับ จงหาความยาวคลื่น", { bold: true }),
            createBullet("หาคาบ T จากผลต่างเวลาของลูกคลื่นติดกัน: T = 5.5 - 5.0 = 0.5 s", "วิธีทำ:"),
            createBullet("หาอัตราเร็วคลื่น: v = s / t = 10 / 5.0 = 2 m/s"),
            createBullet("หาความยาวคลื่นจาก λ = v T = 2 * 0.5 = 1 m"),
            createAnswerPara("ความยาวคลื่นผิวน้ำมีค่าเท่ากับ 1 เมตร"),

            createH2("ข้อที่ 7"),
            createPara("โจทย์: คลื่นขบวนหนึ่งเมื่อเวลา t = 0 s มีสันคลื่นอยู่ที่ตำแหน่ง x = 2 m ต่อมาเมื่อเวลาผ่านไป t = 20 s สันคลื่นลูกเดิมเคลื่อนที่ไปอยู่ที่ตำแหน่ง x = 62 m จงหาความเร็วในการแผ่ของคลื่นนี้", { bold: true }),
            createBullet("หาระยะทางที่คลื่นเคลื่อนที่ได้ Δs = 62 - 2 = 60 m", "วิธีทำ:"),
            createBullet("ช่วงเวลาที่ใช้ Δt = 20 s"),
            createBullet("ความเร็วคลื่น v = Δs / Δt = 60 / 20 = 3 m/s"),
            createAnswerPara("ความเร็วของคลื่นมีค่าเท่ากับ 3 เมตร/วินาที"),

            createH2("ข้อที่ 8"),
            createPara("โจทย์: คลื่นในเส้นเชือกยาวขบวนหนึ่งมีความยาวคลื่น λ = 1.5 เมตร สังเกตพบว่าเมื่อเวลาผ่านไป 2.0 วินาที รูปร่างคลื่นเคลื่อนที่กลับมามีลักษณะเหมือนเดิมทุกประการเป็นครั้งแรกพอดี จงหาอัตราเร็วที่น้อยที่สุดของคลื่นนี้", { bold: true }),
            createBullet("การที่รูปร่างคลื่นเคลื่อนที่กลับมาเหมือนเดิมทุกประการเป็นครั้งแรก แสดงว่าคลื่นเคลื่อนที่ครบ 1 คาบพอดี (T = 2.0 s)", "วิธีทำ:"),
            createBullet("จากสูตร v = λ / T = 1.5 / 2.0 = 0.75 m/s"),
            createAnswerPara("อัตราเร็วที่น้อยที่สุดของคลื่นคือ 0.75 เมตร/วินาที"),

            createH2("ข้อที่ 9"),
            createPara("โจทย์: ลูกเสือกลุ่มหนึ่งทำการสะบัดสะพานเชือกที่เพิ่งเดินข้ามมา และสังเกตเห็นว่าสันคลื่นแต่ละสันอยู่ห่างกัน 8.00 เมตร หากพวกเขาทำการสะบัดสะพานด้วยอัตรา 2 ครั้งต่อวินาที อัตราเร็วในการแผ่ของคลื่นบนสะพานเชือกเป็นเท่าใด", { bold: true }),
            createBullet("สันคลื่นอยู่ห่างกัน 8.00 m ดังนั้น λ = 8.00 m", "วิธีทำ:"),
            createBullet("สะบัด 2 ครั้งต่อวินาที ดังนั้น f = 2.0 Hz"),
            createBullet("จากสูตร v = f λ = 2.0 * 8.00 = 16.0 m/s"),
            createAnswerPara("อัตราเร็วคลื่นบนสะพานเชือกมีค่าเท่ากับ 16.0 เมตร/วินาที"),

            createH2("ข้อที่ 10"),
            createPara("โจทย์: จงหาความยาวคลื่นของคลื่นแผ่นดินไหวขบวนหนึ่ง ที่สั่นสะเทือนด้วยความถี่ 10.0 เฮิรตซ์ และเดินทางไปถึงเมืองอีกแห่งหนึ่งซึ่งอยู่ห่างออกไป 84 กิโลเมตร โดยใช้เวลาทั้งสิ้น 12.0 วินาที", { bold: true }),
            createBullet("ระยะทาง s = 84 km = 84,000 m ในเวลา t = 12.0 s", "วิธีทำ:"),
            createBullet("หาอัตราเร็วคลื่น v = s / t = 84,000 / 12.0 = 7,000 m/s"),
            createBullet("จากสูตร λ = v / f = 7,000 / 10.0 = 700 m"),
            createAnswerPara("ความยาวคลื่นแผ่นดินไหวมีค่าเท่ากับ 700 เมตร (หรือ 0.7 กิโลเมตร)")
        ]
    }]
});

Packer.toBuffer(doc).then((buffer) => {
    const outPath = path.join(__dirname, 'physics_wave_lesson.docx');
    const brainOutPath = 'C:\\Users\\vones\\.gemini\\antigravity-cli\\brain\\6a22eccb-fbad-42ee-a412-d4594c3a8cb1\\physics_wave_lesson.docx';
    fs.writeFileSync(outPath, buffer);
    try {
        fs.writeFileSync(brainOutPath, buffer);
    } catch(e) {}
    console.log("Successfully generated physics_wave_lesson.docx");
});
