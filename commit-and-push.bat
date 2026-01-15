@echo off
echo ============================================
echo Committing and Pushing Changes
echo ============================================
echo.

git add .
git commit -m "Add clean-photos script and fix migration 008"
git push origin main

echo.
echo ============================================
echo Done!
echo ============================================
pause
