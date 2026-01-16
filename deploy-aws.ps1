# Jalapeno AWS Deployment Script (PowerShell)
# Uses AWS Copilot for simple ECS deployment

param(
    [string]$Command = "help"
)

$ErrorActionPreference = "Stop"

function Write-Step($message) {
    Write-Host "`n==> $message" -ForegroundColor Cyan
}

function Write-Success($message) {
    Write-Host "[OK] $message" -ForegroundColor Green
}

function Write-Error($message) {
    Write-Host "[ERROR] $message" -ForegroundColor Red
}

# Check prerequisites
function Test-Prerequisites {
    Write-Step "Checking prerequisites..."

    # Check AWS CLI
    try {
        $awsVersion = aws --version 2>&1
        Write-Success "AWS CLI installed: $awsVersion"
    } catch {
        Write-Error "AWS CLI not installed"
        Write-Host "Install from: https://awscli.amazonaws.com/AWSCLIV2.msi"
        exit 1
    }

    # Check AWS credentials
    try {
        $identity = aws sts get-caller-identity 2>&1
        Write-Success "AWS credentials configured"
    } catch {
        Write-Error "AWS credentials not configured. Run: aws configure"
        exit 1
    }

    # Check Copilot
    try {
        $copilotVersion = copilot --version 2>&1
        Write-Success "AWS Copilot installed: $copilotVersion"
    } catch {
        Write-Error "AWS Copilot not installed"
        Write-Host "Install from: https://aws.github.io/copilot-cli/"
        Write-Host "Or run: Invoke-WebRequest -Uri https://github.com/aws/copilot-cli/releases/latest/download/copilot-windows.exe -OutFile copilot.exe"
        exit 1
    }

    # Check Docker
    try {
        docker --version | Out-Null
        Write-Success "Docker installed"
    } catch {
        Write-Error "Docker not installed or not running"
        exit 1
    }
}

# Initialize Copilot app
function Initialize-App {
    Write-Step "Initializing Copilot application..."

    Push-Location $PSScriptRoot

    # Initialize app if not exists
    if (-not (Test-Path "copilot/.workspace")) {
        copilot app init jalapeno
    } else {
        Write-Host "App already initialized"
    }

    Pop-Location
}

# Create environment
function Initialize-Environment {
    Write-Step "Creating production environment..."

    Push-Location $PSScriptRoot
    copilot env init --name prod --default-config
    copilot env deploy --name prod
    Pop-Location
}

# Store secrets
function Set-Secrets {
    param(
        [string]$OpenAIKey,
        [string]$UsdaKey,
        [string]$UnsplashKey,
        [string]$RedisUrl
    )

    Write-Step "Storing secrets in AWS SSM..."

    if (-not $OpenAIKey) {
        $OpenAIKey = Read-Host "Enter your OpenAI API key"
    }

    aws ssm put-parameter `
        --name "/copilot/jalapeno/prod/secrets/OPENAI_API_KEY" `
        --value $OpenAIKey `
        --type SecureString `
        --overwrite

    Write-Success "OpenAI API key stored"

    if (-not $UsdaKey) {
        $UsdaKey = Read-Host "Enter your USDA API key (get one at https://fdc.nal.usda.gov/api-key-signup.html)"
    }

    aws ssm put-parameter `
        --name "/copilot/jalapeno/prod/secrets/USDA_API_KEY" `
        --value $UsdaKey `
        --type SecureString `
        --overwrite

    Write-Success "USDA API key stored"

    if (-not $UnsplashKey) {
        $UnsplashKey = Read-Host "Enter your Unsplash API key (get one at https://unsplash.com/developers, or press Enter to skip)"
    }

    if ($UnsplashKey) {
        aws ssm put-parameter `
            --name "/copilot/jalapeno/prod/secrets/UNSPLASH_ACCESS_KEY" `
            --value $UnsplashKey `
            --type SecureString `
            --overwrite

        Write-Success "Unsplash API key stored"
    } else {
        Write-Host "Skipping Unsplash API key (barcode image fallback will be disabled)" -ForegroundColor Yellow
    }

    if (-not $RedisUrl) {
        $RedisUrl = Read-Host "Enter your Redis URL (get one at https://redis.com/try-free/, or press Enter to skip)"
    }

    if ($RedisUrl) {
        aws ssm put-parameter `
            --name "/copilot/jalapeno/prod/secrets/REDIS_URL" `
            --value $RedisUrl `
            --type SecureString `
            --overwrite

        Write-Success "Redis URL stored"
    } else {
        Write-Host "Skipping Redis URL (caching will be disabled)" -ForegroundColor Yellow
    }
}

