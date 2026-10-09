package com.ielts.backend.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AccountStatusUserDetailsChecker;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.web.servlet.HandlerExceptionResolver;

@Configuration
public class SecurityConfig {

    /**
     * Security errors raised in the filter chain are handed to the MVC exception
     * resolver so they get the same JSON format as GlobalExceptionHandler.
     */
    private final HandlerExceptionResolver exceptionResolver;

    public SecurityConfig(@Qualifier("handlerExceptionResolver") HandlerExceptionResolver exceptionResolver) {
        this.exceptionResolver = exceptionResolver;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Account status (pending/locked) is checked only after the password matches,
     * so a wrong password never reveals whether an account exists or is locked.
     */
    @Bean
    public AuthenticationManager authenticationManager(UserDetailsService userDetailsService,
                                                       PasswordEncoder passwordEncoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder);
        provider.setPreAuthenticationChecks(user -> { });
        provider.setPostAuthenticationChecks(new AccountStatusUserDetailsChecker());
        return new ProviderManager(provider);
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
                                                   AuthenticationManager authenticationManager) throws Exception {
        AuthenticationEntryPoint entryPoint =
                (request, response, ex) -> exceptionResolver.resolveException(request, response, null, ex);
        AccessDeniedHandler accessDeniedHandler =
                (request, response, ex) -> exceptionResolver.resolveException(request, response, null, ex);

        http
                .authenticationManager(authenticationManager)
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // UC07: only learners can join a course
                        .requestMatchers(HttpMethod.POST, "/api/courses/*/enroll").hasRole("STUDENT")
                        // Exercise authoring: only teachers and admins can create exercises
                        .requestMatchers(HttpMethod.POST, "/api/exercises").hasAnyRole("TEACHER", "ADMIN")
                        // Public catalogue & exercise preview. Answers are guarded at service level
                        .requestMatchers(HttpMethod.GET, "/api/courses/**", "/api/lessons/**", "/api/exercises/**").permitAll()
                        // API docs, health check, demo UI and static assets
                        .requestMatchers("/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**",
                                "/actuator/health", "/error", "/listening-demo.html", "/", "/index.html", "/static/**").permitAll()
                        .anyRequest().authenticated())
                // Temporary until JWT auth is implemented
                .httpBasic(basic -> basic.authenticationEntryPoint(entryPoint))
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(entryPoint)
                        .accessDeniedHandler(accessDeniedHandler));
        return http.build();
    }
}
