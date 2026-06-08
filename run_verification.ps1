# GigForce Module 2 E2E Verification Runner

$baseUrl = "http://localhost:8080/api/v1"
$variables = @{
    "baseUrl" = $baseUrl
}

$results = @()

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
    Log-Test "Login Admin" "PASS" "Admin logged in successfully and token captured."
} else {
    Log-Test "Login Admin" "FAIL" "Failed to log in as admin. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- STEP 2: Register Contractor A (Alice) ---
$regAliceBody = @{
    name = "Contractor Alice"
    email = "alice@org-a.com"
    password = "Password123!"
    phone = "9111111111"
    role = "CONTRACTOR"
}
$res = Send-Req "POST" "/auth/register" -body $regAliceBody
if ($res.StatusCode -eq 201) {
    $variables["contractorAUserId"] = $res.Body.userId
    Log-Test "Register Contractor A (Alice)" "PASS" "Registered user Alice with ID $($res.Body.userId)."
} else {
    Log-Test "Register Contractor A (Alice)" "FAIL" "Registration failed. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- STEP 3: Login Contractor A (Alice) ---
$loginAliceBody = @{
    email = "alice@org-a.com"
    password = "Password123!"
}
$res = Send-Req "POST" "/auth/login" -body $loginAliceBody
if ($res.StatusCode -eq 200) {
    $variables["contractorAccessTokenA"] = $res.Body.accessToken
    Log-Test "Login Contractor A (Alice)" "PASS" "Contractor Alice logged in successfully."
} else {
    Log-Test "Login Contractor A (Alice)" "FAIL" "Login failed. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- STEP 4: Register Vendor Manager A (Victor) ---
$regVictorBody = @{
    name = "Vendor Manager Victor"
    email = "victor@org-a.com"
    password = "Password123!"
    phone = "9222222222"
    role = "VENDOR_MANAGER"
}
$res = Send-Req "POST" "/auth/register" -body $regVictorBody
if ($res.StatusCode -eq 201) {
    $variables["vendorManagerUserId"] = $res.Body.userId
    Log-Test "Register Vendor Manager A (Victor)" "PASS" "Registered Vendor Manager Victor with ID $($res.Body.userId)."
} else {
    Log-Test "Register Vendor Manager A (Victor)" "FAIL" "Registration failed. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- STEP 5: Login Vendor Manager A ---
$loginVictorBody = @{
    email = "victor@org-a.com"
    password = "Password123!"
}
$res = Send-Req "POST" "/auth/login" -body $loginVictorBody
if ($res.StatusCode -eq 200) {
    $variables["vendorManagerAccessTokenA"] = $res.Body.accessToken
    Log-Test "Login Vendor Manager A" "PASS" "Vendor Manager Victor logged in successfully."
} else {
    Log-Test "Login Vendor Manager A" "FAIL" "Login failed. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- STEP 6: Create Org B (Admin Only) ---
$orgBBody = @{
    name = "Organization B"
    code = "ORG_B"
    status = "ACTIVE"
}
$res = Send-Req "POST" "/organizations" -token $variables["adminAccessToken"] -body $orgBBody
if ($res.StatusCode -eq 201) {
    $variables["orgBId"] = $res.Body.organizationId
    Log-Test "Create Org B (Admin)" "PASS" "Org B created with ID $($res.Body.organizationId)."
} else {
    Log-Test "Create Org B (Admin)" "FAIL" "Failed to create Org B. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- STEP 7: Register Contractor B (Bob) ---
$regBobBody = @{
    name = "Contractor Bob"
    email = "bob@org-b.com"
    password = "Password123!"
    phone = "9333333333"
    role = "CONTRACTOR"
    orgCode = "ORG_B"
}
$res = Send-Req "POST" "/auth/register" -body $regBobBody
if ($res.StatusCode -eq 201) {
    $variables["contractorBUserId"] = $res.Body.userId
    Log-Test "Register Contractor B (Bob)" "PASS" "Registered user Bob with ID $($res.Body.userId)."
} else {
    Log-Test "Register Contractor B (Bob)" "FAIL" "Registration failed. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- STEP 8: Update Contractor B Org to Org B (Admin) ---
$updateBobBody = @{
    name = "Contractor Bob"
    phone = "9333333333"
    orgUnitId = [int]$variables["orgBId"]
}
$res = Send-Req "PUT" "/users/$($variables["contractorBUserId"])" -token $variables["adminAccessToken"] -body $updateBobBody
if ($res.StatusCode -eq 200) {
    Log-Test "Update Contractor B Org to Org B" "PASS" "Updated Contractor Bob's organization to Org B."
} else {
    Log-Test "Update Contractor B Org to Org B" "FAIL" "Failed to update organization. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- STEP 9: Login Contractor B (Bob) ---
$loginBobBody = @{
    email = "bob@org-b.com"
    password = "Password123!"
}
$res = Send-Req "POST" "/auth/login" -body $loginBobBody
if ($res.StatusCode -eq 200) {
    $variables["contractorAccessTokenB"] = $res.Body.accessToken
    Log-Test "Login Contractor B (Bob)" "PASS" "Contractor Bob logged in successfully."
} else {
    Log-Test "Login Contractor B (Bob)" "FAIL" "Login failed. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- STEP 10: Register Hiring Manager B (Harold) ---
$regHaroldBody = @{
    name = "Hiring Manager Harold"
    email = "harold@org-b.com"
    password = "Password123!"
    phone = "9444444444"
    role = "HIRING_MANAGER"
    orgCode = "ORG_B"
}
$res = Send-Req "POST" "/auth/register" -body $regHaroldBody
if ($res.StatusCode -eq 201) {
    $variables["hiringManagerUserId"] = $res.Body.userId
    Log-Test "Register Hiring Manager B (Harold)" "PASS" "Registered Hiring Manager Harold with ID $($res.Body.userId)."
} else {
    Log-Test "Register Hiring Manager B (Harold)" "FAIL" "Registration failed. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- STEP 11: Update Hiring Manager B Org to Org B (Admin) ---
$updateHaroldBody = @{
    name = "Hiring Manager Harold"
    phone = "9444444444"
    orgUnitId = [int]$variables["orgBId"]
}
$res = Send-Req "PUT" "/users/$($variables["hiringManagerUserId"])" -token $variables["adminAccessToken"] -body $updateHaroldBody
if ($res.StatusCode -eq 200) {
    Log-Test "Update Hiring Manager B Org to Org B" "PASS" "Updated Hiring Manager Harold's organization to Org B."
} else {
    Log-Test "Update Hiring Manager B Org to Org B" "FAIL" "Failed to update organization. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- STEP 12: Login Hiring Manager B ---
$loginHaroldBody = @{
    email = "harold@org-b.com"
    password = "Password123!"
}
$res = Send-Req "POST" "/auth/login" -body $loginHaroldBody
if ($res.StatusCode -eq 200) {
    $variables["hiringManagerAccessTokenB"] = $res.Body.accessToken
    Log-Test "Login Hiring Manager B" "PASS" "Hiring Manager Harold logged in successfully."
} else {
    Log-Test "Login Hiring Manager B" "FAIL" "Login failed. Status: $($res.StatusCode)" "$($res.RawContent)"
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
    title = "Senior Java Developer"
    bio = "Experienced engineer specializing in Spring Boot microservices."
    hourlyRate = 45.00
    experienceYears = 6
}
$res = Send-Req "POST" "/contractors/profiles" -token $variables["contractorAccessTokenA"] -body $profileAliceBody
if ($res.StatusCode -eq 201) {
    $variables["contractorAProfileId"] = $res.Body.id
    Log-Test "Create Contractor Profile" "PASS" "Profile for Contractor Alice created with ID $($res.Body.id)."
} else {
    Log-Test "Create Contractor Profile" "FAIL" "Failed to create profile. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 18: Attempt duplicate Profile creation ---
$res = Send-Req "POST" "/contractors/profiles" -token $variables["contractorAccessTokenA"] -body $profileAliceBody
if ($res.StatusCode -eq 400) {
    Log-Test "Attempt duplicate Profile creation" "PASS" "Duplicate profile creation rejected with 400."
} else {
    Log-Test "Attempt duplicate Profile creation" "FAIL" "Expected 400 but got: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 19: Get My Profile ---
$res = Send-Req "GET" "/contractors/profiles/me" -token $variables["contractorAccessTokenA"]
if ($res.StatusCode -eq 200 -and $res.Body.title -eq "Senior Java Developer") {
    Log-Test "Get My Profile" "PASS" "Own profile retrieved correctly."
} else {
    Log-Test "Get My Profile" "FAIL" "Profile mismatch or retrieval failed. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 20: Update Profile ---
$updateAliceBody = @{
    title = "Lead Spring Boot Architect"
    bio = "Specializing in distributed systems and cloud solutions."
    hourlyRate = 55.00
    experienceYears = 7
}
$res = Send-Req "PUT" "/contractors/profiles/$($variables["contractorAProfileId"])" -token $variables["contractorAccessTokenA"] -body $updateAliceBody
if ($res.StatusCode -eq 200 -and $res.Body.title -eq "Lead Spring Boot Architect") {
    Log-Test "Update Profile" "PASS" "Profile updated successfully."
} else {
    Log-Test "Update Profile" "FAIL" "Update failed. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 21: Create Profile (Bob) ---
$profileBobBody = @{
    title = "Fullstack React Developer"
    bio = "Building beautiful frontends with React."
    hourlyRate = 40.00
    experienceYears = 4
}
$res = Send-Req "POST" "/contractors/profiles" -token $variables["contractorAccessTokenB"] -body $profileBobBody
if ($res.StatusCode -eq 201) {
    $variables["contractorBProfileId"] = $res.Body.id
    Log-Test "Create Contractor B Profile" "PASS" "Contractor Bob profile created with ID $($res.Body.id)."
} else {
    Log-Test "Create Contractor B Profile" "FAIL" "Failed to create Bob's profile. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# ==================== CONTRACTOR SKILLS mappings ====================

# --- Test 22: Add Skill to Profile (Java -> Alice) ---
$skillJavaMapBody = @{
    skillId = [int]$variables["skillJavaId"]
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
    skillId = [int]$variables["skillReactId"]
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
    skillId = [int]$variables["skillReactId"]
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
    skillId = [int]$variables["skillPythonId"]
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
    skillId = [int]$variables["skillReactId"]
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

# --- Test 28: Add Engagement (Vendor Manager A -> Alice) ---
$engBody = @{
    clientOrgId = 1
    roleTitle = "Contract Software Engineer"
    startDate = "2024-01-10"
    endDate = "2024-05-10"
    feedback = "Excellent contribution to our microservices project."
    rating = 5
}
$res = Send-Req "POST" "/contractors/profiles/$($variables["contractorAProfileId"])/engagements" -token $variables["vendorManagerAccessTokenA"] -body $engBody
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

# --- Test 35: Cross Org Profile Read (Hiring Manager B -> Contractor Alice - Fail 403) ---
$res = Send-Req "GET" "/contractors/profiles/$($variables["contractorAProfileId"])" -token $variables["hiringManagerAccessTokenB"]
if ($res.StatusCode -eq 403) {
    Log-Test "Cross Org Profile Read Blocked" "PASS" "Hiring Manager B was blocked from reading Alice's Org A profile."
} else {
    Log-Test "Cross Org Profile Read Blocked" "FAIL" "Got status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 36: Cross Org Search Isolation ---
$res = Send-Req "GET" "/contractors/profiles" -token $variables["hiringManagerAccessTokenB"]
$containsAlice = $false
if ($res.StatusCode -eq 200) {
    foreach ($prof in $res.Body.content) {
        if ($prof.id -eq $variables["contractorAProfileId"]) {
            $containsAlice = $true
        }
    }
}
if ($res.StatusCode -eq 200 -and !$containsAlice) {
    Log-Test "Cross Org Search Isolation" "PASS" "Hiring Manager B only see profiles in Org B (Alice excluded)."
} else {
    Log-Test "Cross Org Search Isolation" "FAIL" "Alice was not isolated. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 37: ADMIN bypass works correctly ---
$res = Send-Req "GET" "/contractors/profiles/$($variables["contractorAProfileId"])" -token $variables["adminAccessToken"]
if ($res.StatusCode -eq 200) {
    Log-Test "ADMIN bypass works correctly" "PASS" "Admin successfully accessed Org A profile directly."
} else {
    Log-Test "ADMIN bypass works correctly" "FAIL" "Admin read failed. Status: $($res.StatusCode)" "$($res.RawContent)"
}

# ==================== VALIDATION checks ====================

# --- Test 38: Create Profile - Negative Hourly Rate (Fail) ---
$profileNegativeBody = @{
    title = "Architect"
    bio = "Negative hourly rate test"
    hourlyRate = -1.00
    experienceYears = 5
}
$res = Send-Req "POST" "/contractors/profiles" -token $variables["contractorAccessTokenB"] -body $profileNegativeBody
if ($res.StatusCode -eq 400) {
    Log-Test "Validation: Negative Hourly Rate" "PASS" "Correctly rejected with 400 Bad Request."
} else {
    Log-Test "Validation: Negative Hourly Rate" "FAIL" "Got status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Test 39: Create Profile - Empty Title (Fail) ---
$profileEmptyBody = @{
    title = ""
    bio = "Empty title test"
    hourlyRate = 10.00
    experienceYears = 5
}
$res = Send-Req "POST" "/contractors/profiles" -token $variables["contractorAccessTokenB"] -body $profileEmptyBody
if ($res.StatusCode -eq 400) {
    Log-Test "Validation: Empty Title" "PASS" "Correctly rejected with 400."
} else {
    Log-Test "Validation: Empty Title" "FAIL" "Got status: $($res.StatusCode)" "$($res.RawContent)"
}

# ==================== AUDIT LOGS verification ====================

# --- Test 40: Verify Audit Logs ---
$res = Send-Req "GET" "/audit/user/$($variables["contractorAUserId"])" -token $variables["adminAccessToken"]
$actionsFound = @{}
if ($res.StatusCode -eq 200) {
    foreach ($log in $res.Body) {
        $actionsFound[$log.action] = $true
    }
}
$missing = @()
foreach ($act in @("CONTRACTOR_PROFILE_CREATED", "CONTRACTOR_PROFILE_UPDATED", "CONTRACTOR_SKILL_ADDED", "CONTRACTOR_SKILL_UPDATED", "CONTRACTOR_SKILL_REMOVED")) {
    if (!$actionsFound.ContainsKey($act)) {
        $missing += $act
    }
}

if ($res.StatusCode -eq 200 -and $missing.Count -eq 0) {
    Log-Test "Verify Audit Logs" "PASS" "All expected contractor actions logged (CREATED, UPDATED, SKILL_ADDED, SKILL_UPDATED, SKILL_REMOVED)."
} else {
    Log-Test "Verify Audit Logs" "FAIL" "Missing audit actions: $($missing -join ', '). Status: $($res.StatusCode)" "$($res.RawContent)"
}

# --- Output Report Summary ---
Write-Host "`n==================================================" -ForegroundColor Cyan
Write-Host "Verification Finished! Total tests: $($global:results.Count)" -ForegroundColor Cyan
$passed = ($global:results | Where-Object { $_.Status -eq "PASS" }).Count
$failed = ($global:results | Where-Object { $_.Status -eq "FAIL" }).Count
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor Red
Write-Host "==================================================" -ForegroundColor Cyan
