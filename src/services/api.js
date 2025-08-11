import courses from '../mocks/courses.json';
import modules from '../mocks/modules.json';
import lectures from '../mocks/lectures.json';
import assignments from '../mocks/assignments.json';
import materials from '../mocks/materials.json';
import threads from '../mocks/threads.json';
import messages from '../mocks/messages.json';
import quizzes from '../mocks/quizzes.json';


const LS_KEYS = {
  completedLectures: 'completedLectures',
  submissions: 'submissions',
  dynamicContent: 'dynamicContent',
};


function readDynamic() {
  try {
    const raw = localStorage.getItem(LS_KEYS.dynamicContent);
    const def = { modules: [], lectures: [] };
    return raw ? { ...def, ...JSON.parse(raw) } : def;
  } catch {
    return { modules: [], lectures: [] };
  }
}

function writeDynamic(state) {
  localStorage.setItem(LS_KEYS.dynamicContent, JSON.stringify(state));
}

function mergeById(staticArr, dynamicArr) {
  const map = new Map();
  for (const s of staticArr) map.set(s.id, s);
  for (const d of dynamicArr) {
    if (d.__deleted) {
      map.delete(d.id);
    } else {
      map.set(d.id, { ...(map.get(d.id) || {}), ...d });
    }
  }
  return Array.from(map.values());
}

