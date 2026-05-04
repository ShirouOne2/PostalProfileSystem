package com.pps.profilesystem.Service;

import com.pps.profilesystem.Entity.User;
import com.pps.profilesystem.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired
    private UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));

        String roleString = "ROLE_" + getRoleName(user.getRole());

        return org.springframework.security.core.userdetails.User
            .withUsername(user.getEmail())
            .password(user.getPassword())
            .authorities(roleString)
            .disabled(!user.isEnabled())
            .build();
    }

    public static String getRoleName(Integer roleId) {
        if (roleId == null) return "USER";
        switch (roleId) {
            case 1: return "ADMIN";
            case 2: return "AREA_ADMIN";
            case 3: return "USER";
            case 4: return "SRD_OPERATION";   // NEW — SRD Operation role
            case 5: return "ASSET";
            default: return "USER";
        }
    }
}