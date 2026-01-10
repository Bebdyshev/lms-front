import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.tsx';
import apiClient from '../services/api.ts';
import { toast } from '../components/Toast.tsx';
import {
  User,
  Mail,
  GraduationCap,
  Target,
  Upload,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Send,
  BookOpen,
  PenTool,
  FileText,
  Calculator,
  MessageSquare,
  Cloud,
  CloudOff,
  Loader2,
} from 'lucide-react';
import { Button } from '../components/ui/button.tsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card.tsx';
import { Input } from '../components/ui/input.tsx';
import { Label } from '../components/ui/label.tsx';
import { Textarea } from '../components/ui/textarea.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select.tsx';
import { Checkbox } from '../components/ui/checkbox.tsx';

// Form data interface with all fields
interface FormData {
  full_name: string;
  phone_number: string;
  parent_phone_number: string;
  telegram_id: string;
  email: string;
  college_board_email: string;
  college_board_password: string;
  birthday_date: string;
  city: string;
  school_type: string;
  group_name: string;
  sat_target_date: string;
  has_passed_sat_before: boolean;
  previous_sat_score: string; // Will be computed from structured fields
  // Structured previous SAT fields
  previous_sat_month: string;
  previous_sat_year: string;
  previous_sat_verbal: string;
  previous_sat_math: string;
  recent_practice_test_score: string;
  bluebook_practice_test_5_score: string; // Will be computed from structured fields
  // Structured Bluebook Practice Test 5 fields
  bluebook_verbal: string;
  bluebook_math: string;
  screenshot_url: string;
  // Grammar Assessment (1-5 scale)
  grammar_punctuation: number | null;
  grammar_noun_clauses: number | null;
  grammar_relative_clauses: number | null;
  grammar_verb_forms: number | null;
  grammar_comparisons: number | null;
  grammar_transitions: number | null;
  grammar_synthesis: number | null;
  // Reading Skills Assessment (1-5 scale)
  reading_word_in_context: number | null;
  reading_text_structure: number | null;
  reading_cross_text: number | null;
  reading_central_ideas: number | null;
  reading_inferences: number | null;
  // SAT Passage Types (1-5 scale)
  passages_literary: number | null;
  passages_social_science: number | null;
  passages_humanities: number | null;
  passages_science: number | null;
  passages_poetry: number | null;
  // Math Topics
  math_topics: string[];
  // Additional comments
  additional_comments: string;
}

const SCHOOL_TYPES = [
  { value: 'NIS', label: 'Nazarbayev Intellectual Schools' },
  { value: 'RFMS', label: 'National Physics and Mathematics Schools' },
  { value: 'BIL', label: 'Bilim Innovation Lyceums' },
  { value: 'Private', label: 'Private school (частная)' },
  { value: 'Public', label: 'Public school (общеобразовательная)' },
];

const SAT_TARGET_DATES = [
  { value: 'October', label: 'October' },
  { value: 'November', label: 'November' },
  { value: 'December', label: 'December' },
  { value: 'March', label: 'March' },
  { value: 'May', label: 'May' },
];

const SAT_MONTHS = [
  { value: 'January', label: 'January' },
  { value: 'February', label: 'February' },
  { value: 'March', label: 'March' },
  { value: 'April', label: 'April' },
  { value: 'May', label: 'May' },
  { value: 'June', label: 'June' },
  { value: 'July', label: 'July' },
  { value: 'August', label: 'August' },
  { value: 'September', label: 'September' },
  { value: 'October', label: 'October' },
  { value: 'November', label: 'November' },
  { value: 'December', label: 'December' },
];

const SAT_YEARS = [
  { value: '2026', label: '2026' },
  { value: '2025', label: '2025' },
  { value: '2024', label: '2024' },
  { value: '2023', label: '2023' },
  { value: '2022', label: '2022' },
  { value: '2021', label: '2021' },
  { value: '2020', label: '2020' },
];

const GRAMMAR_QUESTIONS = [
  { key: 'grammar_punctuation', label: 'I feel confident in the following topic: Essential and Non-Essential Clauses. I can easily identify dependent clauses and apply punctuation rules.' },
  { key: 'grammar_noun_clauses', label: 'I feel confident in the following topic: Colons and Dashes. I understand all of the conditions for the use of colons and dashes.' },
  { key: 'grammar_relative_clauses', label: 'I feel confident in the following topic: Modifiers. I understand the dependence between Subject and Fragment.' },
  { key: 'grammar_verb_forms', label: 'I feel confident in the following topic: Tenses. I understand the difference between the use of different tenses. I can easily distinguish Past Perfect, Past Simple, Present Perfect, Present Simple, Present Continuous, Future Simple Tenses.' },
  { key: 'grammar_comparisons', label: 'I feel confident in the following topic: Parallel Structure. I can apply rules of parallel structures to the lists of nouns, verbs, etc.' },
  { key: 'grammar_transitions', label: 'I feel confident in the following topic: Transitions. I mostly understand the meaning of the 2 sentences and can easily identify the most suitable transition.' },
  { key: 'grammar_synthesis', label: 'I feel confident in the following topic: FANBOYS, Conjunctions, Strong Transitions. I understand how to connect sentences, sentences and fragments via the mentioned above rules.' },
];