# Deploy backend
function Deploy-Backend {
    Write-Step "Deploying backend service..."

    Push-Location $PSScriptRoot

    # Initialize service if not exists
    $svcExists = copilot svc ls 2>&1 | Select-String "backend"
    if (-not $svcExists) {
        copilot svc init --name backend --svc-type "Load Balanced Web Service" --dockerfile backend/Dockerfile --port 8000
    }

    # Deploy
    copilot svc deploy --name backend --env prod

    Pop-Location
}

# Deploy frontend to S3 with CloudFront
function Deploy-Frontend {
    Write-Step "Deploying frontend..."

    Push-Location $PSScriptRoot/frontend

    # Get backend URL
    $backendUrl = copilot svc show --name backend --json | ConvertFrom-Json | Select-Object -ExpandProperty routes | Select-Object -First 1 -ExpandProperty url

    Write-Host "Backend URL: $backendUrl"

    # Build frontend
    Write-Step "Building frontend..."
    npm run build

    # Use consistent bucket name
    $bucketName = "jalapeno-frontend-prod"

    # Check if bucket exists
    $bucketExists = aws s3api head-bucket --bucket $bucketName 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Step "Creating S3 bucket: $bucketName"
        aws s3 mb "s3://$bucketName" --region us-east-1
    } else {
        Write-Host "Using existing bucket: $bucketName"
    }

    # Configure for static hosting
    aws s3 website "s3://$bucketName" --index-document index.html --error-document index.html

    # Upload files
    Write-Step "Uploading to S3..."
    aws s3 sync dist/ "s3://$bucketName/" --delete

    # Make public (required for CloudFront with S3 website endpoint)
    $policy = @"
{
    "Version": "2012-10-17",
    "Statement": [{
        "Sid": "PublicRead",
        "Effect": "Allow",
        "Principal": "*",
        "Action": "s3:GetObject",
        "Resource": "arn:aws:s3:::$bucketName/*"
    }]
}
"@

    aws s3api put-public-access-block --bucket $bucketName --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

    # Write policy to temp file (Windows compatible)
    $policyFile = [System.IO.Path]::GetTempFileName()
    [System.IO.File]::WriteAllText($policyFile, $policy, [System.Text.UTF8Encoding]::new($false))
    aws s3api put-bucket-policy --bucket $bucketName --policy "file://$policyFile"
    Remove-Item $policyFile

    Pop-Location

    # Now set up CloudFront
    Deploy-CloudFront -BucketName $bucketName -BackendUrl $backendUrl
}

