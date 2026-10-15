
package com.Result_Analysis.Result_Analysis;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Service;

@Service
public class StudentService {

    public String calculateGrade(Integer marks) {
        if (marks == null || marks < 36) return "Fail";
        if (marks >= 90) return "A+";
        if (marks >= 80) return "A";
        if (marks >= 70) return "B+";
        if (marks >= 60) return "B";
        if (marks >= 50) return "C+";
        return "C";
    }

    public double calculateGradePoint(String grade) {
        if (grade == null) return 0.0;

        return switch (grade.trim().toUpperCase()) {
            case "A+" -> 10.0;
            case "A" -> 9.0;
            case "B+" -> 8.0;
            case "B" -> 7.0;
            case "C+" -> 6.0;
            case "C" -> 5.0;
            default -> 0.0;
        };
    }

    public String calculateStatus(Integer marks) {
        return marks != null && marks >= 36 ? "PASS" : "FAIL";
    }

    public void calculateSubjectResults(Student student) {
        if (student == null || student.getResults() == null) return;

        for (SubjectResult subject : student.getResults()) {
            subject.setGrade(calculateGrade(subject.getMarks()));
            subject.setStatus(calculateStatus(subject.getMarks()));
            subject.setStudent(student);
        }
    }

    public int getSemesterNumber(String semester) {
        if (semester == null || semester.trim().isEmpty()) return 0;

        String value = semester.trim().toLowerCase();

        if (value.startsWith("1")) return 1;
        if (value.startsWith("2")) return 2;
        if (value.startsWith("3")) return 3;
        if (value.startsWith("4")) return 4;
        if (value.startsWith("5")) return 5;
        if (value.startsWith("6")) return 6;
        if (value.startsWith("7")) return 7;
        if (value.startsWith("8")) return 8;

        return 0;
    }

    public List<SubjectResult> getSemesterResults(
            Student student, int semesterNumber) {

        List<SubjectResult> semesterResults = new ArrayList<>();

        if (student == null || student.getResults() == null) {
            return semesterResults;
        }

        for (SubjectResult subject : student.getResults()) {
            if (getSemesterNumber(subject.getSemester()) == semesterNumber) {
                semesterResults.add(subject);
            }
        }

        return semesterResults;
    }

    private List<Integer> getAvailableSemesters(Student student) {
        List<Integer> semesters = new ArrayList<>();

        if (student == null || student.getResults() == null) {
            return semesters;
        }

        for (SubjectResult subject : student.getResults()) {
            int number = getSemesterNumber(subject.getSemester());

            if (number > 0 && !semesters.contains(number)
                    && subject.getMarks() != null) {
                semesters.add(number);
            }
        }

        semesters.sort(Comparator.naturalOrder());
        return semesters;
    }

    public double calculateSemesterSGPA(
            List<SubjectResult> semesterResults) {

        if (semesterResults == null || semesterResults.isEmpty()) {
            return 0.0;
        }

        double totalCreditPoints = 0.0;
        int totalCredits = 0;

        for (SubjectResult subject : semesterResults) {
            if (subject.getMarks() == null) continue;

            if (subject.getGrade() == null
                    || subject.getGrade().trim().isEmpty()) {
                subject.setGrade(calculateGrade(subject.getMarks()));
            }

            if (subject.getCredits() == null
                    || subject.getCredits() <= 0) {
                continue;
            }

            double gradePoint =
                    calculateGradePoint(subject.getGrade());

            totalCreditPoints += subject.getCredits() * gradePoint;
            totalCredits += subject.getCredits();
        }

        if (totalCredits == 0) return 0.0;

        return roundTwoDecimals(totalCreditPoints / totalCredits);
    }

    private int getLatestAvailableSemester(Student student) {
        List<Integer> semesters = getAvailableSemesters(student);

        if (semesters.isEmpty()) return 0;

        return semesters.get(semesters.size() - 1);
    }

    public int getLatestCompletedSemester(Student student) {
        // Use the latest semester with imported marks.
        // This avoids assuming that the current semester is incomplete.
        return getLatestAvailableSemester(student);
    }

    public double calculateLatestSGPA(Student student) {
        int latestSemester = getLatestAvailableSemester(student);

        if (latestSemester == 0) return 0.0;

        return calculateSemesterSGPA(
                getSemesterResults(student, latestSemester));
    }

    public double calculateLatestPercentage(Student student) {
        int latestSemester = getLatestAvailableSemester(student);

        if (latestSemester == 0) return 0.0;

        List<SubjectResult> results =
                getSemesterResults(student, latestSemester);

        int totalMarks = 0;
        int subjectCount = 0;

        for (SubjectResult subject : results) {
            if (subject.getMarks() != null) {
                totalMarks += subject.getMarks();
                subjectCount++;
            }
        }

        if (subjectCount == 0) return 0.0;

        return roundTwoDecimals(
                (totalMarks * 100.0) / (subjectCount * 100.0));
    }

    public double getSGPAForSemester(
            Student student, int semesterNumber) {

        return calculateSemesterSGPA(
                getSemesterResults(student, semesterNumber));
    }

    public double calculateCGPA(Student student) {
        List<Integer> semesters = getAvailableSemesters(student);

        if (semesters.isEmpty()) return 0.0;

        double totalCreditPoints = 0.0;
        int totalCredits = 0;

        // Calculate credit-weighted CGPA across all semesters
        // for which marks and credits are available.
        for (Integer semester : semesters) {
            List<SubjectResult> results =
                    getSemesterResults(student, semester);

            for (SubjectResult subject : results) {
                if (subject.getMarks() == null
                        || subject.getCredits() == null
                        || subject.getCredits() <= 0) {
                    continue;
                }

                String grade = calculateGrade(subject.getMarks());
                subject.setGrade(grade);

                totalCreditPoints += subject.getCredits()
                        * calculateGradePoint(grade);

                totalCredits += subject.getCredits();
            }
        }

        if (totalCredits == 0) return 0.0;

        return roundTwoDecimals(
                totalCreditPoints / totalCredits);
    }

    public String calculateOverallResult(Student student) {
        if (student == null
                || student.getResults() == null
                || student.getResults().isEmpty()) {
            return "FAIL";
        }

        boolean hasMarks = false;

        for (SubjectResult subject : student.getResults()) {
            if (subject.getMarks() == null) continue;

            hasMarks = true;

            if (subject.getMarks() < 36) {
                return "FAIL";
            }
        }

        return hasMarks ? "PASS" : "FAIL";
    }

    public int calculateBacklogs(Student student) {
        int backlogCount = 0;

        if (student == null || student.getResults() == null) {
            return 0;
        }

        int latestSemester = getLatestAvailableSemester(student);

        if (latestSemester == 0) return 0;

        // Count failed subjects in the latest semester only.
        for (SubjectResult subject :
                getSemesterResults(student, latestSemester)) {

            if (subject.getMarks() != null
                    && subject.getMarks() < 36) {
                backlogCount++;
            }
        }

        return backlogCount;
    }

    public void calculateStudentData(Student student) {
        if (student == null) return;

        calculateSubjectResults(student);

        student.setSgpa(calculateLatestSGPA(student));
        student.setPercentage(calculateLatestPercentage(student));
        student.setCgpa(calculateCGPA(student));
        student.setBacklog(calculateBacklogs(student));
        student.setResult(calculateOverallResult(student));
    }

    private double roundTwoDecimals(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
