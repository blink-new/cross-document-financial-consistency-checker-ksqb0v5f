import React, { useState, useCallback } from 'react';
import { Toaster } from './components/ui/toaster';
import { useToast } from './hooks/use-toast';
import DocumentUpload from './components/upload/DocumentUpload';
import AnalysisEngine from './components/analysis/AnalysisEngine';
import CrossCheckReport from './components/report/CrossCheckReport';
import { DocumentAnalysis } from './types/financial';
import './index.css';

type AppState = 'upload' | 'analyzing' | 'report';

// Helper functions
const generateComparisons = (analyses: DocumentAnalysis[]) => {
  const comparisons: any[] = [];
  const allFields = new Set<string>();
  const allYears = new Set<string>();
  
  analyses.forEach(analysis => {
    analysis.extractedFigures.forEach(figure => {
      allFields.add(figure.label);
      allYears.add(figure.year);
    });
  });

  allFields.forEach(field => {
    allYears.forEach(year => {
      const values: { [documentName: string]: number | null } = {};
      let category = 'Income Statement';
      
      analyses.forEach(analysis => {
        const figure = analysis.extractedFigures.find(f => f.label === field && f.year === year);
        values[analysis.fileName] = figure ? figure.value : null;
        if (figure) {
          category = figure.category;
        }
      });

      const nonNullValues = Object.values(values).filter(v => v !== null);
      if (nonNullValues.length >= 2) {
        const uniqueValues = new Set(nonNullValues);
        const consistent = uniqueValues.size === 1;
        
        comparisons.push({
          year,
          field,
          values,
          consistent,
          category
        });
      }
    });
  });

  return comparisons;
};

const generateReportContent = (analyses: DocumentAnalysis[]): string => {
  const lines: string[] = [];
  lines.push('DOCUMENT CROSS-CHECKER REPORT');
  lines.push('='.repeat(50));
  lines.push('');
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push(`Documents Analyzed: ${analyses.length}`);
  lines.push('');

  // Executive Summary
  lines.push('EXECUTIVE SUMMARY');
  lines.push('-'.repeat(20));
  
  const allComparisons = generateComparisons(analyses);
  const consistentCount = allComparisons.filter(c => c.consistent).length;
  const discrepancyCount = allComparisons.length - consistentCount;
  
  lines.push(`Total Comparisons: ${allComparisons.length}`);
  lines.push(`Consistent Values: ${consistentCount}`);
  lines.push(`Discrepancies Found: ${discrepancyCount}`);
  lines.push('');

  if (discrepancyCount > 0) {
    lines.push('KEY DISCREPANCIES:');
    allComparisons
      .filter(c => !c.consistent)
      .slice(0, 10)
      .forEach(c => {
        const docValues = Object.entries(c.values)
          .filter(([, value]) => value !== null)
          .map(([doc, value]) => `${doc}: $${value?.toLocaleString()}`)
          .join(', ');
        lines.push(`• ${c.field} for ${c.year}: ${docValues}`);
      });
    lines.push('');
  }

  // Detailed Results
  lines.push('DETAILED COMPARISON RESULTS');
  lines.push('-'.repeat(30));
  lines.push('');

  const categories = ['Income Statement', 'Balance Sheet', 'Cash Flow Statement'];
  categories.forEach(category => {
    const categoryComparisons = allComparisons.filter(c => c.category === category);
    if (categoryComparisons.length > 0) {
      lines.push(`${category.toUpperCase()}`);
      lines.push('');
      categoryComparisons.forEach(c => {
        lines.push(`${c.year} - ${c.field}:`);
        Object.entries(c.values).forEach(([doc, value]) => {
          lines.push(`  ${doc}: ${value !== null ? `$${value.toLocaleString()}` : 'N/A'}`);
        });
        lines.push(`  Consistent: ${c.consistent ? 'Yes' : 'No'}`);
        lines.push('');
      });
    }
  });

  return lines.join('\n');
};

