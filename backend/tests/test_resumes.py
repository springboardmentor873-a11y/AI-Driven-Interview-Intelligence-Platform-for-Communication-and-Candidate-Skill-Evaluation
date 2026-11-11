import io

def test_resume_upload_and_skill_extraction(client):
    # 1. Register candidate
    reg_resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": "resume_user@smarthire.ai",
            "password": "Password123!",
            "full_name": "Resume Developer",
            "role": "candidate"
        }
    )
    token = reg_resp.json()["access_token"]

    # 2. Upload sample resume file
    resume_content = """
    John Doe - Full Stack Developer
    Email: john@example.com | Phone: 555-1234
    
    Professional Summary:
    Results-driven Software Engineer with 4 years of experience specializing in Python, FastAPI, React, and PostgreSQL.
    Proficient in Docker, AWS, Git, CI/CD, and Microservices architecture.
    
    Education:
    Bachelor of Technology in Computer Science & Engineering (2020 - 2024)
    
    Experience:
    Software Engineer at Tech Corp (2022 - Present)
    - Developed REST APIs with FastAPI and PostgreSQL
    - Built responsive frontend with React and Tailwind CSS
    - Deployed containerized applications using Docker and Kubernetes
    
    Core Skills:
    Python, JavaScript, TypeScript, React, FastAPI, PostgreSQL, Docker, Kubernetes, AWS, Git, Machine Learning, System Design
    """
    
    file_bytes = resume_content.encode("utf-8")
    files = {
        "file": ("resume_john_doe.txt", io.BytesIO(file_bytes), "text/plain")
    }

    upload_resp = client.post(
        "/api/v1/resumes/upload",
        headers={"Authorization": f"Bearer {token}"},
        files=files
    )
    assert upload_resp.status_code == 201
    data = upload_resp.json()
    assert data["message"] == "Resume uploaded and skills extracted successfully"
    resume = data["resume"]
    assert resume["filename"] == "resume_john_doe.txt"
    assert "Python" in resume["skills"]
    assert "FastAPI" in resume["skills"]
    assert "React" in resume["skills"]
    assert "PostgreSQL" in resume["skills"]
    assert resume["experience_years"] >= 4.0
    assert len(resume["education"]) > 0

    resume_id = resume["id"]

    # 3. List resumes
    list_resp = client.get(
        "/api/v1/resumes/",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert list_resp.status_code == 200
    resumes = list_resp.json()
    assert len(resumes) >= 1

    # 4. Get specific resume skills
    skills_resp = client.get(
        f"/api/v1/resumes/{resume_id}/skills",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert skills_resp.status_code == 200
    skills_data = skills_resp.json()
    assert "Python" in skills_data["skills"]
    assert "FastAPI" in skills_data["skills"]

    # 5. Delete resume
    del_resp = client.delete(
        f"/api/v1/resumes/{resume_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert del_resp.status_code == 200
