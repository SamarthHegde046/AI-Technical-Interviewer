# Candidate JSON Details - API Reference

This document provides examples of the different JSON formats available for shortlisted candidates.

## API Endpoints

### 1. Full Format (Complete Database Record)
```
GET /api/shortlisted/{candidateId}
Authorization: Bearer {recruiter_token}
```

### 2. AI-Optimized Format (Clean Structure)
```
GET /api/shortlisted/{candidateId}/ai-format
Authorization: Bearer {recruiter_token}
```

## Sample JSON Responses

### Full Format Response
```json
{
  "rawData": {
    "_id": "673a1b2c3d4e5f6789012345",
    "candidateId": {
      "_id": "673a1b2c3d4e5f6789012346",
      "name": "John Doe",
      "email": "john.doe@email.com",
      "profile": {
        "phone": "+1234567890",
        "location": "San Francisco, CA",
        "bio": "Full-stack developer with 4 years of experience",
        "techStack": ["React", "Node.js", "MongoDB", "Python"],
        "skills": ["Problem Solving", "Team Leadership", "API Design"],
        "linkedin": "https://linkedin.com/in/johndoe",
        "github": "https://github.com/johndoe",
        "portfolio": "https://johndoe.dev"
      }
    },
    "jobId": {
      "_id": "673a1b2c3d4e5f6789012347",
      "title": "Senior React Developer",
      "company": "Tech Corp",
      "location": "Remote",
      "type": "Full-time",
      "description": "We are looking for a senior React developer...",
      "requirements": ["React", "Node.js", "TypeScript", "GraphQL"],
      "techStack": ["React", "TypeScript", "GraphQL", "AWS"],
      "salary": "$120,000 - $150,000"
    },
    "applicationId": {
      "_id": "673a1b2c3d4e5f6789012348",
      "appliedAt": "2025-11-01T10:30:00.000Z",
      "techStack": ["React", "Node.js", "JavaScript"],
      "experience": "4 years",
      "projects": [
        {
          "name": "E-commerce Platform",
          "description": "Full-stack e-commerce application with React and Node.js",
          "githubLink": "https://github.com/johndoe/ecommerce",
          "liveLink": "https://myecommerce.app",
          "techUsed": ["React", "Node.js", "MongoDB", "Stripe"],
          "aiAnalysis": {
            "status": "completed",
            "summary": {
              "total_files_found": 45,
              "ai_percentage": 15,
              "human_percentage": 85,
              "avg_confidence": 0.92,
              "total_lines": 3500,
              "ai_lines": 525,
              "human_lines": 2975
            },
            "analyzedAt": "2025-11-01T11:00:00.000Z"
          }
        }
      ],
      "resume": "https://drive.google.com/file/d/resume123"
    },
    "recruiterId": {
      "_id": "673a1b2c3d4e5f6789012349",
      "name": "Jane Smith",
      "email": "jane.smith@techcorp.com"
    },
    "candidateName": "John Doe",
    "candidateEmail": "john.doe@email.com",
    "phoneNumber": "+1234567890",
    "companyName": "Tech Corp",
    "role": "Senior React Developer",
    "techStack": ["React", "Node.js", "JavaScript"],
    "experience": "4 years",
    "interviewStatus": "pending",
    "shortlistedAt": "2025-11-05T08:15:00.000Z"
  },
  "aiSchedulingData": {
    "shortlistedId": "673a1b2c3d4e5f6789012345",
    "candidateId": "673a1b2c3d4e5f6789012346",
    "personalInfo": {
      "name": "John Doe",
      "email": "john.doe@email.com",
      "phone": "+1234567890",
      "location": "San Francisco, CA",
      "bio": "Full-stack developer with 4 years of experience",
      "linkedin": "https://linkedin.com/in/johndoe",
      "github": "https://github.com/johndoe",
      "portfolio": "https://johndoe.dev",
      "resume": "https://drive.google.com/file/d/resume123"
    },
    "jobInfo": {
      "role": "Senior React Developer",
      "company": "Tech Corp",
      "jobType": "Full-time",
      "location": "Remote",
      "description": "We are looking for a senior React developer...",
      "requirements": ["React", "Node.js", "TypeScript", "GraphQL"],
      "techStack": ["React", "TypeScript", "GraphQL", "AWS"],
      "salary": "$120,000 - $150,000"
    },
    "technicalProfile": {
      "primaryTechStack": ["React", "Node.js", "JavaScript"],
      "experience": "4 years",
      "skills": ["Problem Solving", "Team Leadership", "API Design"],
      "allTechFromProfile": ["React", "Node.js", "MongoDB", "Python"],
      "projects": [
        {
          "name": "E-commerce Platform",
          "description": "Full-stack e-commerce application with React and Node.js",
          "githubLink": "https://github.com/johndoe/ecommerce",
          "liveLink": "https://myecommerce.app",
          "techUsed": ["React", "Node.js", "MongoDB", "Stripe"],
          "aiAnalysis": {
            "status": "completed",
            "summary": {
              "ai_percentage": 15,
              "human_percentage": 85,
              "avg_confidence": 0.92,
              "total_lines": 3500
            }
          }
        }
      ]
    },
    "matchAnalysis": {
      "techStackMatch": 75,
      "hasGithubProjects": true,
      "totalProjects": 1,
      "aiAnalyzedProjects": 1
    },
    "interviewInfo": {
      "status": "pending",
      "shortlistedAt": "2025-11-05T08:15:00.000Z",
      "appliedAt": "2025-11-01T10:30:00.000Z"
    },
    "timestamps": {
      "shortlistedAt": "2025-11-05T08:15:00.000Z",
      "appliedAt": "2025-11-01T10:30:00.000Z",
      "dataGeneratedAt": "2025-11-05T14:20:00.000Z"
    }
  }
}
```