const READING_QUESTIONS = [
  { key: 'reading_word_in_context', label: 'I feel confident in the following topic: Vocabulary in Context. In most cases, I know or can guess the meaning of the words from the context.' },
  { key: 'reading_text_structure', label: 'I feel confident in the following topic: Main Idea Questions. It is easy for me to read the passage and identify the main idea/theme/topic.' },
  { key: 'reading_cross_text', label: 'I feel confident in the following topic: Sentence Function. It is easy for me to understand what is the role of certain sentence in the passage.' },
  { key: 'reading_central_ideas', label: 'I feel confident in the following topic: Rhetorical Synthesis. It is easy for me to answer questions that require combining information from multiple sources.' },
  { key: 'reading_inferences', label: 'I feel confident in the following topic: Detailed Evidence. I can easily identify the point of the author and find evidence that supports or opposes his/her view.' },
];

const PASSAGES_QUESTIONS = [
  { key: 'passages_literary', label: 'I feel confident in the following type of passages: Fiction Passages. I understand the tone and mood of the passage from the literary techniques.' },
  { key: 'passages_social_science', label: 'I feel confident in the following type of passages: Social Science Passages. I can understand scientific terms connected with society, memory, psychology, behavior, even if they are not familiar to me. I mostly understand the scientific ideas or hypothesis presented in the passage.' },
  { key: 'passages_humanities', label: 'I feel confident in the following type of passages: Historical Passages. I can understand political terms even if they are not familiar to me. I mostly understand the ideas of the authors. I can explain what author is advocating for. I understand the context of the issue.' },
  { key: 'passages_science', label: 'I feel confident in the following type of passages: Natural Science Passages. I can understand scientific terms even if they are not familiar to me. I mostly understand the scientific ideas or hypothesis presented in the passage.' },
  { key: 'passages_poetry', label: 'I feel confident in the following type of passages: Poems. I can understand the general ideas in the Poems.' },
];

const MATH_TOPICS = [
  'Problem-solving and Data Analysis',
  'Linear equations',
  'Linear inequalities',
  'Linear functions',
  'System of linear equations',
  'Quadratic equations',
  'Quadratic functions',
  'Polynomial functions',
  'Radical, rational, and exponential functions',
  'Equivalent expressions',
  'Percentages',
  'Ratios, rates, proportional relationships',
  'Geometry and Trigonometry',
  'Lines, angles, and triangles',
  'Right triangles',
  'Circles and sectors',
  'Area, volume, and 3D shapes',
];

const LIKERT_SCALE = [
  { value: 1, label: "1 - Don't know" },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 5, label: '5 - Mastered' },
];

// Step configuration
const STEPS = [
  { title: 'Personal Info', icon: User },
  { title: 'Account Info', icon: Mail },
  { title: 'Education', icon: GraduationCap },
  { title: 'SAT Results', icon: Target },
  { title: 'Grammar', icon: PenTool },
  { title: 'Reading', icon: BookOpen },
  { title: 'Passages', icon: FileText },
  { title: 'Math Topics', icon: Calculator },
  { title: 'Comments', icon: MessageSquare },
];

