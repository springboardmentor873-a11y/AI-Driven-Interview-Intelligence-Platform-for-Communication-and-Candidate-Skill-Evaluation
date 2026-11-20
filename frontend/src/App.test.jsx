import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import App from "./App.jsx";

let apiState;
let xhrControl;
let getUserMedia;

const profile = {
  id: 8,
  username: "candidate",
  email: "candidate@example.test",
  first_name: "Ava",
  last_name: "Candidate",
  role: "CANDIDATE",
};

function makeResume(overrides = {}) {
  return {
    id: 21,
    file: "/media/resumes/21/resume.pdf",
    uploaded_at: "2026-11-20T12:00:00Z",
    extracted_skills: [],
    extracted_qualifications: [],
    extracted_experience: [],
    extracted_projects: [],
    extracted_candidate_name: "",
    extracted_email: "",
    extracted_phone: "",
    extracted_summary: "",
    skills_extracted_at: null,
    extraction_source: "",
    ...overrides,
  };
}

function makeQuestions(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: 41 + index,
    question_text: `Question ${index + 1}: discuss Python for this role.`,
    category: "Python",
    topic: `Python topic ${index + 1}`,
    difficulty: "ADVANCED",
    expected_criteria: ["Clear reasoning"],
    answer: null,
  }));
}

function makeInterview(overrides = {}) {
  return {
    id: 71,
    candidate: profile.id,
    resume: 21,
    target_role: "Backend Engineer",
    interview_type: "TECHNICAL",
    difficulty: "HARD",
    status: "CREATED",
    total_questions: 3,
    current_question: 0,
    elapsed_seconds: 0,
    generation_source: "fallback",
    recording: null,
    ...overrides,
  };
}

function jsonResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    blob: async () => new Blob(["synthetic response"], { type: "video/webm" }),
  };
}

