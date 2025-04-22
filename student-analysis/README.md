# Student Statistics Analysis Application

A web application for analyzing student performance statistics from Excel files. Generate detailed analysis with charts, statistics, and downloadable PDF reports.

## Features

- Excel file upload for student data
- Subject-wise performance analysis
- Overall performance statistics
- Pass/Fail percentage visualization
- Grade distribution analysis
- Detailed failure analysis for labs and theory courses
- PDF report generation with comprehensive statistics
- Responsive web interface

## Tech Stack

- Node.js
- Express.js
- EJS templating
- Chart.js for visualizations
- PDFKit for report generation
- XLSX for Excel file processing

## Deployment on Vercel

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy the application:
   ```bash
   vercel
   ```

4. For production deployment:
   ```bash
   vercel --prod
   ```

## Environment Variables

Create a `.env` file in the root directory with the following variables:
```
NODE_ENV=production
PORT=3000
SESSION_SECRET=your_session_secret_here
```

## Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Visit `http://localhost:3000` in your browser

## Production Build

The application is ready for production deployment on Vercel. No build step is required as it's a Node.js application.

## Notes

- Make sure to use Node.js version 14 or higher
- The application uses in-memory session storage by default
- PDF generation happens server-side
- All charts are generated using Chart.js 