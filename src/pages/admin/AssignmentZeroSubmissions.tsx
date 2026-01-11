import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import apiClient from '../../services/api';
import { Search, Download, Eye, Filter } from 'lucide-react';

interface AssignmentZeroSubmission {
  id: number;
  user_id: number;
  full_name: string;
  email: string;
  phone_number: string;
  parent_phone_number: string;
  telegram_id: string;
  college_board_email: string;
  birthday_date: string;
  city: string;
  school_type: string;
  group_name: string;
  sat_target_date: string;
  has_passed_sat_before: boolean;
  previous_sat_score: string | null;
  recent_practice_test_score: string;
  bluebook_practice_test_5_score: string;
  screenshot_url: string | null;
  // Grammar Assessment
  grammar_punctuation: number | null;
  grammar_noun_clauses: number | null;
  grammar_relative_clauses: number | null;
  grammar_verb_forms: number | null;
  grammar_comparisons: number | null;
  grammar_transitions: number | null;
  grammar_synthesis: number | null;
  // Reading Skills
  reading_word_in_context: number | null;
  reading_text_structure: number | null;
  reading_cross_text: number | null;
  reading_central_ideas: number | null;
  reading_inferences: number | null;
  // Passages
  passages_literary: number | null;
  passages_social_science: number | null;
  passages_humanities: number | null;
  passages_science: number | null;
  passages_poetry: number | null;
  // Math Topics
  math_topics: string[];
  additional_comments: string | null;
  is_draft: boolean;
  created_at: string;
  updated_at: string;
}