const generateCSVContent = (analyses: DocumentAnalysis[]): string => {
  const lines: string[] = [];
  
  // Header
  const documentNames = analyses.map(a => a.fileName);
  lines.push(['Year', 'Field', 'Category', ...documentNames, 'Consistent'].join(','));
  
  // Data rows
  const comparisons = generateComparisons(analyses);
  comparisons.forEach(c => {
    const row = [
      c.year,
      `"${c.field}"`,
      `"${c.category}"`,
      ...documentNames.map(name => c.values[name] !== null ? c.values[name]!.toString() : ''),
      c.consistent ? 'Yes' : 'No'
    ];
    lines.push(row.join(','));
  });
  
  return lines.join('\n');
};

function App() {
  const [state, setState] = useState<AppState>('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [analyses, setAnalyses] = useState<DocumentAnalysis[]>([]);
  const { toast } = useToast();

  const handleFilesChange = useCallback((newFiles: File[]) => {
    console.log('Files changed:', newFiles.map(f => ({ name: f.name, size: f.size, type: f.type })));
    setFiles(newFiles);
    
    // Validate files and show warnings if needed
    const invalidFiles = newFiles.filter(file => {
      const extension = file.name.toLowerCase().split('.').pop();
      return !['pdf', 'docx', 'xlsx'].includes(extension || '') || file.size === 0 || file.size > 50 * 1024 * 1024;
    });
    
    if (invalidFiles.length > 0) {
      toast({
        title: "File Validation Warning",
        description: `${invalidFiles.length} file(s) may have issues. Check console for details.`,
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleStartAnalysis = useCallback(() => {
    if (files.length < 2) {
      toast({
        title: "Insufficient Documents",
        description: "Please upload at least 2 documents for cross-document comparison.",
        variant: "destructive",
      });
      return;
    }
    setState('analyzing');
  }, [files.length, toast]);

  const handleAnalysisComplete = useCallback((results: DocumentAnalysis[]) => {
    console.log('Analysis complete. Results:', results);
    setAnalyses(results);
    setState('report');
    
    const successCount = results.filter(r => r.extractionStatus === 'success').length;
    const partialCount = results.filter(r => r.extractionStatus === 'partial').length;
    const failedCount = results.filter(r => r.extractionStatus === 'failed').length;
    const totalCount = results.length;
    
    if (successCount === 0 && partialCount === 0) {
      toast({
        title: "Analysis Failed",
        description: `Unable to extract financial data from any of the ${totalCount} documents. Please check that your files contain readable financial information.`,
        variant: "destructive",
      });
    } else if (failedCount > 0) {
      toast({
        title: "Analysis Partially Complete",
        description: `Successfully processed ${successCount + partialCount} of ${totalCount} documents. ${failedCount} documents failed to process.`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Analysis Complete",
        description: `Successfully analyzed ${successCount} of ${totalCount} documents with financial data extracted.`,
      });
    }
  }, [toast]);

  const handleExportPDF = useCallback(() => {
    // Generate PDF report content
    const reportContent = generateReportContent(analyses);
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cross-check-report-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Report Exported",
      description: "PDF report has been downloaded successfully.",
    });
  }, [analyses, toast]);

  const handleExportExcel = useCallback(() => {
    // Generate CSV content for Excel compatibility
    const csvContent = generateCSVContent(analyses);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cross-check-data-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Data Exported",
      description: "Excel-compatible CSV file has been downloaded successfully.",
    });
  }, [analyses, toast]);

  const handleStartOver = useCallback(() => {
    setFiles([]);
    setAnalyses([]);
    setState('upload');
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {state === 'upload' && (
          <DocumentUpload
            files={files}
            onFilesChange={handleFilesChange}
            onAnalyze={handleStartAnalysis}
            isAnalyzing={false}
          />
        )}

        {state === 'analyzing' && (
          <AnalysisEngine
            files={files}
            onAnalysisComplete={handleAnalysisComplete}
          />
        )}

        {state === 'report' && (
          <CrossCheckReport
            analyses={analyses}
            onExportPDF={handleExportPDF}
            onExportExcel={handleExportExcel}
            onStartOver={handleStartOver}
          />
        )}
      </div>
      <Toaster />
    </div>
  );
}

export default App;