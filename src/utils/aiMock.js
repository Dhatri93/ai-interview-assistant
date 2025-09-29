export const QUESTION_BUCKET = {
  easy: [
    'Explain the difference between let, const and var in JavaScript.',
    'What is a React component? How do you create one?',
    'What is REST and why is it useful?',
  ],
  medium: [
    'How do you manage state in a large React application? Discuss pros/cons of Redux vs Context API.',
    'Explain event loop and how Node.js handles asynchronous operations.',
    'How would you optimize a slow React application? Give practical steps.',
  ],
  hard: [
    'Design a scalable authentication system for a MERN app supporting refresh tokens and social login.',
    'Explain how you would implement server-side rendering (SSR) in React and why it helps SEO.',
    'How would you design a production-ready CI/CD pipeline for a microservices Node.js app?',
  ],
};

export const pickQuestionsForRole = () => {
  return [
    ...QUESTION_BUCKET.easy.slice(0,2).map(q=>({ difficulty:'easy', text:q, max:10 })),
    ...QUESTION_BUCKET.medium.slice(0,2).map(q=>({ difficulty:'medium', text:q, max:20 })),
    ...QUESTION_BUCKET.hard.slice(0,2).map(q=>({ difficulty:'hard', text:q, max:30 })),
  ];
};

export function scoreAnswer(difficulty, answerText) {
  const len = (answerText || '').trim().split(/\s+/).filter(Boolean).length;
  let base = 0;
  if (difficulty === 'easy') base = Math.min(10, Math.round(len / 5) + 4);
  if (difficulty === 'medium') base = Math.min(20, Math.round(len / 7) + 8);
  if (difficulty === 'hard') base = Math.min(30, Math.round(len / 10) + 10);
  const keywords = {
    easy: ['React','component','let','const','var','REST'],
    medium: ['Redux','Context','Promise','async','await','event loop','optimize'],
    hard: ['authentication','SSR','CI/CD','microservices','scalable','refresh token'],
  };
  const lc = answerText ? answerText.toLowerCase() : '';
  const boost = (keywords[difficulty] || []).reduce((acc, k) => acc + (lc.includes(k.toLowerCase()) ? 1 : 0), 0);
  return base + boost;
}

export function generateFinalSummary(candidate) {
  const answers = candidate.answers || [];
  const totalScore = answers.reduce((s,a)=>s+(a.score||0), 0);
  const maxScore = answers.reduce((s,a)=>s+(a.max||10), 0);
  const percent = Math.round((totalScore / Math.max(1,maxScore)) * 100);
  const strengths = answers.filter(a=>a.score>=((a.max||10)*0.7)).slice(0,3).map(a=>a.question);
  const weaknesses = answers.filter(a=>a.score<((a.max||10)*0.5)).slice(0,3).map(a=>a.question);
  return {
    totalScore, maxScore, percent,
    summaryText: `Candidate ${candidate.name || 'Unknown'} scored ${percent}% (${totalScore}/${maxScore}). Strengths: ${strengths.join('; ') || 'N/A'}. Weaknesses: ${weaknesses.join('; ') || 'N/A'}.`
  };
}
