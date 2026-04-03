import type { ExamCategory } from '../enums/ExamCategory';

export type ExamItem = {
  id: string;
  name: string;
  code: string;
  category: ExamCategory;
  createdAt: string;
  updatedAt: string;
};
