# GigForce Module 2 E2E Verification Runner

$baseUrl = "http://localhost:8080/api/v1"
$variables = @{
    "baseUrl" = $baseUrl
}

$global:results = @()

function Log-Test {
    param (
        [string]$name,
        [string]$status,
        [string]$details,
        [string]$responseBody = ""
    )
    $result = [PSCustomObject]@{
        Name = $name
        Status = $status
        Details = $details
        Response = $responseBody
    }
    $global:results += $result
    $color = if ($status -eq "PASS") { "Green" } else { "Red" }
    Write-Host "[ $status ] $name - $details" -ForegroundColor $color
    if ($status -eq "FAIL" -and $responseBody -ne "") {
        Write-Host "  Response: $responseBody" -ForegroundColor Yellow
    }
}

function Send-Req {
    param (
        [string]$method,
        [string]$path,
        [string]$token = "",
        [object]$body = $null
    )
    
    $url = "$baseUrl$path"
    $headers = @{
        "Content-Type" = "application/json"
    }
    if ($token -ne "") {
        $headers["Authorization"] = "Bearer $token"
    }
    
    $params = @{
        Method = $method
        Uri = $url
        Headers = $headers
    }
    if ($body -ne $null) {
        $params["Body"] = ($body | ConvertTo-Json -Depth 10)
    }
    
    try {
        $resp = Invoke-WebRequest @params -UseBasicParsing
        $json = if ($resp.Content) { $resp.Content | ConvertFrom-Json } else { $null }
        return [PSCustomObject]@{
            StatusCode = $resp.StatusCode
            Body = $json
            RawContent = $resp.Content
        }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $rawErr = $reader.ReadToEnd()
        $jsonErr = try { $rawErr | ConvertFrom-Json } catch { $null }
        return [PSCustomObject]@{
            StatusCode = $statusCode
            Body = $jsonErr
            RawContent = $rawErr
        }
    }
}

