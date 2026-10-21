
package com.poms.backend.health;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class HealthController {

    @GetMapping("/health")
    public Map<String, String> checkHealth() {
        return Map.of(
                "status", "UP",
                "application", "POMS Java Backend",
                "message", "Application is running successfully"
        );
    }
}
