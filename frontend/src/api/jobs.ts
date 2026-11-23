
import API from "./auth";

// Job Type
export interface Job {
  id: number;
  recruiter_id: number;
  title: string;
  description: string;
  location: string;
  employment_type: "Full-time" | "Part-time" | "Internship" | "Contract";
  experience_required: string | null;
  salary_min: number | null;
  salary_max: number | null;
  skills_required: string | null;
  status: "active" | "closed";
  posted_at: string;
  updated_at: string | null;
}

// Create Job Request
export interface JobCreateData {
  title: string;
  description: string;
  location: string;
  employment_type: "Full-time" | "Part-time" | "Internship" | "Contract";
  experience_required?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  skills_required?: string | null;
}

// Update Job Request
export type JobUpdateData = Partial<JobCreateData> & {
  status?: "active" | "closed";
};

// Get JWT Token
const getAuthHeaders = () => {
  const token = localStorage.getItem("access_token");

  if (!token) {
    throw new Error("Please login first");
  }

  return {
    Authorization: `Bearer ${token}`,
  };
};

// Create Job API
export const createJob = async (
  jobData: JobCreateData
): Promise<Job> => {
  const response = await API.post(
    "/api/jobs/",
    jobData,
    {
      headers: getAuthHeaders(),
    }
  );

  return response.data;
};

// Get My Jobs API
export const getMyJobs = async (): Promise<Job[]> => {
  const response = await API.get(
    "/api/jobs/my-jobs",
    {
      headers: getAuthHeaders(),
    }
  );

  return response.data;
};

// Update Job API
export const updateJob = async (
  jobId: number,
  jobData: JobUpdateData
): Promise<Job> => {
  const response = await API.put(
    `/api/jobs/${jobId}`,
    jobData,
    {
      headers: getAuthHeaders(),
    }
  );

  return response.data;
};

// Delete Job API
export const deleteJob = async (
  jobId: number
) => {
  const response = await API.delete(
    `/api/jobs/${jobId}`,
    {
      headers: getAuthHeaders(),
    }
  );

  return response.data;
};
