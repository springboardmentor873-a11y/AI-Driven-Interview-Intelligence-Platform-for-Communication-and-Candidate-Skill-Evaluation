export const interviewTracks = {
  Technical: {
    title: "Technical Engineering",
    description: "Software engineering architecture, distributed systems, and coding fundamentals.",
    questions: [
      "Explain the architectural differences between monolithic and microservices architectures and when each is appropriate.",
      "How does the event loop function in asynchronous JavaScript or Node.js environments?",
      "What strategies do you use to optimize database queries and resolve N+1 query bottlenecks?",
      "How do you design a resilient caching strategy with Redis or Memcached?",
      "Walk me through how you implement robust error handling, retries, and observability in a REST API.",
    ],
  },
  Behavioural: {
    title: "Behavioural & Leadership",
    description: "Scenario-based evaluation of collaboration, communication, and ownership.",
    questions: [
      "Tell me about a time you navigated a significant technical disagreement with a teammate or stakeholder.",
      "Describe a project where you took full ownership when scope or requirements were ambiguous.",
      "How do you process and act on constructive feedback when you initially disagree with the assessment?",
      "Share an experience where you had to balance technical debt with urgent feature deadlines.",
      "Walk me through a time you helped unblock or mentor a team member through a challenging milestone.",
    ],
  },
  HR: {
    title: "HR & Culture Alignment",
    description: "Professional background, values, career objectives, and team dynamics.",
    questions: [
      "Walk me through your background and the pivotal engineering experiences that shaped your approach.",
      "What specific criteria do you prioritize when evaluating potential teams, projects, and working environments?",
      "What are two technical strengths you rely on daily, and one domain you are actively improving?",
      "Where do you see your engineering skills and career trajectory progressing over the next few years?",
      "What strategies keep you focused, energized, and accountable during high-pressure deadlines?",
    ],
  },
  Aptitude: {
    title: "Analytical & Problem Solving",
    description: "Quantitative logic, systems analysis, and deductive reasoning.",
    questions: [
      "API response latency increases by 50% under doubled traffic. What systematic steps do you take to isolate the bottleneck?",
      "How would you estimate storage and bandwidth needs for a platform processing 100,000 document uploads daily?",
      "If six worker nodes process a batch queue of 1,200 items in 30 minutes, how many nodes are needed to complete in 10 minutes?",
      "Explain how you determine whether an added database index yields a net positive return on query throughput.",
    ],
  },
};

export const questions = {
  Technical: interviewTracks.Technical.questions,
  Behavioural: interviewTracks.Behavioural.questions,
  HR: interviewTracks.HR.questions,
  Aptitude: interviewTracks.Aptitude.questions,
};
