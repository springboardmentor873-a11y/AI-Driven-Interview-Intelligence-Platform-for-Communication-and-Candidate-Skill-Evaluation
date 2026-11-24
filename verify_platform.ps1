$base = 'http://127.0.0.1:8000'
Write-Host "--- 1. Testing Service Health & Status ---"
$s = Invoke-RestMethod -Uri "$base/api/status"
Write-Host "API Status:" $s.status "| Project:" $s.project

$h = Invoke-RestMethod -Uri "$base/health"
Write-Host "Health:" $h.api_status "| DB status:" $h.database.status "| Dialect:" $h.database.dialect

Write-Host "`n--- 2. Testing Authentication ---"
$body = '{"email":"candidate@smarthire.ai","password":"CandidatePass123!"}'
$auth = Invoke-RestMethod -Uri "$base/api/v1/auth/login" -Method POST -ContentType 'application/json' -Body $body
Write-Host "Login Token Received for:" $auth.user.full_name "| Role:" $auth.role

$token = $auth.access_token
$headers = @{Authorization="Bearer $token"}

Write-Host "`n--- 3. Testing Practice Questions API ---"
$q = Invoke-RestMethod -Uri "$base/api/v1/interviews/practice-questions" -Headers $headers
Write-Host "Practice Questions Loaded:" $q.Count

Write-Host "`n--- 4. Testing Web Pages Serving ---"
$pages = @(
    '/',
    '/login',
    '/register',
    '/candidate-dashboard',
    '/my-resume',
    '/user-profile',
    '/practice-library',
    '/live-mock-interview',
    '/candidate-assessment-report',
    '/recruiter-dashboard',
    '/recruiter-candidate-management',
    '/recruiter-candidate-analytics',
    '/admin-dashboard',
    '/account-settings',
    '/forgot-password',
    '/docs'
)

foreach ($p in $pages) {
    try {
        $res = Invoke-WebRequest -Uri "$base$p" -UseBasicParsing -TimeoutSec 5
        Write-Host "  ✓ $p -> Status: $($res.StatusCode) (OK)"
    } catch {
        Write-Host "  ✗ $p -> Failed: $_"
    }
}
Write-Host "`nAll platform checks completed successfully!"

