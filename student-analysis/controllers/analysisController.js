const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const Chart = require('chart.js/auto');
const ChartDataLabels = require('chartjs-plugin-datalabels');

// Register the plugin
Chart.register(ChartDataLabels);

// Create a chart configuration function
const createChart = (width = 600, height = 300) => {
    return new ChartJsImage();
};

class AnalysisController {
    getHomePage(req, res) {
        res.render('index');
    }

    async uploadFile(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(req.file.buffer);
            
            const worksheet = workbook.worksheets[0];
            const data = [];
            
            // Get headers from the first row
            const headers = [];
            worksheet.getRow(1).eachCell((cell, colNumber) => {
                headers[colNumber] = cell.value;
            });
            
            // Get data from remaining rows
            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber > 1) { // Skip header row
                    const rowData = {};
                    row.eachCell((cell, colNumber) => {
                        rowData[headers[colNumber]] = cell.value;
                    });
                    data.push(rowData);
                }
            });

            // Get unique subjects
            const subjects = [...new Set(data.map(row => row['Sub Name']))];
            
            // Return both subjects and data
            res.json({ subjects, data });
        } catch (error) {
            console.error('Upload error:', error);
            res.status(500).json({ error: 'Error processing file' });
        }
    }

    getStats(req, res) {
        try {
            const { subject_name, data } = req.body;
            
            if (!data || !Array.isArray(data)) {
                return res.status(400).json({ 
                    error: 'Invalid Data',
                    message: 'No data provided or data is not in correct format. Please upload a file first.' 
                });
            }

            if (!subject_name) {
                return res.status(400).json({ 
                    error: 'Invalid Subject',
                    message: 'Subject name is required' 
                });
            }

            const subjectData = data.filter(row => row['Sub Name'] === subject_name);
            
            if (subjectData.length === 0) {
                return res.status(404).json({ 
                    error: 'No Data Found',
                    message: 'No data found for the selected subject.' 
                });
            }

            // Calculate basic statistics
            const totalStudents = subjectData.length;
            const passStudents = subjectData.filter(row => row['Status'] === 'PASS').length;
            const failStudents = totalStudents - passStudents;
            
            const passPercentage = (passStudents / totalStudents) * 100;
            const failPercentage = (failStudents / totalStudents) * 100;

            // Calculate marks statistics
            const marks = subjectData.map(s => {
                const total = parseFloat(s['Total']);
                if (isNaN(total)) {
                    throw new Error(`Invalid mark value found for student ${s['Roll No']}`);
                }
                return total;
            });

            const averageMark = marks.reduce((a, b) => a + b, 0) / totalStudents;
            const highestMark = Math.max(...marks);
            const lowestMark = Math.min(...marks);

            // Get students with highest and lowest marks
            const highestStudents = subjectData.filter(s => parseFloat(s['Total']) === highestMark);
            const lowestStudents = subjectData.filter(s => parseFloat(s['Total']) === lowestMark);

            // Get grade distribution
            const gradeCount = subjectData.reduce((acc, curr) => {
                const grade = curr['Grade'];
                if (!grade) {
                    throw new Error(`Missing grade for student ${curr['Roll No']}`);
                }
                acc[grade] = (acc[grade] || 0) + 1;
                return acc;
            }, {});

            // Sort grades in descending order
            const sortedGrades = Object.entries(gradeCount).sort((a, b) => {
                const gradeOrder = { 'O': 7, 'A+': 6, 'A': 5, 'B+': 4, 'B': 3, 'C': 2, 'F': 1 };
                return gradeOrder[b[0]] - gradeOrder[a[0]];
            });

            // Calculate marks distribution
            const marksRanges = {
                '91-100': marks.filter(m => m >= 91 && m <= 100).length,
                '81-90': marks.filter(m => m >= 81 && m < 91).length,
                '71-80': marks.filter(m => m >= 71 && m < 81).length,
                '61-70': marks.filter(m => m >= 61 && m < 71).length,
                '51-60': marks.filter(m => m >= 51 && m < 61).length,
                '41-50': marks.filter(m => m >= 41 && m < 51).length,
                '0-40': marks.filter(m => m >= 0 && m < 41).length
            };

            res.json({
                subject_name,
                total_students: totalStudents,
                pass_percentage: passPercentage,
                fail_percentage: failPercentage,
                num_students_pass: passStudents,
                num_students_fail: failStudents,
                average_mark: averageMark.toFixed(2),
                highest_mark: highestMark,
                lowest_mark: lowestMark,
                highest_students: highestStudents.map(s => ({
                    roll_no: s['Roll No'],
                    marks: s['Total'],
                    grade: s['Grade']
                })),
                lowest_students: lowestStudents.map(s => ({
                    roll_no: s['Roll No'],
                    marks: s['Total'],
                    grade: s['Grade']
                })),
                grade_distribution: Object.fromEntries(sortedGrades),
                marks_distribution: marksRanges
            });
        } catch (error) {
            console.error('Stats calculation error:', error);
            throw error; // Let the error middleware handle it
        }
    }

    getAllSubjectsGraph(req, res) {
        try {
            const { data } = req.body;
            if (!data || !Array.isArray(data)) {
                return res.status(400).json({ error: 'No data available' });
            }

            const subjects = [...new Set(data.map(row => row['Sub Name']))];
            const stats = subjects.map(subject => {
                const subjectData = data.filter(row => row['Sub Name'] === subject);
                const total = subjectData.length;
                const pass = subjectData.filter(row => row['Status'] === 'PASS').length;
                return {
                    subject,
                    passPercentage: (pass / total) * 100,
                    failPercentage: ((total - pass) / total) * 100
                };
            });

            res.json(stats);
        } catch (error) {
            console.error('Graph error:', error);
            res.status(500).json({ error: 'Error generating graph data' });
        }
    }

    getFailCounts(req, res) {
        try {
            const { data } = req.body;
            if (!data || !Array.isArray(data)) {
                return res.status(400).json({ error: 'No data available' });
            }

            // Get fail counts by student
            const failsByStudent = data.reduce((acc, curr) => {
                if (curr['Status'] === 'FAIL') {
                    const rollNo = curr['Roll No'];
                    const isLab = curr['Sub Name'].toLowerCase().includes('lab');
                    
                    if (!acc[rollNo]) {
                        acc[rollNo] = { labs: 0, subjects: 0 };
                    }
                    
                    if (isLab) {
                        acc[rollNo].labs++;
                    } else {
                        acc[rollNo].subjects++;
                    }
                }
                return acc;
            }, {});

            // Organize fail counts
            const failCounts = {
                '1_lab_fails': [],
                '2_lab_fails': [],
                '3_lab_fails': [],
                '4_lab_fails': [],
                '5_lab_fails': [],
                '1_subject_fails': [],
                '2_subject_fails': [],
                '3_subject_fails': [],
                '4_subject_fails': [],
                '5_subject_fails': []
            };

            Object.entries(failsByStudent).forEach(([rollNo, counts]) => {
                if (counts.labs > 0 && counts.labs <= 5) {
                    failCounts[`${counts.labs}_lab_fails`].push(rollNo);
                }
                if (counts.subjects > 0 && counts.subjects <= 5) {
                    failCounts[`${counts.subjects}_subject_fails`].push(rollNo);
                }
            });

            res.json(failCounts);
        } catch (error) {
            console.error('Fail counts error:', error);
            res.status(500).json({ error: 'Error calculating fail counts' });
        }
    }

    getOverallPassFail(req, res) {
        try {
            const { data } = req.body;
            if (!data || !Array.isArray(data)) {
                return res.status(400).json({ error: 'No data available' });
            }

            const studentResults = {};
            data.forEach(row => {
                if (!studentResults[row['Roll No']]) {
                    studentResults[row['Roll No']] = [];
                }
                studentResults[row['Roll No']].push(row['Status']);
            });

            const totalPass = Object.values(studentResults)
                .filter(results => results.every(status => status === 'PASS')).length;
            
            const totalFail = Object.keys(studentResults).length - totalPass;

            res.json({
                num_students_pass: totalPass,
                num_students_fail: totalFail
            });
        } catch (error) {
            console.error('Overall stats error:', error);
            res.status(500).json({ error: 'Error calculating overall statistics' });
        }
    }

    async generatePDF(req, res) {
        try {
            const { data, subjectData, overallData } = req.body;
            
            if (!data || !subjectData || !overallData) {
                return res.status(400).json({ error: 'Missing required data' });
            }

            // Create a new PDF document
            const doc = new PDFDocument();

            // Set response headers
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=analysis-report.pdf');

            // Pipe the PDF directly to the response
            doc.pipe(res);

            // Add title
            doc.fontSize(20)
               .text('Student Analysis Report', { align: 'center' })
               .moveDown();

            // Add subject analysis
            doc.fontSize(16)
               .text(`Subject Analysis: ${subjectData.subject_name}`, { underline: true })
               .moveDown();

            doc.fontSize(12)
               .text(`Total Students: ${subjectData.total_students}`)
               .text(`Average Mark: ${subjectData.average_mark}`)
               .text(`Pass Rate: ${subjectData.pass_percentage.toFixed(2)}%`)
               .text(`Fail Rate: ${subjectData.fail_percentage.toFixed(2)}%`)
               .moveDown();

            // Add highest marks students
            if (subjectData.highest_students && subjectData.highest_students.length > 0) {
                doc.fontSize(14)
                   .text('Highest Marks Students:', { underline: true })
                   .moveDown();

                subjectData.highest_students.forEach(student => {
                    doc.fontSize(12)
                       .text(`Roll No: ${student.roll_no}`)
                       .text(`Marks: ${student.marks}`)
                       .text(`Grade: ${student.grade}`)
                       .moveDown(0.5);
                });
            }

            // Add lowest marks students
            if (subjectData.lowest_students && subjectData.lowest_students.length > 0) {
                doc.fontSize(14)
                   .text('Lowest Marks Students:', { underline: true })
                   .moveDown();

                subjectData.lowest_students.forEach(student => {
                    doc.fontSize(12)
                       .text(`Roll No: ${student.roll_no}`)
                       .text(`Marks: ${student.marks}`)
                       .text(`Grade: ${student.grade}`)
                       .moveDown(0.5);
                });
            }

            // Add grade distribution
            doc.fontSize(14)
               .text('Grade Distribution:', { underline: true })
               .moveDown();

            Object.entries(subjectData.grade_distribution).forEach(([grade, count]) => {
                const percentage = ((count / subjectData.total_students) * 100).toFixed(1);
                doc.fontSize(12)
                   .text(`${grade}: ${count} students (${percentage}%)`);
            });
            doc.moveDown();

            // Add overall analysis
            doc.fontSize(16)
               .text('Overall Performance Analysis', { underline: true })
               .moveDown();

            doc.fontSize(12)
               .text(`Total Pass (All Subjects): ${overallData.totalPass} students`)
               .text(`Total Fail (One or More Subjects): ${overallData.totalFail} students`)
               .moveDown();

            // Add subject-wise performance
            if (overallData.subjects && overallData.subjects.length > 0) {
                doc.fontSize(14)
                   .text('Subject-wise Performance:', { underline: true })
                   .moveDown();

                overallData.subjects.forEach(subject => {
                    doc.fontSize(12)
                       .text(`${subject.subject}:`)
                       .text(`  Pass: ${subject.passPercentage.toFixed(2)}%`)
                       .text(`  Fail: ${subject.failPercentage.toFixed(2)}%`)
                       .moveDown(0.5);
                });
            }

            // Add footer with timestamp
            doc.fontSize(10)
               .text('Generated on: ' + new Date().toLocaleString(), {
                   align: 'center',
                   y: doc.page.height - 50
               });

            // Finalize the PDF
            doc.end();

        } catch (error) {
            console.error('PDF generation error:', error);
            res.status(500).json({ error: 'Error generating PDF' });
        }
    }
}

module.exports = new AnalysisController(); 