### AI-Optimized Format Response
```json
{
  "candidateId": "673a1b2c3d4e5f6789012346",
  "name": "John Doe",
  "email": "john.doe@email.com",
  "phone": "+1234567890",
  "role": "Senior React Developer",
  "company": "Tech Corp",
  "technicalProfile": {
    "experience": "4 years",
    "primarySkills": ["React", "Node.js", "JavaScript"],
    "jobRequiredSkills": ["React", "TypeScript", "GraphQL", "AWS"],
    "skillMatchPercentage": 75,
    "projects": [
      {
        "name": "E-commerce Platform",
        "description": "Full-stack e-commerce application with React and Node.js",
        "technologies": ["React", "Node.js", "MongoDB", "Stripe"],
        "githubUrl": "https://github.com/johndoe/ecommerce",
        "aiCodeAnalysis": {
          "humanCodePercentage": 85,
          "aiCodePercentage": 15,
          "confidence": 0.92,
          "totalLines": 3500
        }
      }
    ]
  },
  "jobDetails": {
    "title": "Senior React Developer",
    "description": "We are looking for a senior React developer...",
    "requirements": ["React", "Node.js", "TypeScript", "GraphQL"],
    "salary": "$120,000 - $150,000",
    "type": "Full-time"
  },
  "interviewScheduling": {
    "status": "pending",
    "shortlistedDate": "2025-11-05T08:15:00.000Z",
    "scheduledDate": null,
    "recruiterNotes": null,
    "aiSessionId": null
  },
  "metadata": {
    "shortlistedId": "673a1b2c3d4e5f6789012345",
    "recruiterName": "Jane Smith",
    "dataExportedAt": "2025-11-05T14:20:00.000Z"
  }
}
```

## Key Differences

### Full Format
- **Purpose**: Complete database record for internal use
- **Size**: Larger, includes all raw data and relationships
- **Structure**: Nested objects maintaining original database structure
- **Usage**: Detailed analysis, backup, debugging, complete context

### AI-Optimized Format
- **Purpose**: Clean structure optimized for AI processing
- **Size**: Smaller, focused on essential data
- **Structure**: Flat, normalized structure with computed fields
- **Usage**: AI interview scheduling, automated processing, integrations

## Computed Fields in AI Format

### skillMatchPercentage
Calculated percentage of job requirements that match candidate skills:
```javascript
// Example: Job requires [React, TypeScript, GraphQL, AWS]
// Candidate has [React, Node.js, JavaScript, MongoDB]
// Match: React (1/4 = 25%)
// But algorithm also checks partial matches and synonyms
```

### aiCodeAnalysis
Processed data from GitHub repository analysis:
- `humanCodePercentage`: Percentage of human-written code
- `aiCodePercentage`: Percentage of AI-generated code
- `confidence`: AI detection confidence score
- `totalLines`: Total lines of code analyzed

## Usage Examples

### Frontend Integration
```javascript
// Get full format for detailed view
const fullData = await shortlistedAPI.getCandidate(candidateId);

// Get AI format for scheduling
const aiData = await shortlistedAPI.getCandidateAIFormat(candidateId);

// Export for external AI system
const response = await fetch(`/api/shortlisted/${candidateId}/ai-format`);
const cleanData = await response.json();
```

### AI System Integration
```python
import requests

# Fetch candidate for AI processing
response = requests.get(
    f"/api/shortlisted/{candidate_id}/ai-format",
    headers={"Authorization": f"Bearer {token}"}
)

candidate = response.json()

# Use structured data for interview scheduling
skill_match = candidate['technicalProfile']['skillMatchPercentage']
if skill_match >= 70:
    schedule_interview(candidate)
```

## API Response Status Codes

- `200`: Success
- `401`: Unauthorized (missing or invalid token)
- `403`: Forbidden (not authorized to view this candidate)
- `404`: Candidate not found
- `500`: Server error

## Rate Limiting

- Standard rate limits apply (100 requests per minute per user)
- For bulk operations, use the batch export endpoint
- AI format endpoint has same limits as full format

## Security Considerations

- All endpoints require valid recruiter authentication
- Candidates can only be accessed by the recruiter who shortlisted them
- No sensitive information is exposed in error messages
- All responses include only authorized data