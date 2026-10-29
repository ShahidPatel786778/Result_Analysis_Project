# Result Analysis Backend

## Required
- Java 17+
- MySQL

## Before starting
1. Create database `result_analysis` in MySQL.
2. Open `src/main/resources/application.properties`.
3. Replace `YOUR_MYSQL_PASSWORD` with your MySQL password.
4. Start MySQL.

## Start backend (Windows PowerShell)
```powershell
cd Backend_Development\Result_Analysis
.\mvnw.cmd spring-boot:run
```

Backend: http://localhost:8081/
All students: http://localhost:8081/students
Find by USN: http://localhost:8081/students/usn/1KL24EC002

## Frontend
Open the Frontend_Development folder and start the HTML files with VS Code Live Server, or open `index.html` directly. The JavaScript calls `http://localhost:8081`.
## Rank Analysis features
- Topper list sorted by CGPA
- Rank change versus the previous successful load in the same browser
- Department-wise average CGPA chart
- Current vs previous rank comparison chart
- PDF download button using the browser Print / Save as PDF dialog

The rank history is intentionally stored in browser localStorage because the current database does not yet contain a historical-results table. For permanent semester-wise rank history, add a separate rank-history table later.


## HOD Excel import

Log in using the demo HOD account `hodmam` / `ecedept`. The Home page shows the Excel import form only for this account. Upload an `.xlsx` or `.xls` file with a header row. Supported columns include `USN`, `College Code`/`collegeCode`, `Branch`/`Department`, `Name`/`Student Name`, `Semester`, `Academic Year`/`Year`, `Email`, `Code`/`Subject Code`, `Subject`/`Subject Name`, `Credits`, and `Marks`/`Total Marks`. Each row should represent one subject result; repeat student details for each subject row. The first worksheet is imported. Subject-wise batch graphs depend on academic year and subject values being present.

**Demo credentials warning:** the requested HOD credentials are hardcoded for demonstration and are not production-safe. Use a secure database-backed account, password hashing, authorization, and HTTPS before deployment.
