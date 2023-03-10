Tim Hall, March 10, 2023

Task:
- Iterate over all snapshots
  - If the snapshot's parent db does not exist, delete it
  - if the snapshot's parent db is still running, remove snapshots older than 21 days
- Verify that snapshot retention policy is set to 21 days for databases in the PROD acount
- Disable snapshots in lower environments

Solution:
- Created a lambda function using Node.js and the AWS SDK, to perform the tasks described above
- Created a terraform file to:
  - create lambda function, iam role, permissions
  - use CloudWatch Events to trigger the function once a month

Assumptions:
- The solution is designed to clean up RDS snapshots in AWS.
- The lambda function has permissions needed to interact with RDS and EC2 services
- RDS instances have an 'Environment' tag
- The lambda function is scheduled to be invoked once a month

Note:
Although I wrote this solution in a lambda function as that is what I'm most familiar with, I could also write another solution that leverages native Terraform more heavily.