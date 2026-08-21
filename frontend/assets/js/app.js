/**
 * Main App Script
 * Shared utilities and Data Service.
 */

const DB_EXAMS = 'ems_exams';
const DB_RESULTS = 'ems_results';

class ExamService {
    // --- Exams ---
    static getExams() {
        const data = localStorage.getItem(DB_EXAMS);
        if (!data || data === '[]') {
            const seedExams = [
                {
                    id: "exam_demo_01",
                    title: "Mid-Term Programming Assessment",
                    year: "All",
                    branch: ["All"],
                    batch: ["2022-2026", "2023-2027", "2024-2028", "2025-2029"],
                    subject: "Data Structures & Algorithms",
                    duration: 60,
                    attemptLimit: -1,
                    status: "published",
                    createdAt: Date.now() - 3600000,
                    questions: [
                        {
                            id: "q_demo_1",
                            type: "coding",
                            text: "Write a program to calculate the sum of two integers A and B provided via standard input.",
                            constraints: ["-1000 <= A, B <= 1000"],
                            testIn: "10 20",
                            testOut: "30",
                            hiddenCases: [
                                { input: "5 5", output: "10" },
                                { input: "-1 1", output: "0" },
                                { input: "100 -50", output: "50" }
                            ]
                        },
                        {
                            id: "q_demo_2",
                            type: "coding",
                            text: "Write a program to check if a given integer N is Even or Odd. Output 'Even' if it is even, and 'Odd' if it is odd.",
                            constraints: ["-10000 <= N <= 10000"],
                            testIn: "4",
                            testOut: "Even",
                            hiddenCases: [
                                { input: "7", output: "Odd" },
                                { input: "0", output: "Even" },
                                { input: "-3", output: "Odd" }
                            ]
                        },
                        {
                            id: "q_demo_3",
                            type: "mcq",
                            text: "What is the time complexity of searching in a balanced Binary Search Tree (BST)?",
                            options: ["O(1)", "O(log N)", "O(N)", "O(N log N)"],
                            correct: "1"
                        }
                    ]
                },
                {
                    id: "exam_survey_demo_01",
                    title: "Campus Experience & Academic Feedback Survey",
                    year: "All",
                    branch: ["All"],
                    batch: ["2022-2026", "2023-2027", "2024-2028", "2025-2029"],
                    subject: "Student Feedback",
                    duration: 30,
                    attemptLimit: 1,
                    examType: "survey",
                    isSurvey: true,
                    analysisKeywords: ["Depression", "Active Engagement", "Academic Stress", "Campus Satisfaction"],
                    analysisNotes: "Evaluate mental wellness and laboratory feedback across student batches.",
                    analysisRequired: {
                        keywords: ["Depression", "Active Engagement", "Academic Stress", "Campus Satisfaction"],
                        notes: "Evaluate mental wellness and laboratory feedback across student batches."
                    },
                    status: "published",
                    createdAt: Date.now() - 1800000,
                    questions: [
                        {
                            id: "sq_1",
                            type: "mcq",
                            text: "How would you rate the overall quality of campus laboratory facilities?",
                            options: ["Excellent", "Very Good", "Good", "Needs Improvement"]
                        },
                        {
                            id: "sq_2",
                            type: "multi_select",
                            text: "Which technical workshops or bootcamps would you like the university to organize this semester?",
                            options: ["Full Stack Web Development", "AI & Machine Learning", "Cloud Computing & DevOps", "Cybersecurity & Ethical Hacking", "Mobile App Development"]
                        },
                        {
                            id: "sq_3",
                            type: "text",
                            text: "Please share any additional suggestions or improvements for library resources and study spaces.",
                            options: []
                        }
                    ]
                }
            ];
            localStorage.setItem(DB_EXAMS, JSON.stringify(seedExams));
            return seedExams;
        }
        try {
            return JSON.parse(data);
        } catch {
            return [];
        }
    }

    static saveExam(exam) {
        const exams = this.getExams();
        // Check if update or new
        const index = exams.findIndex(e => e.id === exam.id);
        if (index > -1) {
            exams[index] = exam;
        } else {
            exams.push(exam);
        }
        localStorage.setItem(DB_EXAMS, JSON.stringify(exams));
    }

    static getExamById(id) {
        const exams = this.getExams();
        return exams.find(e => e.id === id);
    }

    // --- Results ---
    static submitResult(result) {
        const results = this.getResults();
        results.push(result);
        localStorage.setItem(DB_RESULTS, JSON.stringify(results));
    }

    static getResults() {
        const data = localStorage.getItem(DB_RESULTS);
        return data ? JSON.parse(data) : [];
    }

    static getStudentResults(studentId) {
        return this.getResults().filter(r => r.studentId === studentId);
    }

    // --- Helpers ---
    static generateId() {
        return 'exam_' + Math.random().toString(36).substr(2, 9);
    }
}

window.ExamService = ExamService;

console.log('ExamiNation App Initialized');
