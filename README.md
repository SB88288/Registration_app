# Registration_app

Node.js registration application using MySQL/RDS and shared upload storage.

## Auto Scaling and ALB health checks

The workflow at `.github/workflows/autoscaling-health-check.yml` runs every 15 minutes and can also be started manually from **GitHub → Actions → Auto Scaling Health Check → Run workflow**.

It checks that:
- the Auto Scaling Group has at least its desired number of healthy `InService` instances;
- the ALB target group has a healthy target when desired capacity is greater than zero;
- no ALB targets are explicitly marked `unhealthy`.

A failed check marks the GitHub Actions run as failed; it does not itself replace instances or change Auto Scaling settings. Configure EC2/ELB health checks and the Auto Scaling Group's health-check grace period in AWS to enable AWS-managed replacement of unhealthy instances.

### Required GitHub repository configuration

Under **Settings → Secrets and variables → Actions**, add:

**Secret**
- `AWS_ROLE_TO_ASSUME`: ARN of an IAM role that trusts GitHub Actions OIDC for this repository.

**Variables**
- `AWS_REGION`: for example, `ap-south-1`
- `AWS_AUTO_SCALING_GROUP_NAME`: exact Auto Scaling Group name
- `AWS_TARGET_GROUP_ARN`: ARN of the ALB target group attached to the Auto Scaling Group

Configure the IAM role's trust policy for the GitHub OIDC provider (`token.actions.githubusercontent.com`) and this repository. Grant only these read permissions:
- `autoscaling:DescribeAutoScalingGroups`
- `elasticloadbalancing:DescribeTargetHealth`

The role does not need access keys stored in GitHub. The workflow uses OIDC to obtain temporary credentials.

### Application health endpoint

The Node.js app already exposes `GET /health`. Configure the ALB target group's health-check path to `/health` and its traffic port (normally port 80 when Apache proxies requests to Node.js). Ensure the Apache virtual host proxies this path to the Node.js app and that the instance security group allows the ALB security group to reach the target port.

The current `/health` endpoint checks the database connection too, so it reports unhealthy if MySQL/RDS is unreachable. Confirm this is the intended readiness check for your deployment.
