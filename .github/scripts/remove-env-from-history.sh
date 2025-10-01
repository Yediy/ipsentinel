#!/bin/bash
# Script to remove .env from Git history
# Run this ONLY if .env was accidentally committed

set -e

echo "⚠️  WARNING: This will rewrite Git history!"
echo "Make sure you have a backup and all team members are aware."
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

# Check if git-filter-repo is installed
if ! command -v git-filter-repo &> /dev/null; then
    echo "❌ git-filter-repo not found. Install it first:"
    echo "   pip install git-filter-repo"
    echo "   or: brew install git-filter-repo (macOS)"
    exit 1
fi

echo "🔄 Removing .env from history..."
git filter-repo --invert-paths --path .env --force

echo "✅ .env removed from history"
echo ""
echo "Next steps:"
echo "1. Force push to remote: git push --force --all"
echo "2. Notify all team members to re-clone the repository"
echo "3. Verify .env is now in .gitignore"
