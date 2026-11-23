
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
    ArrowLeft,
    BrainCircuit,
    CalendarDays,
    Eye,
    Loader2,
    AlertCircle,
    ClipboardList,
} from "lucide-react";

import {
    getMyInterviewSessions,
    type InterviewSessionResponse,
} from "../api/interview";

function InterviewHistory() {
    const navigate = useNavigate();

    const [sessions, setSessions] = useState<InterviewSessionResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchSessions = async () => {
            try {
                const data = await getMyInterviewSessions();
                setSessions(data);
            } catch (err: any) {
                console.error("Failed to fetch interview history:", err);

                setError(
                    err.response?.data?.detail ||
                    err.message ||
                    "Unable to load interview history."
                );
            } finally {
                setLoading(false);
            }
        };

        fetchSessions();
    }, []);

    return (
        <div className="min-h-screen bg-[#F8FAFC]">

            <header className="bg-white border-b border-slate-200">
                <div className="max-w-6xl mx-auto px-5 py-5 flex items-center justify-between">

                    <Link
                        to="/candidate/dashboard"
                        className="flex items-center gap-2 text-slate-600 hover:text-[#172554]"
                    >
                        <ArrowLeft size={19} />
                        <span className="text-sm font-medium">Dashboard</span>
                    </Link>

                    <div className="flex items-center gap-2">
                        <BrainCircuit className="text-teal-600" size={25} />
                        <h1 className="font-bold text-[#172554]">
                            SmartHire <span className="text-teal-600">AI</span>
                        </h1>
                    </div>

                </div>
            </header>

            <main className="max-w-6xl mx-auto px-5 py-10">

                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-[#172554]">
                        Interview History
                    </h2>

                    <p className="text-slate-500 mt-2">
                        View your previous mock interviews and AI performance evaluations.
                    </p>
                </div>

                {loading && (
                    <div className="flex justify-center items-center py-20">
                        <Loader2 className="animate-spin text-teal-600" size={35} />
                    </div>
                )}

                {!loading && error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex gap-3">
                        <AlertCircle className="text-red-600 shrink-0" />
                        <p className="text-red-700 text-sm">{error}</p>
                    </div>
                )}

                {!loading && !error && sessions.length === 0 && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
                        <ClipboardList
                            size={45}
                            className="mx-auto text-slate-400 mb-4"
                        />

                        <h3 className="text-lg font-bold text-[#172554]">
                            No Interviews Yet
                        </h3>

                        <p className="text-slate-500 text-sm mt-2">
                            Your completed mock interviews will appear here.
                        </p>

                        <button
                            onClick={() => navigate("/candidate/interview")}
                            className="mt-5 bg-[#172554] text-white px-5 py-3 rounded-lg font-semibold"
                        >
                            Start Mock Interview
                        </button>
                    </div>
                )}

                {!loading && !error && sessions.length > 0 && (
                    <div className="space-y-5">

                        {sessions.map((session) => (
                            <div
                                key={session.id}
                                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">

                                    <div className="flex-1">

                                        <div className="flex flex-wrap items-center gap-3 mb-3">
                                            <span className="font-bold text-[#172554]">
                                                Interview #{session.id}
                                            </span>

                                            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${session.status === "completed"
                                                    ? "bg-green-50 text-green-700"
                                                    : "bg-yellow-50 text-yellow-700"
                                                }`}>
                                                {session.status}
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap gap-4 text-sm text-slate-500">

                                            <span className="flex items-center gap-1">
                                                <CalendarDays size={15} />
                                                {new Date(session.started_at).toLocaleDateString()}
                                            </span>

                                            <span className="capitalize">
                                                Type: {session.interview_type}
                                            </span>

                                            <span className="capitalize">
                                                Difficulty: {session.difficulty}
                                            </span>

                                        </div>

                                        <div className="mt-4 flex flex-wrap gap-5 text-sm">

                                            <span className="text-slate-600">
                                                Questions: {session.questions?.length || 0}
                                            </span>

                                            <span className="text-slate-600">
                                                Answered: {session.answers?.filter(
                                                    (item) => item.answer?.trim()
                                                ).length || 0}
                                            </span>

                                            {session.evaluation && (
                                                <span className="font-semibold text-teal-700">
                                                    Score: {session.evaluation.overall_score ?? "N/A"}/100
                                                </span>
                                            )}

                                        </div>

                                        {session.evaluation?.rating && (
                                            <p className="mt-2 text-sm text-slate-600">
                                                Rating: {session.evaluation.rating}
                                            </p>
                                        )}

                                    </div>


                                    <button
                                        onClick={() =>
                                            navigate(
                                                `/candidate/interview/result?sessionId=${session.id}&from=history`
                                            )
                                        }
                                        disabled={session.status !== "completed"}
                                        className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition ${session.status === "completed"
                                                ? "bg-[#172554] text-white hover:bg-blue-900"
                                                : "bg-slate-100 text-slate-400 cursor-not-allowed"
                                            }`}
                                    >
                                        <Eye size={17} />
                                        {session.status === "completed" ? "View Result" : "In Progress"}
                                    </button>


                                </div>
                            </div>
                        ))}

                    </div>
                )}

            </main>
        </div>
    );
}

export default InterviewHistory;
