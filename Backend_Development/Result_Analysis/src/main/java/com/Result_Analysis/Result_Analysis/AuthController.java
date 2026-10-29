package com.Result_Analysis.Result_Analysis;

import java.util.Optional;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/auth")

public class AuthController{
    private final UserRepository userRepository;

    public AuthController(UserRepository userRepository ){
        this.userRepository = userRepository;
    }

    @PostMapping("/register")

    public String register(@RequestBody User user){
        if(userRepository.findByUserId(user.getUserId()).isPresent()){
            return "User ID already exists";
        }

        userRepository.save(user);
        
        return "Registration successful";
    }
    
    @PostMapping("/login")

    public String login(@RequestBody User user){
        // Demo HOD account requested for the college project. Replace with a database-backed,
        // hashed credential and role-based authentication before production deployment.
        if ("hodmam".equals(user.getUserId()) && "ecedept".equals(user.getPassword())) {
            return "HOD_LOGIN_SUCCESS";
        }
        Optional<User> existingUser = userRepository.findByUserId(user.getUserId());
        if(existingUser.isPresent() && existingUser.get().getPassword().equals(user.getPassword())){
            return "Login Successful";
        }
        return "Cannot find your account";
    }
}
