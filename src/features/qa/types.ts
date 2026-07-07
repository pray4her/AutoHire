export type QaFaqEntry = {
  readonly id: string;
  readonly slug: string;
  readonly question: string;
  readonly answer: string;
  readonly keywords: readonly string[];
  readonly sortOrder: number;
  readonly isPublished: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type CreateQaFaqEntryInput = {
  readonly slug: string;
  readonly question: string;
  readonly answer: string;
  readonly keywords: readonly string[];
  readonly sortOrder?: number;
  readonly isPublished?: boolean;
};
