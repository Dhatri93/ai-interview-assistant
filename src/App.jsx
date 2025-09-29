import React, { useState, useEffect } from "react";
import { Layout, Tabs, Upload, Button, Table, Modal, Input, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import mammoth from "mammoth";
import { v4 as uuidv4 } from "uuid";


const { Header, Content } = Layout;

/* ---------------- Zustand Store ---------------- */
const useInterviewStore = create(
  persist(
    (set, get) => ({
      candidates: [],
      activeCandidateId: null,
      addCandidate: (c) =>
        set((state) => ({
          candidates: [...state.candidates, c],
          activeCandidateId: c.id,
        })),
      updateCandidate: (id, data) =>
        set((state) => ({
          candidates: state.candidates.map((c) =>
            c.id === id ? { ...c, ...data } : c
          ),
        })),
      setActiveCandidate: (id) => set({ activeCandidateId: id }),
    }),
    { name: "interview-store" }
  )
);

/* ---------------- PDF/DOCX helpers ---------------- */
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const extractTextFromPDF = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((s) => s.str).join(" ") + "\n";
  }
  return text;
};

const extractTextFromDOCX = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
};

const parseResume = (text) => {
  const nameMatch = text.match(/([A-Z][a-z]+ [A-Z][a-z]+)/);
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Z]{2,}/i);
  const phoneMatch = text.match(/(\+?\d{1,3}[-.\s]?)?(\d{10})/);
  return {
    name: nameMatch ? nameMatch[0] : "",
    email: emailMatch ? emailMatch[0] : "",
    phone: phoneMatch ? phoneMatch[0] : "",
  };
};

/* ---------------- Interview Questions & Scoring ---------------- */
const generateQuestions = () => [
  { level: "Easy", q: "What is React? Explain briefly.", time: 20 },
  { level: "Easy", q: "What is Node.js used for?", time: 20 },
  { level: "Medium", q: "Explain the difference between state and props in React.", time: 60 },
  { level: "Medium", q: "How does Express.js handle routing?", time: 60 },
  { level: "Hard", q: "How would you optimize performance in a React app?", time: 120 },
  { level: "Hard", q: "Explain the event loop in Node.js with an example.", time: 120 },
];

const scoreAnswer = (answer, level) => {
  if (!answer) return 0;
  let base = level === "Easy" ? 10 : level === "Medium" ? 20 : 30;
  return Math.min(base, Math.floor(answer.length / 5));
};