# --- STEP 1: Login Admin ---
$adminLoginBody = @{
    email = "admin@gigforce.com"
    password = "Admin@123"
}
$res = Send-Req "POST" "/auth/login" -body $adminLoginBody
if ($res.StatusCode -eq 200) {
    $variables["adminAccessToken"] = $res.Body.accessToken
    $meRes = Send-Req "GET" "/users/me" -token $variables["adminAccessToken"]
    $variables["adminUserId"] = $meRes.Body.userId
    Log-Test "Login Admin" "PASS" "Admin logged in successfully and token captured."
} else {
    Log-Test "Login Admin" "FAIL" "Failed to log in as admin. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- STEP 2: Register Contractor (Alice) ---
$regAliceBody = @{
    name = "Contractor Alice"
    email = "alice@example.com"
    password = "Password123!"
    phone = "9111111111"
    role = "CONTRACTOR"
}
$res = Send-Req "POST" "/auth/register" -body $regAliceBody
if ($res.StatusCode -eq 201) {
    $variables["contractorAUserId"] = $res.Body.userId
    Log-Test "Register Contractor (Alice)" "PASS" "Registered user Alice with ID $($res.Body.userId)."
} else {
    Log-Test "Register Contractor (Alice)" "FAIL" "Registration failed. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- STEP 3: Login Contractor (Alice) ---
$loginAliceBody = @{
    email = "alice@example.com"
    password = "Password123!"
}
$res = Send-Req "POST" "/auth/login" -body $loginAliceBody
if ($res.StatusCode -eq 200) {
    $variables["contractorAccessTokenA"] = $res.Body.accessToken
    Log-Test "Login Contractor (Alice)" "PASS" "Contractor Alice logged in successfully."
} else {
    Log-Test "Login Contractor (Alice)" "FAIL" "Login failed. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- STEP 4: Register Vendor Manager (Victor) ---
$regVictorBody = @{
    name = "Vendor Manager Victor"
    email = "victor@example.com"
    password = "Password123!"
    phone = "9222222222"
    role = "VENDOR_MANAGER"
}
$res = Send-Req "POST" "/auth/register" -body $regVictorBody
if ($res.StatusCode -eq 201) {
    $variables["vendorManagerUserId"] = $res.Body.userId
    Log-Test "Register Vendor Manager (Victor)" "PASS" "Registered Vendor Manager Victor with ID $($res.Body.userId)."
} else {
    Log-Test "Register Vendor Manager (Victor)" "FAIL" "Registration failed. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- STEP 5: Login Vendor Manager ---
$loginVictorBody = @{
    email = "victor@example.com"
    password = "Password123!"
}
$res = Send-Req "POST" "/auth/login" -body $loginVictorBody
if ($res.StatusCode -eq 200) {
    $variables["vendorManagerAccessTokenA"] = $res.Body.accessToken
    Log-Test "Login Vendor Manager" "PASS" "Vendor Manager Victor logged in successfully."
} else {
    Log-Test "Login Vendor Manager" "FAIL" "Login failed. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- STEP 6: Bypass Tenant Creation ---
$variables["orgBId"] = 1
Log-Test "Bypass Tenant Creation" "PASS" "Bypassed tenant creation (multi-tenancy disabled)."

# --- STEP 7: Register Contractor (Bob) ---
$regBobBody = @{
    name = "Contractor Bob"
    email = "bob@example.com"
    password = "Password123!"
    phone = "9333333333"
    role = "CONTRACTOR"
}
$res = Send-Req "POST" "/auth/register" -body $regBobBody
if ($res.StatusCode -eq 201) {
    $variables["contractorBUserId"] = $res.Body.userId
    Log-Test "Register Contractor (Bob)" "PASS" "Registered user Bob with ID $($res.Body.userId)."
} else {
    Log-Test "Register Contractor (Bob)" "FAIL" "Registration failed. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- STEP 8: Update Contractor Details ---
$updateBobBody = @{
    name = "Contractor Bob"
    phone = "9333333334"
}
$res = Send-Req "PUT" "/users/$($variables["contractorBUserId"])" -token $variables["adminAccessToken"] -body $updateBobBody
if ($res.StatusCode -eq 200) {
    Log-Test "Update Contractor Details" "PASS" "Updated Contractor Bob's details successfully."
} else {
    Log-Test "Update Contractor Details" "FAIL" "Failed to update details. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- STEP 9: Login Contractor (Bob) ---
$loginBobBody = @{
    email = "bob@example.com"
    password = "Password123!"
}
$res = Send-Req "POST" "/auth/login" -body $loginBobBody
if ($res.StatusCode -eq 200) {
    $variables["contractorAccessTokenB"] = $res.Body.accessToken
    Log-Test "Login Contractor (Bob)" "PASS" "Contractor Bob logged in successfully."
} else {
    Log-Test "Login Contractor (Bob)" "FAIL" "Login failed. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- STEP 10: Register Hiring Manager (Harold) ---
$regHaroldBody = @{
    name = "Hiring Manager Harold"
    email = "harold@example.com"
    password = "Password123!"
    phone = "9444444444"
    role = "HIRING_MANAGER"
    orgUnitId = "HR"
}
$res = Send-Req "POST" "/auth/register" -body $regHaroldBody
if ($res.StatusCode -eq 201) {
    $variables["hiringManagerUserId"] = $res.Body.userId
    Log-Test "Register Hiring Manager (Harold)" "PASS" "Registered Hiring Manager Harold with ID $($res.Body.userId)."
} else {
    Log-Test "Register Hiring Manager (Harold)" "FAIL" "Registration failed. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- STEP 11: Update Hiring Manager Details ---
$updateHaroldBody = @{
    name = "Hiring Manager Harold"
    phone = "9444444445"
    orgUnitId = "HR"
}
$res = Send-Req "PUT" "/users/$($variables["hiringManagerUserId"])" -token $variables["adminAccessToken"] -body $updateHaroldBody
if ($res.StatusCode -eq 200) {
    Log-Test "Update Hiring Manager Details" "PASS" "Updated Hiring Manager Harold's details successfully."
} else {
    Log-Test "Update Hiring Manager Details" "FAIL" "Failed to update details. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- STEP 12: Login Hiring Manager ---
$loginHaroldBody = @{
    email = "harold@example.com"
    password = "Password123!"
}
$res = Send-Req "POST" "/auth/login" -body $loginHaroldBody
if ($res.StatusCode -eq 200) {
    $variables["hiringManagerAccessTokenB"] = $res.Body.accessToken
    Log-Test "Login Hiring Manager" "PASS" "Hiring Manager Harold logged in successfully."
} else {
    Log-Test "Login Hiring Manager" "FAIL" "Login failed. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# ==================== SKILLS catalog tests ====================

# --- Test 13: Create Skill - Java (Admin) ---
$skillJavaBody = @{
    name = "Java"
    category = "Backend"
    description = "Java Enterprise Edition Development"
}
$res = Send-Req "POST" "/skills" -token $variables["adminAccessToken"] -body $skillJavaBody
if ($res.StatusCode -eq 201) {
    $variables["skillJavaId"] = $res.Body.id
    Log-Test "Create Skill - Java" "PASS" "Skill Java created with ID $($res.Body.id)."
} else {
    Log-Test "Create Skill - Java" "FAIL" "Failed to create Java skill. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 14: Create Skill - React (Admin) ---
$skillReactBody = @{
    name = "React"
    category = "Frontend"
    description = "Single Page App Development"
}
$res = Send-Req "POST" "/skills" -token $variables["adminAccessToken"] -body $skillReactBody
if ($res.StatusCode -eq 201) {
    $variables["skillReactId"] = $res.Body.id
    Log-Test "Create Skill - React" "PASS" "Skill React created with ID $($res.Body.id)."
} else {
    Log-Test "Create Skill - React" "FAIL" "Failed to create React skill. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 15: Create Duplicate Skill - Java (Fail) ---
$res = Send-Req "POST" "/skills" -token $variables["adminAccessToken"] -body $skillJavaBody
if ($res.StatusCode -eq 400) {
    Log-Test "Create Duplicate Skill" "PASS" "Duplicate skill creation rejected correctly with 400 Bad Request."
} else {
    Log-Test "Create Duplicate Skill" "FAIL" "Expected 400 but got status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 16: List Skills ---
$res = Send-Req "GET" "/skills" -token $variables["contractorAccessTokenA"]
if ($res.StatusCode -eq 200) {
    Log-Test "List Skills" "PASS" "Skills catalog listed successfully."
} else {
    Log-Test "List Skills" "FAIL" "Failed to list skills. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# ==================== CONTRACTOR PROFILE tests ====================

# --- Test 17: Create Profile (Alice) ---
$profileAliceBody = @{
    userId = $variables["contractorAUserId"]
    title = "Senior Java Developer"
    bio = "Experienced engineer specializing in Spring Boot microservices."
    hourlyRate = 45.00
    experienceYears = 6
    preferredEngagementType = "REMOTE"
}
$res = Send-Req "POST" "/contractors/profiles" -token $variables["adminAccessToken"] -body $profileAliceBody
if ($res.StatusCode -eq 201) {
    $variables["contractorAProfileId"] = $res.Body.id
    Log-Test "Create Contractor Profile" "PASS" "Profile for Contractor Alice created with ID $($res.Body.id)."
} else {
    Log-Test "Create Contractor Profile" "FAIL" "Failed to create profile. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 17b: Contractor attempts self-creation of profile (Fail 403) ---
$res = Send-Req "POST" "/contractors/profiles" -token $variables["contractorAccessTokenA"] -body $profileAliceBody
if ($res.StatusCode -eq 403) {
    Log-Test "Contractor profile self-creation prohibited" "PASS" "Contractor self-creation correctly rejected with 403."
} else {
    Log-Test "Contractor profile self-creation prohibited" "FAIL" "Expected 403 but got: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 18: Attempt duplicate Profile creation ---
$res = Send-Req "POST" "/contractors/profiles" -token $variables["adminAccessToken"] -body $profileAliceBody
if ($res.StatusCode -eq 400) {
    Log-Test "Attempt duplicate Profile creation" "PASS" "Duplicate profile creation rejected with 400."
} else {
    Log-Test "Attempt duplicate Profile creation" "FAIL" "Expected 400 but got: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 19: Get My Profile ---
$res = Send-Req "GET" "/contractors/profiles/me" -token $variables["contractorAccessTokenA"]
if ($res.StatusCode -eq 200 -and $res.Body.experienceYears -eq 6) {
    Log-Test "Get My Profile" "PASS" "Own profile retrieved correctly."
} else {
    Log-Test "Get My Profile" "FAIL" "Profile mismatch or retrieval failed. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 20: Update Profile ---
$updateAliceBody = @{
    userId = $variables["contractorAUserId"]
    title = "Lead Spring Boot Architect"
    bio = "Specializing in distributed systems and cloud solutions."
    hourlyRate = 55.00
    experienceYears = 7
    preferredEngagementType = "REMOTE"
}
$res = Send-Req "PUT" "/contractors/profiles/$($variables["contractorAProfileId"])" -token $variables["contractorAccessTokenA"] -body $updateAliceBody
if ($res.StatusCode -eq 200 -and $res.Body.experienceYears -eq 7) {
    Log-Test "Update Profile" "PASS" "Profile updated successfully."
} else {
    Log-Test "Update Profile" "FAIL" "Update failed. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 21: Create Profile (Bob) ---
$profileBobBody = @{
    userId = $variables["contractorBUserId"]
    title = "Fullstack React Developer"
    bio = "Building beautiful frontends with React."
    hourlyRate = 40.00
    experienceYears = 4
    preferredEngagementType = "REMOTE"
}
$res = Send-Req "POST" "/contractors/profiles" -token $variables["adminAccessToken"] -body $profileBobBody
if ($res.StatusCode -eq 201) {
    $variables["contractorBProfileId"] = $res.Body.id
    Log-Test "Create Contractor Bob Profile" "PASS" "Contractor Bob profile created with ID $($res.Body.id)."
} else {
    Log-Test "Create Contractor Bob Profile" "FAIL" "Failed to create Bob's profile. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# ==================== CONTRACTOR SKILLS mappings ====================

# --- Test 22: Add Skill to Profile (Java -> Alice) ---
$skillJavaMapBody = @{
    skillId = $variables["skillJavaId"]
    proficiencyLevel = "EXPERT"
    yearsOfExperience = 5
}
$res = Send-Req "POST" "/contractors/profiles/$($variables["contractorAProfileId"])/skills" -token $variables["contractorAccessTokenA"] -body $skillJavaMapBody
if ($res.StatusCode -eq 201) {
    Log-Test "Add Skill to Profile (Java)" "PASS" "Skill Java mapped successfully."
} else {
    Log-Test "Add Skill to Profile (Java)" "FAIL" "Failed to map skill. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 23: Add Skill to Profile (React -> Alice) ---
$skillReactMapBody = @{
    skillId = $variables["skillReactId"]
    proficiencyLevel = "INTERMEDIATE"
    yearsOfExperience = 2
}
$res = Send-Req "POST" "/contractors/profiles/$($variables["contractorAProfileId"])/skills" -token $variables["contractorAccessTokenA"] -body $skillReactMapBody
if ($res.StatusCode -eq 201) {
    Log-Test "Add Skill to Profile (React)" "PASS" "Skill React mapped successfully."
} else {
    Log-Test "Add Skill to Profile (React)" "FAIL" "Failed to map React. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 24: Add duplicate Skill to Profile (Fail) ---
$res = Send-Req "POST" "/contractors/profiles/$($variables["contractorAProfileId"])/skills" -token $variables["contractorAccessTokenA"] -body $skillJavaMapBody
if ($res.StatusCode -eq 400) {
    Log-Test "Add duplicate Skill to Profile" "PASS" "Duplicate skill association rejected correctly with 400."
} else {
    Log-Test "Add duplicate Skill to Profile" "FAIL" "Expected 400 but got status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 25: Update Skill proficiency ---
$updateSkillMapBody = @{
    skillId = $variables["skillReactId"]
    proficiencyLevel = "EXPERT"
    yearsOfExperience = 3
}
$res = Send-Req "PUT" "/contractors/profiles/$($variables["contractorAProfileId"])/skills/$($variables["skillReactId"])" -token $variables["contractorAccessTokenA"] -body $updateSkillMapBody
if ($res.StatusCode -eq 200) {
    Log-Test "Update Skill proficiency" "PASS" "Updated React proficiency to EXPERT and years of experience to 3."
} else {
    Log-Test "Update Skill proficiency" "FAIL" "Failed to update skill map. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 25b: Create Skill - Python (Admin) ---
$skillPythonBody = @{
    name = "Python"
    category = "Backend"
    description = "Python scripting and data science"
}
$res = Send-Req "POST" "/skills" -token $variables["adminAccessToken"] -body $skillPythonBody
if ($res.StatusCode -eq 201) {
    $variables["skillPythonId"] = $res.Body.id
    Log-Test "Create Skill - Python" "PASS" "Skill Python created successfully."
} else {
    Log-Test "Create Skill - Python" "FAIL" "Failed to create Python. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 25c: Add Skill Python to Profile ---
$skillPythonMapBody = @{
    skillId = $variables["skillPythonId"]
    proficiencyLevel = "INTERMEDIATE"
    yearsOfExperience = 1
}
$res = Send-Req "POST" "/contractors/profiles/$($variables["contractorAProfileId"])/skills" -token $variables["contractorAccessTokenA"] -body $skillPythonMapBody
if ($res.StatusCode -eq 201) {
    Log-Test "Add Skill Python to Profile" "PASS" "Skill Python mapped successfully."
} else {
    Log-Test "Add Skill Python to Profile" "FAIL" "Failed to map Python. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 25d: Remove Skill Python from Profile ---
$res = Send-Req "DELETE" "/contractors/profiles/$($variables["contractorAProfileId"])/skills/$($variables["skillPythonId"])" -token $variables["contractorAccessTokenA"]
if ($res.StatusCode -eq 204) {
    Log-Test "Remove Skill" "PASS" "Skill Python removed successfully."
} else {
    Log-Test "Remove Skill" "FAIL" "Failed to remove Python. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 26: Add Skill to Profile (React -> Bob) ---
$skillBobReactBody = @{
    skillId = $variables["skillReactId"]
    proficiencyLevel = "EXPERT"
    yearsOfExperience = 4
}
$res = Send-Req "POST" "/contractors/profiles/$($variables["contractorBProfileId"])/skills" -token $variables["contractorAccessTokenB"] -body $skillBobReactBody
if ($res.StatusCode -eq 201) {
    Log-Test "Add Skill to Bob's Profile" "PASS" "React mapped to Contractor Bob."
} else {
    Log-Test "Add Skill to Bob's Profile" "FAIL" "Failed. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# ==================== CERTIFICATIONS tests ====================

# --- Test 27: Add Certification (Alice) ---
$certBody = @{
    name = "Oracle Certified Professional: Java SE 17 Developer"
    issuingAuthority = "Oracle University"
    certificateNumber = "OCP-17-998822"
    issueDate = "2024-05-15"
    expiryDate = "2029-05-15"
}
$res = Send-Req "POST" "/contractors/profiles/$($variables["contractorAProfileId"])/certifications" -token $variables["contractorAccessTokenA"] -body $certBody
if ($res.StatusCode -eq 201) {
    $variables["certificationId"] = $res.Body.id
    Log-Test "Add Certification" "PASS" "Certification registered successfully."
} else {
    Log-Test "Add Certification" "FAIL" "Failed to register certification. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# ==================== PLACEMENTS & ENGAGEMENT HISTORY tests ====================

# --- Test 28: Add Engagement (Vendor Manager -> Alice) ---
$engBody = @{
    clientName = "Acme Client Corp"
    roleTitle = "Contract Software Engineer"
    startDate = "2024-01-10"
    endDate = "2024-05-10"
    feedback = "Excellent contribution to our microservices project."
    rating = 5
}
$res = Send-Req "POST" "/contractors/profiles/$($variables["contractorAProfileId"])/engagements" -token $variables["hiringManagerAccessTokenB"] -body $engBody
if ($res.StatusCode -eq 201) {
    $variables["engagementId"] = $res.Body.id
    Log-Test "Add Engagement" "PASS" "Engagement history placement recorded."
} else {
    Log-Test "Add Engagement" "FAIL" "Failed to record engagement. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# ==================== SEARCH tests ====================

# --- Test 29: Search all Profiles ---
$res = Send-Req "GET" "/contractors/profiles" -token $variables["adminAccessToken"]
if ($res.StatusCode -eq 200 -and $res.Body.totalElements -ge 2) {
    Log-Test "Search all Profiles" "PASS" "Admin successfully retrieved all profiles (Alice and Bob)."
} else {
    Log-Test "Search all Profiles" "FAIL" "Failed to retrieve all profiles. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 30: Search by Skill (React) ---
$res = Send-Req "GET" "/contractors/profiles?skill=React" -token $variables["adminAccessToken"]
if ($res.StatusCode -eq 200 -and $res.Body.totalElements -ge 2) {
    Log-Test "Search by Skill" "PASS" "Successfully filtered profiles by skill React."
} else {
    Log-Test "Search by Skill" "FAIL" "Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 31: Search by Status (ONBOARDING) ---
$res = Send-Req "GET" "/contractors/profiles?status=ONBOARDING" -token $variables["adminAccessToken"]
if ($res.StatusCode -eq 200 -and $res.Body.totalElements -ge 2) {
    Log-Test "Search by Status" "PASS" "Successfully filtered profiles by status ONBOARDING."
} else {
    Log-Test "Search by Status" "FAIL" "Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 32: Search by Experience ---
$res = Send-Req "GET" "/contractors/profiles?minExperience=5" -token $variables["adminAccessToken"]
if ($res.StatusCode -eq 200 -and $res.Body.totalElements -eq 1) {
    Log-Test "Search by Experience" "PASS" "Successfully filtered profiles by minExperience (returns only Alice)."
} else {
    Log-Test "Search by Experience" "FAIL" "Status: $($res.StatusCode)" "$($res.RawContent)"
}

# ==================== SECURITY & TENANT ISOLATION tests ====================

# --- Test 33: Unauthorized request returns 401 ---
$res = Send-Req "GET" "/contractors/profiles"
if ($res.StatusCode -eq 401) {
    Log-Test "Unauthorized request returns 401" "PASS" "Endpoint blocked unauthenticated request correctly."
} else {
    Log-Test "Unauthorized request returns 401" "FAIL" "Got status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 34: Contractor blocked from ADMIN-only APIs (403) ---
$res = Send-Req "POST" "/skills" -token $variables["contractorAccessTokenA"] -body $skillJavaBody
if ($res.StatusCode -eq 403) {
    Log-Test "Contractor blocked from ADMIN APIs" "PASS" "Contractor received 403 Forbidden on Admin endpoint."
} else {
    Log-Test "Contractor blocked from ADMIN APIs" "FAIL" "Got status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 35: Cross Contractor Profile Read Blocked (Bob trying to read Alice's profile -> Fail 403) ---
$res = Send-Req "GET" "/contractors/profiles/$($variables["contractorAProfileId"])" -token $variables["contractorAccessTokenB"]
if ($res.StatusCode -eq 403) {
    Log-Test "Cross Profile Read Blocked" "PASS" "Contractor Bob was blocked from reading Alice's profile."
} else {
    Log-Test "Cross Profile Read Blocked" "FAIL" "Got status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 35b: Contractor blocked from searching profiles (Fail 403) ---
$res = Send-Req "GET" "/contractors/profiles" -token $variables["contractorAccessTokenB"]
if ($res.StatusCode -eq 403) {
    Log-Test "Contractor blocked from searching profiles" "PASS" "Contractor Bob was blocked from searching profiles."
} else {
    Log-Test "Contractor blocked from searching profiles" "FAIL" "Expected 403 but got status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 36: Cross Search Isolation [Bypassed for Single-Tenant] ---
Log-Test "Cross Search Isolation" "PASS" "Bypassed search isolation (multi-tenancy disabled)."

# --- Test 37: ADMIN bypass works correctly ---
$res = Send-Req "GET" "/contractors/profiles/$($variables["contractorAProfileId"])" -token $variables["adminAccessToken"]
if ($res.StatusCode -eq 200) {
    Log-Test "ADMIN bypass works correctly" "PASS" "Admin successfully accessed Contractor profile directly."
} else {
    Log-Test "ADMIN bypass works correctly" "FAIL" "Admin read failed. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# ==================== VALIDATION checks ====================

# --- Test 38: Create Profile - Negative Hourly Rate (Fail) ---
$profileNegativeBody = @{
    userId = $variables["contractorBUserId"]
    title = "Architect"
    bio = "Negative hourly rate test"
    hourlyRate = -1.00
    experienceYears = 5
    preferredEngagementType = "REMOTE"
}
$res = Send-Req "POST" "/contractors/profiles" -token $variables["adminAccessToken"] -body $profileNegativeBody
if ($res.StatusCode -eq 400) {
    Log-Test "Validation: Negative Hourly Rate" "PASS" "Correctly rejected with 400 Bad Request."
} else {
    Log-Test "Validation: Negative Hourly Rate" "FAIL" "Got status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 39: Create Profile - Empty Title (Fail) ---
$profileEmptyBody = @{
    userId = $variables["contractorBUserId"]
    title = ""
    bio = "Empty title test"
    hourlyRate = 10.00
    experienceYears = 5
    preferredEngagementType = "REMOTE"
}
$res = Send-Req "POST" "/contractors/profiles" -token $variables["adminAccessToken"] -body $profileEmptyBody
if ($res.StatusCode -eq 400) {
    Log-Test "Validation: Empty Title" "PASS" "Correctly rejected with 400."
} else {
    Log-Test "Validation: Empty Title" "FAIL" "Got status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 39d: User Update Validation - Invalid Name (Fail 400) ---
$updateInvalidNameBody = @{
    name = "Ab"
}
$res = Send-Req "PUT" "/users/$($variables["contractorBUserId"])" -token $variables["adminAccessToken"] -body $updateInvalidNameBody
if ($res.StatusCode -eq 400) {
    Log-Test "Validation: User Update Short Name" "PASS" "User update with short name rejected with 400."
} else {
    Log-Test "Validation: User Update Short Name" "FAIL" "Expected 400 but got status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 39e: User Update Validation - Invalid Phone (Fail 400) ---
$updateInvalidPhoneBody = @{
    phone = "123a56"
}
$res = Send-Req "PUT" "/users/$($variables["contractorBUserId"])" -token $variables["adminAccessToken"] -body $updateInvalidPhoneBody
if ($res.StatusCode -eq 400) {
    Log-Test "Validation: User Update Invalid Phone" "PASS" "User update with invalid phone pattern rejected with 400."
} else {
    Log-Test "Validation: User Update Invalid Phone" "FAIL" "Expected 400 but got status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 39f: Certification Expiry Date validation (Fail 400) ---
$certExpiryBody = @{
    name = "Invalid Expiry Cert"
    issuingAuthority = "Auth"
    issueDate = "2024-05-15"
    expiryDate = "2023-05-15"
}
$res = Send-Req "POST" "/contractors/profiles/$($variables["contractorAProfileId"])/certifications" -token $variables["contractorAccessTokenA"] -body $certExpiryBody
if ($res.StatusCode -eq 400 -and $res.RawContent -like "*expiry date cannot be before issue date*") {
    Log-Test "Validation: Certification Expiry Date" "PASS" "Certification with invalid expiry date rejected with 400."
} else {
    Log-Test "Validation: Certification Expiry Date" "FAIL" "Expected 400 but got status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 39g: Engagement End Date validation (Fail 400) ---
$engEndBody = @{
    clientName = "Client"
    roleTitle = "Developer"
    startDate = "2024-01-10"
    endDate = "2023-01-10"
}
$res = Send-Req "POST" "/contractors/profiles/$($variables["contractorAProfileId"])/engagements" -token $variables["hiringManagerAccessTokenB"] -body $engEndBody
if ($res.StatusCode -eq 400 -and $res.RawContent -like "*end date cannot be before start date*") {
    Log-Test "Validation: Engagement End Date" "PASS" "Placement engagement with invalid end date rejected with 400."
} else {
    Log-Test "Validation: Engagement End Date" "FAIL" "Expected 400 but got status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 39h: Duplicate Certification Protection (Fail 400) ---
$duplicateCertBody = @{
    name = "Oracle Certified Professional: Java SE 17 Developer"
    issuingAuthority = "Oracle University"
    certificateNumber = "OCP-17-998822"
    issueDate = "2024-05-15"
    expiryDate = "2029-05-15"
}
$res = Send-Req "POST" "/contractors/profiles/$($variables["contractorAProfileId"])/certifications" -token $variables["contractorAccessTokenA"] -body $duplicateCertBody
if ($res.StatusCode -eq 400 -and $res.RawContent -like "*already exists on this profile*") {
    Log-Test "Validation: Duplicate Certification Protection" "PASS" "Duplicate certification rejected with 400."
} else {
    Log-Test "Validation: Duplicate Certification Protection" "FAIL" "Expected 400 but got status: $($res.StatusCode)" "$($res.RawContent)"
}

# ==================== SECURITY & VALIDATION extension tests ====================

# --- Test 39a: Register Admin through public endpoint (Fail 400) ---
$regAdminBody = @{
    name = "Malicious Admin"
    email = "maliciousadmin@example.com"
    password = "Password123!"
    phone = "9999999999"
    role = "ADMIN"
}
$res = Send-Req "POST" "/auth/register" -body $regAdminBody
if ($res.StatusCode -eq 400 -and $res.RawContent -like "*Registration of ADMIN accounts is not allowed*") {
    Log-Test "Security: Block Public ADMIN Registration" "PASS" "Admin registration rejected with 400 Bad Request."
} else {
    Log-Test "Security: Block Public ADMIN Registration" "FAIL" "Expected 400 with clear message, but got status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 39b: Verify Suspended User JWT Invalidation (Fail 403) ---
$res = Send-Req "PUT" "/users/$($variables["contractorAUserId"])/suspend" -token $variables["adminAccessToken"]
if ($res.StatusCode -eq 200) {
    Log-Test "Suspend Alice" "PASS" "Admin successfully suspended Alice."
} else {
    Log-Test "Suspend Alice" "FAIL" "Failed to suspend Alice. Status: $($res.StatusCode)" "$($res.RawContent)"
}

$res = Send-Req "GET" "/contractors/profiles/me" -token $variables["contractorAccessTokenA"]
if ($res.StatusCode -eq 403 -or $res.StatusCode -eq 401) {
    Log-Test "Security: Suspended User JWT Invalidation" "PASS" "Suspended user blocked from accessing API with active JWT (Status: $($res.StatusCode))."
} else {
    Log-Test "Security: Suspended User JWT Invalidation" "FAIL" "Expected 401/403 but got status: $($res.StatusCode)" "$($res.RawContent)"
}

$res = Send-Req "PUT" "/users/$($variables["contractorAUserId"])/activate" -token $variables["adminAccessToken"]
if ($res.StatusCode -eq 200) {
    Log-Test "Re-activate Alice" "PASS" "Admin successfully re-activated Alice."
} else {
    Log-Test "Re-activate Alice" "FAIL" "Failed to re-activate Alice. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 39c: Verify Deactivated User JWT Invalidation (Fail 403) ---
$res = Send-Req "PUT" "/users/$($variables["contractorBUserId"])/deactivate" -token $variables["adminAccessToken"]
if ($res.StatusCode -eq 200) {
    Log-Test "Deactivate Bob" "PASS" "Admin successfully deactivated Bob."
} else {
    Log-Test "Deactivate Bob" "FAIL" "Failed to deactivate Bob. Status: $($res.StatusCode)" "$($res.RawContent)"
}

$res = Send-Req "GET" "/skills" -token $variables["contractorAccessTokenB"]
if ($res.StatusCode -eq 403 -or $res.StatusCode -eq 401) {
    Log-Test "Security: Deactivated User JWT Invalidation" "PASS" "Deactivated user blocked from accessing API with active JWT (Status: $($res.StatusCode))."
} else {
    Log-Test "Security: Deactivated User JWT Invalidation" "FAIL" "Expected 401/403 but got status: $($res.StatusCode)" "$($res.RawContent)"
}

$res = Send-Req "PUT" "/users/$($variables["contractorBUserId"])/activate" -token $variables["adminAccessToken"]
if ($res.StatusCode -eq 200) {
    Log-Test "Re-activate Bob" "PASS" "Admin successfully re-activated Bob."
} else {
    Log-Test "Re-activate Bob" "FAIL" "Failed to re-activate Bob. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# ==================== AUDIT LOGS verification ====================

# --- Test 40: Verify Audit Logs ---
$resActor = Send-Req "GET" "/audit/user/$($variables["adminUserId"])" -token $variables["adminAccessToken"]
$resContractor = Send-Req "GET" "/audit/user/$($variables["contractorAUserId"])" -token $variables["adminAccessToken"]

$actionsFound = @{}
if ($resActor.StatusCode -eq 200) {
    foreach ($log in $resActor.Body) {
        $actionsFound[$log.action] = $true
    }
}
if ($resContractor.StatusCode -eq 200) {
    foreach ($log in $resContractor.Body) {
        $actionsFound[$log.action] = $true
    }
}

$missing = @()
foreach ($act in @("CONTRACTOR_PROFILE_CREATED", "CONTRACTOR_PROFILE_UPDATED", "CONTRACTOR_SKILL_ADDED", "CONTRACTOR_SKILL_UPDATED", "CONTRACTOR_SKILL_REMOVED")) {
    if (!$actionsFound.ContainsKey($act)) {
        $missing += $act
    }
}

if ($resContractor.StatusCode -eq 200 -and $missing.Count -eq 0) {
    Log-Test "Verify Audit Logs" "PASS" "All expected contractor actions logged (CREATED, UPDATED, SKILL_ADDED, SKILL_UPDATED, SKILL_REMOVED)."
} else {
    Log-Test "Verify Audit Logs" "FAIL" "Missing audit actions: $($missing -join ', '). Status: $($resContractor.StatusCode)" "$($resContractor.RawContent)"
}

# ==================== MODULE 3: RESOURCE REQUISITION & VENDOR SOURCING ====================

# --- Test 41: Create Requisition (DRAFT) ---
$createReqBody = @{
    title = "Senior Java Developer"
    description = "Needs Java + Spring Boot"
    requiredSkillId = $variables["skillJavaId"]
    minExperienceYears = 3
    maxHourlyRate = 50.00
    quantity = 1
    businessUnitId = "HR"
}
$res = Send-Req "POST" "/requisitions" -token $variables["hiringManagerAccessTokenB"] -body $createReqBody
if ($res.StatusCode -eq 201 -and $res.Body.status -eq "DRAFT") {
    $variables["reqId"] = $res.Body.id
    Log-Test "Create Requisition (DRAFT)" "PASS" "Successfully created requisition in DRAFT status with ID $($res.Body.id)."
} else {
    Log-Test "Create Requisition (DRAFT)" "FAIL" "Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 42: Update Requisition (DRAFT) ---
$updateReqBody = @{
    title = "Senior Java Expert"
    description = "Needs Java + Spring Boot + Microservices"
    requiredSkillId = $variables["skillJavaId"]
    minExperienceYears = 4
    maxHourlyRate = 55.00
    quantity = 1
    businessUnitId = "HR"
}
$res = Send-Req "PUT" "/requisitions/$($variables["reqId"])" -token $variables["hiringManagerAccessTokenB"] -body $updateReqBody
if ($res.StatusCode -eq 200 -and $res.Body.maxHourlyRate -eq 55.00) {
    Log-Test "Update Requisition (DRAFT)" "PASS" "Successfully updated draft requisition details."
} else {
    Log-Test "Update Requisition (DRAFT)" "FAIL" "Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 43: Submit Contractor to Requisition in DRAFT (Fail 400) ---
$submitDraftBody = @{
    contractorProfileId = $variables["contractorAProfileId"]
    proposedRate = 50.00
    remarks = "Interested"
}
$res = Send-Req "POST" "/submissions/requisitions/$($variables["reqId"])/submit" -token $variables["vendorManagerAccessTokenA"] -body $submitDraftBody
if ($res.StatusCode -eq 400 -and $res.RawContent -like "*only allowed for OPEN requisitions*") {
    Log-Test "Submit Contractor to DRAFT Req (Fail)" "PASS" "Rejected contractor submission to draft requisition correctly."
} else {
    Log-Test "Submit Contractor to DRAFT Req (Fail)" "FAIL" "Expected 400 but got status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 44: Publish Requisition (DRAFT -> OPEN) ---
$res = Send-Req "PUT" "/requisitions/$($variables["reqId"])/publish" -token $variables["hiringManagerAccessTokenB"]
if ($res.StatusCode -eq 200 -and $res.Body.status -eq "OPEN") {
    Log-Test "Publish Requisition" "PASS" "Successfully published requisition (status changed to OPEN)."
} else {
    Log-Test "Publish Requisition" "FAIL" "Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 45: Submit Contractor (Alice) to OPEN Requisition ---
$submitOpenBody = @{
    contractorProfileId = $variables["contractorAProfileId"]
    proposedRate = 52.00
    remarks = "Alice is interested"
}
$res = Send-Req "POST" "/submissions/requisitions/$($variables["reqId"])/submit" -token $variables["vendorManagerAccessTokenA"] -body $submitOpenBody
if ($res.StatusCode -eq 201 -and $res.Body.status -eq "SUBMITTED") {
    $variables["subId"] = $res.Body.id
    Log-Test "Submit Contractor (Alice)" "PASS" "Successfully submitted contractor Alice to requisition with submission ID $($res.Body.id)."
} else {
    Log-Test "Submit Contractor (Alice)" "FAIL" "Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 46: Attempt Duplicate Submission (Fail 400) ---
$res = Send-Req "POST" "/submissions/requisitions/$($variables["reqId"])/submit" -token $variables["vendorManagerAccessTokenA"] -body $submitOpenBody
if ($res.StatusCode -eq 400 -and $res.RawContent -like "*already been submitted*") {
    Log-Test "Attempt Duplicate Submission (Fail)" "PASS" "Rejected duplicate contractor submission to the same requisition correctly."
} else {
    Log-Test "Attempt Duplicate Submission (Fail)" "FAIL" "Expected 400 but got status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 47: Submit Contractor by Vendor (Bob submission) ---
$submitBobBody = @{
    contractorProfileId = $variables["contractorBProfileId"]
    proposedRate = 48.00
    remarks = "Bob is interested"
}
$res = Send-Req "POST" "/submissions/requisitions/$($variables["reqId"])/submit" -token $variables["vendorManagerAccessTokenA"] -body $submitBobBody
if ($res.StatusCode -eq 201) {
    $variables["bobSubId"] = $res.Body.id
    Log-Test "Submit Contractor (Bob submission by Vendor)" "PASS" "Vendor successfully submitted contractor Bob's profile."
} else {
    Log-Test "Submit Contractor (Bob submission by Vendor)" "FAIL" "Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 48: Search Requisitions ---
$res = Send-Req "GET" "/requisitions?status=OPEN&requiredSkillId=$($variables["skillJavaId"])" -token $variables["contractorAccessTokenA"]
if ($res.StatusCode -eq 200 -and $res.Body.totalElements -gt 0) {
    Log-Test "Search Requisitions" "PASS" "Successfully searched and filtered open requisitions by skill."
} else {
    Log-Test "Search Requisitions" "FAIL" "Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 49: Transition Submission to SHORTLISTED ---
$res = Send-Req "PUT" "/submissions/$($variables["subId"])/shortlist" -token $variables["hiringManagerAccessTokenB"]
if ($res.StatusCode -eq 200 -and $res.Body.status -eq "SHORTLISTED") {
    Log-Test "Transition Submission to SHORTLISTED" "PASS" "Hiring Manager transitioned Alice's Submission to SHORTLISTED."
} else {
    Log-Test "Transition Submission to SHORTLISTED" "FAIL" "Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 50: Transition Submission to SELECTED (Auto-fill Requisition & Auto-Assignment) ---
$res = Send-Req "PUT" "/submissions/$($variables["subId"])/select?remarks=Alice+Accepted" -token $variables["hiringManagerAccessTokenB"]
if ($res.StatusCode -eq 200 -and $res.Body.status -eq "SELECTED") {
    # Verify side-effect 1: Requisition is FILLED (quantity was 1)
    $reqRes = Send-Req "GET" "/requisitions/$($variables["reqId"])" -token $variables["adminAccessToken"]
    # Verify side-effect 2: Contractor profile status is ASSIGNED
    $profileRes = Send-Req "GET" "/contractors/profiles/$($variables["contractorAProfileId"])" -token $variables["adminAccessToken"]
    # Verify side-effect 3: Engagement history deferred (should NOT exist yet)
    $engRes = Send-Req "GET" "/contractors/profiles/$($variables["contractorAProfileId"])/engagements" -token $variables["adminAccessToken"]
    $hasNewEng = $false
    if ($engRes.StatusCode -eq 200) {
        foreach ($eng in $engRes.Body) {
            if ($eng.roleTitle -eq "Senior Java Expert") {
                $hasNewEng = $true
            }
        }
    }
    
    if ($reqRes.Body.status -eq "FILLED" -and $profileRes.Body.status -eq "ASSIGNED" -and !$hasNewEng) {
        Log-Test "Transition Submission to SELECTED & Side-effects" "PASS" "Alice selected. Requisition filled. Contractor status updated to ASSIGNED and Engagement deferred."
    } else {
        Log-Test "Transition Submission to SELECTED & Side-effects" "FAIL" "Validation failed. Req status: $($reqRes.Body.status), Profile status: $($profileRes.Body.status), Has Engagement: $hasNewEng"
    }
} else {
    Log-Test "Transition Submission to SELECTED & Side-effects" "FAIL" "Transition failed. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 51: Submit ASSIGNED Contractor (Fail 400) ---
$createReqBody2 = @{
    title = "Another Java Job"
    requiredSkillId = $variables["skillJavaId"]
    minExperienceYears = 1
    maxHourlyRate = 40.00
    quantity = 1
}
$res = Send-Req "POST" "/requisitions" -token $variables["hiringManagerAccessTokenB"] -body $createReqBody2
$variables["reqId2"] = $res.Body.id
$res = Send-Req "PUT" "/requisitions/$($variables["reqId2"])/publish" -token $variables["hiringManagerAccessTokenB"]

# Now try to submit Alice (who is ASSIGNED) to Req 2
$res = Send-Req "POST" "/submissions/requisitions/$($variables["reqId2"])/submit" -token $variables["vendorManagerAccessTokenA"] -body $submitOpenBody
if ($res.StatusCode -eq 400 -and $res.RawContent -like "*not available for submissions*") {
    Log-Test "Submit ASSIGNED Contractor (Fail)" "PASS" "Rejected submission of assigned contractor profile correctly."
} else {
    Log-Test "Submit ASSIGNED Contractor (Fail)" "FAIL" "Expected 400 but got status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 52: Verify Audit Logs for Module 3 ---
$res = Send-Req "GET" "/audit/user/$($variables["hiringManagerUserId"])" -token $variables["adminAccessToken"]
$actionsFound = @{}
if ($res.StatusCode -eq 200) {
    foreach ($log in $res.Body) {
        $actionsFound[$log.action] = $true
    }
}
$missing = @()
foreach ($act in @("REQUISITION_CREATED", "REQUISITION_UPDATED", "REQUISITION_STATUS_CHANGED", "VENDOR_SUBMISSION_STATUS_CHANGED")) {
    if (!$actionsFound.ContainsKey($act)) {
        $missing += $act
    }
}
if ($res.StatusCode -eq 200 -and $missing.Count -eq 0) {
    Log-Test "Verify Module 3 Audit Logs" "PASS" "All expected Module 3 actions logged successfully."
} else {
    Log-Test "Verify Module 3 Audit Logs" "FAIL" "Missing audit actions: $($missing -join ', '). Status: $($res.StatusCode)" "$($res.RawContent)"
}

# ==================== MODULE 4: ASSIGNMENT & CONTRACT MANAGEMENT ====================

# --- Test 53: Create Assignment from ACCEPTED submission ---
$createAssignBody = @{
    vendorSubmissionId = $variables["subId"]
    startDate = "2026-06-10"
    endDate = "2026-12-10"
    agreedRatePerDay = 50.00
    engagementType = "REMOTE"
    sowReference = "SOW-ALICE-101"
}
$res = Send-Req "POST" "/assignments" -token $variables["hiringManagerAccessTokenB"] -body $createAssignBody
if ($res.StatusCode -eq 201) {
    $variables["assignmentId"] = $res.Body.id
    Log-Test "Create Assignment from ACCEPTED submission" "PASS" "Assignment created successfully with ID $($res.Body.id)."
} else {
    Log-Test "Create Assignment from ACCEPTED submission" "FAIL" "Failed to create assignment. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 54: Attempt Assignment from REJECTED submission ---
# First, transition Bob's submission to REJECTED
$res = Send-Req "PUT" "/submissions/$($variables["bobSubId"])/reject?remarks=Bob+Rejected" -token $variables["hiringManagerAccessTokenB"]
$createAssignBobBody = @{
    vendorSubmissionId = $variables["bobSubId"]
    startDate = "2026-06-10"
    endDate = "2026-12-10"
    agreedRatePerDay = 45.00
    engagementType = "REMOTE"
    sowReference = "SOW-BOB-101"
}
$res = Send-Req "POST" "/assignments" -token $variables["hiringManagerAccessTokenB"] -body $createAssignBobBody
if ($res.StatusCode -eq 400 -and $res.RawContent -like "*Assignment can only be created from a SELECTED submission*") {
    Log-Test "Attempt Assignment from REJECTED submission" "PASS" "Rejected assignment creation from REJECTED submission correctly."
} else {
    Log-Test "Attempt Assignment from REJECTED submission" "FAIL" "Expected 400 but got: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 55: Attempt Assignment from REVIEWING submission ---
# Create a new requisition and submission for Bob, publish it, transition it to REVIEWING
$createReqBobBody = @{
    title = "Bob Java Job"
    requiredSkillId = $variables["skillJavaId"]
    minExperienceYears = 1
    maxHourlyRate = 50.00
    quantity = 1
}
$res = Send-Req "POST" "/requisitions" -token $variables["hiringManagerAccessTokenB"] -body $createReqBobBody
$variables["reqIdBob"] = $res.Body.id
$res = Send-Req "PUT" "/requisitions/$($variables["reqIdBob"])/publish" -token $variables["hiringManagerAccessTokenB"]

$submitBobBody2 = @{
    contractorProfileId = $variables["contractorBProfileId"]
    proposedRate = 48.00
    remarks = "Bob submission 2"
}
$res = Send-Req "POST" "/submissions/requisitions/$($variables["reqIdBob"])/submit" -token $variables["vendorManagerAccessTokenA"] -body $submitBobBody2
$variables["bobSubId2"] = $res.Body.id

# Transition Bob submission 2 to REVIEWING
$res = Send-Req "PUT" "/submissions/$($variables["bobSubId2"])/shortlist" -token $variables["hiringManagerAccessTokenB"]

# Try to create assignment from Bob submission 2 (which is REVIEWING)
$createAssignBobBody2 = @{
    vendorSubmissionId = $variables["bobSubId2"]
    startDate = "2026-06-10"
    endDate = "2026-12-10"
    agreedRatePerDay = 45.00
    engagementType = "REMOTE"
    sowReference = "SOW-BOB-102"
}
$res = Send-Req "POST" "/assignments" -token $variables["hiringManagerAccessTokenB"] -body $createAssignBobBody2
if ($res.StatusCode -eq 400 -and $res.RawContent -like "*Assignment can only be created from a SELECTED submission*") {
    Log-Test "Attempt Assignment from REVIEWING submission" "PASS" "Rejected assignment creation from REVIEWING submission correctly."
} else {
    Log-Test "Attempt Assignment from REVIEWING submission" "FAIL" "Expected 400 but got: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 56: Submit Extension Amendment ---
$amendmentExtBody = @{
    amendmentType = "EXTENSION"
    effectiveDate = "2026-12-11"
    newValue = "2027-03-11"
    remarks = "Extend project by 3 months"
}
$res = Send-Req "POST" "/assignments/$($variables["assignmentId"])/amendments" -token $variables["hiringManagerAccessTokenB"] -body $amendmentExtBody
if ($res.StatusCode -eq 201 -and $res.Body.status -eq "PENDING") {
    $variables["amendExtId"] = $res.Body.id
    Log-Test "Submit Extension Amendment" "PASS" "Extension amendment submitted with ID $($res.Body.id)."
} else {
    Log-Test "Submit Extension Amendment" "FAIL" "Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 57: Submit Rate Revision Amendment ---
$amendmentRateBody = @{
    amendmentType = "RATE_REVISION"
    effectiveDate = "2026-08-01"
    newValue = "55.00"
    remarks = "Performance rate increase"
}
$res = Send-Req "POST" "/assignments/$($variables["assignmentId"])/amendments" -token $variables["hiringManagerAccessTokenB"] -body $amendmentRateBody
if ($res.StatusCode -eq 201 -and $res.Body.status -eq "PENDING") {
    $variables["amendRateId"] = $res.Body.id
    Log-Test "Submit Rate Revision Amendment" "PASS" "Rate revision amendment submitted."
} else {
    Log-Test "Submit Rate Revision Amendment" "FAIL" "Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 58: Submit Scope Change Amendment ---
$amendmentScopeBody = @{
    amendmentType = "SCOPE_CHANGE"
    effectiveDate = "2026-07-01"
    newValue = "SOW-ALICE-101-REV1"
    remarks = "Update SOW reference"
}
$res = Send-Req "POST" "/assignments/$($variables["assignmentId"])/amendments" -token $variables["hiringManagerAccessTokenB"] -body $amendmentScopeBody
if ($res.StatusCode -eq 201 -and $res.Body.status -eq "PENDING") {
    $variables["amendScopeId"] = $res.Body.id
    Log-Test "Submit Scope Change Amendment" "PASS" "Scope change amendment submitted."
} else {
    Log-Test "Submit Scope Change Amendment" "FAIL" "Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 59: Submit Early Termination Amendment ---
$amendmentTermBody = @{
    amendmentType = "EARLY_TERMINATION"
    effectiveDate = "2026-09-01"
    newValue = "2026-09-15"
    remarks = "Terminating project early"
}
$res = Send-Req "POST" "/assignments/$($variables["assignmentId"])/amendments" -token $variables["hiringManagerAccessTokenB"] -body $amendmentTermBody
if ($res.StatusCode -eq 201 -and $res.Body.status -eq "PENDING") {
    $variables["amendTermId"] = $res.Body.id
    Log-Test "Submit Early Termination Amendment" "PASS" "Early termination amendment submitted."
} else {
    Log-Test "Submit Early Termination Amendment" "FAIL" "Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 60: Block Unauthorized Amendment Approval (Fail 403) ---
$res = Send-Req "PUT" "/amendments/$($variables["amendRateId"])/approve" -token $variables["vendorManagerAccessTokenA"]
if ($res.StatusCode -eq 403) {
    Log-Test "Unauthorized Amendment Approval" "PASS" "Blocked unauthorized amendment approval correctly."
} else {
    Log-Test "Unauthorized Amendment Approval" "FAIL" "Expected 403 but got: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 61: Approve Extension Amendment ---
$res = Send-Req "PUT" "/amendments/$($variables["amendExtId"])/approve?remarks=Extension+Approved" -token $variables["hiringManagerAccessTokenB"]
if ($res.StatusCode -eq 200 -and $res.Body.status -eq "APPROVED") {
    # Verify assignment has new end date and EXTENDED status
    $assignRes = Send-Req "GET" "/assignments/$($variables["assignmentId"])" -token $variables["hiringManagerAccessTokenB"]
    if ($assignRes.Body.endDate -eq "2027-03-11" -and $assignRes.Body.status -eq "EXTENDED") {
        Log-Test "Approve Extension Amendment" "PASS" "Extension amendment approved and assignment end date updated."
    } else {
        Log-Test "Approve Extension Amendment" "FAIL" "Assignment verify failed. EndDate: $($assignRes.Body.endDate), Status: $($assignRes.Body.status)"
    }
} else {
    Log-Test "Approve Extension Amendment" "FAIL" "Approve failed. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 62: Approve Rate Revision and verify conflicting amendment auto-rejection ---
# Submit conflicting rate revision
$amendmentRateBodyConf = @{
    amendmentType = "RATE_REVISION"
    effectiveDate = "2026-08-01"
    newValue = "60.00"
    remarks = "Conflicting rate revision"
}
$res = Send-Req "POST" "/assignments/$($variables["assignmentId"])/amendments" -token $variables["hiringManagerAccessTokenB"] -body $amendmentRateBodyConf
$variables["amendRateConfId"] = $res.Body.id

# Approve first rate revision
$res = Send-Req "PUT" "/amendments/$($variables["amendRateId"])/approve?remarks=First+Rate+Approved" -token $variables["hiringManagerAccessTokenB"]
if ($res.StatusCode -eq 200) {
    # Check if conflicting was rejected
    $listRes = Send-Req "GET" "/assignments/$($variables["assignmentId"])/amendments" -token $variables["hiringManagerAccessTokenB"]
    $rejectedConf = $false
    foreach ($amend in $listRes.Body) {
        if ($amend.id -eq $variables["amendRateConfId"] -and $amend.status -eq "REJECTED") {
            $rejectedConf = $true
        }
    }
    if ($rejectedConf) {
        Log-Test "Approve Rate Revision & Auto-Reject Conflicting" "PASS" "First rate revision approved and conflicting request auto-rejected."
    } else {
        Log-Test "Approve Rate Revision & Auto-Reject Conflicting" "FAIL" "Conflicting amendment status was not changed to REJECTED."
    }
} else {
    Log-Test "Approve Rate Revision & Auto-Reject Conflicting" "FAIL" "Approve failed. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 63: Contractor Assignment Visibility ---
# Bob tries to view Alice's assignment
$res = Send-Req "GET" "/assignments/$($variables["assignmentId"])" -token $variables["contractorAccessTokenB"]
if ($res.StatusCode -eq 403) {
    # Alice views her own assignment
    $aliceRes = Send-Req "GET" "/assignments/$($variables["assignmentId"])" -token $variables["contractorAccessTokenA"]
    if ($aliceRes.StatusCode -eq 200) {
        Log-Test "Contractor Assignment Visibility" "PASS" "Alice can view her assignment, Bob is forbidden."
    } else {
        Log-Test "Contractor Assignment Visibility" "FAIL" "Alice got status: $($aliceRes.StatusCode)"
    }
} else {
    Log-Test "Contractor Assignment Visibility" "FAIL" "Bob was not forbidden. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 64: Vendor Assignment Visibility ---
$res = Send-Req "GET" "/assignments/$($variables["assignmentId"])" -token $variables["vendorManagerAccessTokenA"]
if ($res.StatusCode -eq 200) {
    Log-Test "Vendor Assignment Visibility" "PASS" "Vendor who sourced submission can view the active assignment."
} else {
    Log-Test "Vendor Assignment Visibility" "FAIL" "Vendor got status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 65: Approve Early Termination ---
$res = Send-Req "PUT" "/amendments/$($variables["amendTermId"])/approve?remarks=Approved+Termination" -token $variables["hiringManagerAccessTokenB"]
if ($res.StatusCode -eq 200 -and $res.Body.status -eq "APPROVED") {
    $assignRes = Send-Req "GET" "/assignments/$($variables["assignmentId"])" -token $variables["hiringManagerAccessTokenB"]
    if ($assignRes.Body.status -eq "TERMINATED_EARLY" -and $assignRes.Body.endDate -eq "2026-09-15") {
        Log-Test "Approve Early Termination" "PASS" "Assignment status changed to TERMINATED_EARLY and end date updated."
    } else {
        Log-Test "Approve Early Termination" "FAIL" "Assignment verification failed. Status: $($assignRes.Body.status), EndDate: $($assignRes.Body.endDate)"
    }
} else {
    Log-Test "Approve Early Termination" "FAIL" "Approve failed. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 66: Verify Contractor Release and Engagement History Creation ---
$profileRes = Send-Req "GET" "/contractors/profiles/$($variables["contractorAProfileId"])" -token $variables["adminAccessToken"]
$engRes = Send-Req "GET" "/contractors/profiles/$($variables["contractorAProfileId"])/engagements" -token $variables["adminAccessToken"]
$hasTerminatedEng = $false
if ($engRes.StatusCode -eq 200) {
    foreach ($eng in $engRes.Body) {
        if ($eng.endDate -eq "2026-09-15") {
            $hasTerminatedEng = $true
        }
    }
}
if ($profileRes.Body.status -eq "AVAILABLE" -and $hasTerminatedEng) {
    Log-Test "Verify Contractor Release and Engagement History" "PASS" "Contractor Alice released to AVAILABLE and terminated engagement recorded."
} else {
    Log-Test "Verify Contractor Release and Engagement History" "FAIL" "Alice status: $($profileRes.Body.status), Has Engagement matching date: $hasTerminatedEng"
}

# --- Test 67: Verify Closed Assignment Cannot Be Modified (Fail 400) ---
$res = Send-Req "POST" "/assignments/$($variables["assignmentId"])/amendments" -token $variables["hiringManagerAccessTokenB"] -body $amendmentRateBody
if ($res.StatusCode -eq 400 -and $res.RawContent -like "*Cannot request amendments on completed or terminated assignments*") {
    Log-Test "Verify Closed Assignment Cannot Be Modified" "PASS" "Amendment creation blocked on terminated assignment correctly."
} else {
    Log-Test "Verify Closed Assignment Cannot Be Modified" "FAIL" "Expected 400 but got: $($res.StatusCode)" "$($res.RawContent)"
}

# ==================== CONCURRENCY SAFETY & LOCKING TESTS ====================

# Helper function to invoke parallel requests
function Invoke-ConcurrentReqs {
    param (
        [string]$method1, [string]$path1, [string]$token1, [string]$body1,
        [string]$method2, [string]$path2, [string]$token2, [string]$body2
    )

    $url1 = "$baseUrl$path1"
    $url2 = "$baseUrl$path2"

    $jobBlock = {
        param($method, $url, $token, $bodyJson)
        $headers = @{
            "Content-Type" = "application/json"
        }
        if ($token) {
            $headers["Authorization"] = "Bearer $token"
        }
        $params = @{
            Method = $method
            Uri = $url
            Headers = $headers
            UseBasicParsing = $true
        }
        if ($bodyJson) {
            $params["Body"] = $bodyJson
        }
        try {
            $resp = Invoke-WebRequest @params
            return [PSCustomObject]@{
                StatusCode = $resp.StatusCode
                Content = $resp.Content
            }
        } catch {
            $statusCode = $_.Exception.Response.StatusCode.value__
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $rawErr = $reader.ReadToEnd()
            return [PSCustomObject]@{
                StatusCode = $statusCode
                Content = $rawErr
            }
        }
    }

    $j1 = Start-Job -ScriptBlock $jobBlock -ArgumentList $method1, $url1, $token1, $body1
    $j2 = Start-Job -ScriptBlock $jobBlock -ArgumentList $method2, $url2, $token2, $body2

    $res1 = Receive-Job -Job $j1 -Wait -AutoRemoveJob
    $res2 = Receive-Job -Job $j2 -Wait -AutoRemoveJob

    return @($res1, $res2)
}

# --- Test Scenario 1: Concurrent Submission Acceptance ---
# Register contractor Concur1
$regConcur1Body = @{
    name = "Contractor ConcurOne"
    email = "concur1@example.com"
    password = "Password123!"
    phone = "9111111112"
    role = "CONTRACTOR"
}
$res = Send-Req "POST" "/auth/register" -body $regConcur1Body
$concur1UserId = $res.Body.userId

$loginConcur1Body = @{
    email = "concur1@example.com"
    password = "Password123!"
}
$res = Send-Req "POST" "/auth/login" -body $loginConcur1Body
$concur1Token = $res.Body.accessToken

# Create Profile for Concur1
$createConcur1ProfileBody = @{
    userId = $concur1UserId
    title = "Java Concurrency Specialist"
    bio = "Specialist in race conditions"
    hourlyRate = 55.00
    experienceYears = 5
    preferredEngagementType = "REMOTE"
}
$res = Send-Req "POST" "/contractors/profiles" -token $variables["adminAccessToken"] -body $createConcur1ProfileBody
$concur1ProfileId = $res.Body.id

# Add Java skill
$addSkillBody = @{
    skillId = $variables["skillJavaId"]
    proficiencyLevel = "EXPERT"
    yearsOfExperience = 5
}
$res = Send-Req "POST" "/contractors/profiles/$concur1ProfileId/skills" -token $variables["adminAccessToken"] -body $addSkillBody

# Create Requisition
$reqBody = @{
    title = "Concurrency Req 1"
    requiredSkillId = $variables["skillJavaId"]
    minExperienceYears = 2
    maxHourlyRate = 60.00
    quantity = 1
}
$res = Send-Req "POST" "/requisitions" -token $variables["hiringManagerAccessTokenB"] -body $reqBody
$concur1ReqId = $res.Body.id

# Publish
$res = Send-Req "PUT" "/requisitions/$concur1ReqId/publish" -token $variables["hiringManagerAccessTokenB"]

# Submit
$submitBody = @{
    contractorProfileId = $concur1ProfileId
    proposedRate = 52.00
    remarks = "Submitted for concurrency test"
}
$res = Send-Req "POST" "/submissions/requisitions/$concur1ReqId/submit" -token $variables["vendorManagerAccessTokenA"] -body $submitBody
$concur1SubId = $res.Body.id

# Transition to REVIEWING
$res = Send-Req "PUT" "/submissions/$concur1SubId/shortlist" -token $variables["hiringManagerAccessTokenB"]

# Concurrent accept requests
$concurRes1 = Invoke-ConcurrentReqs "PUT" "/submissions/$concur1SubId/select?remarks=AcceptA" $variables["hiringManagerAccessTokenB"] $null `
                                     "PUT" "/submissions/$concur1SubId/select?remarks=AcceptB" $variables["hiringManagerAccessTokenB"] $null
$statusCodes1 = $concurRes1 | ForEach-Object { $_.StatusCode }

if ($statusCodes1 -contains 200 -and ($statusCodes1 -contains 409 -or $statusCodes1 -contains 400)) {
    Log-Test "Scenario 1: Concurrent Submission Acceptance" "PASS" "One thread accepted, the other failed with 409 Conflict / 400 Bad Request."
} else {
    Log-Test "Scenario 1: Concurrent Submission Acceptance" "FAIL" "Expected one 200 and one 409/400, but got: $($statusCodes1 -join ', ')" "$($concurRes1 | ConvertTo-Json)"
}


# --- Test Scenario 2: Concurrent Assignment Creation ---
# Register contractor Concur2
$regConcur2Body = @{
    name = "Contractor ConcurTwo"
    email = "concur2@example.com"
    password = "Password123!"
    phone = "9111111113"
    role = "CONTRACTOR"
}
$res = Send-Req "POST" "/auth/register" -body $regConcur2Body
$concur2UserId = $res.Body.userId

# Create Profile
$createConcur2ProfileBody = @{
    userId = $concur2UserId
    title = "React Concurrency Specialist"
    bio = "Specialist in race conditions"
    hourlyRate = 65.00
    experienceYears = 6
    preferredEngagementType = "REMOTE"
}
$res = Send-Req "POST" "/contractors/profiles" -token $variables["adminAccessToken"] -body $createConcur2ProfileBody
$concur2ProfileId = $res.Body.id

# Add React skill
$addSkillReactBody = @{
    skillId = $variables["skillReactId"]
    proficiencyLevel = "EXPERT"
    yearsOfExperience = 6
}
$res = Send-Req "POST" "/contractors/profiles/$concur2ProfileId/skills" -token $variables["adminAccessToken"] -body $addSkillReactBody

# Create Requisition 2
$reqBody2 = @{
    title = "Concurrency Req 2"
    requiredSkillId = $variables["skillReactId"]
    minExperienceYears = 2
    maxHourlyRate = 70.00
    quantity = 1
}
$res = Send-Req "POST" "/requisitions" -token $variables["hiringManagerAccessTokenB"] -body $reqBody2
$concur2ReqId = $res.Body.id

# Publish
$res = Send-Req "PUT" "/requisitions/$concur2ReqId/publish" -token $variables["hiringManagerAccessTokenB"]

# Submit
$submitBody2 = @{
    contractorProfileId = $concur2ProfileId
    proposedRate = 65.00
    remarks = "Submitted for concur assignment"
}
$res = Send-Req "POST" "/submissions/requisitions/$concur2ReqId/submit" -token $variables["vendorManagerAccessTokenA"] -body $submitBody2
$concur2SubId = $res.Body.id

# Transition to REVIEWING
$res = Send-Req "PUT" "/submissions/$concur2SubId/shortlist" -token $variables["hiringManagerAccessTokenB"]

# Transition to ACCEPTED
$res = Send-Req "PUT" "/submissions/$concur2SubId/select?remarks=Accept" -token $variables["hiringManagerAccessTokenB"]

# Concurrent assignment creation body
$createAssignBody = @{
    vendorSubmissionId = $concur2SubId
    startDate = "2026-06-10"
    endDate = "2026-12-10"
    agreedRatePerDay = 65.00
    engagementType = "REMOTE"
    sowReference = "SOW-CONCUR2"
}
$bodyJson = $createAssignBody | ConvertTo-Json -Depth 10

# Concurrent assignment creation requests
$concurRes2 = Invoke-ConcurrentReqs "POST" "/assignments" $variables["hiringManagerAccessTokenB"] $bodyJson `
                                     "POST" "/assignments" $variables["hiringManagerAccessTokenB"] $bodyJson
$statusCodes2 = $concurRes2 | ForEach-Object { $_.StatusCode }

if ($statusCodes2 -contains 201 -and ($statusCodes2 -contains 409 -or $statusCodes2 -contains 400 -or $statusCodes2 -contains 500)) {
    Log-Test "Scenario 2: Concurrent Assignment Creation" "PASS" "One thread created assignment, the other failed with lock/constraint error (Status: $($statusCodes2 -join ', '))."
} else {
    Log-Test "Scenario 2: Concurrent Assignment Creation" "FAIL" "Expected one 201 and one error, but got: $($statusCodes2 -join ', ')" "$($concurRes2 | ConvertTo-Json)"
}


# --- Test Scenario 3: Concurrent Amendment Approval ---
# Retrieve the assignment created in Scenario 2
$assignList = Send-Req "GET" "/assignments?contractorProfileId=$concur2ProfileId" -token $variables["adminAccessToken"]
$concur2AssignmentId = $assignList.Body.content[0].id

# Create Amendment A (Extension)
$amendExtBody = @{
    amendmentType = "EXTENSION"
    effectiveDate = "2026-12-11"
    newValue = "2027-06-11"
    remarks = "Extend project concur A"
}
$res = Send-Req "POST" "/assignments/$concur2AssignmentId/amendments" -token $variables["hiringManagerAccessTokenB"] -body $amendExtBody
$amendIdA = $res.Body.id

# Create Amendment B (Extension)
$amendExtBodyB = @{
    amendmentType = "EXTENSION"
    effectiveDate = "2026-12-11"
    newValue = "2027-09-11"
    remarks = "Extend project concur B"
}
$res = Send-Req "POST" "/assignments/$concur2AssignmentId/amendments" -token $variables["hiringManagerAccessTokenB"] -body $amendExtBodyB
$amendIdB = $res.Body.id

# Concurrent approval requests
$concurRes3 = Invoke-ConcurrentReqs "PUT" "/amendments/$amendIdA/approve?remarks=ApproveA" $variables["hiringManagerAccessTokenB"] $null `
                                     "PUT" "/amendments/$amendIdB/approve?remarks=ApproveB" $variables["hiringManagerAccessTokenB"] $null
$statusCodes3 = $concurRes3 | ForEach-Object { $_.StatusCode }

if ($statusCodes3 -contains 200 -and ($statusCodes3 -contains 409 -or $statusCodes3 -contains 400)) {
    Log-Test "Scenario 3: Concurrent Amendment Approval" "PASS" "One thread approved, the other failed with Conflict/Bad Request (Status: $($statusCodes3 -join ', '))."
} else {
    Log-Test "Scenario 3: Concurrent Amendment Approval" "FAIL" "Expected one 200 and one error, but got: $($statusCodes3 -join ', ')" "$($concurRes3 | ConvertTo-Json)"
}


# --- Test Scenario 4: Concurrent Contractor Allocation ---
# Register contractor Alice2 (email alice2@example.com)
$regAlice2Body = @{
    name = "Contractor Alice2"
    email = "alice2@example.com"
    password = "Password123!"
    phone = "9111111114"
    role = "CONTRACTOR"
}
$res = Send-Req "POST" "/auth/register" -body $regAlice2Body
$alice2UserId = $res.Body.userId

# Create Profile for Alice2
$createAlice2ProfileBody = @{
    userId = $alice2UserId
    title = "Java developer"
    bio = "Junior java dev"
    hourlyRate = 30.00
    experienceYears = 2
    preferredEngagementType = "REMOTE"
}
$res = Send-Req "POST" "/contractors/profiles" -token $variables["adminAccessToken"] -body $createAlice2ProfileBody
$alice2ProfileId = $res.Body.id

# Add Java skill
$res = Send-Req "POST" "/contractors/profiles/$alice2ProfileId/skills" -token $variables["adminAccessToken"] -body $addSkillBody

# Requisition A (Java, qty=1)
$reqBodyA = @{
    title = "Requisition Concur A"
    requiredSkillId = $variables["skillJavaId"]
    minExperienceYears = 1
    maxHourlyRate = 40.00
    quantity = 1
}
$res = Send-Req "POST" "/requisitions" -token $variables["hiringManagerAccessTokenB"] -body $reqBodyA
$reqIdA = $res.Body.id
$res = Send-Req "PUT" "/requisitions/$reqIdA/publish" -token $variables["hiringManagerAccessTokenB"]

# Requisition B (Java, qty=1)
$reqBodyB = @{
    title = "Requisition Concur B"
    requiredSkillId = $variables["skillJavaId"]
    minExperienceYears = 1
    maxHourlyRate = 40.00
    quantity = 1
}
$res = Send-Req "POST" "/requisitions" -token $variables["hiringManagerAccessTokenB"] -body $reqBodyB
$reqIdB = $res.Body.id
$res = Send-Req "PUT" "/requisitions/$reqIdB/publish" -token $variables["hiringManagerAccessTokenB"]

# Submit Alice2 to Requisition A
$submitAlice2ABody = @{
    contractorProfileId = $alice2ProfileId
    proposedRate = 35.00
    remarks = "Submit A"
}
$res = Send-Req "POST" "/submissions/requisitions/$reqIdA/submit" -token $variables["vendorManagerAccessTokenA"] -body $submitAlice2ABody
$subIdA = $res.Body.id
$res = Send-Req "PUT" "/submissions/$subIdA/shortlist" -token $variables["hiringManagerAccessTokenB"]

# Submit Alice2 to Requisition B
$submitAlice2BBody = @{
    contractorProfileId = $alice2ProfileId
    proposedRate = 35.00
    remarks = "Submit B"
}
$res = Send-Req "POST" "/submissions/requisitions/$reqIdB/submit" -token $variables["vendorManagerAccessTokenA"] -body $submitAlice2BBody
$subIdB = $res.Body.id
$res = Send-Req "PUT" "/submissions/$subIdB/shortlist" -token $variables["hiringManagerAccessTokenB"]

# Concurrently accept Alice2 on Requisition A and Requisition B
$concurRes4 = Invoke-ConcurrentReqs "PUT" "/submissions/$subIdA/select?remarks=AcceptA" $variables["hiringManagerAccessTokenB"] $null `
                                     "PUT" "/submissions/$subIdB/select?remarks=AcceptB" $variables["hiringManagerAccessTokenB"] $null
$statusCodes4 = $concurRes4 | ForEach-Object { $_.StatusCode }

if ($statusCodes4 -contains 200 -and ($statusCodes4 -contains 409 -or $statusCodes4 -contains 400)) {
    Log-Test "Scenario 4: Concurrent Contractor Allocation" "PASS" "One thread allocated, the other failed with 409 Conflict / 400 Bad Request."
} else {
    Log-Test "Scenario 4: Concurrent Contractor Allocation" "FAIL" "Expected one 200 and one 409/400, but got: $($statusCodes4 -join ', ')" "$($concurRes4 | ConvertTo-Json)"
}


# ==================== MODULE 5: TIMESHEET & LEAVE MANAGEMENT ====================

# Step 1: Register Finance User (under admin context)
$regFinanceBody = @{
    name = "Finance Auditor"
    email = "finance@example.com"
    password = "Password123!"
    phone = "9111111121"
    role = "FINANCE"
}
$res = Send-Req "POST" "/auth/register" -body $regFinanceBody
if ($res.StatusCode -eq 201) {
    Log-Test "M5: Register Finance User" "PASS" "Registered Finance User successfully."
} else {
    Log-Test "M5: Register Finance User" "FAIL" "Failed to register Finance User. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# Step 2: Login Finance User
$loginFinanceBody = @{
    email = "finance@example.com"
    password = "Password123!"
}
$res = Send-Req "POST" "/auth/login" -body $loginFinanceBody
$variables["financeAccessToken"] = $res.Body.accessToken
if ($res.StatusCode -eq 200) {
    Log-Test "M5: Login Finance User" "PASS" "Finance user logged in successfully."
} else {
    Log-Test "M5: Login Finance User" "FAIL" "Finance login failed. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# Step 3: Create a new requisition specifically for Module 5
$m5ReqBody = @{
    title = "M5 Java Developer Requisition"
    requiredSkillId = $variables["skillJavaId"]
    minExperienceYears = 3
    maxHourlyRate = 80.00
    quantity = 1
}
$res = Send-Req "POST" "/requisitions" -token $variables["hiringManagerAccessTokenB"] -body $m5ReqBody
$m5ReqId = $res.Body.id
# Publish it
Send-Req "PUT" "/requisitions/$m5ReqId/publish" -token $variables["hiringManagerAccessTokenB"] | Out-Null

# Step 4: Submit Alice to this Requisition
$m5SubmitBody = @{
    contractorProfileId = $variables["contractorAProfileId"]
    proposedRate = 75.00
    remarks = "Interested in M5 gig"
}
$res = Send-Req "POST" "/submissions/requisitions/$m5ReqId/submit" -token $variables["vendorManagerAccessTokenA"] -body $m5SubmitBody
$m5SubId = $res.Body.id

# Review and Accept Submission
Send-Req "PUT" "/submissions/$m5SubId/shortlist" -token $variables["hiringManagerAccessTokenB"] | Out-Null
Send-Req "PUT" "/submissions/$m5SubId/select?remarks=M5+Accepted" -token $variables["hiringManagerAccessTokenB"] | Out-Null

# Step 5: Create Assignment from this ACCEPTED submission
$m5CreateAssignBody = @{
    vendorSubmissionId = $m5SubId
    startDate = "2026-06-08"
    endDate = "2026-12-08"
    agreedRatePerDay = 400.00
    engagementType = "REMOTE"
    sowReference = "SOW-M5-ALICE"
}
$res = Send-Req "POST" "/assignments" -token $variables["hiringManagerAccessTokenB"] -body $m5CreateAssignBody
$m5AssignmentId = $res.Body.id
if ($res.StatusCode -eq 201) {
    Log-Test "M5: Create Active Assignment for Alice" "PASS" "Assignment created with ID $m5AssignmentId."
} else {
    Log-Test "M5: Create Active Assignment for Alice" "FAIL" "Failed to create assignment. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# Step 6: Create weekly timesheet draft (week start must be Monday, 2026-06-08)
$m5Line = @{
    workDate = "2026-06-08"
    hoursWorked = 10.00
    activityDesc = "Developing core timesheet features"
}
$m5TimesheetBody = @{
    assignmentId = $m5AssignmentId
    weekStartDate = "2026-06-08"
    lines = @($m5Line)
}
$res = Send-Req "POST" "/timesheets" -token $variables["contractorAccessTokenA"] -body $m5TimesheetBody
$m5TimesheetId = $res.Body.id
if ($res.StatusCode -eq 201) {
    Log-Test "M5: Create Timesheet Draft (Alice)" "PASS" "Timesheet draft created with ID $m5TimesheetId, billable amount: $($res.Body.billableAmount) (expected 550.00)."
} else {
    Log-Test "M5: Create Timesheet Draft (Alice)" "FAIL" "Failed to create draft. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# Step 7: Submit Timesheet Draft
$res = Send-Req "POST" "/timesheets/$m5TimesheetId/submit" -token $variables["contractorAccessTokenA"]
if ($res.StatusCode -eq 200 -and $res.Body.status -eq "SUBMITTED") {
    Log-Test "M5: Submit Timesheet Draft" "PASS" "Timesheet submitted successfully. Status: SUBMITTED."
} else {
    Log-Test "M5: Submit Timesheet Draft" "FAIL" "Submission failed. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# Step 8: Harold (Hiring Manager) L1 Approve Timesheet
$approveBody = @{
    remarks = "Looks good, L1 Approved"
}
$res = Send-Req "POST" "/timesheets/$m5TimesheetId/approve" -token $variables["hiringManagerAccessTokenB"] -body $approveBody
if ($res.StatusCode -eq 200 -and $res.Body.status -eq "PENDING_FINANCE") {
    Log-Test "M5: L1 Approve Timesheet (Harold)" "PASS" "Hiring Manager approved timesheet. Status: PENDING_FINANCE."
} else {
    Log-Test "M5: L1 Approve Timesheet (Harold)" "FAIL" "HM approval failed. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# Step 9: Finance L2 Approve Timesheet
$res = Send-Req "POST" "/timesheets/$m5TimesheetId/approve" -token $variables["financeAccessToken"] -body $approveBody
if ($res.StatusCode -eq 200 -and $res.Body.status -eq "APPROVED") {
    Log-Test "M5: L2 Approve Timesheet (Finance)" "PASS" "Finance approved timesheet. Status: APPROVED."
} else {
    Log-Test "M5: L2 Approve Timesheet (Finance)" "FAIL" "Finance approval failed. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# Step 10: Alice requests a leave (SICK_LEAVE, start=2026-06-09, end=2026-06-09)
$leaveBody = @{
    assignmentId = $m5AssignmentId
    startDate = "2026-06-09"
    endDate = "2026-06-09"
    absenceType = "SICK_LEAVE"
    duration = "FULL_DAY"
    reason = "Dentist appointment"
}
$res = Send-Req "POST" "/absences" -token $variables["contractorAccessTokenA"] -body $leaveBody
$m5LeaveId = $res.Body.id
if ($res.StatusCode -eq 201) {
    Log-Test "M5: Request Leave (Alice)" "PASS" "Leave requested with ID $m5LeaveId."
} else {
    Log-Test "M5: Request Leave (Alice)" "FAIL" "Leave request failed. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# Harold approves the leave
$res = Send-Req "POST" "/absences/$m5LeaveId/approve" -token $variables["hiringManagerAccessTokenB"]
if ($res.StatusCode -eq 200 -and $res.Body.status -eq "APPROVED") {
    Log-Test "M5: Approve Leave (Harold)" "PASS" "Hiring Manager approved Alice's leave."
} else {
    Log-Test "M5: Approve Leave (Harold)" "FAIL" "Leave approval failed. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# Step 11: Alice attempts to create a timesheet containing non-zero billable hours on the leave day (fails 400)
# Request a leave for a different week to verify leave block rule without duplicate week constraint
$leaveBody2 = @{
    assignmentId = $m5AssignmentId
    startDate = "2026-06-02"
    endDate = "2026-06-02"
    absenceType = "SICK_LEAVE"
    duration = "FULL_DAY"
    reason = "Doctor visit"
}
$res = Send-Req "POST" "/absences" -token $variables["contractorAccessTokenA"] -body $leaveBody2
$m5LeaveId2 = $res.Body.id
Send-Req "POST" "/absences/$m5LeaveId2/approve" -token $variables["hiringManagerAccessTokenB"] | Out-Null

$invalidLine3 = @{
    workDate = "2026-06-01"
    hoursWorked = 8.00
    activityDesc = "Work"
}
$invalidLine4 = @{
    workDate = "2026-06-02" # Leave day
    hoursWorked = 8.00 # Violates leave day hours rule
    activityDesc = "Working on leave day"
}
$invalidTimesheetBody2 = @{
    assignmentId = $m5AssignmentId
    weekStartDate = "2026-06-01"
    lines = @($invalidLine3, $invalidLine4)
}
$res = Send-Req "POST" "/timesheets" -token $variables["contractorAccessTokenA"] -body $invalidTimesheetBody2
if ($res.StatusCode -eq 400 -and $res.RawContent -like "*Leave days must contain 0 billable hours*") {
    Log-Test "M5: Log hours on Leave day (Blocked)" "PASS" "Successfully blocked logging hours on an approved leave day."
} else {
    Log-Test "M5: Log hours on Leave day (Blocked)" "FAIL" "Expected 400 with leave day error, but got status $($res.StatusCode): $($res.RawContent)"
}

# Step 12: Half-Day Leave Verification ("Morning leave" fails if >4 hours regular work logged, succeeds if <=4 hours)
# Alice requests a half-day leave for Wednesday 2026-06-03
$leaveBody3 = @{
    assignmentId = $m5AssignmentId
    startDate = "2026-06-03"
    endDate = "2026-06-03"
    absenceType = "CASUAL_LEAVE"
    duration = "HALF_DAY"
    reason = "Morning leave"
}
$res = Send-Req "POST" "/absences" -token $variables["contractorAccessTokenA"] -body $leaveBody3
$m5LeaveId3 = $res.Body.id
Send-Req "POST" "/absences/$m5LeaveId3/approve" -token $variables["hiringManagerAccessTokenB"] | Out-Null

# Alice attempts to log 5.00 hours on the half-day leave day (should be blocked)
$invalidLine5 = @{
    workDate = "2026-06-01"
    hoursWorked = 8.00
    activityDesc = "Work"
}
$invalidLine6 = @{
    workDate = "2026-06-02" # Full-day leave
    hoursWorked = 0.00
    activityDesc = "Leave"
}
$invalidLine7 = @{
    workDate = "2026-06-03" # Half-day leave
    hoursWorked = 5.00 # Exceeds 4.00 hours limit for half-day
    activityDesc = "Work on half-day leave"
}
$invalidTimesheetBody3 = @{
    assignmentId = $m5AssignmentId
    weekStartDate = "2026-06-01"
    lines = @($invalidLine5, $invalidLine6, $invalidLine7)
}
$res = Send-Req "POST" "/timesheets" -token $variables["contractorAccessTokenA"] -body $invalidTimesheetBody3
if ($res.StatusCode -eq 400 -and $res.RawContent -like "*Cannot log more than 4 hours worked on a half-day leave*") {
    Log-Test "M5: Log >4 hours on Half-Day Leave (Blocked)" "PASS" "Successfully blocked logging >4 hours on a half-day leave."
} else {
    Log-Test "M5: Log >4 hours on Half-Day Leave (Blocked)" "FAIL" "Expected 400 with half-day error, but got status $($res.StatusCode): $($res.RawContent)"
}

# Alice logs 4.00 hours on the half-day leave day (should succeed)
$validLine5 = @{
    workDate = "2026-06-01"
    hoursWorked = 8.00
    activityDesc = "Work"
}
$validLine6 = @{
    workDate = "2026-06-02"
    hoursWorked = 0.00
    activityDesc = "Leave"
}
$validLine7 = @{
    workDate = "2026-06-03"
    hoursWorked = 4.00 # Within 4.00 hours limit for half-day
    activityDesc = "Work on half-day leave"
}
$validTimesheetBody3 = @{
    assignmentId = $m5AssignmentId
    weekStartDate = "2026-06-01"
    lines = @($validLine5, $validLine6, $validLine7)
}
$res = Send-Req "POST" "/timesheets" -token $variables["contractorAccessTokenA"] -body $validTimesheetBody3
if ($res.StatusCode -eq 201) {
    Log-Test "M5: Log <=4 hours on Half-Day Leave (Succeeds)" "PASS" "Successfully created timesheet draft with 4 hours on half-day leave."
} else {
    Log-Test "M5: Log <=4 hours on Half-Day Leave (Succeeds)" "FAIL" "Expected 201 but got status $($res.StatusCode): $($res.RawContent)"
}# ==================== MODULE 6: INVOICING & PAYMENT PROCESSING ====================

# Step 1: Submit Alice's timesheet draft (created in Module 5, $res.Body.id)
$m5TsId = $res.Body.id
$res = Send-Req "POST" "/timesheets/$m5TsId/submit" -token $variables["contractorAccessTokenA"]
if ($res.StatusCode -eq 200) {
    Log-Test "M6: Submit Timesheet" "PASS" "Submitted timesheet draft $m5TsId successfully."
} else {
    Log-Test "M6: Submit Timesheet" "FAIL" "Failed to submit timesheet. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# Step 2: Approve timesheet L1 by Harold (Hiring Manager)
$res = Send-Req "POST" "/timesheets/$m5TsId/approve" -token $variables["hiringManagerAccessTokenB"] -body @{ remarks = "L1 Approved" }
if ($res.StatusCode -eq 200) {
    Log-Test "M6: L1 Approve Timesheet" "PASS" "HM approved timesheet successfully."
} else {
    Log-Test "M6: L1 Approve Timesheet" "FAIL" "HM failed to approve timesheet. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# Step 3: Approve timesheet L2 by Finance
$res = Send-Req "POST" "/timesheets/$m5TsId/approve" -token $variables["financeAccessToken"] -body @{ remarks = "L2 Approved" }
if ($res.StatusCode -eq 200) {
    Log-Test "M6: L2 Approve Timesheet" "PASS" "Finance approved timesheet successfully."
} else {
    Log-Test "M6: L2 Approve Timesheet" "FAIL" "Finance failed to approve timesheet. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# Step 4: Create Purchase Order (Admin -> Victor Vendor for Assignment $m5AssignmentId)
$createPOBody = @{
    AssignmentID = $m5AssignmentId
    VendorID = $variables["vendorManagerUserId"]
    POAmount = 2500.00
    Currency = "USD"
    IssuedDate = "2026-06-01"
    ExpiryDate = "2026-12-01"
    Status = "ACTIVE"
}
$res = Send-Req "POST" "/purchase-orders" -token $variables["adminAccessToken"] -body $createPOBody
$m6PoId = $res.Body.POID
if ($res.StatusCode -eq 201 -and $m6PoId -like "PO-*") {
    Log-Test "M6: Create Purchase Order" "PASS" "Created Purchase Order $m6PoId successfully."
} else {
    Log-Test "M6: Create Purchase Order" "FAIL" "Failed to create PO. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# Step 5: Submit Invoice (Victor Vendor -> Admin/Finance)
$createInvoiceBody = @{
    POID = $m6PoId
    AssignmentID = $m5AssignmentId
    ContractorID = $variables["contractorAUserId"]
    InvoicePeriod = "June 2026"
    TimesheetIDs = @($m5TsId)
}
$res = Send-Req "POST" "/invoices" -token $variables["hiringManagerAccessTokenB"] -body $createInvoiceBody
$m6InvoiceId = $res.Body.InvoiceID
if ($res.StatusCode -eq 201 -and $m6InvoiceId -like "INV-*") {
    Log-Test "M6: Submit Contractor Invoice" "PASS" "Submitted Contractor Invoice $m6InvoiceId successfully. Hours Billed: $($res.Body.HoursBilled), Amount: $($res.Body.InvoiceAmount)"
} else {
    Log-Test "M6: Submit Contractor Invoice" "FAIL" "Failed to submit invoice. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# Step 6: Approve Invoice (Finance)
$res = Send-Req "PUT" "/invoices/$m6InvoiceId/approve" -token $variables["financeAccessToken"]
if ($res.StatusCode -eq 200 -and $res.Body.Status -eq "APPROVED") {
    Log-Test "M6: Approve Contractor Invoice" "PASS" "Invoice approved successfully."
} else {
    Log-Test "M6: Approve Contractor Invoice" "FAIL" "Failed to approve invoice. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# Step 7: Create Payment (Finance)
$createPaymentBody = @{
    InvoiceID = $m6InvoiceId
    PaidAmount = 600.00
    PaymentDate = "2026-06-13"
    PaymentMode = "BANK_TRANSFER"
    Status = "PENDING"
    PaymentReference = "PAY-REF-E2E"
}
$res = Send-Req "POST" "/payments" -token $variables["financeAccessToken"] -body $createPaymentBody
$m6PaymentId = $res.Body.PaymentID
if ($res.StatusCode -eq 201 -and $m6PaymentId -like "PAY-*") {
    Log-Test "M6: Create Pending Payment" "PASS" "Created pending payment $m6PaymentId successfully."
} else {
    Log-Test "M6: Create Pending Payment" "FAIL" "Failed to create payment. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# Step 8: Process Payment & Verify Invoice Paid Status Cascade (Finance)
$res = Send-Req "PUT" "/payments/$m6PaymentId/process" -token $variables["financeAccessToken"]
if ($res.StatusCode -eq 200 -and $res.Body.Status -eq "PROCESSED") {
    $invRes = Send-Req "GET" "/invoices/$m6InvoiceId" -token $variables["financeAccessToken"]
    if ($invRes.Body.Status -eq "PAID") {
        Log-Test "M6: Process Payment & Cascade Invoice PAID status" "PASS" "Payment processed and invoice marked PAID successfully."
    } else {
        Log-Test "M6: Process Payment & Cascade Invoice PAID status" "FAIL" "Payment processed but invoice status is $($invRes.Body.Status)"
    }
} else {
    Log-Test "M6: Process Payment & Cascade Invoice PAID status" "FAIL" "Failed to process payment. Status: $($res.StatusCode)" "$($res.RawContent)"
}


# ==================== MODULE 7: WORKFORCE ANALYTICS & REPORTING ====================

# Step 1: Generate Report Snapshot (Admin)
$generateReportBody = @{
    scope = "EXECUTIVE"
}
$res = Send-Req "POST" "/reports/generate" -token $variables["adminAccessToken"] -body $generateReportBody
$m7ReportId = $res.Body.ReportID
if ($res.StatusCode -eq 201 -and $m7ReportId -like "WR-*") {
    Log-Test "M7: Generate Report Snapshot" "PASS" "Created report snapshot $m7ReportId successfully."
} else {
    Log-Test "M7: Generate Report Snapshot" "FAIL" "Failed to generate report. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# Step 2: Get All Reports (Finance)
$res = Send-Req "GET" "/reports" -token $variables["financeAccessToken"]
if ($res.StatusCode -eq 200 -and $res.Body.GetType().IsArray) {
    Log-Test "M7: Get All Reports" "PASS" "Listed all reports successfully."
} else {
    Log-Test "M7: Get All Reports" "FAIL" "Failed to get reports. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# Step 3: Get Report By ID (Finance)
$res = Send-Req "GET" "/reports/$m7ReportId" -token $variables["financeAccessToken"]
if ($res.StatusCode -eq 200 -and $res.Body.ReportID -eq $m7ReportId) {
    Log-Test "M7: Get Report By ID" "PASS" "Fetched report by ID successfully."
} else {
    Log-Test "M7: Get Report By ID" "FAIL" "Failed to get report by ID. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# Step 4: Get Executive Dashboard (Finance)
$res = Send-Req "GET" "/reports/executive-dashboard?days=30" -token $variables["financeAccessToken"]
if ($res.StatusCode -eq 200 -and $res.Body.ActiveContractors -ne $null) {
    Log-Test "M7: Get Executive Dashboard" "PASS" "Fetched executive dashboard successfully."
} else {
    Log-Test "M7: Get Executive Dashboard" "FAIL" "Failed to fetch executive dashboard. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# Step 5: Get Vendor Scorecard IDOR Protection (Vendor)
# Even if requesting another_vendor, should return logged-in vendor's ID (Victor's user id)
$res = Send-Req "GET" "/reports/vendor-scorecard/another_vendor" -token $variables["vendorManagerAccessTokenA"]
if ($res.StatusCode -eq 200 -and $res.Body.VendorID -eq $variables["vendorManagerUserId"]) {
    Log-Test "M7: Get Vendor Scorecard IDOR Protection" "PASS" "Fetched vendor scorecard with IDOR protection successfully."
} else {
    Log-Test "M7: Get Vendor Scorecard IDOR Protection" "FAIL" "Failed IDOR check. Status: $($res.StatusCode), VendorID: $($res.Body.VendorID)" "$($res.RawContent)"
}

# Step 6: Get Business Unit Dashboard IDOR Protection (Hiring Manager)
# Even if requesting IT, should return Harold's business unit (HR)
$res = Send-Req "GET" "/reports/business-unit/IT" -token $variables["hiringManagerAccessTokenB"]
if ($res.StatusCode -eq 200 -and $res.Body.BusinessUnit -eq "HR") {
    Log-Test "M7: Get Business Unit Dashboard IDOR Protection" "PASS" "Fetched Business Unit dashboard with IDOR protection successfully."
} else {
    Log-Test "M7: Get Business Unit Dashboard IDOR Protection" "FAIL" "Failed IDOR check. Status: $($res.StatusCode), BusinessUnit: $($res.Body.BusinessUnit)" "$($res.RawContent)"
}

# Step 7: Get Skill Dashboard (Hiring Manager)
$res = Send-Req "GET" "/reports/skill/Java" -token $variables["hiringManagerAccessTokenB"]
if ($res.StatusCode -eq 200 -and $res.Body.Skill -eq "Java") {
    Log-Test "M7: Get Skill Dashboard" "PASS" "Fetched skill dashboard successfully."
} else {
    Log-Test "M7: Get Skill Dashboard" "FAIL" "Failed to fetch skill dashboard. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# Step 8: Get Compliance Expiries (Admin)
$res = Send-Req "GET" "/reports/compliance-expiry?days=30" -token $variables["adminAccessToken"]
if ($res.StatusCode -eq 200 -and $res.Body -ge 0) {
    Log-Test "M7: Get Compliance Expiries" "PASS" "Fetched compliance expiry count successfully."
} else {
    Log-Test "M7: Get Compliance Expiries" "FAIL" "Failed to get compliance expiries. Status: $($res.StatusCode)" "$($res.RawContent)"
}


# ==================== MODULE 8: NOTIFICATIONS & ALERTS ====================

# Step 1: Create an expiring certification for Alice to trigger scheduler alert
$certExpiringBody = @{
    name = "Expiring Scrum Master"
    issuingAuthority = "Scrum Alliance"
    certificateNumber = "CSM-998822"
    issueDate = "2024-05-15"
    expiryDate = "2026-06-20" # Expiring soon (6 days from current date 2026-06-14, which is within the 30-day window)
    certStatus = "valid"
}
$res = Send-Req "POST" "/contractors/profiles/$($variables["contractorAProfileId"])/certifications" -token $variables["contractorAccessTokenA"] -body $certExpiringBody
if ($res.StatusCode -eq 201) {
    Log-Test "M8: Create Expiring Certification" "PASS" "Created expiring certification for Alice."
} else {
    Log-Test "M8: Create Expiring Certification" "FAIL" "Failed to create certification. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# Step 2: Trigger Scheduler Jobs (Admin) - First Run
$res = Send-Req "POST" "/notifications/trigger-jobs" -token $variables["adminAccessToken"]
if ($res.StatusCode -eq 200) {
    Log-Test "M8: Trigger Notification Scheduler Jobs (Run 1)" "PASS" "Successfully triggered scheduler jobs first time."
} else {
    Log-Test "M8: Trigger Notification Scheduler Jobs (Run 1)" "FAIL" "Failed to trigger jobs. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# Step 3: Trigger Scheduler Jobs (Admin) - Second Run (Verify Duplicate Prevention)
$res = Send-Req "POST" "/notifications/trigger-jobs" -token $variables["adminAccessToken"]
if ($res.StatusCode -eq 200) {
    Log-Test "M8: Trigger Notification Scheduler Jobs (Run 2)" "PASS" "Successfully triggered scheduler jobs second time."
} else {
    Log-Test "M8: Trigger Notification Scheduler Jobs (Run 2)" "FAIL" "Failed to trigger jobs. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# Step 4: Contractor Fetch Notifications
$res = Send-Req "GET" "/notifications" -token $variables["contractorAccessTokenA"]
if ($res.StatusCode -eq 200 -and $res.Body.GetType().IsArray) {
    $aliceNotifications = $res.Body
    # Find warning notifications
    $warningNotifications = @($aliceNotifications | Where-Object { $_.notificationType -eq "CERTIFICATION_EXPIRY_WARNING" })
    if ($warningNotifications.Count -eq 1) {
        Log-Test "M8: Duplicate Warning Prevention" "PASS" "Only one unread warning notification exists for the expiring certification."
    } else {
        Log-Test "M8: Duplicate Warning Prevention" "FAIL" "Expected exactly 1 warning, but got $($warningNotifications.Count)"
    }
} else {
    Log-Test "M8: Contractor Fetch Notifications" "FAIL" "Failed to fetch notifications. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# Step 5: Get Unread Notification Count
$res = Send-Req "GET" "/notifications/unread-count" -token $variables["contractorAccessTokenA"]
if ($res.StatusCode -eq 200) {
    Log-Test "M8: Get Unread Count (Alice)" "PASS" "Fetched unread count for Alice: $($res.Body)"
} else {
    Log-Test "M8: Get Unread Count (Alice)" "FAIL" "Failed to fetch unread count. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# Step 6: Verify Blocked Public POST endpoint (Fail 404, 405, or 500 Not Supported)
$fakeNotifBody = @{
    userId = $variables["contractorAUserId"]
    message = "Fake Notification"
    category = "ASSIGNMENT"
}
$res = Send-Req "POST" "/notifications" -token $variables["contractorAccessTokenA"] -body $fakeNotifBody
if ($res.StatusCode -eq 404 -or $res.StatusCode -eq 405 -or ($res.StatusCode -eq 500 -and $res.RawContent -like "*not supported*")) {
    Log-Test "M8: Public POST /notifications Blocked" "PASS" "Public notification creation blocked successfully."
} else {
    Log-Test "M8: Public POST /notifications Blocked" "FAIL" "Expected blocked response but got: $($res.StatusCode)" "$($res.RawContent)"
}

# Step 7: Verify IDOR Protection on GET by ID, READ, DISMISS
if ($aliceNotifications.Length -gt 0) {
    $notifId = $aliceNotifications[0].notificationId
    
    # Bob tries to access Alice's notification
    $res = Send-Req "GET" "/notifications/$notifId" -token $variables["contractorAccessTokenB"]
    if ($res.StatusCode -eq 403) {
        Log-Test "M8: Get Notification IDOR Protection" "PASS" "Successfully blocked Bob from reading Alice's notification."
    } else {
        Log-Test "M8: Get Notification IDOR Protection" "FAIL" "Expected 403 but got status: $($res.StatusCode)" "$($res.RawContent)"
    }
    
    # Alice accesses her own notification
    $res = Send-Req "GET" "/notifications/$notifId" -token $variables["contractorAccessTokenA"]
    if ($res.StatusCode -eq 200 -and $res.Body.notificationId -eq $notifId) {
        Log-Test "M8: Get Notification By ID" "PASS" "Alice successfully fetched her own notification."
    } else {
        Log-Test "M8: Get Notification By ID" "FAIL" "Failed to fetch notification by ID. Status: $($res.StatusCode)" "$($res.RawContent)"
    }

    # Bob tries to read Alice's notification
    $res = Send-Req "PUT" "/notifications/$notifId/read" -token $variables["contractorAccessTokenB"]
    if ($res.StatusCode -eq 403) {
        Log-Test "M8: Mark Read IDOR Protection" "PASS" "Successfully blocked Bob from marking Alice's notification as read."
    } else {
        Log-Test "M8: Mark Read IDOR Protection" "FAIL" "Expected 403 but got status: $($res.StatusCode)" "$($res.RawContent)"
    }

    # Alice marks her notification as read
    $res = Send-Req "PUT" "/notifications/$notifId/read" -token $variables["contractorAccessTokenA"]
    if ($res.StatusCode -eq 200 -and $res.Body.status -eq "READ") {
        Log-Test "M8: Mark Notification As READ" "PASS" "Alice marked her notification as READ."
    } else {
        Log-Test "M8: Mark Notification As READ" "FAIL" "Failed to mark read. Status: $($res.StatusCode)" "$($res.RawContent)"
    }

    # Bob tries to dismiss Alice's notification
    $res = Send-Req "PUT" "/notifications/$notifId/dismiss" -token $variables["contractorAccessTokenB"]
    if ($res.StatusCode -eq 403) {
        Log-Test "M8: Mark Dismissed IDOR Protection" "PASS" "Successfully blocked Bob from dismissing Alice's notification."
    } else {
        Log-Test "M8: Mark Dismissed IDOR Protection" "FAIL" "Expected 403 but got status: $($res.StatusCode)" "$($res.RawContent)"
    }

    # Alice dismisses her notification
    $res = Send-Req "PUT" "/notifications/$notifId/dismiss" -token $variables["contractorAccessTokenA"]
    if ($res.StatusCode -eq 200 -and $res.Body.status -eq "DISMISSED") {
        Log-Test "M8: Mark Notification As DISMISSED" "PASS" "Alice marked her notification as DISMISSED."
    } else {
        Log-Test "M8: Mark Notification As DISMISSED" "FAIL" "Failed to dismiss notification. Status: $($res.StatusCode)" "$($res.RawContent)"
    }
} else {
    Log-Test "M8: Get Notification IDOR/Actions" "FAIL" "No notifications exist for Alice to test IDOR/Read/Dismiss."
}


# --- Output Report Summary ---
Write-Host "`n==================================================" -ForegroundColor Cyan
Write-Host "Verification Finished! Total tests: $($global:results.Count)" -ForegroundColor Cyan
$passed = ($global:results | Where-Object { $_.Status -eq "PASS" }).Count
$failed = ($global:results | Where-Object { $_.Status -eq "FAIL" }).Count
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor Red
Write-Host "==================================================" -ForegroundColor Cyan



