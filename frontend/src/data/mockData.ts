// Mock data for all dashboards

export const mockPatients = [
  { id: "P001", name: "Sarah Johnson", age: 34, gender: "Female", condition: "Diabetes Type 2", riskLevel: "High", lastVisit: "2024-01-15", doctor: "Dr. Patel", status: "Active", bloodType: "A+", phone: "+1-555-0101" },
  { id: "P002", name: "Michael Chen", age: 45, gender: "Male", condition: "Hypertension", riskLevel: "Medium", lastVisit: "2024-01-14", doctor: "Dr. Smith", status: "Active", bloodType: "O-", phone: "+1-555-0102" },
  { id: "P003", name: "Emily Rodriguez", age: 28, gender: "Female", condition: "Anxiety", riskLevel: "Low", lastVisit: "2024-01-13", doctor: "Dr. Patel", status: "Active", bloodType: "B+", phone: "+1-555-0103" },
  { id: "P004", name: "James Wilson", age: 62, gender: "Male", condition: "Heart Disease", riskLevel: "Critical", lastVisit: "2024-01-12", doctor: "Dr. Brown", status: "Critical", bloodType: "AB+", phone: "+1-555-0104" },
  { id: "P005", name: "Aisha Patel", age: 38, gender: "Female", condition: "Asthma", riskLevel: "Medium", lastVisit: "2024-01-11", doctor: "Dr. Smith", status: "Active", bloodType: "O+", phone: "+1-555-0105" },
  { id: "P006", name: "Robert Kim", age: 55, gender: "Male", condition: "COPD", riskLevel: "High", lastVisit: "2024-01-10", doctor: "Dr. Brown", status: "Active", bloodType: "A-", phone: "+1-555-0106" },
];

export const mockDoctors = [
  { id: "D001", name: "Dr. Raj Patel", specialty: "Cardiology", patients: 48, rating: 4.9, experience: 15, status: "Active", consultations: 234, avatar: null },
  { id: "D002", name: "Dr. Lisa Smith", specialty: "Neurology", patients: 36, rating: 4.7, experience: 12, status: "Active", consultations: 189, avatar: null },
  { id: "D003", name: "Dr. James Brown", specialty: "Oncology", patients: 52, rating: 4.8, experience: 20, status: "Active", consultations: 312, avatar: null },
  { id: "D004", name: "Dr. Maria Garcia", specialty: "Pediatrics", patients: 65, rating: 4.9, experience: 10, status: "Active", consultations: 456, avatar: null },
  { id: "D005", name: "Dr. Chen Wei", specialty: "Endocrinology", patients: 41, rating: 4.6, experience: 8, status: "On Leave", consultations: 178, avatar: null },
];

export const mockHealthMetrics = [
  { date: "Jan", heartRate: 72, bloodPressure: 120, glucose: 95, weight: 68 },
  { date: "Feb", heartRate: 74, bloodPressure: 118, glucose: 98, weight: 67.5 },
  { date: "Mar", heartRate: 71, bloodPressure: 122, glucose: 92, weight: 67 },
  { date: "Apr", heartRate: 73, bloodPressure: 119, glucose: 96, weight: 66.8 },
  { date: "May", heartRate: 70, bloodPressure: 116, glucose: 90, weight: 66.5 },
  { date: "Jun", heartRate: 72, bloodPressure: 121, glucose: 94, weight: 66 },
  { date: "Jul", heartRate: 75, bloodPressure: 123, glucose: 97, weight: 65.8 },
];

export const mockPredictions = [
  { id: 1, disease: "Diabetes", probability: 0.72, risk: "High", date: "2024-01-15", model: "XGBoost v3.2", confidence: 94 },
  { id: 2, disease: "Hypertension", probability: 0.45, risk: "Medium", date: "2024-01-10", model: "Neural Net v2.1", confidence: 87 },
  { id: 3, disease: "Heart Disease", probability: 0.28, risk: "Low", date: "2024-01-05", model: "Random Forest v4.0", confidence: 91 },
  { id: 4, disease: "Kidney Disease", probability: 0.15, risk: "Low", date: "2023-12-28", model: "SVM v1.5", confidence: 89 },
];