/* ---------------- Interviewee Tab ---------------- */
function IntervieweeTab() {
  const { addCandidate, updateCandidate, activeCandidateId, candidates } =
    useInterviewStore();
  const candidate = candidates.find((c) => c.id === activeCandidateId);

  const [resumeFields, setResumeFields] = useState({});
  const [missingFields, setMissingFields] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answer, setAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(null);
  const [welcomeBack, setWelcomeBack] = useState(false);

  useEffect(() => {
    if (candidate && candidate.inProgress) {
      setWelcomeBack(true);
    }
  }, [candidate]);

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      handleNext();
      return;
    }
    const t = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft]);

  const beforeUpload = async (file) => {
    try {
      let text = "";
      if (file.type === "application/pdf") {
        text = await extractTextFromPDF(file);
      } else if (
        file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        text = await extractTextFromDOCX(file);
      } else {
        message.error("Only PDF/DOCX accepted");
        return Upload.LIST_IGNORE;
      }
      const fields = parseResume(text);
      setResumeFields(fields);
      const missing = Object.entries(fields)
        .filter(([k, v]) => !v)
        .map(([k]) => k);
      setMissingFields(missing);

      const newCandidate = {
        id: uuidv4(),
        name: fields.name || "",
        email: fields.email || "",
        phone: fields.phone || "",
        chat: [],
        score: 0,
        summary: "",
        inProgress: true,
        questions: generateQuestions(),
      };
      addCandidate(newCandidate);
    } catch (e) {
      console.error(e);
      message.error("Failed to parse resume");
    }
    return false;
  };

  const handleMissingSubmit = () => {
    updateCandidate(candidate.id, { ...resumeFields, inProgress: true });
    setMissingFields([]);
    setTimeLeft(candidate.questions[0].time);
  };

  const handleNext = () => {
    if (candidate) {
      const q = candidate.questions[currentQ];
      const newChat = [
        ...candidate.chat,
        { q: q.q, a: answer || "(no answer)", score: scoreAnswer(answer, q.level) },
      ];
      const newScore = newChat.reduce((acc, x) => acc + x.score, 0);
      updateCandidate(candidate.id, {
        chat: newChat,
        score: newScore,
      });
      setAnswer("");
      if (currentQ < candidate.questions.length - 1) {
        setCurrentQ(currentQ + 1);
        setTimeLeft(candidate.questions[currentQ + 1].time);
      } else {
        updateCandidate(candidate.id, {
          inProgress: false,
          summary: `Candidate scored ${newScore}. Strong areas: React/Node basics. Needs improvement in advanced concepts.`,
        });
        message.success("Interview completed!");
      }
    }
  };

  if (!candidate) {
    return (
      <Upload beforeUpload={beforeUpload} showUploadList={false}>
        <Button icon={<UploadOutlined />}>Upload Resume (PDF/DOCX)</Button>
      </Upload>
    );
  }

  if (welcomeBack) {
    return (
      <Modal
        open={welcomeBack}
        onOk={() => {
          setWelcomeBack(false);
          setTimeLeft(candidate.questions[currentQ].time);
        }}
        onCancel={() => setWelcomeBack(false)}
      >
        <p>Welcome back {candidate.name || "Candidate"}! Resume interview?</p>
      </Modal>
    );
  }

  if (missingFields.length > 0) {
    return (
      <div>
        <h3>Missing info: {missingFields.join(", ")}</h3>
        {missingFields.map((f) => (
          <Input
            key={f}
            placeholder={`Enter ${f}`}
            onChange={(e) =>
              setResumeFields({ ...resumeFields, [f]: e.target.value })
            }
          />
        ))}
        <Button onClick={handleMissingSubmit}>Start Interview</Button>
      </div>
    );
  }

  const q = candidate.questions[currentQ];
  return (
    <div>
      <h3>
        Q{currentQ + 1}: {q.q} ({q.level}) [{timeLeft}s]
      </h3>
      <Input.TextArea
        rows={4}
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
      />
      <Button onClick={handleNext} type="primary" style={{ marginTop: "8px" }}>
        Submit
      </Button>
    </div>
  );
}

/* ---------------- Interviewer Tab ---------------- */
function InterviewerTab() {
  const { candidates } = useInterviewStore();
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");

  const filtered = candidates
    .filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => b.score - a.score);

  const columns = [
    { title: "Name", dataIndex: "name" },
    { title: "Email", dataIndex: "email" },
    { title: "Phone", dataIndex: "phone" },
    { title: "Score", dataIndex: "score" },
    { title: "Summary", dataIndex: "summary" },
  ];

  return (
    <div>
      <Input.Search
        placeholder="Search candidate"
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: "10px" }}
      />
      <Table
        dataSource={filtered}
        columns={columns}
        rowKey="id"
        onRow={(r) => ({
          onClick: () => setSelected(r),
        })}
      />
      <Modal
        open={!!selected}
        onCancel={() => setSelected(null)}
        footer={null}
        width={800}
      >
        {selected && (
          <div>
            <h3>{selected.name} - Detailed View</h3>
            <ul>
              {selected.chat.map((c, i) => (
                <li key={i}>
                  <b>Q:</b> {c.q}
                  <br />
                  <b>A:</b> {c.a}
                  <br />
                  <b>Score:</b> {c.score}
                  <hr />
                </li>
              ))}
            </ul>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ---------------- Main App ---------------- */
export default function App() {
  return (
    <Layout style={{ height: "100vh" }}>
      <Header style={{ color: "white" }}>AI Interview Assistant</Header>
      <Content style={{ padding: "20px" }}>
        <Tabs
          items={[
            { key: "1", label: "Interviewee (Chat)", children: <IntervieweeTab /> },
            { key: "2", label: "Interviewer (Dashboard)", children: <InterviewerTab /> },
          ]}
        />
      </Content>
    </Layout>
  );
}
