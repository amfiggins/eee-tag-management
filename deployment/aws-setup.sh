#!/bin/bash
# AWS Setup Script for GTM Tag Management Deployment
# This script creates the necessary AWS resources for code distribution

set -e

# Configuration
BUCKET_NAME="${BUCKET_NAME:-3e-gtm-tag-management}"
REGION="${AWS_REGION:-us-east-1}"
CLOUDFRONT_COMMENT="GTM Tag Management Code Distribution"

echo "🚀 Setting up AWS resources for GTM Tag Management"
echo "=================================================="
echo ""

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install it first:"
    echo "   https://aws.amazon.com/cli/"
    exit 1
fi

# Check if bucket exists
if aws s3 ls "s3://${BUCKET_NAME}" 2>&1 | grep -q 'NoSuchBucket'; then
    echo "📦 Creating S3 bucket: ${BUCKET_NAME}"
    aws s3 mb "s3://${BUCKET_NAME}" --region "${REGION}"
    
    # Enable versioning
    echo "  Enabling versioning..."
    aws s3api put-bucket-versioning \
        --bucket "${BUCKET_NAME}" \
        --versioning-configuration Status=Enabled
    
    # Block public access (we'll use CloudFront instead)
    echo "  Blocking public access..."
    aws s3api put-public-access-block \
        --bucket "${BUCKET_NAME}" \
        --public-access-block-configuration \
        "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
    
    echo "✓ Bucket created"
else
    echo "✓ Bucket already exists: ${BUCKET_NAME}"
fi

# Create bucket structure
echo ""
echo "📁 Creating bucket structure..."
aws s3api put-object --bucket "${BUCKET_NAME}" --key "releases/" --body /dev/null 2>/dev/null || true
aws s3api put-object --bucket "${BUCKET_NAME}" --key "manifests/" --body /dev/null 2>/dev/null || true
aws s3api put-object --bucket "${BUCKET_NAME}" --key "checksums/" --body /dev/null 2>/dev/null || true
echo "✓ Bucket structure created"

# Create CloudFront distribution
echo ""
echo "🌐 Creating CloudFront distribution..."
echo "  Note: This may take 10-15 minutes to deploy"

# Create origin access control (OAC) for CloudFront
OAC_NAME="gtm-tag-management-oac"
OAC_ID=$(aws cloudfront list-origin-access-controls --query "OriginAccessControlList.Items[?Name=='${OAC_NAME}'].Id" --output text 2>/dev/null || echo "")

if [ -z "$OAC_ID" ]; then
    echo "  Creating Origin Access Control..."
    OAC_ID=$(aws cloudfront create-origin-access-control \
        --origin-access-control-config \
        "Name=${OAC_NAME},OriginAccessControlOriginType=s3,SigningBehavior=always,SigningProtocol=sigv4" \
        --query 'OriginAccessControl.Id' --output text)
    echo "  ✓ OAC created: ${OAC_ID}"
else
    echo "  ✓ OAC already exists: ${OAC_ID}"
fi

# Get bucket ARN
BUCKET_ARN="arn:aws:s3:::${BUCKET_NAME}"

# Create bucket policy for CloudFront
echo "  Creating bucket policy..."
cat > /tmp/bucket-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipal",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "${BUCKET_ARN}/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::$(aws sts get-caller-identity --query Account --output text):distribution/*"
        }
      }
    }
  ]
}
EOF

aws s3api put-bucket-policy --bucket "${BUCKET_NAME}" --policy file:///tmp/bucket-policy.json
echo "  ✓ Bucket policy updated"

# Check if CloudFront distribution already exists
DIST_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?Comment=='${CLOUDFRONT_COMMENT}'].Id" --output text 2>/dev/null || echo "")

if [ -z "$DIST_ID" ]; then
    echo "  Creating CloudFront distribution..."
    
    # Create distribution config
    cat > /tmp/cloudfront-config.json << EOF
{
  "CallerReference": "gtm-tag-management-$(date +%s)",
  "Comment": "${CLOUDFRONT_COMMENT}",
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-${BUCKET_NAME}",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"],
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      }
    },
    "Compress": true,
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {
        "Forward": "none"
      }
    },
    "MinTTL": 0,
    "DefaultTTL": 3600,
    "MaxTTL": 86400,
    "TrustedSigners": {
      "Enabled": false,
      "Quantity": 0
    },
    "OriginAccessControlId": "${OAC_ID}"
  },
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-${BUCKET_NAME}",
        "DomainName": "${BUCKET_NAME}.s3.${REGION}.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        },
        "OriginAccessControlId": "${OAC_ID}"
      }
    ]
  },
  "Enabled": true,
  "PriceClass": "PriceClass_100"
}
EOF
    
    DIST_OUTPUT=$(aws cloudfront create-distribution --distribution-config file:///tmp/cloudfront-config.json)
    DIST_ID=$(echo "$DIST_OUTPUT" | jq -r '.Distribution.Id')
    DIST_DOMAIN=$(echo "$DIST_OUTPUT" | jq -r '.Distribution.DomainName')
    
    echo "  ✓ CloudFront distribution created"
    echo "  Distribution ID: ${DIST_ID}"
    echo "  Domain: ${DIST_DOMAIN}"
    echo ""
    echo "  ⚠️  Note: CloudFront distribution takes 10-15 minutes to deploy"
    echo "  You can check status with:"
    echo "    aws cloudfront get-distribution --id ${DIST_ID}"
else
    DIST_DOMAIN=$(aws cloudfront get-distribution --id "$DIST_ID" --query 'Distribution.DomainName' --output text)
    echo "  ✓ CloudFront distribution already exists"
    echo "  Distribution ID: ${DIST_ID}"
    echo "  Domain: ${DIST_DOMAIN}"
fi

# Cleanup
rm -f /tmp/bucket-policy.json /tmp/cloudfront-config.json

echo ""
echo "✅ AWS setup complete!"
echo ""
echo "Next steps:"
echo "1. Update your GitHub Actions workflow with:"
echo "   - S3_BUCKET: ${BUCKET_NAME}"
echo "   - CLOUDFRONT_DISTRIBUTION_ID: ${DIST_ID}"
echo ""
echo "2. Update auto_updater.py with CloudFront URL:"
echo "   DEFAULT_MANIFEST_URL = 'https://${DIST_DOMAIN}/manifests/latest.json'"
echo ""
echo "3. Add AWS credentials to GitHub Secrets:"
echo "   - AWS_ACCESS_KEY_ID"
echo "   - AWS_SECRET_ACCESS_KEY"
echo ""
echo "4. Test the deployment by pushing to main branch"