function readCompletedLectures() {
  try {
    const raw = localStorage.getItem(LS_KEYS.completedLectures);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCompletedLectures(ids) {
  localStorage.setItem(LS_KEYS.completedLectures, JSON.stringify(ids));
}

export function fetchCourses() {
  const dyn = readDynamic();
  const mergedModules = mergeById(modules, dyn.modules);
  return Promise.resolve(
    courses.map(c => ({
      ...c,
      modulesCount: mergedModules.filter(m => m.courseId === c.id).length,
      progress: getCourseProgress(c.id),
      status: getCourseStatus(c.id),
    }))
  );
}
export function fetchModules() {
  return Promise.resolve(modules);
}
export function fetchLectures(moduleId) {
  return Promise.resolve(
    lectures.filter(l => l.moduleId === moduleId)
  );
}


export function fetchCourseById(courseId) {
  return Promise.resolve(courses.find(c => c.id === courseId));
}

export function fetchModulesByCourse(courseId) {
  const dyn = readDynamic();
  const base = modules.filter(m => m.courseId === courseId);
  const overlay = dyn.modules.filter(m => m.courseId === courseId);
  return Promise.resolve(mergeById(base, overlay));
}

export function fetchModuleById(moduleId) {
  const dyn = readDynamic();
  const foundDyn = dyn.modules.find(m => m.id === moduleId && !m.__deleted);
  if (foundDyn) return Promise.resolve(foundDyn);
  return Promise.resolve(modules.find(m => m.id === moduleId));
}

export function fetchLecturesByModule(moduleId) {
  const dyn = readDynamic();
  const base = lectures.filter(l => l.moduleId === moduleId);
  const overlay = dyn.lectures.filter(l => l.moduleId === moduleId);
  return Promise.resolve(mergeById(base, overlay));
}

export function fetchLectureById(lectureId) {
  const dyn = readDynamic();
  const foundDyn = dyn.lectures.find(l => l.id === lectureId && !l.__deleted);
  if (foundDyn) return Promise.resolve(foundDyn);
  return Promise.resolve(lectures.find(l => l.id === lectureId));
}


export function createModule(courseId, data) {
  const dyn = readDynamic();
  const item = {
    id: `mod-${Date.now()}`,
    courseId,
    title: data.title || 'New module',
    description: data.description || '',
  };
  dyn.modules.push(item);
  writeDynamic(dyn);
  return Promise.resolve(item);
}

export function updateModule(moduleId, data) {
  const dyn = readDynamic();
  // push overlay update
  dyn.modules = dyn.modules.filter(m => m.id !== moduleId).concat([{ id: moduleId, ...data }]);
  writeDynamic(dyn);
  return fetchModuleById(moduleId);
}

export function deleteModule(moduleId) {
  const dyn = readDynamic();
  dyn.modules = dyn.modules.filter(m => m.id !== moduleId).concat([{ id: moduleId, __deleted: true }]);
  // also mark lectures under this module as deleted overlays
  const under = mergeById(lectures, dyn.lectures).filter(l => l.moduleId === moduleId);
  for (const l of under) dyn.lectures = dyn.lectures.filter(x => x.id !== l.id).concat([{ id: l.id, __deleted: true }]);
  writeDynamic(dyn);
  return Promise.resolve(true);
}

export function createLecture(moduleId, data) {
  const dyn = readDynamic();
  const item = {
    id: `lec-${Date.now()}`,
    moduleId,
    title: data.title || 'New lecture',
    videoUrl: data.videoUrl || '/videos/placeholder.mp4',
  };
  dyn.lectures.push(item);
  writeDynamic(dyn);
  return Promise.resolve(item);
}

export function updateLecture(lectureId, data) {
  const dyn = readDynamic();
  dyn.lectures = dyn.lectures.filter(l => l.id !== lectureId).concat([{ id: lectureId, ...data }]);
  writeDynamic(dyn);
  return fetchLectureById(lectureId);
}

export function deleteLecture(lectureId) {
  const dyn = readDynamic();
  dyn.lectures = dyn.lectures.filter(l => l.id !== lectureId).concat([{ id: lectureId, __deleted: true }]);
  writeDynamic(dyn);
  return Promise.resolve(true);
}

export function fetchMaterialsByLecture(lectureId) {
  return Promise.resolve(materials.filter(m => m.lectureId === lectureId));
}

export function fetchAssignmentsByLecture(lectureId) {
  return Promise.resolve(assignments.filter(a => a.lectureId === lectureId));
}

export function markLectureComplete(lectureId) {
  const ids = readCompletedLectures();
  if (!ids.includes(lectureId)) {
    ids.push(lectureId);
    writeCompletedLectures(ids);
  }
}

export function isLectureCompleted(lectureId) {
  return readCompletedLectures().includes(lectureId);
}

export function getModuleProgress(moduleId) {
  const moduleLectures = lectures.filter(l => l.moduleId === moduleId);
  if (moduleLectures.length === 0) return 0;
  const done = moduleLectures.filter(l => isLectureCompleted(l.id)).length;
  return Math.round((done / moduleLectures.length) * 100);
}

export function getCourseProgress(courseId) {
  const courseModules = modules.filter(m => m.courseId === courseId);
  if (courseModules.length === 0) return 0;
  const percents = courseModules.map(m => getModuleProgress(m.id));
  const avg = percents.reduce((a, b) => a + b, 0) / percents.length;
  return Math.round(avg);
}


export function getLectureStatus(lectureId) {
  return isLectureCompleted(lectureId) ? 'completed' : 'not-started';
}

export function getModuleStatus(moduleId) {
  const moduleLectures = mergeById(lectures, readDynamic().lectures).filter(l => l.moduleId === moduleId && !l.__deleted);
  if (moduleLectures.length === 0) return 'not-started';
  const done = moduleLectures.filter(l => isLectureCompleted(l.id)).length;
  if (done === 0) return 'not-started';
  if (done === moduleLectures.length) return 'completed';
  return 'in-progress';
}

function fetchModulesByCourseSync(courseId) {
  const dyn = readDynamic();
  const base = modules.filter(m => m.courseId === courseId);
  const overlay = dyn.modules.filter(m => m.courseId === courseId);
  return mergeById(base, overlay);
}

export function getCourseStatus(courseId) {
  const mods = fetchModulesByCourseSync(courseId);
  if (mods.length === 0) return 'not-started';
  const statuses = mods.map(m => getModuleStatus(m.id));
  if (statuses.every(s => s === 'completed')) return 'completed';
  if (statuses.every(s => s === 'not-started')) return 'not-started';
  return 'in-progress';
}


export function fetchThreads() {
  return Promise.resolve(threads);
}

export function fetchMessages(threadId) {
  const studentId = localStorage.getItem('sid') || 'demo';
  
  const list = messages.filter(m => m.threadId === threadId);
  
  localStorage.setItem(`read:${studentId}:${threadId}`, String(Date.now()));
  return Promise.resolve(list);
}

export function sendMessage(threadId, text) {
  const msg = {
    id: `m${Date.now()}`,
    threadId,
    senderId: (localStorage.getItem('sid') || 'demo'),
    text,
    createdAt: new Date().toISOString(),
  };
  messages.push(msg); 
  return Promise.resolve(msg);
}


function readSubmissions() {
  try {
    const raw = localStorage.getItem(LS_KEYS.submissions);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeSubmissions(list) {
  localStorage.setItem(LS_KEYS.submissions, JSON.stringify(list));
}

export function submitAssignment(assignmentId, payload) {
  const studentId = localStorage.getItem('sid') || 'demo';
  const list = readSubmissions();
  const history = list.filter(s => s.assignmentId === assignmentId && s.studentId === studentId);
  const attempts = history.length;
  if (attempts >= 2) {
    return Promise.reject(new Error('No attempts left'));
  }
  const submission = {
    id: `s${Date.now()}`,
    assignmentId,
    studentId,
    createdAt: new Date().toISOString(),
    status: 'submitted', 
    score: null,
    feedback: null,
    content: payload,
    attempt: attempts + 1,
  };
  list.push(submission);
  writeSubmissions(list);
  return Promise.resolve(submission);
}

export function getSubmissionForStudent(assignmentId, studentId = (localStorage.getItem('sid') || 'demo')) {
  const list = readSubmissions().filter(s => s.assignmentId === assignmentId && s.studentId === studentId);
  if (list.length === 0) return null;
  return list[list.length - 1];
}

export function getPendingSubmissions() {
  return Promise.resolve(readSubmissions().filter(s => s.status === 'submitted'));
}

export function gradeSubmission(submissionId, score, feedback) {
  const list = readSubmissions();
  const idx = list.findIndex(s => s.id === submissionId);
  if (idx >= 0) {
    list[idx].status = 'graded';
    list[idx].score = score;
    list[idx].feedback = feedback;
    writeSubmissions(list);
  }
  return Promise.resolve(list[idx]);
}

export function allowResubmission(submissionId) {
  const list = readSubmissions();
  const idx = list.findIndex(s => s.id === submissionId);
  if (idx >= 0) {
    list[idx].status = 'resubmission-allowed';
    writeSubmissions(list);
  }
  return Promise.resolve(list[idx]);
}

export function getAssignmentStatusForStudent(assignmentId, studentId = (localStorage.getItem('sid') || 'demo')) {
  const a = assignments.find(x => x.id === assignmentId);
  const sub = getSubmissionForStudent(assignmentId, studentId);
  const now = Date.now();
  const deadline = a ? Date.parse(a.deadlineISO) : now;
  const base = { status: 'not-submitted', attemptsLeft: 2, late: false, score: null };
  if (!sub) {
    base.attemptsLeft = 2;
    base.late = now > deadline;
    return base;
  }
  base.attemptsLeft = Math.max(0, 2 - sub.attempt);
  base.score = sub.score;
  if (sub.status === 'submitted') base.status = 'submitted';
  if (sub.status === 'graded') base.status = 'graded';
  if (sub.status === 'resubmission-allowed') base.status = 'resubmission-allowed';
  base.late = Date.parse(sub.createdAt) > deadline;
  return base;
}


export function countOverdueAssignments(studentId = (localStorage.getItem('sid') || 'demo')) {
  
  const now = Date.now();
  return assignments.filter(a => Date.parse(a.deadlineISO) < now && !getSubmissionForStudent(a.id, studentId)).length;
}

export function countUnwatchedLectures(studentId = (localStorage.getItem('sid') || 'demo')) {
  const done = readCompletedLectures();
  return lectures.filter(l => !done.includes(l.id)).length;
}

export function countUnansweredThreadsForCurators() {
  
  const studentId = localStorage.getItem('sid') || 'demo';
  let count = 0;
  for (const t of threads) {
    const list = messages.filter(m => m.threadId === t.id);
    if (list.length === 0) continue;
    const last = list[list.length - 1];
    if (last.senderId === studentId) count += 1;
  }
  return count;
}

export function getUnreadThreadsCount() {
  const studentId = localStorage.getItem('sid') || 'demo';
  let unread = 0;
  for (const t of threads) {
    const lastMsg = messages.filter(m => m.threadId === t.id).slice(-1)[0];
    const lastRead = Number(localStorage.getItem(`read:${studentId}:${t.id}`) || 0);
    if (lastMsg && Date.parse(lastMsg.createdAt) > lastRead && lastMsg.senderId !== studentId) unread += 1;
  }
  return unread;
}


const LS_QUIZ = 'quizAttempts';

function readQuizAttempts() {
  try {
    const raw = localStorage.getItem(LS_QUIZ);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeQuizAttempts(map) {
  localStorage.setItem(LS_QUIZ, JSON.stringify(map));
}

export function fetchQuizzes() {
  return Promise.resolve(quizzes);
}

export function fetchQuizById(id) {
  return Promise.resolve(quizzes.find(q => q.id === id));
}

export function getQuizAttemptsLeft(quizId, studentId = (localStorage.getItem('sid') || 'demo')) {
  const map = readQuizAttempts();
  const key = `${studentId}:${quizId}`;
  const done = map[key]?.length || 0;
  const def = quizzes.find(q => q.id === quizId)?.attempts || 1;
  return Math.max(0, def - done);
}

export function submitQuiz(quizId, answers, score) {
  const studentId = localStorage.getItem('sid') || 'demo';
  const map = readQuizAttempts();
  const key = `${studentId}:${quizId}`;
  if (!map[key]) map[key] = [];
  map[key].push({ answers, score, createdAt: new Date().toISOString() });
  writeQuizAttempts(map);
  return Promise.resolve(map[key][map[key].length - 1]);
}