// Likert Scale Component
function LikertScale({
  label,
  value,
  onChange,
  error,
  leftLabel = 'Strongly Disagree',
  rightLabel = 'Strongly Agree',
}: {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
  error?: string;
  leftLabel?: string;
  rightLabel?: string;
}) {
  return (
    <div className="space-y-3 p-4 border border-gray-200 rounded-lg bg-gray-50">
      <Label className="text-sm font-medium block">{label}</Label>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-gray-500 w-24 text-left">{leftLabel}</span>
        <div className="flex gap-2 flex-1 justify-center">
          {LIKERT_SCALE.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`w-10 h-10 text-sm rounded-lg border transition-all font-medium ${
                value === option.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50'
              }`}
            >
              {option.value}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-500 w-24 text-right">{rightLabel}</span>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

// Saving indicator component
function SavingIndicator({ status }: { status: 'idle' | 'saving' | 'saved' | 'error' }) {
  if (status === 'idle') return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <div
        className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg transition-all ${
          status === 'saving'
            ? 'bg-blue-100 text-blue-700'
            : status === 'saved'
            ? 'bg-green-100 text-green-700'
            : 'bg-red-100 text-red-700'
        }`}
      >
        {status === 'saving' && (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">Saving...</span>
          </>
        )}
        {status === 'saved' && (
          <>
            <Cloud className="w-4 h-4" />
            <span className="text-sm font-medium">All changes saved</span>
          </>
        )}
        {status === 'error' && (
          <>
            <CloudOff className="w-4 h-4" />
            <span className="text-sm font-medium">Failed to save</span>
          </>
        )}
      </div>
    </div>
  );
}

export default function AssignmentZeroPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedDataRef = useRef<string>('');
  const totalSteps = STEPS.length;

  const [formData, setFormData] = useState<FormData>({
    full_name: user?.full_name || user?.name || '',
    phone_number: '',
    parent_phone_number: '',
    telegram_id: '',
    email: user?.email || '',
    college_board_email: '',
    college_board_password: '',
    birthday_date: '',
    city: '',
    school_type: '',
    group_name: '',
    sat_target_date: '',
    has_passed_sat_before: false,
    previous_sat_score: '',
    previous_sat_month: '',
    previous_sat_year: '',
    previous_sat_verbal: '',
    previous_sat_math: '',
    recent_practice_test_score: '',
    bluebook_practice_test_5_score: '',
    bluebook_verbal: '',
    bluebook_math: '',
    screenshot_url: '',
    // Grammar Assessment
    grammar_punctuation: null,
    grammar_noun_clauses: null,
    grammar_relative_clauses: null,
    grammar_verb_forms: null,
    grammar_comparisons: null,
    grammar_transitions: null,
    grammar_synthesis: null,
    // Reading Skills
    reading_word_in_context: null,
    reading_text_structure: null,
    reading_cross_text: null,
    reading_central_ideas: null,
    reading_inferences: null,
    // Passages
    passages_literary: null,
    passages_social_science: null,
    passages_humanities: null,
    passages_science: null,
    passages_poetry: null,
    // Math Topics
    math_topics: [],
    // Comments
    additional_comments: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  // Check status and load draft on mount
  useEffect(() => {
    checkStatusAndLoadDraft();
  }, []);

  // Helper function to compute previous_sat_score from structured fields
  const computePreviousSatScore = () => {
    if (formData.has_passed_sat_before && formData.previous_sat_month && formData.previous_sat_year) {
      const parts = [`${formData.previous_sat_month} ${formData.previous_sat_year}`];
      const scores = [];
      if (formData.previous_sat_math) scores.push(`Math ${formData.previous_sat_math}`);
      if (formData.previous_sat_verbal) scores.push(`Verbal ${formData.previous_sat_verbal}`);
      if (scores.length > 0) {
        return `${parts[0]} - ${scores.join(', ')}`;
      }
      return parts[0];
    }
    return '';
  };

  // Helper function to compute bluebook_practice_test_5_score from structured fields
  const computeBluebookScore = () => {
    const scores = [];
    if (formData.bluebook_math) scores.push(`Math ${formData.bluebook_math}`);
    if (formData.bluebook_verbal) scores.push(`Verbal ${formData.bluebook_verbal}`);
    return scores.join(', ');
  };

  // Auto-save effect with debounce
  const saveProgress = useCallback(async () => {
    const currentData = JSON.stringify(formData);
    if (currentData === lastSavedDataRef.current) return;

    setSaveStatus('saving');
    try {
      // Compute previous_sat_score from structured fields
      const computedPreviousSatScore = computePreviousSatScore();
      // Compute bluebook_practice_test_5_score from structured fields
      const computedBluebookScore = computeBluebookScore();
      
      // Convert null values to undefined for API compatibility
      const dataToSave = {
        ...formData,
        previous_sat_score: computedPreviousSatScore || formData.previous_sat_score,
        bluebook_practice_test_5_score: computedBluebookScore || formData.bluebook_practice_test_5_score,
        last_saved_step: currentStep,
        grammar_punctuation: formData.grammar_punctuation ?? undefined,
        grammar_noun_clauses: formData.grammar_noun_clauses ?? undefined,
        grammar_relative_clauses: formData.grammar_relative_clauses ?? undefined,
        grammar_verb_forms: formData.grammar_verb_forms ?? undefined,
        grammar_comparisons: formData.grammar_comparisons ?? undefined,
        grammar_transitions: formData.grammar_transitions ?? undefined,
        grammar_synthesis: formData.grammar_synthesis ?? undefined,
        reading_word_in_context: formData.reading_word_in_context ?? undefined,
        reading_text_structure: formData.reading_text_structure ?? undefined,
        reading_cross_text: formData.reading_cross_text ?? undefined,
        reading_central_ideas: formData.reading_central_ideas ?? undefined,
        reading_inferences: formData.reading_inferences ?? undefined,
        passages_literary: formData.passages_literary ?? undefined,
        passages_social_science: formData.passages_social_science ?? undefined,
        passages_humanities: formData.passages_humanities ?? undefined,
        passages_science: formData.passages_science ?? undefined,
        passages_poetry: formData.passages_poetry ?? undefined,
      };
      await apiClient.saveAssignmentZeroProgress(dataToSave);
      lastSavedDataRef.current = currentData;
      setSaveStatus('saved');
      
      // Hide "saved" indicator after 2 seconds
      setTimeout(() => {
        setSaveStatus((prev) => (prev === 'saved' ? 'idle' : prev));
      }, 2000);
    } catch (error) {
      console.error('Failed to save progress:', error);
      setSaveStatus('error');
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    }
  }, [formData, currentStep]);

  // Debounced auto-save
  useEffect(() => {
    if (loading || alreadyCompleted) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveProgress();
    }, 1500); // 1.5 second debounce

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [formData, saveProgress, loading, alreadyCompleted]);

  const checkStatusAndLoadDraft = async () => {
    try {
      const status = await apiClient.getAssignmentZeroStatus();
      if (status.completed) {
        setAlreadyCompleted(true);
        setLoading(false);
        return;
      }

      // Try to load existing draft
      if (status.has_draft) {
        try {
          const submission = await apiClient.getMyAssignmentZeroSubmission();
          // Parse previous_sat_score into structured fields if it exists
          let prevMonth = '';
          let prevYear = '';
          let prevVerbal = '';
          let prevMath = '';
          if (submission.previous_sat_score) {
            // Try to parse "October 2024 - Math 650, Verbal 550" format
            const match = submission.previous_sat_score.match(/(\w+)\s+(\d{4})\s*-?\s*(?:Math\s*(\d+))?,?\s*(?:Verbal\s*(\d+))?/i);
            if (match) {
              prevMonth = match[1] || '';
              prevYear = match[2] || '';
              prevMath = match[3] || '';
              prevVerbal = match[4] || '';
            }
          }
          // Parse bluebook_practice_test_5_score into structured fields if it exists
          let bluebookVerbal = '';
          let bluebookMath = '';
          if (submission.bluebook_practice_test_5_score) {
            // Try to parse "Math 500, Verbal 560" format
            const mathMatch = submission.bluebook_practice_test_5_score.match(/Math\s*(\d+)/i);
            const verbalMatch = submission.bluebook_practice_test_5_score.match(/Verbal\s*(\d+)/i);
            if (mathMatch) bluebookMath = mathMatch[1] || '';
            if (verbalMatch) bluebookVerbal = verbalMatch[1] || '';
          }
          setFormData({
            full_name: submission.full_name || '',
            phone_number: submission.phone_number || '',
            parent_phone_number: submission.parent_phone_number || '',
            telegram_id: submission.telegram_id || '',
            email: submission.email || '',
            college_board_email: submission.college_board_email || '',
            college_board_password: submission.college_board_password || '',
            birthday_date: submission.birthday_date || '',
            city: submission.city || '',
            school_type: submission.school_type || '',
            group_name: submission.group_name || '',
            sat_target_date: submission.sat_target_date || '',
            has_passed_sat_before: submission.has_passed_sat_before || false,
            previous_sat_score: submission.previous_sat_score || '',
            previous_sat_month: prevMonth,
            previous_sat_year: prevYear,
            previous_sat_verbal: prevVerbal,
            previous_sat_math: prevMath,
            recent_practice_test_score: submission.recent_practice_test_score || '',
            bluebook_practice_test_5_score: submission.bluebook_practice_test_5_score || '',
            bluebook_verbal: bluebookVerbal,
            bluebook_math: bluebookMath,
            screenshot_url: submission.screenshot_url || '',
            grammar_punctuation: submission.grammar_punctuation,
            grammar_noun_clauses: submission.grammar_noun_clauses,
            grammar_relative_clauses: submission.grammar_relative_clauses,
            grammar_verb_forms: submission.grammar_verb_forms,
            grammar_comparisons: submission.grammar_comparisons,
            grammar_transitions: submission.grammar_transitions,
            grammar_synthesis: submission.grammar_synthesis,
            reading_word_in_context: submission.reading_word_in_context,
            reading_text_structure: submission.reading_text_structure,
            reading_cross_text: submission.reading_cross_text,
            reading_central_ideas: submission.reading_central_ideas,
            reading_inferences: submission.reading_inferences,
            passages_literary: submission.passages_literary,
            passages_social_science: submission.passages_social_science,
            passages_humanities: submission.passages_humanities,
            passages_science: submission.passages_science,
            passages_poetry: submission.passages_poetry,
            math_topics: submission.math_topics || [],
            additional_comments: submission.additional_comments || '',
          });
          lastSavedDataRef.current = JSON.stringify(submission);
          if (status.last_saved_step) {
            setCurrentStep(status.last_saved_step);
          }
        } catch (error) {
          console.error('Failed to load draft:', error);
        }
      }
    } catch (error) {
      console.error('Failed to check status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | boolean | number | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleMathTopicToggle = (topic: string) => {
    setFormData((prev) => ({
      ...prev,
      math_topics: prev.math_topics.includes(topic)
        ? prev.math_topics.filter((t) => t !== topic)
        : [...prev.math_topics, topic],
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast('Please upload an image file (JPEG, PNG, GIF, or WEBP)', 'error');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast('File size must be less than 10MB', 'error');
      return;
    }

    setUploadingFile(true);
    try {
      const result = await apiClient.uploadAssignmentZeroScreenshot(file);
      handleInputChange('screenshot_url', result.url);
      toast('Screenshot uploaded successfully', 'success');
    } catch (error) {
      console.error('Upload failed:', error);
      toast('Failed to upload screenshot', 'error');
    } finally {
      setUploadingFile(false);
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (step === 1) {
      if (!formData.full_name.trim()) newErrors.full_name = 'Required';
      if (!formData.phone_number.trim()) newErrors.phone_number = 'Required';
      if (!formData.parent_phone_number.trim()) newErrors.parent_phone_number = 'Required';
      if (!formData.telegram_id.trim()) newErrors.telegram_id = 'Required';
      if (!formData.email.trim()) newErrors.email = 'Required';
    } else if (step === 2) {
      if (!formData.college_board_email.trim()) newErrors.college_board_email = 'Required';
      if (!formData.college_board_password.trim()) newErrors.college_board_password = 'Required';
      if (!formData.birthday_date) newErrors.birthday_date = 'Required';
      if (!formData.city.trim()) newErrors.city = 'Required';
    } else if (step === 3) {
      if (!formData.school_type) newErrors.school_type = 'Required';
      if (!formData.group_name.trim()) newErrors.group_name = 'Required';
      if (!formData.sat_target_date) newErrors.sat_target_date = 'Required';
    } else if (step === 4) {
      if (!formData.recent_practice_test_score.trim()) newErrors.recent_practice_test_score = 'Required';
      if (!formData.bluebook_verbal.trim()) newErrors.bluebook_verbal = 'Required';
      if (!formData.bluebook_math.trim()) newErrors.bluebook_math = 'Required';
      if (!formData.screenshot_url) newErrors.screenshot_url = 'Required';
    }
    // Steps 5-9 are optional assessments, no required validation

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    // Validate all required steps
    for (let step = 1; step <= 4; step++) {
      if (!validateStep(step)) {
        setCurrentStep(step);
        toast('Please complete all required fields', 'error');
        return;
      }
    }

    setSubmitting(true);
    try {
      // Compute previous_sat_score from structured fields
      const computedPreviousSatScore = computePreviousSatScore();
      // Compute bluebook_practice_test_5_score from structured fields
      const computedBluebookScore = computeBluebookScore();
      
      await apiClient.submitAssignmentZero({
        ...formData,
        previous_sat_score: computedPreviousSatScore || formData.previous_sat_score || undefined,
        bluebook_practice_test_5_score: computedBluebookScore || formData.bluebook_practice_test_5_score,
        grammar_punctuation: formData.grammar_punctuation || undefined,
        grammar_noun_clauses: formData.grammar_noun_clauses || undefined,
        grammar_relative_clauses: formData.grammar_relative_clauses || undefined,
        grammar_verb_forms: formData.grammar_verb_forms || undefined,
        grammar_comparisons: formData.grammar_comparisons || undefined,
        grammar_transitions: formData.grammar_transitions || undefined,
        grammar_synthesis: formData.grammar_synthesis || undefined,
        reading_word_in_context: formData.reading_word_in_context || undefined,
        reading_text_structure: formData.reading_text_structure || undefined,
        reading_cross_text: formData.reading_cross_text || undefined,
        reading_central_ideas: formData.reading_central_ideas || undefined,
        reading_inferences: formData.reading_inferences || undefined,
        passages_literary: formData.passages_literary || undefined,
        passages_social_science: formData.passages_social_science || undefined,
        passages_humanities: formData.passages_humanities || undefined,
        passages_science: formData.passages_science || undefined,
        passages_poetry: formData.passages_poetry || undefined,
        math_topics: formData.math_topics.length > 0 ? formData.math_topics : undefined,
        additional_comments: formData.additional_comments || undefined,
      });

      // Refresh user data to get updated assignment_zero_completed status
      await refreshUser();

      toast('Assignment Zero submitted successfully!', 'success');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Submit failed:', error);
      toast(error.message || 'Failed to submit', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (alreadyCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Already Completed!</h2>
            <p className="text-gray-600 mb-6">
              You have already submitted Assignment Zero. You can proceed to your dashboard.
            </p>
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const CurrentStepIcon = STEPS[currentStep - 1]?.icon || User;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <SavingIndicator status={saveStatus} />
      
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Assignment Zero</h1>
          <p className="text-lg text-gray-600">Self-Assessment Questionnaire</p>
          <p className="text-sm text-gray-500 mt-2">
            Please be honest when answering questions. This helps us understand your current level.
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2 overflow-x-auto pb-2">
            {STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const stepNumber = index + 1;
              return (
                <button
                  key={stepNumber}
                  onClick={() => stepNumber <= currentStep && setCurrentStep(stepNumber)}
                  disabled={stepNumber > currentStep}
                  className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all ${
                    stepNumber === currentStep
                      ? 'bg-blue-600 text-white'
                      : stepNumber < currentStep
                      ? 'bg-green-500 text-white cursor-pointer hover:bg-green-600'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                  title={step.title}
                >
                  {stepNumber < currentStep ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <StepIcon className="w-5 h-5" />
                  )}
                </button>
              );
            })}
          </div>
          <div className="relative h-2 bg-gray-200 rounded-full">
            <div
              className="absolute h-full bg-blue-600 rounded-full transition-all"
              style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
            />
          </div>
          <p className="text-center text-sm text-gray-600 mt-2">
            Step {currentStep} of {totalSteps}: {STEPS[currentStep - 1]?.title}
          </p>
        </div>

        {/* Form Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CurrentStepIcon className="w-5 h-5" />
              {STEPS[currentStep - 1]?.title}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && 'Tell us about yourself'}
              {currentStep === 2 && 'Your College Board and platform accounts'}
              {currentStep === 3 && 'Your school and SAT goals'}
              {currentStep === 4 && 'Your recent test scores'}
              {currentStep === 5 && 'Rate your grammar knowledge (1 = Don\'t know, 5 = Mastered)'}
              {currentStep === 6 && 'Rate your reading skills (1 = Don\'t know, 5 = Mastered)'}
              {currentStep === 7 && 'Rate your familiarity with SAT passage types (1 = Don\'t know, 5 = Mastered)'}
              {currentStep === 8 && 'Select the math topics you need to work on'}
              {currentStep === 9 && 'Any additional comments or questions'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="full_name">Name and Surname *</Label>
                  <Input
                    id="full_name"
                    placeholder="Enter your full name"
                    value={formData.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    className={errors.full_name ? 'border-red-500' : ''}
                  />
                  {errors.full_name && <p className="text-sm text-red-500">{errors.full_name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone_number">Your Phone Number *</Label>
                  <Input
                    id="phone_number"
                    placeholder="+7 (XXX) XXX-XX-XX"
                    value={formData.phone_number}
                    onChange={(e) => handleInputChange('phone_number', e.target.value)}
                    className={errors.phone_number ? 'border-red-500' : ''}
                  />
                  {errors.phone_number && <p className="text-sm text-red-500">{errors.phone_number}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parent_phone_number">Your Parent's Phone Number *</Label>
                  <Input
                    id="parent_phone_number"
                    placeholder="+7 (XXX) XXX-XX-XX"
                    value={formData.parent_phone_number}
                    onChange={(e) => handleInputChange('parent_phone_number', e.target.value)}
                    className={errors.parent_phone_number ? 'border-red-500' : ''}
                  />
                  {errors.parent_phone_number && (
                    <p className="text-sm text-red-500">{errors.parent_phone_number}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telegram_id">Your Telegram ID *</Label>
                  <Input
                    id="telegram_id"
                    placeholder="@your_telegram"
                    value={formData.telegram_id}
                    onChange={(e) => handleInputChange('telegram_id', e.target.value)}
                    className={errors.telegram_id ? 'border-red-500' : ''}
                  />
                  {errors.telegram_id && <p className="text-sm text-red-500">{errors.telegram_id}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <p className="text-xs text-gray-500">
                    This email will be used to give you access to the weekly practice tests.
                  </p>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={errors.email ? 'border-red-500' : ''}
                  />
                  {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                </div>
              </>
            )}

            {/* Step 2: Account Information */}
            {currentStep === 2 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="college_board_email">College Board Account Email *</Label>
                  <p className="text-xs text-gray-500">
                    Please provide your email with which you have registered your College Board account.
                  </p>
                  <Input
                    id="college_board_email"
                    type="email"
                    placeholder="collegeboard@email.com"
                    value={formData.college_board_email}
                    onChange={(e) => handleInputChange('college_board_email', e.target.value)}
                    className={errors.college_board_email ? 'border-red-500' : ''}
                  />
                  {errors.college_board_email && (
                    <p className="text-sm text-red-500">{errors.college_board_email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="college_board_password">College Board Account Password *</Label>
                  <p className="text-xs text-gray-500">
                    Your email and password will be used by your teacher to check if you have correctly
                    registered for SAT.
                  </p>
                  <Input
                    id="college_board_password"
                    type="password"
                    placeholder="Enter your password"
                    value={formData.college_board_password}
                    onChange={(e) => handleInputChange('college_board_password', e.target.value)}
                    className={errors.college_board_password ? 'border-red-500' : ''}
                  />
                  {errors.college_board_password && (
                    <p className="text-sm text-red-500">{errors.college_board_password}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birthday_date">Birthday Date *</Label>
                  <Input
                    id="birthday_date"
                    type="date"
                    value={formData.birthday_date}
                    onChange={(e) => handleInputChange('birthday_date', e.target.value)}
                    className={errors.birthday_date ? 'border-red-500' : ''}
                  />
                  {errors.birthday_date && <p className="text-sm text-red-500">{errors.birthday_date}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    placeholder="Enter your city"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className={errors.city ? 'border-red-500' : ''}
                  />
                  {errors.city && <p className="text-sm text-red-500">{errors.city}</p>}
                </div>
              </>
            )}

            {/* Step 3: Education & Goals */}
            {currentStep === 3 && (
              <>
                <div className="space-y-2">
                  <Label>Which type of school do you study at? *</Label>
                  <Select
                    value={formData.school_type}
                    onValueChange={(value) => handleInputChange('school_type', value)}
                  >
                    <SelectTrigger className={errors.school_type ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select your school type" />
                    </SelectTrigger>
                    <SelectContent>
                      {SCHOOL_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.school_type && <p className="text-sm text-red-500">{errors.school_type}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="group_name">Group Name *</Label>
                  <Input
                    id="group_name"
                    placeholder="Enter your group name"
                    value={formData.group_name}
                    onChange={(e) => handleInputChange('group_name', e.target.value)}
                    className={errors.group_name ? 'border-red-500' : ''}
                  />
                  {errors.group_name && <p className="text-sm text-red-500">{errors.group_name}</p>}
                </div>

                <div className="space-y-2">
                  <Label>When are you planning to pass SAT? *</Label>
                  <Select
                    value={formData.sat_target_date}
                    onValueChange={(value) => handleInputChange('sat_target_date', value)}
                  >
                    <SelectTrigger className={errors.sat_target_date ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select target date" />
                    </SelectTrigger>
                    <SelectContent>
                      {SAT_TARGET_DATES.map((date) => (
                        <SelectItem key={date.value} value={date.value}>
                          {date.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.sat_target_date && <p className="text-sm text-red-500">{errors.sat_target_date}</p>}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has_passed_sat"
                    checked={formData.has_passed_sat_before}
                    onCheckedChange={(checked) =>
                      handleInputChange('has_passed_sat_before', checked === true)
                    }
                  />
                  <Label htmlFor="has_passed_sat" className="cursor-pointer">
                    Have you passed SAT before?
                  </Label>
                </div>

                {formData.has_passed_sat_before && (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
                    <Label className="font-medium">What was your score and on which exam?</Label>
                    
                    {/* Month and Year Selection */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="previous_sat_month">Month *</Label>
                        <Select
                          value={formData.previous_sat_month}
                          onValueChange={(value) => handleInputChange('previous_sat_month', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select month" />
                          </SelectTrigger>
                          <SelectContent>
                            {SAT_MONTHS.map((month) => (
                              <SelectItem key={month.value} value={month.value}>
                                {month.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="previous_sat_year">Year *</Label>
                        <Select
                          value={formData.previous_sat_year}
                          onValueChange={(value) => handleInputChange('previous_sat_year', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select year" />
                          </SelectTrigger>
                          <SelectContent>
                            {SAT_YEARS.map((year) => (
                              <SelectItem key={year.value} value={year.value}>
                                {year.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Verbal and Math Scores */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="previous_sat_verbal">Verbal Score *</Label>
                        <Input
                          id="previous_sat_verbal"
                          type="number"
                          min="200"
                          max="800"
                          placeholder="200-800"
                          value={formData.previous_sat_verbal}
                          onChange={(e) => handleInputChange('previous_sat_verbal', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="previous_sat_math">Math Score *</Label>
                        <Input
                          id="previous_sat_math"
                          type="number"
                          min="200"
                          max="800"
                          placeholder="200-800"
                          value={formData.previous_sat_math}
                          onChange={(e) => handleInputChange('previous_sat_math', e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Show total score if both are entered */}
                    {formData.previous_sat_verbal && formData.previous_sat_math && (
                      <div className="text-sm text-gray-600 bg-white p-2 rounded border">
                        Total Score: <span className="font-semibold">{Number(formData.previous_sat_verbal) + Number(formData.previous_sat_math)}</span>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Step 4: SAT Results */}
            {currentStep === 4 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="recent_practice_test_score">
                    What was your score on recent practice tests? *
                  </Label>
                  <p className="text-xs text-gray-500">
                    For example: "I passed Bluebook Practice Test 5 on October 23rd and got 1200 (Verbal
                    500, Math 700)"
                  </p>
                  <Textarea
                    id="recent_practice_test_score"
                    placeholder="Describe your recent practice test results"
                    value={formData.recent_practice_test_score}
                    onChange={(e) => handleInputChange('recent_practice_test_score', e.target.value)}
                    className={errors.recent_practice_test_score ? 'border-red-500' : ''}
                  />
                  {errors.recent_practice_test_score && (
                    <p className="text-sm text-red-500">{errors.recent_practice_test_score}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>
                    Please submit the results of Bluebook Practice Test 5 *
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="bluebook_verbal" className="text-sm text-gray-600">Verbal Score</Label>
                      <Input
                        id="bluebook_verbal"
                        type="number"
                        placeholder="200-800"
                        min="200"
                        max="800"
                        step="10"
                        value={formData.bluebook_verbal}
                        onChange={(e) => handleInputChange('bluebook_verbal', e.target.value)}
                        className={errors.bluebook_verbal ? 'border-red-500' : ''}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="bluebook_math" className="text-sm text-gray-600">Math Score</Label>
                      <Input
                        id="bluebook_math"
                        type="number"
                        placeholder="200-800"
                        min="200"
                        max="800"
                        step="10"
                        value={formData.bluebook_math}
                        onChange={(e) => handleInputChange('bluebook_math', e.target.value)}
                        className={errors.bluebook_math ? 'border-red-500' : ''}
                      />
                    </div>
                  </div>
                  {(errors.bluebook_verbal || errors.bluebook_math) && (
                    <p className="text-sm text-red-500">Both Verbal and Math scores are required</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Upload a screenshot with your results of Bluebook Practice Test 5 *</Label>
                  <p className="text-xs text-gray-500">
                    Max 10 MB. Supported formats: JPEG, PNG, GIF, WEBP
                  </p>

                  {formData.screenshot_url ? (
                    <div className="border rounded-lg p-4 bg-green-50 border-green-200">
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-medium">Screenshot uploaded successfully!</span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => handleInputChange('screenshot_url', '')}
                      >
                        Upload different file
                      </Button>
                    </div>
                  ) : (
                    <div
                      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                        errors.screenshot_url
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="screenshot-upload"
                        disabled={uploadingFile}
                      />
                      <label
                        htmlFor="screenshot-upload"
                        className="cursor-pointer flex flex-col items-center gap-2"
                      >
                        {uploadingFile ? (
                          <>
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="text-gray-600">Uploading...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 text-gray-400" />
                            <span className="text-gray-600">Click to upload screenshot</span>
                          </>
                        )}
                      </label>
                    </div>
                  )}
                  {errors.screenshot_url && (
                    <p className="text-sm text-red-500">{errors.screenshot_url}</p>
                  )}
                </div>
              </>
            )}

            {/* Step 5: Grammar Assessment */}
            {currentStep === 5 && (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">Important</p>
                    <p>
                      Please be honest when answering questions. This questionnaire is designed to
                      identify your current strong and weak skills to help us personalize your
                      learning experience.
                    </p>
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2">Grammar Assessment</h3>
                <div className="space-y-4">
                  {GRAMMAR_QUESTIONS.map((question) => (
                    <LikertScale
                      key={question.key}
                      label={question.label}
                      value={formData[question.key as keyof FormData] as number | null}
                      onChange={(value) => handleInputChange(question.key as keyof FormData, value)}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Step 6: Reading Skills Assessment */}
            {currentStep === 6 && (
              <>
                <h3 className="text-lg font-semibold mb-4">Assessment of Reading Skills</h3>
                <div className="space-y-4">
                  {READING_QUESTIONS.map((question) => (
                    <LikertScale
                      key={question.key}
                      label={question.label}
                      value={formData[question.key as keyof FormData] as number | null}
                      onChange={(value) => handleInputChange(question.key as keyof FormData, value)}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Step 7: SAT Passage Types */}
            {currentStep === 7 && (
              <>
                <h3 className="text-lg font-semibold mb-4">Styles of the SAT Passages</h3>
                <div className="space-y-4">
                  {PASSAGES_QUESTIONS.map((question) => (
                    <LikertScale
                      key={question.key}
                      label={question.label}
                      value={formData[question.key as keyof FormData] as number | null}
                      onChange={(value) => handleInputChange(question.key as keyof FormData, value)}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Step 8: Math Topics */}
            {currentStep === 8 && (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>Instructions:</strong> Select all the math topics that you feel you need
                    to work on or improve.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {MATH_TOPICS.map((topic) => (
                    <div key={topic} className="flex items-center space-x-3">
                      <Checkbox
                        id={`math-${topic}`}
                        checked={formData.math_topics.includes(topic)}
                        onCheckedChange={() => handleMathTopicToggle(topic)}
                      />
                      <Label htmlFor={`math-${topic}`} className="cursor-pointer text-sm">
                        {topic}
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  Selected: {formData.math_topics.length} topic(s)
                </p>
              </>
            )}

            {/* Step 9: Additional Comments */}
            {currentStep === 9 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="additional_comments">Additional Comments (Optional)</Label>
                  <p className="text-xs text-gray-500">
                    Is there anything else you'd like us to know? Any specific questions, concerns, or
                    areas you'd like help with?
                  </p>
                  <Textarea
                    id="additional_comments"
                    placeholder="Enter any additional comments or questions here..."
                    value={formData.additional_comments}
                    onChange={(e) => handleInputChange('additional_comments', e.target.value)}
                    rows={6}
                  />
                </div>

                {/* Important Notice */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">Important</p>
                    <p>
                      Please be honest when answering questions. This questionnaire is designed to
                      identify your current strong and weak skills to help us personalize your
                      learning experience.
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-4 border-t">
              {currentStep > 1 ? (
                <Button type="button" variant="outline" onClick={handleBack}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              ) : (
                <div />
              )}

              {currentStep < totalSteps ? (
                <Button type="button" onClick={handleNext}>
                  Next <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Assignment Zero
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
