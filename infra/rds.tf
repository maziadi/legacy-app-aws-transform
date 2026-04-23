# =============================================================================
# RDS MySQL Resources
# MySQL 8.0 instance in private subnets with encryption and managed password
# =============================================================================

# -----------------------------------------------------------------------------
# DB Subnet Group
# Places the RDS instance in private subnets
# -----------------------------------------------------------------------------
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-${var.environment}-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "${var.project_name}-${var.environment}-db-subnet-group"
  }
}

# -----------------------------------------------------------------------------
# RDS MySQL Instance
# -----------------------------------------------------------------------------
resource "aws_db_instance" "main" {
  identifier     = "${var.project_name}-${var.environment}-db"
  engine         = "mysql"
  engine_version = "8.0"
  instance_class = var.db_instance_class

  allocated_storage     = 20
  max_allocated_storage = 100

  db_name  = var.db_name
  username = "admin" # Update this username as needed; password is managed by AWS Secrets Manager

  # AWS Provider 5.x feature: RDS manages the master password via Secrets Manager automatically
  manage_master_user_password = true

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  # Set to true for production environments for high availability
  multi_az = false

  publicly_accessible = false

  # Set to false for production environments to create a final snapshot before deletion
  skip_final_snapshot       = true
  final_snapshot_identifier = "${var.project_name}-${var.environment}-final-snapshot"

  storage_encrypted = true

  tags = {
    Name = "${var.project_name}-${var.environment}-db"
  }
}
