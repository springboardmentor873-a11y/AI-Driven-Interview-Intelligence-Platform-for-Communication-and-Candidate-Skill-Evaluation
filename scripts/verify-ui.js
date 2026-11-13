const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');

console.log('====================================================');
console.log('SmartHire AI - Module 1 UI Verification Suite');
console.log('====================================================');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

// 1. Check Git baseline tag
try {
  const tagHash = execSync('git rev-parse module1-ui-original', { cwd: ROOT_DIR, stdio: 'pipe' }).toString().trim();
  assert(tagHash.length === 40, `Git baseline tag 'module1-ui-original' exists (${tagHash.slice(0, 7)})`);
} catch (e) {
  assert(false, `Git baseline tag 'module1-ui-original' exists`);
}

// 2. Check package.json restore:ui script
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
assert(pkg.scripts && pkg.scripts['restore:ui'] === 'node scripts/restore-ui.js', 'package.json has "restore:ui": "node scripts/restore-ui.js"');

// 3. Check manifest and recorded UI files
const manifestPath = path.join(ROOT_DIR, 'scripts', 'ui-files.json');
assert(fs.existsSync(manifestPath), 'scripts/ui-files.json exists');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert(Array.isArray(manifest.uiFiles) && manifest.uiFiles.length === 21, `Identified and recorded ${manifest.uiFiles.length} UI files in manifest`);

// 4. Verify protected files are preserved
const protectedFiles = [
  'src/lib/firebase.js',
  'src/context/AuthContext.jsx',
  'src/services/authService.js',
  'src/services/userService.js',
  'firebase.json',
  'firestore.rules'
];
protectedFiles.forEach(f => {
  assert(fs.existsSync(path.join(ROOT_DIR, f)), `Protected backend/firebase file exists: ${f}`);
});

// 5. Verify Login page requirements
const loginCode = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/auth/Login.jsx'), 'utf8');
assert(loginCode.includes('setEmail') && loginCode.includes('Email address'), 'Login page has Email input');
assert(loginCode.includes('setPassword') && loginCode.includes('showPasswordToggle'), 'Login page has Password input with show/hide password toggle');
assert(loginCode.includes('/forgot-password'), 'Login page has Forgot Password link');
assert(loginCode.includes('Sign in') || loginCode.includes('Login'), 'Login page has Login button');
assert(loginCode.includes('/register'), 'Login page has Register link');

// 6. Verify Registration page requirements
const registerCode = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/auth/Register.jsx'), 'utf8');
assert(registerCode.includes('setName') && registerCode.includes('Full name'), 'Register page has Full name input');
assert(registerCode.includes('setEmail') && registerCode.includes('Email address'), 'Register page has Email address input');
assert(registerCode.includes('setPassword'), 'Register page has Password input');
assert(registerCode.includes('setConfirmPassword'), 'Register page has Confirm password input');
assert(registerCode.includes('showPasswordToggle'), 'Register page has Show/hide password option');
assert(registerCode.includes('Register') && registerCode.includes('type="submit"'), 'Register page has Register button');
assert(registerCode.includes('/login'), 'Register page has Login link');

// 7. Verify Candidate Dashboard requirements
const candidateCode = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/candidate/CandidateDashboard.jsx'), 'utf8');
assert(candidateCode.includes('Welcome,') && candidateCode.includes('displayName'), 'Candidate Dashboard has Welcome message');
assert(candidateCode.includes('Profile Information') && candidateCode.includes('displayEmail'), 'Candidate Dashboard has Profile information card');

// 8. Verify Recruiter Dashboard requirements
const recruiterCode = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/recruiter/RecruiterDashboard.jsx'), 'utf8');
assert(recruiterCode.includes('Welcome,') && recruiterCode.includes('displayName'), 'Recruiter Dashboard has Welcome message');
assert(recruiterCode.includes('Profile Information') || recruiterCode.includes('Recruiter Profile'), 'Recruiter Dashboard has Profile information card');

// 9. Verify Admin Dashboard requirements
const adminCode = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/admin/AdminDashboard.jsx'), 'utf8');
assert(adminCode.includes('Welcome,') && adminCode.includes('displayName'), 'Admin Dashboard has Welcome message');
assert(adminCode.includes('Platform Overview') || adminCode.includes('Dashboard Overview'), 'Admin Dashboard has Overview section');

// 10. Verify Sidebar and Header (Navigation & Logout)
const sidebarCode = fs.readFileSync(path.join(ROOT_DIR, 'src/components/common/Sidebar.jsx'), 'utf8');
assert(sidebarCode.includes('navLinks') && sidebarCode.includes('handleLogout'), 'Sidebar has role navigation and Logout button');
const headerCode = fs.readFileSync(path.join(ROOT_DIR, 'src/components/common/Header.jsx'), 'utf8');
assert(headerCode.includes('handleLogout') && headerCode.includes('onToggleSidebar'), 'Header has responsive menu toggle and Logout button');

// 11. Run production build
try {
  execSync('npm run build', { cwd: ROOT_DIR, stdio: 'pipe' });
  assert(true, 'Vite production build succeeds without errors');
} catch (e) {
  assert(false, 'Vite production build succeeds');
}

console.log('----------------------------------------------------');
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('All verification checks passed successfully!');
}

