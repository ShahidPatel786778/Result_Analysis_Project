
package com.Result_Analysis.Result_Analysis;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/hod")
@CrossOrigin(origins = "*")
public class ExcelImportController {

    private final StudentRepository students;
    private final StudentService studentService;

    public ExcelImportController(
            StudentRepository students,
            StudentService studentService) {
        this.students = students;
        this.studentService = studentService;
    }

    @PostMapping("/import-excel")
    @Transactional
    public ResponseEntity<Map<String, Object>> importExcel(
            @RequestParam("file") MultipartFile file) {

        if (file == null || file.isEmpty()) {
            return error("Choose an Excel file first.");
        }

        String filename =
                Objects.toString(file.getOriginalFilename(), "");

        String lowerFilename =
                filename.toLowerCase(Locale.ROOT);

        if (!lowerFilename.endsWith(".xlsx")
                && !lowerFilename.endsWith(".xls")) {
            return error("Upload an .xlsx or .xls file.");
        }

        try (InputStream input = file.getInputStream();
             Workbook workbook = WorkbookFactory.create(input)) {

            if (workbook.getNumberOfSheets() == 0) {
                return error("The workbook has no sheets.");
            }

            DataFormatter formatter = new DataFormatter();

            int importedRows = 0;
            int studentsUpdated = 0;
            int skippedRows = 0;
            int subjectsDetected = 0;
            int subjectsSkipped = 0;
            int sheetsSkipped = 0;

            Set<String> touchedUSNs = new HashSet<>();
            List<String> detectedSemesters = new ArrayList<>();

            String filenameSemester =
                    detectSemesterInText(filename);

            for (int sheetIndex = 0;
                 sheetIndex < workbook.getNumberOfSheets();
                 sheetIndex++) {

                Sheet sheet = workbook.getSheetAt(sheetIndex);

                String semester =
                        detectSemester(sheet, formatter);

                if (semester == null) {
                    semester = filenameSemester;
                }

                if (semester == null) {
                    sheetsSkipped++;
                    System.out.println(
                            "Skipped sheet: "
                            + sheet.getSheetName()
                            + " - semester not detected.");
                    continue;
                }

                int semesterNumber =
                        getSemesterNumber(semester);

                if (semesterNumber != 3
                        && semesterNumber != 4) {
                    return error(
                            "Unsupported semester in sheet '"
                            + sheet.getSheetName() + "': "
                            + semester
                            + ". This importer supports "
                            + "3rd and 4th semester only.");
                }

                // Excel row 5: subject headings.
                // Excel row 6: subheadings.
                // Excel row 7 onwards: student data.
                Row header = sheet.getRow(4);
                Row subHeader = sheet.getRow(5);

                if (header == null || subHeader == null) {
                    sheetsSkipped++;
                    System.out.println(
                            "Skipped sheet: "
                            + sheet.getSheetName()
                            + " - heading row missing.");
                    continue;
                }

                int usnColumn = findHeader(
                        header,
                        formatter,
                        "USN",
                        "University Seat Number",
                        "University Seat No");

                int nameColumn = findHeader(
                        header,
                        formatter,
                        "Student Name",
                        "Name");

                if (usnColumn < 0 || nameColumn < 0) {
                    sheetsSkipped++;
                    System.out.println(
                            "Skipped sheet: "
                            + sheet.getSheetName()
                            + " - USN or Name column not found.");
                    continue;
                }

                Map<String, Integer> totalColumns =
                        new LinkedHashMap<>();

                Map<String, Integer> creditsColumns =
                        new LinkedHashMap<>();

                String currentSubjectCode = "";

                int lastHeaderColumn = Math.max(
                        header.getLastCellNum(),
                        subHeader.getLastCellNum());

                for (int col = 0;
                     col < lastHeaderColumn;
                     col++) {

                    String heading =
                            cellValue(header, col, formatter).trim();

                    // Subject headings may be merged across columns.
                    if (col >= 3 && col <= 47
                            && !heading.isBlank()) {
                        currentSubjectCode = heading;
                    }

                    if (col < 3 || col > 47
                            || currentSubjectCode.isBlank()) {
                        continue;
                    }

                    int subjectSemester =
                            getSemesterFromSubjectCode(
                                    currentSubjectCode);

                    if (subjectSemester != semesterNumber) {
                        continue;
                    }

                    String rawSubHeading =
                            cellValue(subHeader, col, formatter);

                    String subHeading =
                            normalize(rawSubHeading);

                    System.out.println(
                            "Header scan | Column: " + col
                            + " | Subject: " + currentSubjectCode
                            + " | Subheading: " + rawSubHeading
                            + " | Normalized: " + subHeading);

                    if (subHeading.equals("tot")
                            || subHeading.equals("total")) {
                        totalColumns.put(
                                currentSubjectCode, col);
                    }

                    // Supports Excel headings such as Credit or Credits.
                    if (subHeading.equals("credit")
                            || subHeading.equals("credits")) {
                        creditsColumns.put(
                                currentSubjectCode, col);
                    }
                }

                List<SubjectColumn> subjectColumns =
                        new ArrayList<>();

                for (Map.Entry<String, Integer> entry
                        : totalColumns.entrySet()) {

                    String code = entry.getKey();

                    Integer creditsColumn =
                            creditsColumns.get(code);

                    System.out.println(
                            "Detected subject: " + code
                            + " | Total column: " + entry.getValue()
                            + " | Credits column: " + creditsColumn);

                    if (creditsColumn == null) {
                        subjectsSkipped++;
                    }

                    subjectColumns.add(
                            new SubjectColumn(
                                    code,
                                    entry.getValue(),
                                    creditsColumn == null
                                            ? -1
                                            : creditsColumn));
                }

                if (subjectColumns.isEmpty()) {
                    sheetsSkipped++;
                    System.out.println(
                            "No subject columns detected in sheet: "
                            + sheet.getSheetName());
                    continue;
                }

                subjectsDetected += subjectColumns.size();

                if (!detectedSemesters.contains(semester)) {
                    detectedSemesters.add(semester);
                }

                for (int rowIndex = 6;
                     rowIndex <= sheet.getLastRowNum();
                     rowIndex++) {

                    Row row = sheet.getRow(rowIndex);

                    if (row == null) {
                        continue;
                    }

                    String usn = cellValue(
                            row, usnColumn, formatter)
                            .trim()
                            .toUpperCase(Locale.ROOT);

                    if (usn.isBlank()
                            || normalize(usn).equals("usn")) {
                        continue;
                    }

                    String name = cellValue(
                            row, nameColumn, formatter).trim();

                    Optional<Student> existingStudent =
                            students.findByUsnIgnoreCase(usn);

                    Student student = existingStudent
                            .orElseGet(Student::new);

                    student.setUsn(usn);

                    if (!name.isBlank()) {
                        student.setName(name);
                    }

                    if (student.getResults() == null) {
                        student.setResults(new ArrayList<>());
                    }

                    int subjectsRead = 0;

                    for (SubjectColumn subjectColumn
                            : subjectColumns) {

                        String code = subjectColumn.code();

                        String marksText = cellValue(
                                row,
                                subjectColumn.columnIndex(),
                                formatter).trim();

                        Integer marks = parseInt(marksText);

                        if (marks == null) {
                            continue;
                        }

                        SubjectResult subjectResult = null;

                        for (SubjectResult existingResult
                                : student.getResults()) {

                            if (normalize(
                                    existingResult.getSemester())
                                    .equals(normalize(semester))
                                    && normalize(
                                    existingResult.getCode())
                                    .equals(normalize(code))) {

                                subjectResult = existingResult;
                                break;
                            }
                        }

                        if (subjectResult == null) {
                            subjectResult = new SubjectResult();
                            subjectResult.setStudent(student);
                            subjectResult.setSemester(semester);
                            subjectResult.setCode(code);

                            student.getResults().add(subjectResult);
                        }

                        subjectResult.setSemester(semester);
                        subjectResult.setCode(code);
                        subjectResult.setMarks(marks);
                        subjectResult.setStudent(student);

                        // Read the Credits cell for this subject.
                        int creditsColumn =
                                subjectColumn.creditsColumnIndex();

                        if (creditsColumn >= 0) {

                            String creditsText = cellValue(
                                    row,
                                    creditsColumn,
                                    formatter).trim();

                            Integer credits = parseInt(creditsText);

                            System.out.println(
                                    "Credits read | USN: " + usn
                                    + " | Subject: " + code
                                    + " | Credits column: "
                                    + creditsColumn
                                    + " | Excel value: "
                                    + creditsText
                                    + " | Parsed credits: "
                                    + credits);

                            if (credits != null) {
                                subjectResult.setCredits(credits);
                            }

                        } else {
                            System.out.println(
                                    "Credits column missing | USN: "
                                    + usn + " | Subject: " + code);
                        }

                        subjectsRead++;
                    }

                    if (subjectsRead == 0) {
                        skippedRows++;
                        continue;
                    }

                    if (student.getCollegeCode() == null
                            || student.getCollegeCode().isBlank()) {
                        student.setCollegeCode("KLE");
                    }

                    if (student.getBranch() == null
                            || student.getBranch().isBlank()) {
                        student.setBranch("ECE");
                    }

                    student.setSemester(semester);

                    if (student.getAcademicYear() == null
                            || student.getAcademicYear().isBlank()) {
                        student.setAcademicYear("2025");
                    }

                    studentService.calculateSubjectResults(student);
                    studentService.calculateStudentData(student);

                    // Save the student and its subject results.
                    students.save(student);

                    importedRows++;

                    if (touchedUSNs.add(usn)) {
                        studentsUpdated++;
                    }
                }
            }

            Map<String, Object> result = new LinkedHashMap<>();

            result.put("message", "Excel import completed.");
            result.put("semestersDetected", detectedSemesters);
            result.put("rowsImported", importedRows);
            result.put("studentsUpdated", studentsUpdated);
            result.put("skippedRows", skippedRows);
            result.put("subjectsDetected", subjectsDetected);
            result.put("subjectColumnsSkipped", subjectsSkipped);
            result.put("sheetsSkipped", sheetsSkipped);

            return ResponseEntity.ok(result);

        } catch (Exception ex) {


            Map<String, Object> body = new LinkedHashMap<>();

            body.put("message", "Excel import failed.");
            body.put(
                    "detail",
                    Objects.toString(
                            ex.getMessage(),
                            "Unknown import error"));

            return ResponseEntity.badRequest().body(body);
        }
    }

