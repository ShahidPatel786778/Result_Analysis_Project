
package com.Result_Analysis.Result_Analysis;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/students")
@CrossOrigin(origins = "*")
public class StudentController {

    private final StudentRepository repository;
    private final StudentService studentService;

    public StudentController(
            StudentRepository repository,
            StudentService studentService) {
        this.repository = repository;
        this.studentService = studentService;
    }

    // Get all students and calculate ranks
    @GetMapping
    public List<Student> getStudents() {

        List<Student> students = repository.findAll();

        for (Student student : students) {
            studentService.calculateStudentData(student);
        }

        students.sort((a, b) -> {
            Double cgpaA = a.getCgpa();
            Double cgpaB = b.getCgpa();

            if (cgpaA == null && cgpaB == null) return 0;
            if (cgpaA == null) return 1;
            if (cgpaB == null) return -1;

            int result = Double.compare(cgpaB, cgpaA);

            if (result != 0) {
                return result;
            }

            return String.valueOf(a.getUsn())
                    .compareToIgnoreCase(String.valueOf(b.getUsn()));
        });

        int rank = 1;

        for (Student student : students) {
            student.setstudentRank(rank++);
        }

        return students;
    }

    // Find a student by USN.
    // College code and branch are optional filters.
    @GetMapping("/usn/{usn}")
    public ResponseEntity<Student> getByUsn(
            @PathVariable String usn,
            @RequestParam(required = false) String collegeCode,
            @RequestParam(required = false) String branch) {

        if (usn == null || usn.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        String normalizedUsn = usn.trim();

        List<Student> matches = repository.findAll()
                .stream()
                .filter(student ->
                        student.getUsn() != null
                        && student.getUsn().trim()
                                .equalsIgnoreCase(normalizedUsn))
                .toList();

        // No student with this USN
        if (matches.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        // Apply college and branch filters only when supplied.
        List<Student> filteredMatches = matches.stream()
                .filter(student ->
                        collegeCode == null || collegeCode.isBlank()
                        || (student.getCollegeCode() != null
                        && student.getCollegeCode().trim()
                                .equalsIgnoreCase(collegeCode.trim())))
                .filter(student ->
                        branch == null || branch.isBlank()
                        || (student.getBranch() != null
                        && student.getBranch().trim()
                                .equalsIgnoreCase(branch.trim())))
                .toList();

        // If the optional filters don't match, use the USN match.
        // This helps when imported Excel data has different
        // college-code or branch values.
        Student student = filteredMatches.isEmpty()
                ? matches.get(0)
                : filteredMatches.get(0);

        studentService.calculateStudentData(student);

        return ResponseEntity.ok(student);
    }

    // Find student by database ID
    @GetMapping("/{id}")
    public ResponseEntity<Student> getById(@PathVariable Long id) {
        return repository.findById(id)
                .map(student -> {
                    studentService.calculateStudentData(student);
                    return ResponseEntity.ok(student);
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // Add a student
    @PostMapping("/addstudent")
    public Student addStudent(@RequestBody Student student) {
        studentService.calculateStudentData(student);
        return repository.save(student);
    }

    // Update student details
    @PutMapping("/{id}")
    public ResponseEntity<Student> update(
            @PathVariable Long id,
            @RequestBody Student details) {

        return repository.findById(id).map(student -> {

            student.setUsn(details.getUsn());
            student.setName(details.getName());
            student.setCollegeCode(details.getCollegeCode());
            student.setBranch(details.getBranch());
            student.setSemester(details.getSemester());
            student.setAcademicYear(details.getAcademicYear());
            student.setEmail(details.getEmail());
            student.setSgpa(details.getSgpa());
            student.setCgpa(details.getCgpa());
            student.setPercentage(details.getPercentage());
            student.setResult(details.getResult());

            if (details.getResults() != null) {
                student.getResults().clear();

                details.getResults().forEach(result -> {
                    result.setStudent(student);
                    student.getResults().add(result);
                });
            }

            studentService.calculateStudentData(student);

            return ResponseEntity.ok(repository.save(student));

        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    // Add a subject result
    @PostMapping("/{id}/result")
    public ResponseEntity<Student> addSubjectResult(
            @PathVariable Long id,
            @RequestBody SubjectResult subjectResult) {

        Student student = repository.findById(id).orElse(null);

        if (student == null) {
            return ResponseEntity.notFound().build();
        }

        subjectResult.setStudent(student);
        student.getResults().add(subjectResult);

        studentService.calculateStudentData(student);

        return ResponseEntity.ok(repository.save(student));
    }

    // Delete a student
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {

        if (!repository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        repository.deleteById(id);

        return ResponseEntity.noContent().build();
    }
}
