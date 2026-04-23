# =============================================================================
# Secrets Manager Resources
# Stores sensitive values for database credentials and application secrets
# =============================================================================

# -----------------------------------------------------------------------------
# Database Credentials Secret
# Stores MySQL database credentials (username, password, host, port, db name)
# -----------------------------------------------------------------------------
resource "aws_secretsmanager_secret" "db_credentials" {
  name        = "${var.project_name}-${var.environment}-db-credentials"
  description = "Database credentials for the ${var.project_name} ${var.environment} environment (username, password, host, port, database name)"

  tags = {
    Name = "${var.project_name}-${var.environment}-db-credentials"
  }
}

# IMPORTANT: Do NOT create aws_secretsmanager_secret_version with hardcoded values.
# After running terraform apply, populate the secret values manually or via CI/CD pipeline:
#
# Example using AWS CLI:
#   aws secretsmanager put-secret-value \
#     --secret-id <db_credentials_secret_arn> \
#     --secret-string '{"username":"admin","password":"<secure-password>","host":"<rds-endpoint>","port":"3306","dbname":"appdb"}'
#
# The ECS task definition references this secret by ARN to inject values as
# environment variables at container runtime.

# -----------------------------------------------------------------------------
# Application Secrets
# Stores application-level secrets (JWT secret, session secret, API keys, etc.)
# -----------------------------------------------------------------------------
resource "aws_secretsmanager_secret" "app_secrets" {
  name        = "${var.project_name}-${var.environment}-app-secrets"
  description = "Application secrets for the ${var.project_name} ${var.environment} environment (JWT secret, session secret, API keys)"

  tags = {
    Name = "${var.project_name}-${var.environment}-app-secrets"
  }
}

# IMPORTANT: Do NOT create aws_secretsmanager_secret_version with hardcoded values.
# After running terraform apply, populate the secret values manually or via CI/CD pipeline:
#
# Example using AWS CLI:
#   aws secretsmanager put-secret-value \
#     --secret-id <app_secrets_secret_arn> \
#     --secret-string '{"JWT_SECRET":"<your-jwt-secret>","SESSION_SECRET":"<your-session-secret>","API_KEY":"<your-api-key>"}'
#
# The ECS task definition references this secret by ARN to inject values as
# environment variables at container runtime.