export const mockReports = [
  { id: 1, name: "Blood Panel Q4 2023", date: "2023-12-15", type: "Lab Report", status: "Analyzed", doctor: "Dr. Patel", size: "2.4 MB" },
  { id: 2, name: "Chest X-Ray", date: "2024-01-03", type: "Radiology", status: "Pending", doctor: "Dr. Smith", size: "8.1 MB" },
  { id: 3, name: "ECG Report", date: "2024-01-10", type: "Cardiology", status: "Analyzed", doctor: "Dr. Brown", size: "1.2 MB" },
  { id: 4, name: "MRI Scan Brain", date: "2024-01-12", type: "Radiology", status: "Analyzed", doctor: "Dr. Garcia", size: "45 MB" },
];

export const mockNotifications = [
  { id: 1, type: "alert", message: "High risk prediction for Patient P004", time: "5 min ago", read: false },
  { id: 2, type: "info", message: "New lab report uploaded by Dr. Patel", time: "1 hour ago", read: false },
  { id: 3, type: "success", message: "Appointment confirmed for tomorrow", time: "2 hours ago", read: true },
  { id: 4, type: "warning", message: "Medication reminder: Take evening dose", time: "3 hours ago", read: true },
  { id: 5, type: "info", message: "Monthly health summary is ready", time: "1 day ago", read: true },
];

export const mockActivities = [
  { id: 1, action: "Prediction generated", description: "Diabetes risk analysis completed", time: "10 min ago", icon: "brain" },
  { id: 2, action: "Report uploaded", description: "Blood test results analyzed", time: "1 hour ago", icon: "file" },
  { id: 3, action: "Consultation scheduled", description: "Appointment with Dr. Patel", time: "2 hours ago", icon: "calendar" },
  { id: 4, action: "Medication updated", description: "Metformin dosage adjusted", time: "3 hours ago", icon: "pill" },
  { id: 5, action: "Health score updated", description: "Score improved to 78/100", time: "1 day ago", icon: "heart" },
];

export const mockDiseaseStats = [
  { name: "Diabetes", count: 234, change: 12, trend: "up" },
  { name: "Hypertension", count: 189, change: -5, trend: "down" },
  { name: "Heart Disease", count: 145, change: 8, trend: "up" },
  { name: "Asthma", count: 98, change: 3, trend: "up" },
  { name: "Cancer", count: 67, change: -2, trend: "down" },
  { name: "COPD", count: 54, change: 1, trend: "up" },
];

export const mockMonthlyData = [
  { month: "Jan", patients: 120, predictions: 89, reports: 45 },
  { month: "Feb", patients: 145, predictions: 112, reports: 67 },
  { month: "Mar", patients: 132, predictions: 98, reports: 54 },
  { month: "Apr", patients: 168, predictions: 134, reports: 78 },
  { month: "May", patients: 189, predictions: 156, reports: 92 },
  { month: "Jun", patients: 201, predictions: 178, reports: 103 },
  { month: "Jul", patients: 178, predictions: 145, reports: 88 },
];

export const mockAyurvedaData = {
  prakriti: { vata: 35, pitta: 40, kapha: 25 },
  recommendations: {
    diet: ["Warm, cooked foods", "Avoid cold drinks", "Increase ginger and turmeric", "Sesame seeds daily"],
    yoga: ["Surya Namaskar", "Pranayama", "Bhujangasana", "Shavasana"],
    herbs: ["Ashwagandha", "Triphala", "Brahmi", "Tulsi"],
  },
};

export const mockAppointments = [
  { id: 1, patient: "Sarah Johnson", doctor: "Dr. Patel", date: "2024-01-20", time: "10:00 AM", type: "Follow-up", status: "Confirmed" },
  { id: 2, patient: "Michael Chen", doctor: "Dr. Smith", date: "2024-01-20", time: "11:30 AM", type: "Initial", status: "Confirmed" },
  { id: 3, patient: "Emily Rodriguez", doctor: "Dr. Patel", date: "2024-01-20", time: "2:00 PM", type: "Check-up", status: "Pending" },
  { id: 4, patient: "James Wilson", doctor: "Dr. Brown", date: "2024-01-21", time: "9:00 AM", type: "Urgent", status: "Confirmed" },
  { id: 5, patient: "Aisha Patel", doctor: "Dr. Garcia", date: "2024-01-21", time: "3:30 PM", type: "Follow-up", status: "Cancelled" },
];

