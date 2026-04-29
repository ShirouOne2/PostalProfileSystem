package com.pps.profilesystem;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableCaching
@ComponentScan({"com.pps.profilesystem", "inventory"})
@EnableJpaRepositories({"com.pps.profilesystem.Repository", "inventory.Repository"})
public class ProfilesystemApplication {

	public static void main(String[] args) {
		SpringApplication.run(ProfilesystemApplication.class, args);
	}

	@Bean
	public ObjectMapper objectMapper() {
		return new ObjectMapper();
	}

}