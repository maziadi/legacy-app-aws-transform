# =============================================================================
# IAM Roles and Policies
# ECS Task Execution Role and ECS Task Role with Secrets Manager access
# =============================================================================

# -----------------------------------------------------------------------------
# ECS Task Execution Role
# Used by the ECS agent to pull images, push logs, and read secrets
# -----------------------------------------------------------------------------
data "aws_iam_policy_document" "ecs_task_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ecs_task_execution" {
  name               = "${var.project_name}-${var.environment}-ecs-task-execution-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume_role.json

  tags = {
    Name = "${var.project_name}-${var.environment}-ecs-task-execution-role"
  }
}

# Attach the AWS managed ECS Task Execution Role policy
resource "aws_iam_role_policy_attachment" "ecs_task_execution_policy" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Inline policy granting access to Secrets Manager secrets
data "aws_iam_policy_document" "ecs_execution_secrets_access" {
  statement {
    sid    = "SecretsManagerAccess"
    effect = "Allow"
    actions = [
      "secretsmanager:GetSecretValue"
    ]
    resources = [
      aws_secretsmanager_secret.db_credentials.arn,
      aws_secretsmanager_secret.app_secrets.arn
    ]
  }
}

resource "aws_iam_role_policy" "ecs_execution_secrets" {
  name   = "${var.project_name}-${var.environment}-ecs-execution-secrets-policy"
  role   = aws_iam_role.ecs_task_execution.id
  policy = data.aws_iam_policy_document.ecs_execution_secrets_access.json
}

# -----------------------------------------------------------------------------
# ECS Task Role
# Used by the application container itself at runtime
# -----------------------------------------------------------------------------
resource "aws_iam_role" "ecs_task" {
  name               = "${var.project_name}-${var.environment}-ecs-task-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume_role.json

  tags = {
    Name = "${var.project_name}-${var.environment}-ecs-task-role"
  }
}

# Inline policy granting the application access to Secrets Manager secrets
data "aws_iam_policy_document" "ecs_task_secrets_access" {
  statement {
    sid    = "SecretsManagerAccess"
    effect = "Allow"
    actions = [
      "secretsmanager:GetSecretValue"
    ]
    resources = [
      aws_secretsmanager_secret.db_credentials.arn,
      aws_secretsmanager_secret.app_secrets.arn
    ]
  }
}

resource "aws_iam_role_policy" "ecs_task_secrets" {
  name   = "${var.project_name}-${var.environment}-ecs-task-secrets-policy"
  role   = aws_iam_role.ecs_task.id
  policy = data.aws_iam_policy_document.ecs_task_secrets_access.json
}
