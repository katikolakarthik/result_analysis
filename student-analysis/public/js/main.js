// Global variables to store charts and data
let currentChart = null;
let allSubjectsChart = null;
let currentSubjectData = null;
let overallPerformanceData = null;

// Handle file input change
document.querySelector('.file-input-label').addEventListener('click', () => {
    document.getElementById('fileInput').click();
});

document.getElementById('fileInput').addEventListener('change', function(e) {
    const fileName = e.target.files[0]?.name || 'Click to select Excel file';
    document.querySelector('.file-input-label').textContent = fileName;
});

// Handle chart type change
document.getElementById('chartType').addEventListener('change', function() {
    if (currentChart) {
        updateChart(currentChart.data.datasets[0].data, ['Pass', 'Fail']);
    }
});

// File upload function
async function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Please select a file first.');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        
        if (response.ok) {
            populateSubjectDropdown(data.subjects);
        } else {
            alert(data.error || 'Error uploading file');
        }
    } catch (error) {
        console.error('Upload error:', error);
        alert('Error uploading file');
    }
}

// Populate subject dropdown
function populateSubjectDropdown(subjects) {
    const select = document.getElementById('subjectSelect');
    select.innerHTML = '<option value="">Select a subject</option>';
    
    subjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject;
        option.textContent = subject;
        select.appendChild(option);
    });
}

// Fetch statistics for selected subject
async function fetchStats() {
    const subject = document.getElementById('subjectSelect').value;
    
    if (!subject) {
        alert('Please select a subject');
        return;
    }

    try {
        // Update the subject title before fetching
        document.querySelector('.subject-title').textContent = `Analysis for ${subject}`;

        const response = await fetch('/get-stats', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ subject_name: subject })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Error fetching statistics');
        }

        displayStats(data);
    } catch (error) {
        console.error('Stats error:', error);
        document.querySelector('.subject-title').textContent = 'Error Loading Statistics';
        document.querySelector('.stats-grid').innerHTML = `
            <div class="error-message">
                <p>Failed to load statistics: ${error.message}</p>
                <p>Please try again or select a different subject.</p>
            </div>
        `;
    }
}

// Display statistics
function displayStats(data) {
    if (!data) return;

    // Store the current subject data for PDF generation
    currentSubjectData = {
        subject: data.subject_name,
        total_students: data.total_students,
        average_mark: parseFloat(data.average_mark),
        pass_percentage: data.pass_percentage,
        fail_percentage: data.fail_percentage,
        num_students_pass: data.num_students_pass,
        num_students_fail: data.num_students_fail,
        highest_students: data.highest_students,
        grade_distribution: data.grade_distribution
    };

    console.log('Stored subject data:', currentSubjectData);

    // Update the subject title
    document.querySelector('.subject-title').textContent = `Analysis for ${data.subject_name}`;

    // Create pass/fail chart
    const chartData = {
        labels: ['Pass', 'Fail'],
        datasets: [{
            data: [data.pass_percentage, data.fail_percentage],
            backgroundColor: ['#2ecc71', '#e74c3c'],
            borderWidth: 1
        }]
    };

    // Update or create the chart
    const ctx = document.getElementById('passFailChart').getContext('2d');
    if (currentChart) {
        currentChart.destroy();
    }
    currentChart = new Chart(ctx, {
        type: 'pie',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                title: {
                    display: true,
                    text: 'Pass/Fail Distribution',
                    font: {
                        size: 16
                    }
                }
            }
        }
    });

    // Display highest and lowest marks
    const highestLowestHtml = `
        <div class="section-block">
            <h3 class="section-header">Top Performers</h3>
            ${data.highest_students.map(s => `
                <div class="student-record">
                    <p><strong>Roll No:</strong> ${s.roll_no}</p>
                    <p><strong>Marks:</strong> ${s.marks}</p>
                    <p><strong>Grade:</strong> ${s.grade}</p>
                </div>
            `).join('<hr>')}
        </div>
        <div class="section-block">
            <h3 class="section-header">Lowest Marks</h3>
            ${data.lowest_students.map(s => `
                <div class="student-record">
                    <p><strong>Roll No:</strong> ${s.roll_no}</p>
                    <p><strong>Marks:</strong> ${s.marks}</p>
                    <p><strong>Grade:</strong> ${s.grade}</p>
                </div>
            `).join('<hr>')}
        </div>
    `;

    // Display grade distribution
    const gradeHtml = `
        <div class="section-block">
            <h3 class="section-header">Grade Distribution</h3>
            ${Object.entries(data.grade_distribution)
                .map(([grade, count]) => `
                    <div class="grade-bar">
                        <span class="grade-label">${grade}</span>
                        <div class="grade-count" style="width: ${(count / data.total_students) * 100}%">
                            ${count} (${((count / data.total_students) * 100).toFixed(1)}%)
                        </div>
                    </div>
                `).join('')}
        </div>
    `;

    // Display marks distribution
    const marksHtml = `
        <div class="section-block">
            <h3 class="section-header">Marks Distribution</h3>
            ${Object.entries(data.marks_distribution)
                .map(([range, count]) => `
                    <div class="marks-bar">
                        <span class="range-label">${range}</span>
                        <div class="marks-count" style="width: ${(count / data.total_students) * 100}%">
                            ${count} (${((count / data.total_students) * 100).toFixed(1)}%)
                        </div>
                    </div>
                `).join('')}
        </div>
    `;

    // Display summary statistics
    const summaryHtml = `
        <div class="section-block">
            <h3 class="section-header">Summary Statistics</h3>
            <p><strong>Total Students:</strong> ${data.total_students}</p>
            <p><strong>Average Mark:</strong> ${data.average_mark}</p>
            <p><strong>Pass Rate:</strong> ${data.pass_percentage.toFixed(2)}% (${data.num_students_pass} students)</p>
            <p><strong>Fail Rate:</strong> ${data.fail_percentage.toFixed(2)}% (${data.num_students_fail} students)</p>
        </div>
    `;

    // Update the DOM
    document.querySelector('.highest-lowest').innerHTML = highestLowestHtml;
    document.querySelector('.grade-stats').innerHTML = gradeHtml;
    document.querySelector('.extra-stats').innerHTML = `${summaryHtml}${marksHtml}`;
}

