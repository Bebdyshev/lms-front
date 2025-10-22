import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../services/api';
import { toast } from '../../components/Toast';
import { ArrowLeft, Download, FileText, User, Calendar, Award, CheckCircle, Clock } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';

interface Submission {
  id: number;
  user_name: string;
  answers: any;
  file_url?: string;
  submitted_file_name?: string;
  score?: number;
  max_score: number;
  is_graded: boolean;
  feedback?: string;
  grader_name?: string;
  submitted_at: string;
  graded_at?: string;
}

interface Assignment {
  id: number;
  title: string;
  max_score: number;
}

export default function AssignmentGradingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [isGradingModalOpen, setIsGradingModalOpen] = useState(false);
  const [gradingScore, setGradingScore] = useState<number>(0);
  const [gradingFeedback, setGradingFeedback] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const assignmentData = await apiClient.getAssignment(id);
      setAssignment(assignmentData);
      const submissionsData = await apiClient.getAssignmentSubmissions(id);
      setSubmissions(submissionsData);
    } catch (error) {
      toast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGradeSubmission = async () => {
    if (!selectedSubmission || !id) return;
    setIsSubmitting(true);
    try {
      await apiClient.gradeSubmission(id, selectedSubmission.id.toString(), gradingScore, gradingFeedback);
      toast('Submission graded successfully', 'success');
      setIsGradingModalOpen(false);
      await loadData();
    } catch (error) {
      toast('Failed to grade submission', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openGradingModal = (submission: Submission) => {
    setSelectedSubmission(submission);
    setGradingScore(submission.score || 0);
    setGradingFeedback(submission.feedback || '');
    setIsGradingModalOpen(true);
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" onClick={() => navigate('/assignments')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Grade Submissions</h1>
          <p className="text-gray-600">{assignment?.title}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Submissions ({submissions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {submissions.map((submission) => (
            <div key={submission.id} className="border rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{submission.user_name}</div>
                  <div className="text-sm text-gray-600">
                    Submitted: {new Date(submission.submitted_at).toLocaleDateString()}
                  </div>
                  {submission.file_url && (
                    <div className="text-sm text-blue-600">
                      <Download className="w-3 h-3 inline mr-1" />
                      {submission.submitted_file_name}
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {submission.is_graded ? (
                    <Badge variant="default">Graded: {submission.score}/{submission.max_score}</Badge>
                  ) : (
                    <Badge variant="secondary">Pending</Badge>
                  )}
                  <Button onClick={() => openGradingModal(submission)}>
                    {submission.is_graded ? 'Update Grade' : 'Grade'}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={isGradingModalOpen} onOpenChange={setIsGradingModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grade Submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Score</Label>
              <Input
                type="number"
                min="0"
                max={assignment?.max_score || 100}
                value={gradingScore}
                onChange={(e) => setGradingScore(parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label>Feedback</Label>
              <Textarea
                value={gradingFeedback}
                onChange={(e) => setGradingFeedback(e.target.value)}
                placeholder="Provide feedback..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGradingModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleGradeSubmission} disabled={isSubmitting}>
              Submit Grade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
