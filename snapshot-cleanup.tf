provider "aws" {
  region = "us-west-2"
}

// create snapshot_cleanup lambda function
resource "aws_lambda_function" "snapshot_cleanup" {
  filename      = "snapshot_cleanup.ts"
  function_name = "snapshot-cleanup"
  role          = aws_iam_role.snapshot_cleanup.arn
  handler       = "index.handler"
  runtime       = "nodejs14.x"
}

// create iam role
resource "aws_iam_role" "snapshot_cleanup" {
  name = "snapshot-cleanup-role"

  // define permissions
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

// attach role with permissions so lambda function can write logs to Cloudwatch
resource "aws_iam_role_policy_attachment" "snapshot_cleanup" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.snapshot_cleanup.name
}

// create Cloudwatch event rule to schedule function once a month
resource "aws_cloudwatch_event_rule" "snapshot_cleanup" {
  name        = "snapshot-cleanup-monthly"
  description = "Invoke snapshot cleanup Lambda function once a month"
  schedule_expression = "cron(0 0 1 * ? *)" // runs at midnight on the first day of every month
}

// add permission to allow Cloudwatch to invoke the Lambda function
resource "aws_lambda_permission" "snapshot_cleanup_cloudwatch" {
  statement_id  = "AllowExecutionFromCloudwatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.snapshot_cleanup.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.snapshot_cleanup.arn
}

// create Cloudwatch event target to trigger the Lambda function
resource "aws_cloudwatch_event_target" "snapshot_cleanup" {
  rule      = aws_cloudwatch_event_rule.snapshot_cleanup.name
  arn       = aws_lambda_function.snapshot_cleanup.arn
}
