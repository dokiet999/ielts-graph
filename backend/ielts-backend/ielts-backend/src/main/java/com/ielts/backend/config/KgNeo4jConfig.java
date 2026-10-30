package com.ielts.backend.config;

import lombok.Getter;
import lombok.Setter;
import org.neo4j.driver.AuthTokens;
import org.neo4j.driver.Driver;
import org.neo4j.driver.GraphDatabase;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration of the Neo4j driver for the Knowledge Graph (prefix {@code app.kg.neo4j}).
 * The driver is created lazily and does not verify connectivity at startup so tests and local runs
 * that do not call the KG endpoint work without a running Neo4j container.
 */
@Configuration
@ConfigurationProperties(prefix = "app.kg.neo4j")
@Getter
@Setter
public class KgNeo4jConfig {

    private String uri = "bolt://localhost:7687";
    private String username = "neo4j";
    private String password = "";

    @Bean(destroyMethod = "close")
    public Driver neo4jDriver() {
        String safeUser = username != null ? username : "neo4j";
        String safePass = password != null ? password : "";
        return GraphDatabase.driver(uri, AuthTokens.basic(safeUser, safePass));
    }
}

