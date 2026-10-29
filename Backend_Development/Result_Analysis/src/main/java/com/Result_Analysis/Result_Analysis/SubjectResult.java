package com.Result_Analysis.Result_Analysis;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;

@Entity
@Table(name="subject_results")
public class SubjectResult {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    private String semester;
    private String code;
    private String subject;
    private Integer credits;
    private Integer marks;
    private String grade;
    private String status;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="student_id") @JsonBackReference private Student student;
    public SubjectResult(){}
    public Long getId(){return id;} public void setId(Long v){id=v;}
    public String getSemester(){return semester;} public void setSemester(String v){semester=v;}
    public String getCode(){return code;} public void setCode(String v){code=v;}
    public String getSubject(){return subject;} public void setSubject(String v){subject=v;}
    public Integer getCredits(){return credits;} public void setCredits(Integer v){credits=v;}
    public Integer getMarks(){return marks;} public void setMarks(Integer v){marks=v;}
    public String getGrade(){return grade;} public void setGrade(String v){grade=v;}
    public String getStatus(){return status;} public void setStatus(String v){status=v;}
    public Student getStudent(){return student;} public void setStudent(Student v){student=v;}
}
