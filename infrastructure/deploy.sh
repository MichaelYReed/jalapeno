#!/bin/bash
set -e

# Jalapeño AWS Deployment Script
# Usage: ./deploy.sh [init|plan|apply|push|frontend|seed|destroy]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Check prerequisites
check_prerequisites() {
    command -v aws >/dev/null 2>&1 || error "AWS CLI not installed"
    command -v terraform >/dev/null 2>&1 || error "Terraform not installed"
    command -v docker >/dev/null 2>&1 || error "Docker not installed"

    if [ ! -f "$SCRIPT_DIR/terraform.tfvars" ]; then
        error "terraform.tfvars not found. Copy terraform.tfvars.example and fill in values."
    fi
}

# Initialize Terraform
tf_init() {
    log "Initializing Terraform..."
    cd "$SCRIPT_DIR"
    terraform init
}

# Plan infrastructure changes
tf_plan() {
    log "Planning infrastructure changes..."
    cd "$SCRIPT_DIR"
    terraform plan
}

# Apply infrastructure changes
tf_apply() {
    log "Applying infrastructure changes..."
    cd "$SCRIPT_DIR"
    terraform apply
}

# Push Docker image to ECR
push_image() {
    log "Building and pushing Docker image to ECR..."
    cd "$SCRIPT_DIR"

    # Get ECR URL from Terraform output
    ECR_URL=$(terraform output -raw ecr_repository_url)
    AWS_REGION=$(terraform output -raw 2>/dev/null | grep -oP 'aws_region = "\K[^"]+' || echo "us-east-1")

    # Get AWS account ID
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

    log "Logging into ECR..."
    aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

    log "Building Docker image..."
    cd "$PROJECT_ROOT/backend"
    docker build -t jalapeno-backend .

    log "Tagging image..."
    docker tag jalapeno-backend:latest "$ECR_URL:latest"

    log "Pushing to ECR..."
    docker push "$ECR_URL:latest"

    log "Updating ECS service..."
    aws ecs update-service --cluster jalapeno-cluster --service jalapeno-backend --force-new-deployment --region "$AWS_REGION"

    log "Docker image pushed and ECS service updated!"
}

# Deploy frontend to S3
deploy_frontend() {
    log "Building and deploying frontend..."
    cd "$SCRIPT_DIR"

    # Get outputs from Terraform
    S3_BUCKET=$(terraform output -raw s3_bucket)
    CLOUDFRONT_URL=$(terraform output -raw cloudfront_url)
    API_URL=$(terraform output -raw api_url)
    CLOUDFRONT_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?Origins.Items[?Id=='S3-frontend']].Id" --output text)

    log "Building frontend with API URL: $CLOUDFRONT_URL/api"
    cd "$PROJECT_ROOT/frontend"

    # Build with production API URL (CloudFront will proxy /api to ALB)
    VITE_API_URL="" npm run build

    log "Uploading to S3..."
    aws s3 sync dist/ "s3://$S3_BUCKET/" --delete

    log "Invalidating CloudFront cache..."
    aws cloudfront create-invalidation --distribution-id "$CLOUDFRONT_ID" --paths "/*"

    log "Frontend deployed!"
    log "Access your app at: $CLOUDFRONT_URL"
}

# Seed database
seed_database() {
    log "Seeding database..."
    cd "$SCRIPT_DIR"

    # Get RDS endpoint and run seed
    API_URL=$(terraform output -raw api_url)

    warn "To seed the database, exec into the running ECS task or run locally with DATABASE_URL set"
    log "API endpoint: $API_URL"
    log "You can test with: curl $API_URL/health"
}

# Destroy infrastructure
tf_destroy() {
    warn "This will destroy all AWS resources!"
    read -p "Are you sure? (yes/no): " confirm
    if [ "$confirm" = "yes" ]; then
        cd "$SCRIPT_DIR"
        terraform destroy
    else
        log "Cancelled"
    fi
}

# Main
case "${1:-help}" in
    init)
        check_prerequisites
        tf_init
        ;;
    plan)
        check_prerequisites
        tf_plan
        ;;
    apply)
        check_prerequisites
        tf_apply
        ;;
    push)
        check_prerequisites
        push_image
        ;;
    frontend)
        check_prerequisites
        deploy_frontend
        ;;
    seed)
        check_prerequisites
        seed_database
        ;;
    destroy)
        check_prerequisites
        tf_destroy
        ;;
    all)
        check_prerequisites
        tf_init
        tf_apply
        push_image
        deploy_frontend
        ;;
    *)
        echo "Jalapeño AWS Deployment"
        echo ""
        echo "Usage: $0 <command>"
        echo ""
        echo "Commands:"
        echo "  init      Initialize Terraform"
        echo "  plan      Show planned infrastructure changes"
        echo "  apply     Create/update AWS infrastructure"
        echo "  push      Build and push Docker image to ECR"
        echo "  frontend  Build and deploy frontend to S3"
        echo "  seed      Seed the database"
        echo "  destroy   Destroy all AWS resources"
        echo "  all       Run init, apply, push, and frontend"
        ;;
esac
