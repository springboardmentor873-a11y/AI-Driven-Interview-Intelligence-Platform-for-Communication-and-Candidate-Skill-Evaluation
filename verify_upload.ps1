$base = 'http://127.0.0.1:8000'

# Login
$body = '{"email":"candidate@smarthire.ai","password":"CandidatePass123!"}'
$auth = Invoke-RestMethod -Uri "$base/api/v1/auth/login" -Method POST -ContentType 'application/json' -Body $body
$token = $auth.access_token

# Create dummy sample resume PDF file
$dummyPdf = "Alex_Morgan_Resume.pdf"
[System.IO.File]::WriteAllBytes($dummyPdf, [System.Text.Encoding]::UTF8.GetBytes("%PDF-1.4 Sample Resume Alex Morgan Full Stack Engineer"))

# Upload using curl.exe
$uploadRes = & curl.exe -s -X POST "$base/api/v1/resumes/upload" -H "Authorization: Bearer $token" -F "file=@$dummyPdf" -F "is_primary=true" | ConvertFrom-Json
Write-Host "Uploaded Resume ID: $($uploadRes.id) | File: $($uploadRes.original_filename) | Status: $($uploadRes.upload_status)"

# Verify list
$resumes = Invoke-RestMethod -Uri "$base/api/v1/resumes/my-resumes" -Headers @{Authorization="Bearer $token"}
Write-Host "Total Resumes for Candidate: $($resumes.Count)"

# Clean up local dummy file
Remove-Item $dummyPdf -ErrorAction SilentlyContinue
Write-Host "Resume upload and retrieval verified successfully!"

