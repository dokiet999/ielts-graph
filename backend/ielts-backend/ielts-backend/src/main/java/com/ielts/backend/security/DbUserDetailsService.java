package com.ielts.backend.security;

import com.ielts.backend.entity.User;
import com.ielts.backend.enums.UserStatus;
import com.ielts.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Locale;

/**
 * Loads accounts from the users table. Login is by username + password;
 * usernames are stored in lower case, so the lookup is case-insensitive.
 * PENDING accounts are reported as disabled, LOCKED accounts as locked.
 */
@Service
@RequiredArgsConstructor
public class DbUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public static String normalize(String username) {
        return username == null ? null : username.trim().toLowerCase(Locale.ROOT);
    }

    @Override
    public UserDetails loadUserByUsername(String username) {
        User user = userRepository.findByUsername(normalize(username))
                .filter(u -> u.getPasswordHash() != null)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        return org.springframework.security.core.userdetails.User
                .withUsername(user.getUsername())
                .password(user.getPasswordHash())
                .roles(user.getRole().name())
                .disabled(user.getStatus() == UserStatus.PENDING)
                .accountLocked(user.getStatus() == UserStatus.LOCKED)
                .build();
    }
}
