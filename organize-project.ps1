# Project Organization Script
# This script will organize the project into a professional structure

# Move setup scripts
Move-Item -Path "setup-helper.js" -Destination "scripts\setup\" -Force -ErrorAction SilentlyContinue
Move-Item -Path "setupEmployees.js" -Destination "scripts\setup\" -Force -ErrorAction SilentlyContinue
Move-Item -Path "run-setup.js" -Destination "scripts\setup\" -Force -ErrorAction SilentlyContinue
Move-Item -Path "create-admin-user.mjs" -Destination "scripts\setup\" -Force -ErrorAction SilentlyContinue
Move-Item -Path "setup-admin.mjs" -Destination "scripts\setup\" -Force -ErrorAction SilentlyContinue
Move-Item -Path "create-auth-users.js" -Destination "scripts\setup\" -Force -ErrorAction SilentlyContinue
Move-Item -Path "create-missing-user.js" -Destination "scripts\setup\" -Force -ErrorAction SilentlyContinue
Move-Item -Path "sync-users.js" -Destination "scripts\setup\" -Force -ErrorAction SilentlyContinue

# Move testing scripts
Move-Item -Path "test-*.js" -Destination "scripts\testing\" -Force -ErrorAction SilentlyContinue
Move-Item -Path "validate-*.js" -Destination "scripts\testing\" -Force -ErrorAction SilentlyContinue
Move-Item -Path "validate-*.cjs" -Destination "scripts\testing\" -Force -ErrorAction SilentlyContinue
Move-Item -Path "verify-*.js" -Destination "scripts\testing\" -Force -ErrorAction SilentlyContinue
Move-Item -Path "check-user-fields.js" -Destination "scripts\testing\" -Force -ErrorAction SilentlyContinue
Move-Item -Path "fix-current-user.js" -Destination "scripts\testing\" -Force -ErrorAction SilentlyContinue

# Move migration scripts
Move-Item -Path "migrate-*.js" -Destination "scripts\migration\" -Force -ErrorAction SilentlyContinue
Move-Item -Path "migrate-*.ts" -Destination "scripts\migration\" -Force -ErrorAction SilentlyContinue
Move-Item -Path "create-attendance-data.js" -Destination "scripts\migration\" -Force -ErrorAction SilentlyContinue
Move-Item -Path "create-test-*.js" -Destination "scripts\migration\" -Force -ErrorAction SilentlyContinue
Move-Item -Path "clean-and-setup-today.js" -Destination "scripts\migration\" -Force -ErrorAction SilentlyContinue
Move-Item -Path "final-cleanup.*" -Destination "scripts\migration\" -Force -ErrorAction SilentlyContinue

# Move documentation
Move-Item -Path "*.md" -Destination "docs\" -Force -ErrorAction SilentlyContinue

Write-Host "Project organization complete!"