    private static String detectSemester(
            Sheet sheet,
            DataFormatter formatter) {

        int rowsToCheck = Math.min(
                sheet.getLastRowNum() + 1, 15);

        for (int rowIndex = 0;
             rowIndex < rowsToCheck;
             rowIndex++) {

            Row row = sheet.getRow(rowIndex);

            if (row == null) {
                continue;
            }

            StringBuilder text = new StringBuilder();

            short lastCell = row.getLastCellNum();

            for (int col = 0; col < lastCell; col++) {
                text.append(' ')
                        .append(cellValue(row, col, formatter));
            }

            String semester =
                    detectSemesterInText(text.toString());

            if (semester != null) {
                return semester;
            }
        }

        return null;
    }

    private static String detectSemesterInText(String text) {

        if (text == null || text.isBlank()) {
            return null;
        }

        Pattern pattern = Pattern.compile(
                "(?i)(?<!\\d)([1-8])\\s*"
                + "(st|nd|rd|th)\\s*"
                + "[\\s_-]*sem(?:ester)?\\b");

        Matcher matcher = pattern.matcher(text);

        if (matcher.find()) {
            return matcher.group(1)
                    + matcher.group(2).toLowerCase(Locale.ROOT);
        }

        return null;
    }

    private static int getSemesterFromSubjectCode(String code) {

        if (code == null || code.isBlank()) {
            return -1;
        }

        Pattern pattern = Pattern.compile(
                "(?i)[A-Z]+\\s*([1-8])\\d{2}[A-Z]?");

        Matcher matcher = pattern.matcher(code.trim());

        if (matcher.find()) {
            return Integer.parseInt(matcher.group(1));
        }

        return -1;
    }

