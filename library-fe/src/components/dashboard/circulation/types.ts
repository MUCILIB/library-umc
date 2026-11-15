export interface ItemResult {
  item: {
    id: string;
    itemCode: string;
    title: string;
    status: string;
    location: string;
  };
  activeLoan: any;
  allowedActions: string[];
}

export interface LoanResult {
  loan: {
    id: string;
    loanCode: string;
    memberId: string;
    itemId: string;
    status: string;
    loanDate: string;
    dueDate: string;
  } | null;
  message: string;
}

export interface ReturnResult {
  success: boolean;
  message: string;
  fine?: {
    id: string;
    overdueDays: number;
    assessedAmount: string;
    status: string;
  };
}
