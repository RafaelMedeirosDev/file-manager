import type { ExamCategory } from '../enums/ExamCategory';

export type ExamRequestItem = {
  id: string;
  userId: string;
  indication: string;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string; email: string };
  exams: { id: string; name: string; code: string; category: ExamCategory }[];
};