// Update chart based on type selection
function updateChart(data, labels) {
    const chartType = document.getElementById('chartType').value;
    const ctx = document.getElementById('passFailChart').getContext('2d');

    if (currentChart) {
        currentChart.destroy();
    }

    currentChart = new Chart(ctx, {
        type: chartType,
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: ['#2ecc71', '#e74c3c'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Fetch all subjects graph
async function fetchAllSubjectsGraph() {
    try {
        const response = await fetch('/get-all-subjects-graph');
        const data = await response.json();
        
        if (response.ok) {
            displayAllSubjectsGraph(data.stats);
        } else {
            alert(data.error || 'Error fetching graph data');
        }
    } catch (error) {
        console.error('Graph error:', error);
        alert('Error fetching graph data');
    }
}

// Display all subjects graph
function displayAllSubjectsGraph(stats) {
    // Store the stats for PDF generation
    const subjects = stats.map(s => ({
        subject: s.subject,
        passPercentage: s.passPercentage,
        failPercentage: s.failPercentage
    }));

    // Update overallPerformanceData
    if (!overallPerformanceData) {
        overallPerformanceData = {};
    }
    overallPerformanceData.subjects = subjects;

    console.log('Updated overall performance data (subjects):', overallPerformanceData);

    const ctx = document.getElementById('allSubjectsChart').getContext('2d');
    
    if (allSubjectsChart) {
        allSubjectsChart.destroy();
    }

    allSubjectsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: stats.map(s => s.subject),
            datasets: [{
                label: 'Pass %',
                data: stats.map(s => s.passPercentage),
                backgroundColor: '#2ecc71'
            }, {
                label: 'Fail %',
                data: stats.map(s => s.failPercentage),
                backgroundColor: '#e74c3c'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Percentage'
                    }
                },
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top'
                },
                title: {
                    display: true,
                    text: 'Subject-wise Performance Analysis',
                    font: {
                        size: 16
                    }
                }
            }
        }
    });
}

// Fetch fail counts
async function fetchFailCounts() {
    try {
        const response = await fetch('/get-fail-counts');
        const data = await response.json();
        
        if (response.ok) {
            displayFailCounts(data);
        } else {
            alert(data.error || 'Error fetching fail counts');
        }
    } catch (error) {
        console.error('Fail counts error:', error);
        alert('Error fetching fail counts');
    }
}