export const mockSystemLogs = [
  { id: 1, level: "INFO", message: "User admin@mediguard.ai logged in", timestamp: "2024-01-15 14:23:01", service: "Auth" },
  { id: 2, level: "WARNING", message: "High CPU usage detected on ML server", timestamp: "2024-01-15 14:20:15", service: "MLOps" },
  { id: 3, level: "ERROR", message: "Failed to process report P004-ECG.pdf", timestamp: "2024-01-15 14:18:43", service: "OCR" },
  { id: 4, level: "INFO", message: "Model v3.2 deployed successfully", timestamp: "2024-01-15 14:15:00", service: "MLOps" },
  { id: 5, level: "INFO", message: "Batch prediction completed: 45 patients", timestamp: "2024-01-15 14:10:32", service: "Prediction" },
];

export const mockMLModels = [
  { id: 1, name: "DiabetesNet v3.2", accuracy: 94.2, status: "Production", predictions: 1247, lastUpdated: "2024-01-10" },
  { id: 2, name: "CardioRisk v2.1", accuracy: 91.8, status: "Production", predictions: 892, lastUpdated: "2024-01-08" },
  { id: 3, name: "LungCancer v1.5", accuracy: 88.9, status: "Staging", predictions: 0, lastUpdated: "2024-01-14" },
  { id: 4, name: "HyperPredict v4.0", accuracy: 93.1, status: "Production", predictions: 634, lastUpdated: "2024-01-05" },
];

export const mockFamilyMembers = [
  { id: 1, name: "John Johnson", relation: "Father", age: 62, conditions: ["Diabetes", "Hypertension"], riskScore: 78 },
  { id: 2, name: "Mary Johnson", relation: "Mother", age: 58, conditions: ["Arthritis"], riskScore: 45 },
  { id: 3, name: "Tom Johnson", relation: "Brother", age: 32, conditions: [], riskScore: 22 },
];

export const mockTimeline = [
  { id: 1, date: "2024-01-15", type: "prediction", title: "Diabetes Risk Assessment", description: "High risk detected - 72% probability", severity: "high" },
  { id: 2, date: "2024-01-10", type: "report", title: "Blood Panel Results", description: "HbA1c: 7.2%, Glucose: 145 mg/dL", severity: "medium" },
  { id: 3, date: "2024-01-05", type: "appointment", title: "Consultation with Dr. Patel", description: "Follow-up on medication adjustment", severity: "low" },
  { id: 4, date: "2023-12-28", type: "report", title: "Kidney Function Test", description: "All values within normal range", severity: "low" },
  { id: 5, date: "2023-12-15", type: "medication", title: "Medication Change", description: "Metformin increased to 1000mg twice daily", severity: "medium" },
];

export const MOCK_PATIENTS = [
  {
    id: "pat_001",
    name: "Eleanor Vance",
    age: 58,
    gender: "Female",
    bloodGroup: "A+",
    phone: "+1 (555) 234-5678",
    email: "eleanor.vance@example.com",
    primaryCondition: "Hypertension & Stage 1 Prediabetes",
    prakriti: "Pitta-Kapha",
    riskScore: 68,
    riskLevel: "Moderate",
    lastVisit: "2026-07-20",
    nextAppointment: "2026-08-05",
  },
  {
    id: "pat_002",
    name: "Marcus Thorne",
    age: 64,
    gender: "Male",
    bloodGroup: "O+",
    phone: "+1 (555) 876-5432",
    email: "marcus.thorne@example.com",
    primaryCondition: "Coronary Artery Risk",
    prakriti: "Vata-Pitta",
    riskScore: 84,
    riskLevel: "High",
    lastVisit: "2026-07-22",
    nextAppointment: "2026-07-29",
  },
  {
    id: "pat_003",
    name: "Aria Montgomery",
    age: 32,
    gender: "Female",
    bloodGroup: "B+",
    phone: "+1 (555) 432-1098",
    email: "aria.m@example.com",
    primaryCondition: "Routine Preventive Care",
    prakriti: "Kapha",
    riskScore: 18,
    riskLevel: "Low",
    lastVisit: "2026-06-15",
    nextAppointment: "2026-12-15",
  },
];

