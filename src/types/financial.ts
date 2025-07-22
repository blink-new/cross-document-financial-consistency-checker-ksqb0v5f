export interface ExtractedFigure {
  category: string;
  year: string;
  value: number;
  label: string;
  documentName: string;
  location: string;
  confidence: number;
}

export interface DocumentAnalysis {
  fileName: string;
  extractedFigures: ExtractedFigure[];
  extractionStatus: 'success' | 'partial' | 'failed';
  errorMessage?: string;
}

export interface ComparisonResult {
  year: string;
  field: string;
  values: { [documentName: string]: number | null };
  consistent: boolean;
  category: 'Income Statement' | 'Balance Sheet' | 'Cash Flow Statement';
}

export interface CrossCheckReport {
  documentAnalyses: DocumentAnalysis[];
  comparisons: ComparisonResult[];
  summary: {
    totalComparisons: number;
    consistentCount: number;
    discrepancyCount: number;
    keyDiscrepancies: string[];
    consistentSections: string[];
  };
}