function apiFetch(url, options = {}) {
  const path = new URL(url).pathname.replace(/^\/api/, "");
  const method = options.method || "GET";

  if (path === "/auth/login/" && method === "POST") {
    return Promise.resolve(
      jsonResponse({ access: "access-token", refresh: "refresh-token" }),
    );
  }
  if (path === "/auth/profile/") {
    return Promise.resolve(jsonResponse(profile));
  }
  if (path === "/auth/resumes/" && method === "GET") {
    return Promise.resolve(jsonResponse(apiState.resumes));
  }
  if (path === "/interviews/" && method === "GET") {
    return Promise.resolve(jsonResponse(apiState.interviews));
  }
  if (path === "/interviews/generate/" && method === "POST") {
    apiState.generatePayload = JSON.parse(options.body);
    apiState.interview = makeInterview({
      resume: apiState.generatePayload.resume,
      target_role: apiState.generatePayload.target_role,
      interview_type: apiState.generatePayload.interview_type,
      difficulty: apiState.generatePayload.difficulty,
      total_questions: apiState.generatePayload.total_questions,
    });
    apiState.questions = makeQuestions(
      apiState.generatePayload.total_questions,
    );
    apiState.interviews = [apiState.interview];
    return Promise.resolve(jsonResponse(apiState.interview, 201));
  }
  if (path === `/interviews/${apiState.interview?.id}/`) {
    return Promise.resolve(jsonResponse(apiState.interview));
  }
  if (path === `/interviews/${apiState.interview?.id}/questions/`) {
    return Promise.resolve(jsonResponse(apiState.questions));
  }
  if (
    path === `/interviews/${apiState.interview?.id}/start/` &&
    method === "POST"
  ) {
    apiState.interview = {
      ...apiState.interview,
      status: "IN_PROGRESS",
    };
    apiState.interviews = [apiState.interview];
    return Promise.resolve(jsonResponse(apiState.interview));
  }
  const answerMatch = path.match(/^\/interviews\/questions\/(\d+)\/answer\/$/);
  if (answerMatch && method === "POST") {
    const question = apiState.questions.find(
      (item) => item.id === Number(answerMatch[1]),
    );
    const answerBody = JSON.parse(options.body);
    apiState.answerPayloads.push(answerBody);
    question.answer = {
      answer_text: answerBody.answer_text,
      evaluation_source: "fallback",
      evaluation: {
        correctness: { score: 4, feedback: "Clear." },
        relevance: { score: 4, feedback: "Relevant." },
        clarity: { score: 4, feedback: "Concise." },
        completeness: { score: 4, feedback: "Complete." },
        overall_feedback: "Good practice answer.",
        improvement_suggestions: [],
        disclaimer: "Practice feedback only.",
      },
    };
    const currentQuestion = apiState.interview.current_question + 1;
    apiState.interview = {
      ...apiState.interview,
      current_question: currentQuestion,
      status:
        currentQuestion === apiState.interview.total_questions
          ? "COMPLETED"
          : "IN_PROGRESS",
    };
    apiState.interviews = [apiState.interview];
    return Promise.resolve(jsonResponse(question.answer, 201));
  }
  if (
    path === `/interviews/${apiState.interview?.id}/recording/` &&
    method === "POST"
  ) {
    apiState.recordingFile = options.body.get("recording");
    if (apiState.recordingUploadFailures > 0) {
      apiState.recordingUploadFailures -= 1;
      return Promise.resolve(
        jsonResponse({ detail: "Recording upload failed." }, 500),
      );
    }
    apiState.interview = {
      ...apiState.interview,
      recording: `interviews/${apiState.recordingFile.name}`,
    };
    apiState.interviews = [apiState.interview];
    return Promise.resolve(jsonResponse(apiState.interview));
  }
  if (
    path === `/interviews/${apiState.interview?.id}/recording/download/`
  ) {
    return Promise.resolve(jsonResponse({ recording: true }));
  }
  if (
    path === `/auth/resumes/${apiState.resume?.id}/extract-skills/` &&
    method === "POST"
  ) {
    apiState.resume = makeResume({
      ...apiState.resume,
      extracted_skills: ["Python", "Django"],
      extracted_candidate_name: "Ava Candidate",
      extracted_email: "candidate@example.test",
      extracted_phone: "+1 555 123 4567",
      extracted_summary: "Skills include Python and Django.",
      skills_extracted_at: "2026-11-20T12:00:00Z",
      extraction_source: "fallback",
    });
    apiState.resumes = [apiState.resume];
    return Promise.resolve(jsonResponse(apiState.resume));
  }

  return Promise.resolve(
    jsonResponse({ detail: `Unexpected API request: ${method} ${path}` }, 404),
  );
}

class MockXMLHttpRequest {
  constructor() {
    this.listeners = {};
    this.uploadListeners = {};
    this.upload = {
      addEventListener: (type, listener) => {
        this.uploadListeners[type] = listener;
      },
    };
    xhrControl.request = this;
  }

  open(method, url) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(name, value) {
    this.headers = { ...this.headers, [name]: value };
  }

  addEventListener(type, listener) {
    this.listeners[type] = listener;
  }

  send(body) {
    this.body = body;
    this.uploadListeners.progress?.({
      lengthComputable: true,
      loaded: 50,
      total: 100,
    });
  }

  complete(status, data) {
    this.status = status;
    this.responseText = JSON.stringify(data);
    this.listeners.load?.();
  }
}

class MockMediaRecorder {
  static instances = [];

  static isTypeSupported() {
    return true;
  }

  constructor(_stream, options = {}) {
    this.mimeType = options.mimeType || "video/webm";
    this.state = "inactive";
    this.listeners = {};
    MockMediaRecorder.instances.push(this);
  }

  addEventListener(type, listener) {
    this.listeners[type] = listener;
  }

  start() {
    this.state = "recording";
  }

  pause() {
    this.state = "paused";
  }

  resume() {
    this.state = "recording";
  }

  emitData(text) {
    this.ondataavailable?.({
      data: new Blob([text], { type: this.mimeType }),
    });
  }