const AssignmentZeroSubmissions = () => {
  const [submissions, setSubmissions] = useState<AssignmentZeroSubmission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<AssignmentZeroSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<AssignmentZeroSubmission | null>(null);
  const [filterDraft, setFilterDraft] = useState<'all' | 'draft' | 'submitted'>('submitted');

  useEffect(() => {
    fetchSubmissions();
  }, []);

  useEffect(() => {
    filterSubmissions();
  }, [searchQuery, submissions, filterDraft]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getAllAssignmentZeroSubmissions();
      setSubmissions(response);
    } catch (error) {
      console.error('Failed to fetch submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterSubmissions = () => {
    let filtered = submissions;

    // Filter by draft status
    if (filterDraft === 'draft') {
      filtered = filtered.filter((s) => s.is_draft);
    } else if (filterDraft === 'submitted') {
      filtered = filtered.filter((s) => !s.is_draft);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.full_name.toLowerCase().includes(query) ||
          s.email.toLowerCase().includes(query) ||
          s.group_name.toLowerCase().includes(query) ||
          s.city.toLowerCase().includes(query)
      );
    }

    setFilteredSubmissions(filtered);
  };

  const calculateAverageScore = (submission: AssignmentZeroSubmission) => {
    const scores = [
      submission.grammar_punctuation,
      submission.grammar_noun_clauses,
      submission.grammar_relative_clauses,
      submission.grammar_verb_forms,
      submission.grammar_comparisons,
      submission.grammar_transitions,
      submission.grammar_synthesis,
      submission.reading_word_in_context,
      submission.reading_text_structure,
      submission.reading_cross_text,
      submission.reading_central_ideas,
      submission.reading_inferences,
      submission.passages_literary,
      submission.passages_social_science,
      submission.passages_humanities,
      submission.passages_science,
      submission.passages_poetry,
    ].filter((score) => score !== null) as number[];

    if (scores.length === 0) return 0;
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
  };

  const exportToCSV = () => {
    const headers = [
      'Full Name',
      'Email',
      'Phone',
      'Parent Phone',
      'Telegram',
      'College Board Email',
      'Birthday',
      'City',
      'School Type',
      'Group Name',
      'SAT Target Date',
      'Has Passed SAT',
      'Previous SAT Score',
      'Recent Practice Test',
      'Bluebook Test 5',
      'Grammar Avg',
      'Reading Avg',
      'Passages Avg',
      'Math Topics Count',
      'Status',
      'Submitted At',
    ];

    const rows = filteredSubmissions.map((s) => {
      const grammarScores = [
        s.grammar_punctuation,
        s.grammar_noun_clauses,
        s.grammar_relative_clauses,
        s.grammar_verb_forms,
        s.grammar_comparisons,
        s.grammar_transitions,
        s.grammar_synthesis,
      ].filter((x) => x !== null) as number[];
      const grammarAvg = grammarScores.length
        ? (grammarScores.reduce((a, b) => a + b, 0) / grammarScores.length).toFixed(1)
        : 'N/A';

      const readingScores = [
        s.reading_word_in_context,
        s.reading_text_structure,
        s.reading_cross_text,
        s.reading_central_ideas,
        s.reading_inferences,
      ].filter((x) => x !== null) as number[];
      const readingAvg = readingScores.length
        ? (readingScores.reduce((a, b) => a + b, 0) / readingScores.length).toFixed(1)
        : 'N/A';

      const passagesScores = [
        s.passages_literary,
        s.passages_social_science,
        s.passages_humanities,
        s.passages_science,
        s.passages_poetry,
      ].filter((x) => x !== null) as number[];
      const passagesAvg = passagesScores.length
        ? (passagesScores.reduce((a, b) => a + b, 0) / passagesScores.length).toFixed(1)
        : 'N/A';

      return [
        s.full_name,
        s.email,
        s.phone_number,
        s.parent_phone_number,
        s.telegram_id,
        s.college_board_email,
        s.birthday_date,
        s.city,
        s.school_type,
        s.group_name,
        s.sat_target_date,
        s.has_passed_sat_before ? 'Yes' : 'No',
        s.previous_sat_score || 'N/A',
        s.recent_practice_test_score,
        s.bluebook_practice_test_5_score,
        grammarAvg,
        readingAvg,
        passagesAvg,
        s.math_topics.length,
        s.is_draft ? 'Draft' : 'Submitted',
        new Date(s.updated_at).toLocaleString(),
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `assignment_zero_submissions_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Assignment Zero Submissions</h1>
        <p className="text-gray-600">View and analyze student self-assessment questionnaires</p>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search by name, email, group, or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterDraft === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterDraft('all')}
                size="sm"
              >
                <Filter className="w-4 h-4 mr-2" />
                All ({submissions.length})
              </Button>
              <Button
                variant={filterDraft === 'submitted' ? 'default' : 'outline'}
                onClick={() => setFilterDraft('submitted')}
                size="sm"
              >
                Submitted ({submissions.filter((s) => !s.is_draft).length})
              </Button>
              <Button
                variant={filterDraft === 'draft' ? 'default' : 'outline'}
                onClick={() => setFilterDraft('draft')}
                size="sm"
              >
                Drafts ({submissions.filter((s) => s.is_draft).length})
              </Button>
            </div>
            <Button onClick={exportToCSV} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Submissions List */}
      <div className="grid gap-4">
        {filteredSubmissions.map((submission) => (
          <Card key={submission.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{submission.full_name}</h3>
                    <Badge variant={submission.is_draft ? 'secondary' : 'default'}>
                      {submission.is_draft ? 'Draft' : 'Submitted'}
                    </Badge>
                    <Badge variant="outline">Avg: {calculateAverageScore(submission)}/5</Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Email:</span> {submission.email}
                    </div>
                    <div>
                      <span className="font-medium">Group:</span> {submission.group_name}
                    </div>
                    <div>
                      <span className="font-medium">City:</span> {submission.city}
                    </div>
                    <div>
                      <span className="font-medium">School:</span> {submission.school_type}
                    </div>
                    <div>
                      <span className="font-medium">SAT Target:</span> {submission.sat_target_date}
                    </div>
                    <div>
                      <span className="font-medium">Bluebook:</span> {submission.bluebook_practice_test_5_score}
                    </div>
                    <div>
                      <span className="font-medium">Math Topics:</span> {submission.math_topics.length} selected
                    </div>
                    <div>
                      <span className="font-medium">Submitted:</span>{' '}
                      {new Date(submission.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setSelectedSubmission(submission)}>
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSubmissions.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center text-gray-500">
            <p>No submissions found matching your criteria.</p>
          </CardContent>
        </Card>
      )}

      {/* Detailed View Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Assignment Zero - {selectedSubmission.full_name}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelectedSubmission(null)}>
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Personal Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 border-b pb-2">Personal Information</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-medium">Full Name:</span> {selectedSubmission.full_name}
                    </div>
                    <div>
                      <span className="font-medium">Email:</span> {selectedSubmission.email}
                    </div>
                    <div>
                      <span className="font-medium">Phone:</span> {selectedSubmission.phone_number}
                    </div>
                    <div>
                      <span className="font-medium">Parent Phone:</span> {selectedSubmission.parent_phone_number}
                    </div>
                    <div>
                      <span className="font-medium">Telegram:</span> {selectedSubmission.telegram_id}
                    </div>
                    <div>
                      <span className="font-medium">Birthday:</span> {selectedSubmission.birthday_date}
                    </div>
                    <div>
                      <span className="font-medium">City:</span> {selectedSubmission.city}
                    </div>
                    <div>
                      <span className="font-medium">College Board Email:</span> {selectedSubmission.college_board_email}
                    </div>
                  </div>
                </div>

                {/* Education Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 border-b pb-2">Education & SAT Information</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-medium">School Type:</span> {selectedSubmission.school_type}
                    </div>
                    <div>
                      <span className="font-medium">Group Name:</span> {selectedSubmission.group_name}
                    </div>
                    <div>
                      <span className="font-medium">SAT Target Date:</span> {selectedSubmission.sat_target_date}
                    </div>
                    <div>
                      <span className="font-medium">Has Passed SAT Before:</span>{' '}
                      {selectedSubmission.has_passed_sat_before ? 'Yes' : 'No'}
                    </div>
                    {selectedSubmission.previous_sat_score && (
                      <div className="col-span-2">
                        <span className="font-medium">Previous SAT Score:</span> {selectedSubmission.previous_sat_score}
                      </div>
                    )}
                    <div className="col-span-2">
                      <span className="font-medium">Recent Practice Test:</span>{' '}
                      {selectedSubmission.recent_practice_test_score}
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium">Bluebook Practice Test 5:</span>{' '}
                      {selectedSubmission.bluebook_practice_test_5_score}
                    </div>
                    {selectedSubmission.screenshot_url && (
                      <div className="col-span-2">
                        <span className="font-medium">Screenshot:</span>{' '}
                        <a
                          href={(import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000') + selectedSubmission.screenshot_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          View Screenshot
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Grammar Assessment */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 border-b pb-2">Grammar Assessment (1-5)</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>Punctuation: {selectedSubmission.grammar_punctuation || 'N/A'}</div>
                    <div>Noun Clauses: {selectedSubmission.grammar_noun_clauses || 'N/A'}</div>
                    <div>Relative Clauses: {selectedSubmission.grammar_relative_clauses || 'N/A'}</div>
                    <div>Verb Forms: {selectedSubmission.grammar_verb_forms || 'N/A'}</div>
                    <div>Comparisons: {selectedSubmission.grammar_comparisons || 'N/A'}</div>
                    <div>Transitions: {selectedSubmission.grammar_transitions || 'N/A'}</div>
                    <div>Synthesis: {selectedSubmission.grammar_synthesis || 'N/A'}</div>
                  </div>
                </div>

                {/* Reading Skills */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 border-b pb-2">Reading Skills (1-5)</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>Word in Context: {selectedSubmission.reading_word_in_context || 'N/A'}</div>
                    <div>Text Structure: {selectedSubmission.reading_text_structure || 'N/A'}</div>
                    <div>Cross-Text: {selectedSubmission.reading_cross_text || 'N/A'}</div>
                    <div>Central Ideas: {selectedSubmission.reading_central_ideas || 'N/A'}</div>
                    <div>Inferences: {selectedSubmission.reading_inferences || 'N/A'}</div>
                  </div>
                </div>

                {/* Passages */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 border-b pb-2">Passage Types (1-5)</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>Literary: {selectedSubmission.passages_literary || 'N/A'}</div>
                    <div>Social Science: {selectedSubmission.passages_social_science || 'N/A'}</div>
                    <div>Humanities: {selectedSubmission.passages_humanities || 'N/A'}</div>
                    <div>Science: {selectedSubmission.passages_science || 'N/A'}</div>
                    <div>Poetry: {selectedSubmission.passages_poetry || 'N/A'}</div>
                  </div>
                </div>

                {/* Math Topics */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 border-b pb-2">
                    Math Topics ({selectedSubmission.math_topics.length} selected)
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedSubmission.math_topics.map((topic) => (
                      <Badge key={topic} variant="secondary">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Additional Comments */}
                {selectedSubmission.additional_comments && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 border-b pb-2">Additional Comments</h3>
                    <p className="text-sm text-gray-700">{selectedSubmission.additional_comments}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AssignmentZeroSubmissions;
