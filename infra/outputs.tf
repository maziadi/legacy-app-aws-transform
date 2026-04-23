# =============================================================================
# Terraform Outputs
# Key resource identifiers and endpoints for reference
# =============================================================================

output "vpc_id" {
  description = "The ID of the VPC"
  value       = aws_vpc.main.id
  sensitive   = false
}

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = aws_subnet.public[*].id
  sensitive   = false
}

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = aws_subnet.private[*].id
  sensitive   = false
}

output "ecr_repository_url" {
  description = "The URL of the ECR repository for pushing Docker images"
  value       = aws_ecr_repository.app.repository_url
  sensitive   = false
}

output "ecs_cluster_name" {
  description = "The name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
  sensitive   = false
}

output "ecs_service_name" {
  description = "The name of the ECS service"
  value       = aws_ecs_service.app.name
  sensitive   = false
}

output "alb_dns_name" {
  description = "The DNS name of the Application Load Balancer (application endpoint)"
  value       = aws_lb.main.dns_name
  sensitive   = false
}

output "rds_endpoint" {
  description = "The endpoint of the RDS MySQL instance"
  value       = aws_db_instance.main.endpoint
  sensitive   = false
}

output "db_credentials_secret_arn" {
  description = "ARN of the DB credentials secret in Secrets Manager"
  value       = aws_secretsmanager_secret.db_credentials.arn
  sensitive   = false
}

output "app_secrets_secret_arn" {
  description = "ARN of the application secrets secret in Secrets Manager"
  value       = aws_secretsmanager_secret.app_secrets.arn
  sensitive   = false
}