  stop() {
    this.state = "inactive";
    this.emitData("final-chunk");
    this.listeners.stop?.();
  }
}

async function signIn(user) {
  render(<App />);
  await user.type(screen.getByLabelText("Username"), "candidate");
  await user.type(screen.getByLabelText("Password"), "StrongPass123!");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
  await screen.findByRole("heading", {
    name: "Build confidence, one interview at a time.",
  });
}

function setMediaDevices({ rejectWith } = {}) {
  const tracks = [
    { kind: "video", enabled: true, readyState: "live", stop: vi.fn() },
    { kind: "audio", enabled: true, readyState: "live", stop: vi.fn() },
  ];
  const stream = {
    getTracks: () => tracks,
    getVideoTracks: () => tracks.filter((track) => track.kind === "video"),
    getAudioTracks: () => tracks.filter((track) => track.kind === "audio"),
  };
  getUserMedia = vi.fn(
    rejectWith
      ? () => Promise.reject(rejectWith)
      : () => Promise.resolve(stream),
  );
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia },
  });
  return { stream, tracks };
}

beforeEach(() => {
  apiState = {
    resumes: [],
    resume: null,
    interviews: [],
    interview: null,
    questions: [],
    generatePayload: null,
    answerPayloads: [],
    recordingFile: null,
    recordingUploadFailures: 0,
  };
  xhrControl = { request: null };
  MockMediaRecorder.instances = [];
  vi.stubGlobal("fetch", vi.fn(apiFetch));
  vi.stubGlobal("XMLHttpRequest", MockXMLHttpRequest);
  vi.stubGlobal("MediaRecorder", MockMediaRecorder);
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:smarthire-test"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("candidate milestone two workflow", () => {
  it("logs in, uploads a resume with progress, and displays its extracted profile", async () => {
    const user = userEvent.setup();
    await signIn(user);

    expect(
      screen.getByRole("heading", { name: "Ava Candidate" }),
    ).toBeInTheDocument();
    const file = new File(["synthetic PDF"], "resume.pdf", {
      type: "application/pdf",
    });
    await user.upload(screen.getByLabelText("Choose a PDF file"), file);
    await user.click(screen.getByRole("button", { name: "Upload PDF" }));

    expect(
      await screen.findByRole("progressbar", {
        name: "Resume upload progress",
      }),
    ).toHaveValue(50);
    expect(
      screen.getByRole("button", { name: "Uploading 50%..." }),
    ).toBeDisabled();
    expect(xhrControl.request.headers.Authorization).toBe("Bearer access-token");
    expect(xhrControl.request.body.get("file").name).toBe("resume.pdf");

    apiState.resume = makeResume({ id: 21 });
    apiState.resumes = [apiState.resume];
    await act(async () => {
      xhrControl.request.complete(201, apiState.resume);
    });
    expect(
      await screen.findByText("Resume uploaded successfully."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Extract locally" }));
    expect(await screen.findByText("Candidate: Ava Candidate")).toBeInTheDocument();
    expect(screen.getByText("Email: candidate@example.test")).toBeInTheDocument();
    expect(screen.getByText("Skills: Python, Django")).toBeInTheDocument();
    expect(screen.getByText(/Summary: Skills include Python and Django/)).toBeInTheDocument();
  });

  it("generates and completes an interview, uploads final media, and supports playback/download", async () => {
    const user = userEvent.setup();
    apiState.resume = makeResume({
      id: 21,
      extracted_skills: ["Python", "Django"],
      skills_extracted_at: "2026-11-20T12:00:00Z",
    });
    apiState.resumes = [apiState.resume];
    apiState.recordingUploadFailures = 1;
    setMediaDevices();
    vi.spyOn(MockMediaRecorder, "isTypeSupported").mockImplementation(
      (type) => type === "video/mp4",
    );
    vi.spyOn(HTMLMediaElement.prototype, "canPlayType").mockImplementation(
      (type) => (type === "video/mp4" ? "maybe" : ""),
    );
    await signIn(user);

    await user.selectOptions(screen.getByLabelText("Resume"), "21");
    await user.clear(screen.getByLabelText("Target role"));
    await user.type(screen.getByLabelText("Target role"), "Backend Engineer");
    await user.selectOptions(screen.getByLabelText("Interview type"), "APTITUDE");
    await user.selectOptions(screen.getByLabelText("Difficulty"), "HARD");
    await user.selectOptions(
      screen.getByLabelText("Number of questions"),
      "3",
    );
    await user.click(
      screen.getByRole("button", { name: "Generate interview" }),
    );

    expect(
      await screen.findByRole("heading", { name: "Backend Engineer" }),
    ).toBeInTheDocument();
    expect(apiState.generatePayload).toMatchObject({
      target_role: "Backend Engineer",
      interview_type: "APTITUDE",
      difficulty: "HARD",
      total_questions: 3,
      ai_consent: false,
    });
    expect(
      await screen.findByRole("button", { name: "Start interview" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Start interview" }));
    expect(await screen.findByText("Question 1 of 3")).toBeInTheDocument();
    expect(getUserMedia).toHaveBeenCalledWith({ video: true, audio: true });
    expect(screen.getByText("Recording")).toBeInTheDocument();
    expect(document.querySelector(".media-preview video").muted).toBe(true);

    const recorder = MockMediaRecorder.instances[0];
    expect(recorder.mimeType).toBe("video/mp4");
    recorder.emitData("first-chunk");
    for (let index = 0; index < 3; index += 1) {
      await user.type(
        screen.getByLabelText("Your answer"),
        `Answer ${index + 1}`,
      );
      await user.click(screen.getByRole("button", { name: "Submit answer" }));
      if (index < 2) {
        expect(
          await screen.findByText(`Question ${index + 2} of 3`),
        ).toBeInTheDocument();
      }
    }

    expect(
      await screen.findByText("You completed all 3 questions in this session."),
    ).toBeInTheDocument();
    expect(apiState.answerPayloads).toHaveLength(3);
    expect(apiState.answerPayloads.map((answer) => answer.answer_text)).toEqual([
      "Answer 1",
      "Answer 2",
      "Answer 3",
    ]);
    expect(apiState.interview.status).toBe("COMPLETED");
    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent("Recording upload failed.");
    expect(
      screen.getByRole("button", { name: "Retry recording upload" }),
    ).toBeInTheDocument();

    const pendingFile = apiState.recordingFile;
    expect(pendingFile.type).toBe("video/mp4");
    expect(pendingFile.name).toBe("interview-71.mp4");
    expect(pendingFile.size).toBe("first-chunk".length + "final-chunk".length);

    await user.click(
      screen.getByRole("button", { name: "Retry recording upload" }),
    );
    expect(
      await screen.findByRole("button", { name: "Play interview recording" }),
    ).toBeInTheDocument();
    expect(apiState.interviews[0].status).toBe("COMPLETED");

    await user.click(
      screen.getByRole("button", { name: "Play interview recording" }),
    );
    const player = await screen.findByLabelText(
      "Interview recording playback",
    );
    expect(player).toHaveAttribute("controls");
    expect(player).toHaveAttribute("src", "blob:smarthire-test");

    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    await user.click(
      screen.getByRole("button", { name: "Download interview recording" }),
    );
    await waitFor(() => expect(clickSpy).toHaveBeenCalled());
  });

  it("reports camera permission denial and still allows local interview answers", async () => {
    const user = userEvent.setup();
    apiState.resume = makeResume({
      id: 21,
      extracted_skills: ["Python"],
      skills_extracted_at: "2026-11-20T12:00:00Z",
    });
    apiState.resumes = [apiState.resume];
    setMediaDevices({ rejectWith: new DOMException("Denied", "NotAllowedError") });
    await signIn(user);

    await user.selectOptions(screen.getByLabelText("Resume"), "21");
    await user.selectOptions(
      screen.getByLabelText("Number of questions"),
      "3",
    );
    await user.click(
      screen.getByRole("button", { name: "Generate interview" }),
    );
    await user.click(await screen.findByRole("button", { name: "Start interview" }));
    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent("Camera or microphone permission was denied.");

    await user.type(screen.getByLabelText("Your answer"), "A local practice answer.");
    await user.click(screen.getByRole("button", { name: "Submit answer" }));
    expect(await screen.findByText("Question 2 of 3")).toBeInTheDocument();
    expect(apiState.answerPayloads[0].ai_consent).toBe(false);
  });

  it("shows login and resume upload errors", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementation(async (url, options = {}) => {
      const path = new URL(url).pathname.replace(/^\/api/, "");
      if (path === "/auth/login/") {
        return jsonResponse({ detail: "Invalid credentials." }, 401);
      }
      return apiFetch(url, options);
    });
    render(<App />);
    await user.type(screen.getByLabelText("Username"), "candidate");
    await user.type(screen.getByLabelText("Password"), "bad-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid credentials.",
    );

    vi.mocked(fetch).mockImplementation(apiFetch);
    await user.clear(screen.getByLabelText("Username"));
    await user.type(screen.getByLabelText("Username"), "candidate");
    await user.clear(screen.getByLabelText("Password"));
    await user.type(screen.getByLabelText("Password"), "StrongPass123!");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await screen.findByRole("heading", {
      name: "Build confidence, one interview at a time.",
    });

    const file = new File(["invalid content"], "resume.pdf", {
      type: "application/pdf",
    });
    await user.upload(screen.getByLabelText("Choose a PDF file"), file);
    await user.click(screen.getByRole("button", { name: "Upload PDF" }));
    await waitFor(() => expect(xhrControl.request).not.toBeNull());
    await act(async () => {
      xhrControl.request.complete(400, { file: ["The uploaded PDF is invalid."] });
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The uploaded PDF is invalid.",
    );
  });

  it("supports template selection, domain customization, and displays enriched resume profile", async () => {
    const user = userEvent.setup();
    apiState.resumes = [
      makeResume({
        id: 30,
        extracted_skills: ["Python", "Django"],
        extracted_technologies: ["PostgreSQL", "Docker"],
        extracted_education: [
          { degree: "B.Tech", institution: "Tech University", year: "2023" },
        ],
        extracted_certifications: ["AWS Certified Solutions Architect"],
        skills_extracted_at: "2026-11-20T12:00:00Z",
      }),
    ];

    render(<App />);
    await user.type(screen.getByLabelText("Username"), "candidate");
    await user.type(screen.getByLabelText("Password"), "StrongPass123!");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    // Verify enriched resume profile is displayed
    expect(await screen.findByText(/Technologies: PostgreSQL, Docker/i)).toBeInTheDocument();
    expect(screen.getByText(/Education: B.Tech · Tech University · 2023/i)).toBeInTheDocument();
    expect(screen.getByText(/Certifications: AWS Certified Solutions Architect/i)).toBeInTheDocument();

    // Verify interview templates and domain selector
    expect(screen.getByRole("group", { name: "Interview Templates" })).toBeInTheDocument();
    const quickTemplate = screen.getByRole("button", { name: /Quick Technical Screen/i });
    await user.click(quickTemplate);

    expect(screen.getByLabelText("Target role")).toHaveValue("Backend Engineer");
    expect(screen.getByLabelText("Technical domain")).toHaveValue("backend_developer");
    expect(screen.getByLabelText("Time limit")).toHaveValue("900");

    // Select resume and generate interview
    await user.selectOptions(screen.getByLabelText("Resume"), "30");
    await user.click(screen.getByRole("button", { name: "Generate interview" }));

    await screen.findByText("INTERVIEW ROOM");
    expect(apiState.generatePayload.domain).toBe("backend_developer");
    expect(apiState.generatePayload.time_limit_seconds).toBe(900);
  });
});