export const MOCK_DISEASE_TRENDS = [
  { month: "Jan", diabetes: 120, cardiovascular: 98, respiratory: 75, renal: 40 },
  { month: "Feb", diabetes: 135, cardiovascular: 105, respiratory: 88, renal: 42 },
  { month: "Mar", diabetes: 140, cardiovascular: 110, respiratory: 95, renal: 45 },
  { month: "Apr", diabetes: 130, cardiovascular: 102, respiratory: 70, renal: 41 },
  { month: "May", diabetes: 155, cardiovascular: 120, respiratory: 62, renal: 50 },
  { month: "Jun", diabetes: 170, cardiovascular: 135, respiratory: 58, renal: 52 },
  { month: "Jul", diabetes: 185, cardiovascular: 142, respiratory: 65, renal: 55 },
];

export const MOCK_ML_OPS_METRICS = {
  modelName: "MediGuard-HealthX-v4.2",
  deployedAt: "2026-07-01",
  f1Score: 0.964,
  precision: 0.971,
  recall: 0.958,
  aucRoc: 0.989,
  avgInferenceMs: 128,
  gpuUtilization: 42,
  memoryUsageGB: "14.2 / 32 GB",
  recentTrainingLoss: [
    { epoch: 1, loss: 0.42, valLoss: 0.45 },
    { epoch: 5, loss: 0.28, valLoss: 0.31 },
    { epoch: 10, loss: 0.18, valLoss: 0.20 },
    { epoch: 15, loss: 0.11, valLoss: 0.13 },
    { epoch: 20, loss: 0.07, valLoss: 0.09 },
  ],
};

export const MOCK_PRAKRITI_QUIZ = [
  {
    id: 1,
    question: "How would you describe your body frame and weight tendency?",
    options: [
      { text: "Light, thin frame; difficulty gaining weight", dosha: "Vata" },
      { text: "Medium athletic build; moderate weight gain/loss easily", dosha: "Pitta" },
      { text: "Large solid frame; gains weight easily, difficult to lose", dosha: "Kapha" },
    ],
  },
  {
    id: 2,
    question: "Which pattern best describes your skin type?",
    options: [
      { text: "Dry, rough, thin skin prone to cold feeling", dosha: "Vata" },
      { text: "Warm, reddish, sensitive, prone to freckles or acne", dosha: "Pitta" },
      { text: "Smooth, oily, thick, cool, supple skin", dosha: "Kapha" },
    ],
  },
  {
    id: 3,
    question: "What is your typical appetite and digestion pattern?",
    options: [
      { text: "Irregular appetite; prone to gas, bloating, constipation", dosha: "Vata" },
      { text: "Strong intense appetite; gets irritable if meals are delayed", dosha: "Pitta" },
      { text: "Slow steady digestion; can easily skip meals without discomfort", dosha: "Kapha" },
    ],
  },
];

export const MOCK_FAMILY_CLUSTER = {
  patientName: "Eleanor Vance",
  relatives: [
    { relation: "Father (deceased at 72)", conditions: ["Type 2 Diabetes", "Ischemic Heart Disease"], riskImpact: "High genetic predisposition" },
    { relation: "Mother (81)", conditions: ["Hypertension", "Osteoarthritis"], riskImpact: "Moderate vascular risk" },
    { relation: "Brother (54)", conditions: ["Hyperlipidemia"], riskImpact: "Monitored lipid marker" },
    { relation: "Daughter (28)", conditions: ["None reported"], riskImpact: "Low baseline risk" },
  ],
};

export const MOCK_SYSTEM_LOGS = [
  { id: "log_1", timestamp: "2026-07-25 07:32:10", level: "INFO", message: "Gemini inference completed for diabetes risk calculator (124ms)", user: "doc_101" },
  { id: "log_2", timestamp: "2026-07-25 07:28:44", level: "INFO", message: "OCR lab parsing executed for Lab_Report_CMP_2026.pdf", user: "pat_001" },
  { id: "log_3", timestamp: "2026-07-25 07:15:02", level: "SUCCESS", message: "Model checkpoint MediGuard-HealthX-v4.2 health check passed", user: "system" },
  { id: "log_4", timestamp: "2026-07-25 06:50:11", level: "WARN", message: "High latency spike detected on node us-east-1a", user: "monitor" },
];