// Display fail counts
function displayFailCounts(data) {
    // Update overallPerformanceData with failures
    if (!overallPerformanceData) {
        overallPerformanceData = { subjects: [] };
    }
    overallPerformanceData.failures = {
        labs: Object.fromEntries(
            Object.entries(data)
                .filter(([key]) => key.includes('lab'))
                .map(([key, rolls]) => [key.split('_')[0], rolls])
        ),
        subjects: Object.fromEntries(
            Object.entries(data)
                .filter(([key]) => key.includes('subject'))
                .map(([key, rolls]) => [key.split('_')[0], rolls])
        )
    };

    const failStatsHtml = `
        <h4>Students with Lab Failures</h4>
        ${Object.entries(data)
            .filter(([key]) => key.includes('lab'))
            .map(([key, rolls]) => `
                <p>${key.split('_')[0]} Lab Failures: ${rolls.length} students</p>
                ${rolls.map(roll => `<small>${roll}</small>`).join(', ')}
            `).join('')}
        
        <h4>Students with Subject Failures</h4>
        ${Object.entries(data)
            .filter(([key]) => key.includes('subject'))
            .map(([key, rolls]) => `
                <p>${key.split('_')[0]} Subject Failures: ${rolls.length} students</p>
                ${rolls.map(roll => `<small>${roll}</small>`).join(', ')}
            `).join('')}
    `;
    document.querySelector('.fail-stats').innerHTML = failStatsHtml;
}

// Fetch overall pass/fail statistics
async function fetchOverallPassFail() {
    try {
        const response = await fetch('/get-overall-pass-fail');
        const data = await response.json();
        
        if (response.ok) {
            displayOverallStats(data);
        } else {
            alert(data.error || 'Error fetching overall statistics');
        }
    } catch (error) {
        console.error('Overall stats error:', error);
        alert('Error fetching overall statistics');
    }
}

// Display overall statistics
function displayOverallStats(data) {
    // Update overallPerformanceData
    if (!overallPerformanceData) {
        overallPerformanceData = {};
    }
    overallPerformanceData.totalPass = data.num_students_pass;
    overallPerformanceData.totalFail = data.num_students_fail;

    console.log('Updated overall performance data (pass/fail):', overallPerformanceData);

    const overallStatsHtml = `
        <h4>Overall Statistics</h4>
        <p>Total Pass (All Subjects): ${data.num_students_pass} students</p>
        <p>Total Fail (One or More Subjects): ${data.num_students_fail} students</p>
    `;
    document.querySelector('.overall-stats').innerHTML = overallStatsHtml;
}

// Show loading spinner
function showLoading() {
    const loadingElement = document.querySelector('.loading');
    if (loadingElement) {
        loadingElement.style.display = 'flex';
    }
}

// Hide loading spinner
function hideLoading() {
    const loadingElement = document.querySelector('.loading');
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
}

// Download PDF function
async function downloadPDF() {
    try {
        showLoading();
        
        // First, ensure we have the required data
        if (!currentSubjectData) {
            alert('Please generate subject statistics first');
            hideLoading();
            return;
        }

        // Fetch overall data if not already available
        if (!overallPerformanceData || !overallPerformanceData.subjects) {
            try {
                await fetchAllSubjectsGraph();
                await fetchOverallPassFail();
                await fetchFailCounts();
            } catch (error) {
                console.error('Error fetching required data:', error);
                alert('Error preparing PDF data. Please try again.');
                hideLoading();
                return;
            }
        }

        // Prepare the data for PDF generation
        const pdfData = {
            subjectData: {
                subject_name: currentSubjectData.subject,
                total_students: currentSubjectData.total_students,
                average_mark: currentSubjectData.average_mark,
                pass_percentage: currentSubjectData.pass_percentage,
                fail_percentage: currentSubjectData.fail_percentage,
                num_students_pass: currentSubjectData.num_students_pass,
                num_students_fail: currentSubjectData.num_students_fail,
                highest_students: currentSubjectData.highest_students || [],
                lowest_students: currentSubjectData.lowest_students || [],
                grade_distribution: currentSubjectData.grade_distribution
            },
            overallData: {
                subjects: overallPerformanceData.subjects || [],
                totalPass: overallPerformanceData.totalPass || 0,
                totalFail: overallPerformanceData.totalFail || 0,
                failures: overallPerformanceData.failures || {
                    labs: {},
                    subjects: {}
                }
            }
        };

        // Send request to server for PDF generation
        const response = await fetch('/generate-pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(pdfData)
        });

        if (!response.ok) {
            throw new Error('Failed to generate PDF');
        }

        // Create blob from response and trigger download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'student-analysis-report.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

    } catch (error) {
        console.error('Error downloading PDF:', error);
        alert('Error generating PDF. Please try again.');
    } finally {
        hideLoading();
    }
} 