    private static int getSemesterNumber(String semester) {

        if (semester == null) {
            return -1;
        }

        Matcher matcher = Pattern.compile(
                "^\\s*([1-8])").matcher(semester);

        if (matcher.find()) {
            return Integer.parseInt(matcher.group(1));
        }

        return -1;
    }

    private static ResponseEntity<Map<String, Object>> error(
            String message) {

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("message", message);

        return ResponseEntity.badRequest().body(body);
    }

    private static int findHeader(
            Row row,
            DataFormatter formatter,
            String... names) {

        Set<String> expected = new HashSet<>();

        for (String name : names) {
            expected.add(normalize(name));
        }

        for (Cell cell : row) {
            String value = formatter.formatCellValue(cell);

            if (expected.contains(normalize(value))) {
                return cell.getColumnIndex();
            }
        }

        return -1;
    }

    private static String cellValue(
            Row row,
            int column,
            DataFormatter formatter) {

        if (row == null || column < 0) {
            return "";
        }

        Cell cell = row.getCell(
                column,
                Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);

        return cell == null
                ? ""
                : formatter.formatCellValue(cell);
    }

    private static String normalize(String value) {

        return value == null
                ? ""
                : value.toLowerCase(Locale.ROOT)
                        .replaceAll("[^a-z0-9]", "");
    }

    private static Integer parseInt(String value) {

        if (value == null || value.isBlank()) {
            return null;
        }

        try {
            double number = Double.parseDouble(value.trim());

            if (!Double.isFinite(number)) {
                return null;
            }

            return (int) Math.round(number);

        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private static class SubjectColumn {

        private final String code;
        private final int columnIndex;
        private final int creditsColumnIndex;

        public SubjectColumn(
                String code,
                int columnIndex,
                int creditsColumnIndex) {
            this.code = code;
            this.columnIndex = columnIndex;
            this.creditsColumnIndex = creditsColumnIndex;
        }

        public String code() {
            return code;
        }

        public int columnIndex() {
            return columnIndex;
        }

        public int creditsColumnIndex() {
            return creditsColumnIndex;
        }
    }
}
