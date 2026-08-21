/**
 * Main App Script - Live Cloud Database & Local Sync Service
 */

const DB_EXAMS = 'ems_exams';
const DB_RESULTS = 'ems_results';

function getApiBase() {
    return (window.location.hostname === 'localhost' && window.location.port === '3000') 
        ? 'http://localhost:4000' 
        : '';
}

class ExamService {
    // --- Live Cloud Fetch & Cache ---
    static async fetchLiveExams() {
        try {
            const res = await fetch(`${getApiBase()}/api/exams`);
            if (res.ok) {
                const data = await res.json();
                if (data.success && Array.isArray(data.exams)) {
                    localStorage.setItem(DB_EXAMS, JSON.stringify(data.exams));
                    return data.exams;
                }
            }
        } catch (e) {
            console.warn('Live API fetch fallback to local cache:', e);
        }
        return this.getExams();
    }

    static getExams() {
        const data = localStorage.getItem(DB_EXAMS);
        if (!data || data === '[]') {
            return [];
        }
        try {
            return JSON.parse(data);
        } catch {
            return [];
        }
    }

    static async saveExam(exam) {
        const exams = this.getExams();
        const index = exams.findIndex(e => e.id === exam.id);
        if (index > -1) {
            exams[index] = exam;
        } else {
            exams.push(exam);
        }
        localStorage.setItem(DB_EXAMS, JSON.stringify(exams));

        // Sync with Cloud Database
        try {
            await fetch(`${getApiBase()}/api/exams`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(exam)
            });
        } catch (e) {
            console.warn('Could not sync exam to live database:', e);
        }
    }

    static async deleteExam(examId) {
        let exams = this.getExams();
        exams = exams.filter(e => e.id !== examId);
        localStorage.setItem(DB_EXAMS, JSON.stringify(exams));

        // Sync deletion with Cloud Database
        try {
            await fetch(`${getApiBase()}/api/exams/${examId}`, {
                method: 'DELETE'
            });
        } catch (e) {
            console.warn('Could not sync exam deletion to live database:', e);
        }
    }

    static getExamById(id) {
        const exams = this.getExams();
        return exams.find(e => e.id === id);
    }

    // --- Results Sync ---
    static async fetchLiveResults() {
        try {
            const res = await fetch(`${getApiBase()}/api/results`);
            if (res.ok) {
                const data = await res.json();
                if (data.success && Array.isArray(data.results)) {
                    localStorage.setItem(DB_RESULTS, JSON.stringify(data.results));
                    return data.results;
                }
            }
        } catch (e) {
            console.warn('Live results fallback to local cache:', e);
        }
        return this.getResults();
    }

    static async submitResult(result) {
        const results = this.getResults();
        results.push(result);
        localStorage.setItem(DB_RESULTS, JSON.stringify(results));

        // Sync with Cloud Database
        try {
            await fetch(`${getApiBase()}/api/results`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(result)
            });
        } catch (e) {
            console.warn('Could not sync result to live database:', e);
        }
    }

    static getResults() {
        const data = localStorage.getItem(DB_RESULTS);
        return data ? JSON.parse(data) : [];
    }

    static getStudentResults(studentId) {
        return this.getResults().filter(r => r.studentId === studentId);
    }

    static generateId() {
        return 'exam_' + Math.random().toString(36).substr(2, 9);
    }
}

window.ExamService = ExamService;

// Auto-sync on page load
if (typeof window !== 'undefined') {
    ExamService.fetchLiveExams().catch(() => {});
    ExamService.fetchLiveResults().catch(() => {});
}

console.log('ExamiNation App Initialized with Cloud Database Sync');
