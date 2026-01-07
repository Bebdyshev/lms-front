import React from 'react';
import { Button } from '../ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Eye } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import type { StudentProgress, AssignmentData, StatusFilter } from './types';

interface StudentsTableProps {
  students: StudentProgress[];
  assignment: AssignmentData;
  searchQuery: string;
  statusFilter: StatusFilter;
  onViewStudent: (student: StudentProgress) => void;
}

const formatDate = (dateString: string | null): string => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const StudentsTable: React.FC<StudentsTableProps> = ({
  students,
  assignment,
  searchQuery,
  statusFilter,
  onViewStudent,
}) => {
  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.student_email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || student.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (filteredStudents.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {students.length === 0
          ? 'No students in this assignment'
          : 'No students match the filters'}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Student</TableHead>
          <TableHead>Submitted At</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredStudents.map((student) => (
          <TableRow key={student.student_id}>
            <TableCell>
              <div>
                <div className="font-medium">{student.student_name}</div>
                <div className="text-sm text-muted-foreground">{student.student_email}</div>
              </div>
            </TableCell>
            <TableCell>{formatDate(student.submitted_at)}</TableCell>
            <TableCell>
              <StatusBadge
                status={student.status}
                score={student.score}
                maxScore={assignment.max_score}
              />
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                {(student.status === 'submitted' || student.status === 'graded') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewStudent(student)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