# Deploy CloudFront distribution
function Deploy-CloudFront {
    param(
        [string]$BucketName = "jalapeno-frontend-prod",
        [string]$BackendUrl
    )

    Write-Step "Setting up CloudFront distribution..."

    # Extract ALB domain from backend URL
    if (-not $BackendUrl) {
        $BackendUrl = copilot svc show --name backend --json | ConvertFrom-Json | Select-Object -ExpandProperty routes | Select-Object -First 1 -ExpandProperty url
    }
    $albDomain = ($BackendUrl -replace "^https?://", "") -replace "/.*$", ""
    Write-Host "ALB Domain: $albDomain"

    # Check if distribution already exists
    $existingDist = aws cloudfront list-distributions --query "DistributionList.Items[?Comment=='jalapeno-frontend'].{Id:Id,Domain:DomainName}" --output json | ConvertFrom-Json

    if ($existingDist -and $existingDist.Count -gt 0) {
        Write-Host "CloudFront distribution already exists: $($existingDist[0].Domain)"
        Write-Host "Distribution ID: $($existingDist[0].Id)"
        Write-Success "Frontend URL: https://$($existingDist[0].Domain)"

        # Invalidate cache
        Write-Step "Invalidating CloudFront cache..."
        aws cloudfront create-invalidation --distribution-id $existingDist[0].Id --paths "/*" | Out-Null
        Write-Success "Cache invalidation started"
        return
    }

    # Create CloudFront distribution config
    $s3Origin = "$BucketName.s3-website-us-east-1.amazonaws.com"

    $distConfig = @"
{
    "CallerReference": "jalapeno-$(Get-Date -Format 'yyyyMMddHHmmss')",
    "Comment": "jalapeno-frontend",
    "Enabled": true,
    "DefaultRootObject": "index.html",
    "Origins": {
        "Quantity": 2,
        "Items": [
            {
                "Id": "S3-frontend",
                "DomainName": "$s3Origin",
                "CustomOriginConfig": {
                    "HTTPPort": 80,
                    "HTTPSPort": 443,
                    "OriginProtocolPolicy": "http-only",
                    "OriginSslProtocols": { "Quantity": 1, "Items": ["TLSv1.2"] }
                }
            },
            {
                "Id": "ALB-backend",
                "DomainName": "$albDomain",
                "CustomOriginConfig": {
                    "HTTPPort": 80,
                    "HTTPSPort": 443,
                    "OriginProtocolPolicy": "http-only",
                    "OriginSslProtocols": { "Quantity": 1, "Items": ["TLSv1.2"] }
                }
            }
        ]
    },
    "DefaultCacheBehavior": {
        "TargetOriginId": "S3-frontend",
        "ViewerProtocolPolicy": "redirect-to-https",
        "AllowedMethods": {
            "Quantity": 2,
            "Items": ["GET", "HEAD"],
            "CachedMethods": { "Quantity": 2, "Items": ["GET", "HEAD"] }
        },
        "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
        "Compress": true
    },
    "CacheBehaviors": {
        "Quantity": 1,
        "Items": [
            {
                "PathPattern": "/api/*",
                "TargetOriginId": "ALB-backend",
                "ViewerProtocolPolicy": "redirect-to-https",
                "AllowedMethods": {
                    "Quantity": 7,
                    "Items": ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"],
                    "CachedMethods": { "Quantity": 2, "Items": ["GET", "HEAD"] }
                },
                "CachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
                "OriginRequestPolicyId": "216adef6-5c7f-47e4-b989-5492eafa07d3",
                "Compress": true
            }
        ]
    },
    "CustomErrorResponses": {
        "Quantity": 2,
        "Items": [
            {
                "ErrorCode": 404,
                "ResponsePagePath": "/index.html",
                "ResponseCode": "200",
                "ErrorCachingMinTTL": 0
            },
            {
                "ErrorCode": 403,
                "ResponsePagePath": "/index.html",
                "ResponseCode": "200",
                "ErrorCachingMinTTL": 0
            }
        ]
    },
    "PriceClass": "PriceClass_100",
    "ViewerCertificate": {
        "CloudFrontDefaultCertificate": true,
        "MinimumProtocolVersion": "TLSv1.2_2021"
    },
    "HttpVersion": "http2"
}
"@

    # Save config to temp file (UTF-8 without BOM for AWS CLI)
    $tempFile = [System.IO.Path]::GetTempFileName()
    [System.IO.File]::WriteAllText($tempFile, $distConfig, [System.Text.UTF8Encoding]::new($false))

    Write-Step "Creating CloudFront distribution (this may take 5-10 minutes)..."
    $result = aws cloudfront create-distribution --distribution-config "file://$tempFile" | ConvertFrom-Json

    Remove-Item $tempFile

    $distId = $result.Distribution.Id
    $distDomain = $result.Distribution.DomainName

    Write-Success "CloudFront distribution created!"
    Write-Host "Distribution ID: $distId"
    Write-Host "Distribution Domain: $distDomain"
    Write-Host ""
    Write-Host "Waiting for deployment (this takes 5-10 minutes)..."
    Write-Host "You can check status with: aws cloudfront get-distribution --id $distId --query 'Distribution.Status'"
    Write-Host ""
    Write-Success "Frontend URL: https://$distDomain"
}

# Show status
function Show-Status {
    Write-Step "Application Status"
    copilot svc status --name backend

    Write-Step "Service URL"
    copilot svc show --name backend
}

# Full deployment
function Deploy-All {
    Test-Prerequisites
    Initialize-App
    Initialize-Environment
    Set-Secrets
    Deploy-Backend
    Deploy-Frontend
    Show-Status
}

# Cleanup
function Remove-All {
    Write-Step "Removing all AWS resources..."

    $confirm = Read-Host "This will delete everything. Type 'yes' to confirm"
    if ($confirm -eq "yes") {
        copilot app delete --yes
        Write-Success "All resources deleted"
    } else {
        Write-Host "Cancelled"
    }
}

# Main
switch ($Command) {
    "check"      { Test-Prerequisites }
    "init"       { Initialize-App }
    "env"        { Initialize-Environment }
    "secrets"    { Set-Secrets }
    "backend"    { Deploy-Backend }
    "frontend"   { Deploy-Frontend }
    "cloudfront" { Deploy-CloudFront }
    "status"     { Show-Status }
    "deploy"     { Deploy-All }
    "delete"     { Remove-All }
    default {
        Write-Host @"

Jalapeno AWS Deployment

Usage: .\deploy-aws.ps1 <command>

Commands:
  check      - Verify prerequisites (AWS CLI, Copilot, Docker)
  deploy     - Full deployment (recommended for first time)
  init       - Initialize Copilot app only
  env        - Create/deploy environment only
  secrets    - Store API keys (OpenAI, USDA, Unsplash)
  backend    - Deploy backend service only
  frontend   - Deploy frontend to S3 + CloudFront (HTTPS)
  cloudfront - Create/update CloudFront distribution only
  status     - Show deployment status
  delete     - Remove all AWS resources

First time? Run:
  .\deploy-aws.ps1 check
  .\deploy-aws.ps1 deploy

"@
    }
}
