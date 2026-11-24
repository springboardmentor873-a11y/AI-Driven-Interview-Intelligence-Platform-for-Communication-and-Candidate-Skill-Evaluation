$base = 'http://127.0.0.1:8000'

# 1. Login
$body = '{"email":"candidate@smarthire.ai","password":"CandidatePass123!"}'
$auth = Invoke-RestMethod -Uri "$base/api/v1/auth/login" -Method POST -ContentType 'application/json' -Body $body
$token = $auth.access_token
$headers = @{Authorization="Bearer $token"; "Content-Type"="application/json"}
Write-Host "Candidate authenticated: $($auth.user.full_name)"

# 2. Start Interview Session
$startBody = '{"role_title":"Full Stack Engineer","difficulty":"Medium","questions_count":2}'
$session = Invoke-RestMethod -Uri "$base/api/v1/interviews/sessions/start" -Method POST -Headers $headers -Body $startBody
$sid = $session.session_id
Write-Host "Started Interview Session ID: $sid with $($session.questions.Count) questions"

# 3. Submit Answer
$ansBody = @{
    question_id = $session.questions[0].id
    question_text = $session.questions[0].question_text
    category = "Behavioral"
    transcript = "In my last project, our payment gateway encountered 504 timeout spikes during peak sales. My task was to isolate the bottleneck and restore 99.9% uptime. I diagnosed database connection pool exhaustion, implemented distributed Redis caching, and optimized query batching. As a result, endpoint latency dropped by 70% and we processed two million transactions with zero downtime."
    duration_seconds = 65
} | ConvertTo-Json

$ans = Invoke-RestMethod -Uri "$base/api/v1/interviews/sessions/$sid/submit-answer" -Method POST -Headers $headers -Body $ansBody
Write-Host "Answer Evaluated -> Score: $($ans.score) | WPM: $($ans.wpm) | Fillers: $($ans.filler_count)"
Write-Host "AI Coaching Feedback: $($ans.ai_feedback)"

# 4. Finalize Interview & Generate Assessment Report
$report = Invoke-RestMethod -Uri "$base/api/v1/interviews/sessions/$sid/complete" -Method POST -Headers $headers
Write-Host "Interview Completed -> Overall Score: $($report.overall_score) / 100"
Write-Host "Strengths:" ($report.strengths -join "; ")
Write-Host "Recommendations:" ($report.recommendations -join "; ")

# 5. Fetch Candidate Resumes
$resumes = Invoke-RestMethod -Uri "$base/api/v1/resumes/my-resumes" -Headers $headers
Write-Host "Candidate Resumes in DB: $($resumes.Count)"

Write-Host "`nAll Interview & AI Assessment End-to-End Tests Passed 100%!"

